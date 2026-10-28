import { Client } from '../../src/lib/Client';
import { GatewayError } from '../../src/lib/GatewayError';
import { PaymentLink } from '../../src/lib/PaymentLink';
import { Transaction } from '../../src/lib/Transaction';

describe('PaymentLink service', () => {
  it('create/get/list/reverse call the expected endpoints', async () => {
    const client = {
      request: jest.fn()
        .mockResolvedValueOnce({ id: 'abc' })
        .mockResolvedValueOnce({ id: 'abc' })
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: 4, status: 'failed', created_at: '2026-01-01T00:00:00Z' },
          { id: 9, status: 'paid', created_at: '2026-01-02T00:00:00Z' }
        ])
        .mockResolvedValueOnce({ id: 9, status: 'refunded' })
        .mockResolvedValueOnce([{ id: 9, status: 'refunded', created_at: '2026-01-02T00:00:00Z' }])
    } as unknown as Client;
    const paymentLink = new PaymentLink(client);

    await paymentLink.create(10, 'Title', 'Desc', { reference: 'R1' });
    await paymentLink.get('abc');
    await paymentLink.list();
    await expect(paymentLink.reverse('abc', 'reason')).resolves.toMatchObject({ id: 9, status: 'refunded' });
    await expect(paymentLink.reverse('abc')).rejects.toBeInstanceOf(GatewayError);

    expect(client.request).toHaveBeenNthCalledWith(1, 'POST', '/payment', {
      price: 10,
      title: 'Title',
      description: 'Desc',
      reference: 'R1'
    });
    expect(client.request).toHaveBeenNthCalledWith(2, 'GET', '/payment/abc');
    expect(client.request).toHaveBeenNthCalledWith(3, 'GET', '/payment');
    expect(client.request).toHaveBeenNthCalledWith(4, 'GET', '/transactions?link_payment_id=abc');
    expect(client.request).toHaveBeenNthCalledWith(5, 'POST', '/transactions/9/reverse', {
      reason: 'reason'
    });
    expect(client.request).toHaveBeenNthCalledWith(6, 'GET', '/transactions?link_payment_id=abc');
  });
});

describe('Transaction service', () => {
  it('list/get/reverse call the expected endpoints', async () => {
    const client = {
      request: jest.fn().mockResolvedValue([])
    } as unknown as Client;
    const tx = new Transaction(client);

    await tx.list({ link_payment_id: 42, page: 1 });
    await tx.get('tx-1');
    await tx.reverse('tx-1', 'refund');

    expect(client.request).toHaveBeenNthCalledWith(1, 'GET', '/transactions?link_payment_id=42&page=1');
    expect(client.request).toHaveBeenNthCalledWith(2, 'GET', '/transactions/tx-1');
    expect(client.request).toHaveBeenNthCalledWith(3, 'POST', '/transactions/tx-1/reverse', {
      reason: 'refund'
    });
  });
});
