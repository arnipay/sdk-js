import crypto from 'crypto';
import { GatewayError } from '../../src/lib/GatewayError';
import { Webhook, WebhookHeaders } from '../../src/lib/Webhook';
import { WebhookEvent } from '../../src/lib/WebhookEvent';

describe('Webhook', () => {
  const webhookSecret = process.env.WEBHOOK_SECRET || 'test-webhook-secret';
  let webhook: Webhook;
  const path = '/webhooks/test-webhook?source=gw';
  const method = 'POST';
  const clientId = 'webhook-client';

  beforeEach(() => {
    webhook = new Webhook(webhookSecret);
  });

  const buildHeaders = (
    payload: string,
    secret: string = webhookSecret,
    overrides: Partial<Record<'x-client-id' | 'x-timestamp', string>> = {}
  ): WebhookHeaders => {
    const timestamp = overrides['x-timestamp'] ?? Math.floor(Date.now() / 1000).toString();
    const client = overrides['x-client-id'] ?? clientId;

    const canonical = [
      method,
      path,
      timestamp,
      client,
      crypto.createHash('sha256').update(payload, 'utf8').digest('base64')
    ].join('\n');

    const signature = crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');

    return {
      'x-client-id': client,
      'x-timestamp': timestamp,
      'x-signature': signature
    };
  };

  describe('validateSignature', () => {
    it('returns true for valid signatures', () => {
      const payload = JSON.stringify({
        event: 'payment.completed',
        timestamp: '2023-01-01T00:00:00Z',
        data: { link_id: 'x', payment_id: '1', status: 'paid', amount: 150000 }
      });

      expect(webhook.validateSignature(payload, buildHeaders(payload), { path, method })).toBe(true);
    });

    it('returns false for invalid signatures', () => {
      const payload = '{"event":"payment.completed","data":{}}';
      expect(webhook.validateSignature(payload, buildHeaders(payload, 'wrong'), { path, method })).toBe(
        false
      );
    });

    it('rejects requests outside allowed tolerance', () => {
      const payload = '{"event":"payment.completed","data":{}}';
      const outdated = (Math.floor(Date.now() / 1000) - 3600).toString();
      const headers = buildHeaders(payload, webhookSecret, { 'x-timestamp': outdated });

      expect(webhook.validateSignature(payload, headers, { path, method })).toBe(false);
    });

    it('rejects when a required header is missing', () => {
      const payload = '{"event":"payment.completed","data":{}}';
      const headers = buildHeaders(payload);
      delete headers['x-client-id'];

      expect(webhook.validateSignature(payload, headers, { path, method })).toBe(false);
    });
  });

  describe('processEvent', () => {
    it('returns a WebhookEvent for valid payloads', () => {
      const payload = JSON.stringify({
        event: 'payment.completed',
        timestamp: '2023-01-01T00:00:00Z',
        data: { link_id: 'x', payment_id: '1', status: 'paid', amount: 150000, reference: 'ORD-1' }
      });

      const event = webhook.processEvent(payload, buildHeaders(payload), { path, method });

      expect(event).toBeInstanceOf(WebhookEvent);
      expect(event.isPaid()).toBe(true);
      expect(event.get('reference')).toBe('ORD-1');
      expect(event.getType()).toBe('payment.completed');
    });

    it('does not treat a refund as a collected payment', () => {
      const refunded = new WebhookEvent({
        event: 'payment.refunded',
        timestamp: '2023-01-01T00:00:00Z',
        data: { status: 'refunded', amount: 150000 }
      });
      const pending = new WebhookEvent({
        event: 'payment.refund_pending',
        timestamp: '2023-01-01T00:00:00Z',
        data: { status: 'pending_refund', amount: 150000 }
      });

      expect(refunded.isPaid()).toBe(false);
      expect(refunded.get('status')).toBe('refunded');
      expect(pending.isPaid()).toBe(false);
      expect(pending.getType()).toBe('payment.refund_pending');
    });

    it('throws GatewayError for invalid signature', () => {
      const payload = JSON.stringify({
        event: 'payment.completed',
        timestamp: '2023-01-01T00:00:00Z',
        data: { amount: 1 }
      });

      expect(() =>
        webhook.processEvent(payload, buildHeaders(payload, 'wrong'), { path, method })
      ).toThrow(GatewayError);
    });

    it('throws for invalid JSON', () => {
      const payload = 'not valid JSON';
      expect(() => webhook.processEvent(payload, buildHeaders(payload), { path, method })).toThrow(
        /Invalid JSON/
      );
    });

    it('throws for missing required fields', () => {
      const payload = JSON.stringify({ timestamp: '2023-01-01T00:00:00Z' });
      expect(() => webhook.processEvent(payload, buildHeaders(payload), { path, method })).toThrow(
        /Invalid webhook payload/
      );
    });
  });

  describe('handle / processRequest', () => {
    it('invokes the callback with the event', async () => {
      const payload = JSON.stringify({
        event: 'payment.completed',
        timestamp: '2023-01-01T00:00:00Z',
        data: { amount: 10, reference: 'R' }
      });
      const headers = buildHeaders(payload);
      const req = { method, originalUrl: path, headers, body: payload };

      const result = await webhook.handle(req, (event) => {
        expect(event.isPaid()).toBe(true);
        return event.get('reference');
      });

      expect(result).toBe('R');
    });
  });
});
