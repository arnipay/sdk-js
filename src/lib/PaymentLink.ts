import {
  PaymentLinkCreateParams,
  PaymentLinkOptions,
  PaymentLinkResponse
} from '../interfaces';
import { Client } from './Client';
import { GatewayError } from './GatewayError';
import { Transaction } from './Transaction';

export class PaymentLink {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Create a new payment link
   */
  public async create(
    price: number,
    title: string,
    description?: string | null,
    options: PaymentLinkOptions = {}
  ): Promise<PaymentLinkResponse> {
    const data: PaymentLinkCreateParams = {
      price,
      title,
      ...options
    };

    if (description != null) {
      data.description = description;
    }

    return this.client.request<PaymentLinkResponse>('POST', '/payment', data);
  }

  /**
   * Get a specific payment link by ID
   */
  public async get(id: string): Promise<PaymentLinkResponse> {
    return this.client.request<PaymentLinkResponse>('GET', `/payment/${id}`);
  }

  /**
   * Get a list of all payment links
   */
  public async list(): Promise<PaymentLinkResponse[]> {
    return this.client.request<PaymentLinkResponse[]>('GET', '/payment');
  }

  /**
   * Reverse the paid transaction on a payment link.
   * The gateway refunds a transaction id (`POST /transactions/{id}/reverse`), not the link id.
   */
  public async reverse(id: string, reason?: string | null): Promise<Record<string, unknown>> {
    const transactions = new Transaction(this.client);
    const list = await transactions.list({ link_payment_id: id });
    const paid = list
      .filter((item) => item.status === 'paid' && item.id != null)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];

    if (!paid) {
      throw new GatewayError('Payment cannot be reversed. It must be in PAID status.', 400);
    }

    return transactions.reverse(String(paid.id), reason);
  }
}
