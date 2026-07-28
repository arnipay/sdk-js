import { PaymentMethod } from '../interfaces';
import { Client, PRODUCTION_BASE_URL, SANDBOX_BASE_URL } from './Client';
import { PaymentBuilder } from './PaymentBuilder';
import { PaymentLink } from './PaymentLink';
import { Transaction } from './Transaction';
import { Webhook } from './Webhook';

/**
 * Simple facade for the Arnipay SDK.
 *
 * @example
 * const arni = new Arnipay('CLIENT_ID', 'PRIVATE_KEY', true); // sandbox
 *
 * const url = await arni.payment()
 *   .title('Pizza Order')
 *   .amount(50000)
 *   .reference('ORDER-123')
 *   .createUrl();
 */
export class Arnipay {
  private readonly client: Client;

  constructor(clientId: string, privateKey: string, isSandbox: boolean = false) {
    this.client = new Client(
      clientId,
      privateKey,
      isSandbox ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL
    );

    if (isSandbox) {
      // Sandbox may use a cert chain that needs looser verify in some environments;
      // HTTPS is still required. Match PHP which passes verifySsl=false for sandbox.
      this.client.setBaseUrl(SANDBOX_BASE_URL, false);
    }
  }

  /** Fluent payment-link builder */
  public payment(): PaymentBuilder {
    return new PaymentBuilder(this.client);
  }

  /** Payment-link service (create/get/list/reverse) */
  public paymentLinks(): PaymentLink {
    return new PaymentLink(this.client);
  }

  /** Transaction service (list/get/reverse) */
  public transaction(): Transaction {
    return new Transaction(this.client);
  }

  /** Webhook verifier / handler */
  public webhook(secret: string): Webhook {
    return new Webhook(secret);
  }

  /** Escape hatch for custom base URL or raw requests */
  public getClient(): Client {
    return this.client;
  }

  /** Available payment methods: [{ code, name }, ...] */
  public async getPaymentMethods(): Promise<PaymentMethod[]> {
    return this.client.request<PaymentMethod[]>('GET', '/payment_methods');
  }
}
