import { Client } from '../../src/lib/Client';
import { PaymentLink } from '../../src/lib/PaymentLink';
import { Transaction } from '../../src/lib/Transaction';

describe('PaymentLink service', () => {
  it('create/get/list/reverse call the expected endpoints', async () => {
    const client = {
      request: jest.fn().mockResolvedValue({ id: 'abc' })
    } as unknown as Client;
    const paymentLink = new PaymentLink(client);

    await paymentLink.create(10, 'Title', 'Desc', { reference: 'R1' });
    await paymentLink.get('abc');
    await paymentLink.list();
    await paymentLink.reverse('abc', 'reason');
    await paymentLink.reverse('abc');

    expect(client.request).toHaveBeenNthCalledWith(1, 'POST', '/payment', {
      price: 10,
      title: 'Title',
      description: 'Desc',
      reference: 'R1'
    });
    expect(client.request).toHaveBeenNthCalledWith(2, 'GET', '/payment/abc');
    expect(client.request).toHaveBeenNthCalledWith(3, 'GET', '/payment');
    expect(client.request).toHaveBeenNthCalledWith(4, 'POST', '/payment/abc/reverse', {
      reason: 'reason'
    });
    expect(client.request).toHaveBeenNthCalledWith(5, 'POST', '/payment/abc/reverse', undefined);
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
