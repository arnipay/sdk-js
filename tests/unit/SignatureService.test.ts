import crypto from 'crypto';
import { SignatureService } from '../../src/lib/SignatureService';

describe('SignatureService', () => {
  const service = new SignatureService();

  it('builds the canonical string and HMAC like the PHP SDK', () => {
    const body = '{"price":100}';
    const bodyHash = crypto.createHash('sha256').update(body, 'utf8').digest('base64');
    const canonical = service.buildCanonicalString('POST', '/api/v1/payment', 1700000000, 'client-1', body);

    expect(canonical).toBe(
      ['POST', '/api/v1/payment', '1700000000', 'client-1', bodyHash].join('\n')
    );

    const signature = service.generate('POST', '/api/v1/payment', 1700000000, 'client-1', 'secret', body);
    const expected = crypto.createHmac('sha256', 'secret').update(canonical, 'utf8').digest('hex');
    expect(signature).toBe(expected);
  });

  it('hashes empty body for GET requests', () => {
    const emptyHash = crypto.createHash('sha256').update('', 'utf8').digest('base64');
    const canonical = service.buildCanonicalString('GET', '/api/v1/payment', 1, 'id', '');
    expect(canonical.endsWith(emptyHash)).toBe(true);
  });

  it('extracts path and query from absolute and relative URLs', () => {
    expect(service.extractUri('https://example.com/api/v1/payment?page=1')).toBe(
      '/api/v1/payment?page=1'
    );
    expect(service.extractUri('/webhooks/hook?x=1')).toBe('/webhooks/hook?x=1');
    expect(service.extractUri('webhooks/hook')).toBe('/webhooks/hook');
  });
});
