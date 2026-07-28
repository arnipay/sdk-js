import {
  PaymentLinkCreateParams,
  PaymentLinkOptions,
  PaymentLinkResponse
} from '../interfaces';
import { Client } from './Client';

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
   * Reverse a payment associated with a payment link
   */
  public async reverse(id: string, reason?: string | null): Promise<Record<string, unknown>> {
    const data: Record<string, string> = {};
    if (reason != null) {
      data.reason = reason;
    }

    return this.client.request<Record<string, unknown>>(
      'POST',
      `/payment/${id}/reverse`,
      Object.keys(data).length > 0 ? data : undefined
    );
  }
}
