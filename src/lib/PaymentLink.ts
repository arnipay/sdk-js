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
   * 
   * @param price The price of the item
   * @param title Title of the payment link
   * @param options Additional options
   * @returns The created payment link data
   */
  public async create(price: number, title: string, description?: string, options: PaymentLinkOptions = {}): Promise<PaymentLinkResponse> {
    const data: PaymentLinkCreateParams = {
      price,
      title,
      ...options
    };

    if (description) {
      data.description = description;
    }

    return this.client.request<PaymentLinkResponse>('POST', '/payment', data);
  }

  /**
   * Get a specific payment link by ID
   * 
   * @param id Payment link ID
   * @returns Payment link data
   */
  public async get(id: string): Promise<PaymentLinkResponse> {
    return this.client.request<PaymentLinkResponse>('GET', `/payment/${id}`);
  }

  /**
   * Get a list of all payment links
   * 
   * @returns List of payment links
   */
  public async list(): Promise<PaymentLinkResponse[]> {
    return this.client.request<PaymentLinkResponse[]>('GET', '/payment');
  }
}
