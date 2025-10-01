import crypto from 'crypto';
import { WebhookEvent } from '../interfaces';

export type WebhookHeaders = Record<string, string | string[] | undefined>;

export interface ValidateSignatureOptions {
  path: string;
  method?: string;
  toleranceSeconds?: number;
}

export class Webhook {
  private readonly webhookSecret: string;

  constructor(webhookSecret: string) {
    this.webhookSecret = webhookSecret;
  }

  /**
   * Validate the webhook signature
   * 
   * @param payload Raw request payload
   * @param headers Headers containing X-Client-ID, X-Timestamp, X-Signature, and X-Webhook-ID (when provided)
   * @param options Validation options including the request path (and optional method/tolerance)
   * @returns Whether the signature is valid
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

    const now = Math.floor(Date.now() / 1000);

    if (now - timestamp > toleranceSeconds) {
      return false;
    }

    const bodyHash = this.hashBody(payload);

    const canonical = this.buildCanonicalString(
      method,
      path,
      timestampHeader,
      clientId,
      bodyHash
    );

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(canonical, 'utf8')
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature);
    const signatureBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  /**
   * Process webhook event
   * 
   * @param payload Raw request payload
   * @param headers Headers containing X-Client-ID, X-Timestamp, X-Signature, and optional X-Webhook-ID
   * @param options Validation options including the request path (and optional method/tolerance)
   * @returns Processed event data or null if invalid
   */
  public processEvent(payload: string, headers: WebhookHeaders, options: ValidateSignatureOptions): WebhookEvent | null {
    if (!this.validateSignature(payload, headers, options)) {
      return null;
    }

    try {
      const event = JSON.parse(payload) as WebhookEvent;

      if (!event || !event.event || !event.data) {
        return null;
      }

      return event;
    } catch (error) {
      return null;
    }
  }

  private hashBody(payload: string): string {
    return crypto.createHash('sha256').update(payload, 'utf8').digest('base64');
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

  private buildCanonicalString(
    method: string,
    path: string,
    timestamp: string,
    clientId: string,
    bodyHash: string
  ): string {
    return [method.toUpperCase(), path, timestamp, clientId, bodyHash].join('\n');
  }

  private normalizePath(path: string): string {
    if (!path) {
      return '/';
    }

    if (!path.startsWith('/')) {
      return `/${path}`;
    }

    return path;
  }
}
