import crypto from 'crypto';

/**
 * Shared HMAC-SHA256 signing used by API requests and webhooks.
 */
export class SignatureService {
  public generate(
    method: string,
    uri: string,
    timestamp: number,
    identifier: string,
    secret: string,
    body: string = ''
  ): string {
    const canonical = this.buildCanonicalString(method, uri, timestamp, identifier, body);
    return crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
  }

  public buildCanonicalString(
    method: string,
    uri: string,
    timestamp: number,
    identifier: string,
    body: string = ''
  ): string {
    const bodyHash = crypto.createHash('sha256').update(body, 'utf8').digest('base64');

    return [method.toUpperCase(), uri, String(timestamp), identifier, bodyHash].join('\n');
  }

  public extractUri(url: string): string {
    try {
      if (/^[a-z][a-z\d+\-.]*:\/\//i.test(url)) {
        const parsed = new URL(url);
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // fall through
    }

    if (!url) {
      return '/';
    }

    const queryIndex = url.indexOf('?');
    if (queryIndex === -1) {
      return url.startsWith('/') ? url : `/${url}`;
    }

    const pathPart = url.slice(0, queryIndex) || '/';
    const query = url.slice(queryIndex);
    const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
    return `${path}${query}`;
  }
}
