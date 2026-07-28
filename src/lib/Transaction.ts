import { Client } from './Client';
import { TransactionFilters, TransactionResponse } from '../interfaces';

export class Transaction {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * List transactions, optionally filtered (e.g. link_payment_id, page)
   */
  public async list(filters: TransactionFilters = {}): Promise<TransactionResponse[]> {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }

    const query = params.toString();
    const endpoint = query ? `/transactions?${query}` : '/transactions';

    return this.client.request<TransactionResponse[]>('GET', endpoint);
  }

  /**
   * Get a single transaction by ID
   */
  public async get(id: string): Promise<TransactionResponse> {
    return this.client.request<TransactionResponse>('GET', `/transactions/${id}`);
  }

  /**
   * Reverse (refund) a transaction
   */
  public async reverse(id: string, reason?: string | null): Promise<Record<string, unknown>> {
    const data: Record<string, string> = {};
    if (reason != null) {
      data.reason = reason;
    }

    return this.client.request<Record<string, unknown>>(
      'POST',
      `/transactions/${id}/reverse`,
      Object.keys(data).length > 0 ? data : undefined
    );
  }
}
