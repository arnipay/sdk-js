import { WebhookEventData, WebhookEventPayload } from '../interfaces';

/**
 * Typed helper around a webhook payload with convenience accessors.
 */
export class WebhookEvent {
  private readonly payload: WebhookEventPayload;

  constructor(payload: WebhookEventPayload) {
    this.payload = payload;
  }

  public getType(): string {
    return this.payload.event;
  }

  public get type(): string {
    return this.getType();
  }

  public get timestamp(): string {
    return this.payload.timestamp;
  }

  public get data(): WebhookEventData {
    return this.payload.data;
  }

  /**
   * True only for `payment.completed`.
   * A refund is `payment.refunded` or `payment.refund_pending`, not a collected payment.
   */
  public isPaid(): boolean {
    return this.getType() === 'payment.completed';
  }

  /**
   * Look up a field from data first, then top-level payload.
   * Mirrors PHP WebhookEvent magic property access.
   */
  public get<T = unknown>(name: string): T | undefined {
    if (name === 'type') {
      return this.getType() as T;
    }

    if (this.payload.data && Object.prototype.hasOwnProperty.call(this.payload.data, name)) {
      return this.payload.data[name] as T;
    }

    if (Object.prototype.hasOwnProperty.call(this.payload, name)) {
      return (this.payload as unknown as Record<string, unknown>)[name] as T;
    }

    return undefined;
  }

  public toObject(): WebhookEventPayload {
    return this.payload;
  }

  public toJSON(): WebhookEventPayload {
    return this.payload;
  }
}
