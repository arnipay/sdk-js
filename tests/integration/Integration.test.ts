import { Arnipay } from '../../src/lib/Arnipay';
import { GatewayError } from '../../src/lib/GatewayError';

const clientId = process.env.CLIENT_ID;
const privateKey = process.env.PRIVATE_KEY;
const baseUrl = process.env.API_BASE_URL;

const hasCredentials = Boolean(clientId && privateKey && baseUrl);

function createSdk(): Arnipay {
  const arni = new Arnipay(clientId!, privateKey!, false);
  arni.getClient().setBaseUrl(baseUrl!, false);
  return arni;
}

const describeIntegration = hasCredentials ? describe : describe.skip;

describeIntegration('Integration: PaymentLink', () => {
  let arni: Arnipay;
  let testPaymentLinkId: string;

  beforeAll(() => {
    arni = createSdk();
  });

  it('creates a payment link', async () => {
    const reference = `TEST-REF-${Date.now()}`;
    const result = await arni.paymentLinks().create(150000, 'Test Subscription', 'Test description', {
      payment_methods: ['qr', 'tigo'],
      reference
    });

    testPaymentLinkId = result.id;

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('url');
    expect(result.title).toBe('Test Subscription');
    expect(result.price).toBe(150000);
  });

  it('gets a payment link by ID', async () => {
    expect(testPaymentLinkId).toBeDefined();
    const result = await arni.paymentLinks().get(testPaymentLinkId);

    expect(result.id).toBe(testPaymentLinkId);
    expect(result.title).toBe('Test Subscription');
    expect(result.price).toBe(150000);
  });

  it('lists payment links', async () => {
    const result = await arni.paymentLinks().list();
    expect(Array.isArray(result)).toBe(true);

    if (testPaymentLinkId) {
      expect(result.some((link) => link.id === testPaymentLinkId)).toBe(true);
    }
  });
});

describeIntegration('Integration: Fluent DX', () => {
  let arni: Arnipay;

  beforeAll(() => {
    arni = createSdk();
  });

  it('createUrl returns a URL', async () => {
    const url = await arni
      .payment()
      .amount(150000)
      .title('DX Integration Test')
      .description('Testing the Fluent Interface')
      .redirect('https://example.com/success', 'https://example.com/failure')
      .reference(`REF-DX-${Date.now()}`)
      .allow(['qr', 'tigo'])
      .createUrl();

    expect(url).toBeTruthy();
    expect(url).toMatch(/^https?:\/\//);
  });

  it('create returns full payment link data', async () => {
    const result = await arni
      .payment()
      .amount(100000)
      .title('DX Integration Test (Object)')
      .reference(`REF-DX-OBJ-${Date.now()}`)
      .create();

    expect(result.id).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.price).toBe(100000);
    expect(result.title).toBe('DX Integration Test (Object)');
  });
});

describeIntegration('Integration: Payment methods', () => {
  it('returns methods with code and name', async () => {
    const methods = await createSdk().getPaymentMethods();

    expect(Array.isArray(methods)).toBe(true);
    expect(methods.length).toBeGreaterThan(0);
    expect(methods[0]).toHaveProperty('code');
    expect(methods[0]).toHaveProperty('name');
  });
});

describeIntegration('Integration: Transactions', () => {
  let arni: Arnipay;

  beforeAll(() => {
    arni = createSdk();
  });

  it('lists transactions for a payment link', async () => {
    const link = await arni
      .payment()
      .amount(50000)
      .title('Test Transaction List')
      .reference(`REF-TX-LIST-${Date.now()}`)
      .create();

    const transactions = await arni.transaction().list({ link_payment_id: link.id });
    expect(Array.isArray(transactions)).toBe(true);
  });

  it('returns 404 for a missing transaction', async () => {
    await expect(arni.transaction().get('non-existent-tx-id')).rejects.toMatchObject({
      statusCode: 404
    } as Partial<GatewayError>);
  });

  it('returns 404 when reversing a missing transaction', async () => {
    await expect(
      arni.transaction().reverse('non-existent-tx-id', 'Integration Test')
    ).rejects.toMatchObject({ statusCode: 404 } as Partial<GatewayError>);
  });
});

if (!hasCredentials) {
  describe('Integration (skipped)', () => {
    it('skips because CLIENT_ID / PRIVATE_KEY / API_BASE_URL are not set', () => {
      console.warn('Integration tests skipped: missing credentials in tests/.env');
      expect(true).toBe(true);
    });
  });
}
