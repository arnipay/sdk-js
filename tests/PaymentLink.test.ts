import dotenv from 'dotenv';
import { Client } from '../src/lib/Client';
import { PaymentLink } from '../src/lib/PaymentLink';

// Load environment variables
dotenv.config();

describe('PaymentLink', () => {
  const clientId = process.env.CLIENT_ID;
  const privateKey = process.env.PRIVATE_KEY;
  const baseUrl = process.env.API_BASE_URL;
  
  let client: Client;
  let paymentLink: PaymentLink;
  let testPaymentLinkId: string;
  
  beforeAll(() => {
    // Skip tests if environment variables are not set
    if (!clientId || !privateKey || !baseUrl) {
      console.warn('API credentials not found in environment variables. Integration tests will be skipped.');
    }
  });
  
  beforeEach(() => {
    // Initialize client and payment link if credentials are available
    if (clientId && privateKey && baseUrl) {
      client = new Client(clientId, privateKey, baseUrl);
      paymentLink = new PaymentLink(client);
    }
  });
  
  describe('create', () => {
    it('should create a payment link successfully', async () => {
      // Skip test if credentials are not available
      if (!clientId || !privateKey || !baseUrl) {
        return console.log('Skipping test: create payment link');
      }
      
      // Create a unique reference for this test
      const reference = `TEST-REF-${Date.now()}`;
      
      // Call create method with real API
      const result = await paymentLink.create(
        150000,
        'Test Subscription',
        'Test description',
        {
          payment_methods: ['qr', 'tigo'],
          reference: reference
        }
      );
      
      // Store the ID for other tests
      testPaymentLinkId = result.id;
      
      // Verify the response has expected structure
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('title', 'Test Subscription');
      expect(result).toHaveProperty('price', 150000);
    });
  });
  
  describe('get', () => {
    it('should get a payment link by ID', async () => {
      // Skip test if credentials are not available or if we don't have a test payment link ID
      if (!clientId || !privateKey || !baseUrl || !testPaymentLinkId) {
        return console.log('Skipping test: get payment link');
      }
      
      // Call get method with real API
      const result = await paymentLink.get(testPaymentLinkId);
      
      // Verify the response
      expect(result).toHaveProperty('id', testPaymentLinkId);
      expect(result).toHaveProperty('title', 'Test Subscription');
      expect(result).toHaveProperty('price', 150000);
    });
  });
  
  describe('list', () => {
    it('should list all payment links', async () => {
      // Skip test if credentials are not available
      if (!clientId || !privateKey || !baseUrl) {
        return console.log('Skipping test: list payment links');
      }
      
      // Call list method with real API
      const result = await paymentLink.list();
      
      // Verify the response is an array
      expect(Array.isArray(result)).toBe(true);
      
      // If we have created a payment link, verify it's in the list
      if (testPaymentLinkId) {
        const found = result.some(link => link.id === testPaymentLinkId);
        expect(found).toBe(true);
      }
    });
  });
});
