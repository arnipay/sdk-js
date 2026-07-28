import crypto from 'crypto';
import { WebhookEventPayload } from '../interfaces';
import { GatewayError } from './GatewayError';
import { SignatureService } from './SignatureService';
import { WebhookEvent } from './WebhookEvent';

export type WebhookHeaders = Record<string, string | string[] | undefined>;

export interface ValidateSignatureOptions {
  path: string;
  method?: string;
  /** Reject timestamps older than this many seconds. Default 900 (15 min). Set 0 to disable. */
  toleranceSeconds?: number;
}

/** Minimal IncomingMessage / Express-like request shape */
export interface WebhookRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers: WebhookHeaders;
  body?: string | Buffer | unknown;
}

export class Webhook {
  private readonly webhookSecret: string;
  private readonly signatureService: SignatureService;

  constructor(webhookSecret: string) {
    this.webhookSecret = webhookSecret;
    this.signatureService = new SignatureService();
  }

  /**
   * Validate the webhook signature
   */
  public validateSignature(
    payload: string,
    headers: WebhookHeaders,
    options: ValidateSignatureOptions
  ): boolean {
    const method = (options.method || 'POST').toUpperCase();
    const path = this.normalizePath(options.path);
    const toleranceSeconds = options.toleranceSeconds ?? 900;

    const signature = this.getHeader(headers, 'x-signature');
    const timestampHeader = this.getHeader(headers, 'x-timestamp');
    const clientId = this.getHeader(headers, 'x-client-id');

    if (!signature || !timestampHeader || !clientId) {
      return false;
    }

    const timestamp = Number.parseInt(timestampHeader, 10);

    if (!Number.isFinite(timestamp)) {
      return false;
    }

    if (toleranceSeconds > 0) {
      const now = Math.floor(Date.now() / 1000);
      if (now - timestamp > toleranceSeconds) {
        return false;
      }
    }

    const expectedSignature = this.signatureService.generate(
      method,
      path,
      timestamp,
      clientId,
      this.webhookSecret,
      payload
    );

    return this.timingSafeEqual(expectedSignature, signature);
  }

  /**
   * Validate and parse a webhook. Throws GatewayError on failure.
   * Returns a WebhookEvent helper (use .toObject() for the raw payload).
   */
  public processEvent(
    payload: string,
    headers: WebhookHeaders,
    options: ValidateSignatureOptions
  ): WebhookEvent {
    if (!this.validateSignature(payload, headers, options)) {
      throw new GatewayError('Invalid webhook signature', 401);
    }

    let event: WebhookEventPayload;

    try {
      event = JSON.parse(payload) as WebhookEventPayload;
    } catch {
      throw new GatewayError('Invalid JSON payload', 400);
    }

    if (!event || !event.event || !event.data) {
      throw new GatewayError('Invalid webhook payload', 422);
    }

    return new WebhookEvent(event);
  }

  /**
   * Process an Express / Node IncomingMessage-style request.
   * Body must be the raw string/Buffer used for signature verification.
   */
  public processRequest(req: WebhookRequest, options?: Partial<ValidateSignatureOptions>): WebhookEvent {
    const path = options?.path ?? req.originalUrl ?? req.url ?? '/';
    const method = options?.method ?? req.method ?? 'POST';
    const payload = this.normalizeBody(req.body);

    return this.processEvent(payload, req.headers, {
      path,
      method,
      toleranceSeconds: options?.toleranceSeconds
    });
  }

  /**
   * Process a request and invoke a callback with the event.
   */
  public async handle(
    req: WebhookRequest,
    callback: (event: WebhookEvent) => unknown | Promise<unknown>,
    options?: Partial<ValidateSignatureOptions>
  ): Promise<unknown> {
    const event = this.processRequest(req, options);
    return callback(event);
  }

  private normalizeBody(body: WebhookRequest['body']): string {
    if (body === undefined || body === null) {
      return '';
    }

    if (typeof body === 'string') {
      return body;
    }

    if (Buffer.isBuffer(body)) {
      return body.toString('utf8');
    }

    // If middleware already parsed JSON, re-stringify for hashing (prefer raw body)
    return JSON.stringify(body).replace(/\\\//g, '/');
  }

  private getHeader(headers: WebhookHeaders, name: string): string | undefined {
    const lowerName = name.toLowerCase();

    for (const [headerName, value] of Object.entries(headers)) {
      if (headerName.toLowerCase() === lowerName) {
        if (value === undefined) {
          return undefined;
        }

        return Array.isArray(value) ? value[0] : value;
      }
    }

    return undefined;
  }

  private normalizePath(path: string): string {
    if (!path) {
      return '/';
    }

    // Strip scheme/host if a full URL was passed
    if (/^[a-z][a-z\d+\-.]*:\/\//i.test(path)) {
      return this.signatureService.extractUri(path);
    }

    if (!path.startsWith('/')) {
      return `/${path}`;
    }

    return path;
  }

  private timingSafeEqual(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(actual);

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  }
}
