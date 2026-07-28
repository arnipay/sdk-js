import { PaymentBuilder } from '../../src/lib/PaymentBuilder';
import { Client } from '../../src/lib/Client';

describe('PaymentBuilder', () => {
  it('requires amount and title before create', async () => {
    const client = new Client('id', 'key');
    const builder = new PaymentBuilder(client);

    await expect(builder.create()).rejects.toThrow(/amount\(\) and title\(\)/);
  });

  it('maps fluent helpers to create options', async () => {
    const client = {
      request: jest.fn().mockResolvedValue({ id: '1', url: 'https://pay.test/1' })
    } as unknown as Client;

    const builder = new PaymentBuilder(client);
    const result = await builder
      .amount(50000)
      .title('Pizza')
      .description('Two pies')
      .reference('ORDER-1')
      .allow(['qr', 'card'])
      .redirect('https://ok', 'https://fail')
      .with('stock', 1)
      .create();

    expect(result.url).toBe('https://pay.test/1');
    expect(client.request).toHaveBeenCalledWith('POST', '/payment', {
      price: 50000,
      title: 'Pizza',
      description: 'Two pies',
      reference: 'ORDER-1',
      payment_methods: ['qr', 'card'],
      approved_redirection_url: 'https://ok',
      failed_redirection_url: 'https://fail',
      stock: 1
    });
  });

  it('createUrl returns only the url', async () => {
    const client = {
      request: jest.fn().mockResolvedValue({ id: '1', url: 'https://pay.test/u' })
    } as unknown as Client;

    const url = await new PaymentBuilder(client).amount(1).title('t').createUrl();
    expect(url).toBe('https://pay.test/u');
  });
});
