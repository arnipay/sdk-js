import { Client, PRODUCTION_BASE_URL, SANDBOX_BASE_URL } from '../../src/lib/Client';
import { Arnipay } from '../../src/lib/Arnipay';

describe('Client', () => {
  it('defaults to production URL', () => {
    const client = new Client('id', 'key');
    expect(client.getBaseUrl()).toBe(PRODUCTION_BASE_URL);
  });

  it('rejects non-HTTPS when verifySsl is true', () => {
    const client = new Client('id', 'key');
    expect(() => client.setBaseUrl('http://example.com/api/v1', true)).toThrow(/HTTPS/);
  });

  it('allows http when verifySsl is false', () => {
    const client = new Client('id', 'key');
    client.setBaseUrl('http://example.com/api/v1', false);
    expect(client.getBaseUrl()).toBe('http://example.com/api/v1');
  });
});

describe('Arnipay facade', () => {
  it('uses sandbox URL when isSandbox is true', () => {
    const arni = new Arnipay('id', 'key', true);
    expect(arni.getClient().getBaseUrl()).toBe(SANDBOX_BASE_URL);
  });

  it('exposes payment, transaction, webhook helpers', () => {
    const arni = new Arnipay('id', 'key');
    expect(arni.payment()).toBeDefined();
    expect(arni.transaction()).toBeDefined();
    expect(arni.webhook('secret')).toBeDefined();
    expect(arni.paymentLinks()).toBeDefined();
  });
});
