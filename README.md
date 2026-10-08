# Arnipay JavaScript/TypeScript SDK

JavaScript/TypeScript library with full TypeScript support for Node.js (and browser use where applicable). Create payment links, manage transactions, and verify webhooks.

**Full API documentation:** [arnipay/gateway-documentation](https://github.com/arnipay/gateway-documentation) ([Español](https://github.com/arnipay/gateway-documentation/blob/main/es/README.md))

- [Payment Links API](https://github.com/arnipay/gateway-documentation/blob/main/payment-links.md)
- [Code examples](https://github.com/arnipay/gateway-documentation/blob/main/payment-links-examples.md)

## Installation

```bash
npm install gw-sdk
```

Repository: [github.com/arnipay/sdk-js](https://github.com/arnipay/sdk-js)

## Quick Start

```typescript
import { Arnipay, GatewayError } from 'gw-sdk';

// Third argument `true` uses https://sandbox.arnipay.com.py/api/v1
const arni = new Arnipay('CLIENT_ID', 'PRIVATE_KEY', true);

// Local / custom API:
// arni.getClient().setBaseUrl('http://arnipay.local/api/v1', false);

try {
  const url = await arni.payment()
    .title('Pizza Order')
    .amount(50000)
    .reference('ORDER-123')
    .description('Two large pizzas')
    .redirect('https://site.com/thanks', 'https://site.com/oops')
    .createUrl();

  console.log('Pay here:', url);

  const methods = await arni.getPaymentMethods();
  // [{ code: 'qr', name: 'Código QR' }, ...]
} catch (error) {
  if (error instanceof GatewayError) {
    console.error(error.message, error.statusCode, error.errors);
  }
}
```

Omit payment methods so the link offers whatever is enabled for your commerce (including newly added ones). You can use `.allow(['qr', 'card'])` when you need to restrict methods for a specific link.

### Webhooks (Express)

```typescript
import express from 'express';
import { Arnipay, GatewayError } from 'gw-sdk';

const arni = new Arnipay('CLIENT_ID', 'PRIVATE_KEY');
const app = express();

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    await arni.webhook('WEBHOOK_SECRET').handle(req, (event) => {
      if (event.isPaid()) {
        // payment.completed only. A refund is payment.refunded or payment.refund_pending.
        // event.get('reference') — same reference you set on create
        console.log('Paid:', event.get('payment_id'), event.get('amount'));
      }

      if (event.getType() === 'payment.refunded') {
        // event.get('status') is "refunded" or "auto_refunded"
      }
    });
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(error instanceof GatewayError ? error.statusCode || 400 : 400);
  }
});
```

For webhook configuration, payloads, and retries, see [Webhook notifications](https://github.com/arnipay/gateway-documentation/blob/main/payment-links.md#webhook-notifications) in the API docs.

### Transactions

```typescript
const txs = await arni.transaction().list({ link_payment_id: linkId });
const tx = await arni.transaction().get('transaction-uuid');
await arni.transaction().reverse('transaction-uuid', 'Customer requested refund');
```

### Payment links (service API)

```typescript
import { Client, PaymentLink } from 'gw-sdk';

const client = new Client('CLIENT_ID', 'PRIVATE_KEY');
const paymentLink = new PaymentLink(client);

const link = await paymentLink.create(150000, 'Premium Subscription', 'desc', {
  reference: 'SUB-2026'
  // Optional: payment_methods: ['qr', 'tigo'] to restrict methods for this link
});

await paymentLink.get(link.id);
await paymentLink.list();
await paymentLink.reverse(link.id, 'Out of stock');
```

## Authentication

All API endpoints use signature-based authentication with your Commerce credentials:

- `X-Client-ID`: Your Commerce client ID (UUID)
- `X-Timestamp`: Current Unix timestamp in seconds (UTC)
- `X-Signature`: HMAC-SHA256 signature using your private key

Requests expire **15 minutes** after `X-Timestamp`.

The same canonical string is used for API requests and webhooks.

**Canonical components:**

1. Uppercased HTTP method (e.g. `GET`, `POST`)
2. Request URI (path + query only; no scheme/host)
3. Unix timestamp (same as `X-Timestamp`)
4. Stable identifier (same as `X-Client-ID`)
5. Base64-encoded SHA-256 of the raw body: `base64(sha256(raw_body))`. For requests without a body use `base64(sha256(""))`

Join the components with newlines (`"\n"`) and compute the signature:

```
canonical = join("\n", [METHOD, URI, TIMESTAMP, CLIENT_ID, base64(sha256(RAW_BODY))])
signature = HMAC-SHA256(canonical, PRIVATE_KEY)
```

Send JSON bodies as the exact raw bytes you sign (no extra escaping). The SDK signs the serialized request body it sends.

You can find your client ID and private key in your Commerce settings, or regenerate them if needed.

## API base URL

| Environment | Base URL |
|-------------|----------|
| Production | `https://arnipay.com.py/api/v1/` |
| Sandbox | `https://sandbox.arnipay.com.py/api/v1/` |

Pass `true` as the third `Arnipay` argument to use the sandbox. Paths are the same in both environments.

## Webhooks

The gateway can send real-time notifications when payment events occur. Configure your webhook URL in Commerce settings.

Webhook requests use the same canonical string and headers as API requests, plus `X-Webhook-ID`.

- Real-time notifications (completed, failed, pending)
- HMAC-SHA256 verification using the canonical string
- Configurable retries
- Detailed event payloads

See [Webhook configuration](https://github.com/arnipay/gateway-documentation/blob/main/payment-links.md#webhook-notifications) and [webhook examples](https://github.com/arnipay/gateway-documentation/blob/main/payment-links-examples.md#webhook-examples) in the API documentation.

## Rate limiting

- 60 requests per minute per client
- 1000 requests per day per client

Exceeding limits returns `429 Too Many Requests`.

## Error handling

```typescript
import { GatewayError } from 'gw-sdk';

try {
  await arni.payment().title('x').amount(1).create();
} catch (error) {
  if (error instanceof GatewayError) {
    console.error(error.message, error.statusCode, error.errors);
  }
}
```

## Other SDKs

- **PHP:** [github.com/arnipay/sdk-php](https://github.com/arnipay/sdk-php)

## Support

If you have any questions or need assistance integrating with our API, see [gateway-documentation](https://github.com/arnipay/gateway-documentation) or contact our support team at [info@arnipay.com.py](mailto:info@arnipay.com.py).

## Running tests

```bash
cp .env.example tests/.env
# fill CLIENT_ID, PRIVATE_KEY, API_BASE_URL, WEBHOOK_SECRET

npm test
```

- Unit tests always run
- Integration tests hit `API_BASE_URL` (e.g. `https://sandbox.arnipay.com.py/api/v1`) and skip if credentials are missing
