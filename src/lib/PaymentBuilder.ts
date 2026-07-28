import { PaymentLinkOptions, PaymentLinkResponse } from '../interfaces';
import { Client } from './Client';
import { PaymentLink } from './PaymentLink';

/**
 * Fluent builder for creating payment links.
 *
 * @example
 * const url = await arni.payment()
 *   .title('Pizza')
 *   .amount(50000)
 *   .reference('ORDER-123')
 *   .createUrl();
 */
export class PaymentBuilder {
  private readonly client: Client;
  private _amount?: number;
  private _title?: string;
  private _description: string | null = null;
  private options: PaymentLinkOptions = {};

  constructor(client: Client) {
    this.client = client;
  }

  public amount(amount: number): this {
    this._amount = amount;
    return this;
  }

  public title(title: string): this {
    this._title = title;
    return this;
  }

  public description(description: string): this {
    this._description = description;
    return this;
  }

  public allow(methods: string[]): this {
    this.options.payment_methods = methods;
    return this;
  }

  public reference(reference: string): this {
    this.options.reference = reference;
    return this;
  }

  public redirect(successUrl: string, failureUrl?: string | null): this {
    this.options.approved_redirection_url = successUrl;
    if (failureUrl) {
      this.options.failed_redirection_url = failureUrl;
    }
    return this;
  }

  /** Escape hatch for any additional API option */
  public with(key: string, value: unknown): this {
    (this.options as Record<string, unknown>)[key] = value;
    return this;
  }

  public async create(): Promise<PaymentLinkResponse> {
    if (this._amount === undefined || this._title === undefined) {
      throw new Error('Payment requires amount() and title() before create()');
    }

    const link = new PaymentLink(this.client);
    return link.create(this._amount, this._title, this._description, this.options);
  }

  public async createUrl(): Promise<string | null> {
    const result = await this.create();
    return result.url ?? null;
  }
}
