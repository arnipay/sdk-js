import crypto from 'crypto';
import { WebhookEvent } from '../src/interfaces';
import { Webhook, WebhookHeaders } from '../src/lib/Webhook';

describe('Webhook', () => {
  const webhookSecret = process.env.WEBHOOK_SECRET || 'test-webhook-secret';
  let webhook: Webhook;
  const path = '/webhooks/test-webhook?source=gw';
  const method = 'POST';
  const clientId = 'webhook-client';
  const webhookId = 'test-webhook';

  beforeEach(() => {
    webhook = new Webhook(webhookSecret);
  });

  const buildHeaders = (
    payload: string,
    secret: string = webhookSecret,
    overrides: Partial<Record<'x-client-id' | 'x-timestamp' | 'x-webhook-id', string>> = {}
  ): WebhookHeaders => {
    const timestamp = overrides['x-timestamp'] ?? Math.floor(Date.now() / 1000).toString();
    const client = overrides['x-client-id'] ?? clientId;
    const id = overrides['x-webhook-id'] ?? webhookId;

    const canonical = [
      method,
      path,
      timestamp,
      client,
      crypto.createHash('sha256').update(payload, 'utf8').digest('base64')
    ].join('\n');

    const signature = crypto
      .createHmac('sha256', secret)
      .update(canonical, 'utf8')
      .digest('hex');

    return {
      'x-client-id': client,
      'x-timestamp': timestamp,
      'x-signature': signature,
      'x-webhook-id': id
    };
  };

  describe('validateSignature', () => {
    it('should return true for valid signatures', () => {
      const payload = JSON.stringify({
        event: 'payment.completed',
        timestamp: '2023-01-01T00:00:00Z',
        data: {
          link_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_id: '12345',
          status: 'paid',
          amount: 150000
        }
      });
      const headers = buildHeaders(payload);

      const result = webhook.validateSignature(payload, headers, { path, method });

      expect(result).toBeTruthy();
    });

    it('should return false for invalid signatures', () => {
      const payload = JSON.stringify({
        event: 'payment.completed',
        timestamp: '2023-01-01T00:00:00Z',
        data: {
          link_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_id: '12345',
          status: 'paid',
          amount: 150000
        }
      });

      const headers = buildHeaders(payload, 'wrong-secret');

      const result = webhook.validateSignature(payload, headers, { path, method });

      expect(result).toBeFalsy();
    });

    it('should reject requests outside allowed tolerance', () => {
      const payload = JSON.stringify({
        event: 'payment.completed',
        timestamp: '2023-01-01T00:00:00Z',
        data: {
          link_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_id: '12345',
          status: 'paid',
          amount: 150000
        }
      });

      const outdatedTimestamp = (Math.floor(Date.now() / 1000) - 3600).toString();
      const outdatedHeaders = buildHeaders(payload, webhookSecret, { 'x-timestamp': outdatedTimestamp });

      const result = webhook.validateSignature(payload, outdatedHeaders, { path, method });

      expect(result).toBeFalsy();
    });

    it('should reject when a required header is missing', () => {
      const payload = JSON.stringify({
        event: 'payment.completed',
        timestamp: '2023-01-01T00:00:00Z',
        data: {
          link_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_id: '12345',
          status: 'paid',
          amount: 150000
        }
      });

      const headers = buildHeaders(payload);
      delete headers['x-client-id'];

      const result = webhook.validateSignature(payload, headers, { path, method });

      expect(result).toBeFalsy();
    });
  });

  describe('processEvent', () => {
    it('should process a valid webhook event', () => {
      const event: WebhookEvent = {
        event: 'payment.completed',
        timestamp: '2023-01-01T00:00:00Z',
        data: {
          link_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_id: '12345',
          status: 'paid',
          amount: 150000
        }
      };

      const payload = JSON.stringify(event);
      const headers = buildHeaders(payload);

      const result = webhook.processEvent(payload, headers, { path, method });

      expect(result).toEqual(event);
    });

    it('should return null for invalid signature', () => {
      const event: WebhookEvent = {
        event: 'payment.completed',
        timestamp: '2023-01-01T00:00:00Z',
        data: {
          link_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_id: '12345',
          status: 'paid',
          amount: 150000
        }
      };

      const payload = JSON.stringify(event);
      const headers = buildHeaders(payload, 'wrong-secret');

      const result = webhook.processEvent(payload, headers, { path, method });

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const payload = 'not valid JSON';
      const headers = buildHeaders(payload);

      const result = webhook.processEvent(payload, headers, { path, method });

      expect(result).toBeNull();
    });

    it('should return null for missing required fields', () => {
      const payload = JSON.stringify({
        timestamp: '2023-01-01T00:00:00Z'
        // Missing event and data fields
      });
      const headers = buildHeaders(payload);

      const result = webhook.processEvent(payload, headers, { path, method });

      expect(result).toBeNull();
    });
  });
});
