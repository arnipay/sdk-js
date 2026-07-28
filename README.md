# Arnipay JavaScript/TypeScript SDK

Simple SDK for [Arnipay](https://arnipay.com.py) — create payment links, manage transactions, and verify webhooks.

## Installation

```bash
npm install gw-sdk
```

## Quick Start

```typescript
import { Arnipay, GatewayError } from 'gw-sdk';

// Third argument `true` enables sandbox
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
    .allow(['qr', 'card'])
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
        // event.get('reference') — same reference you set on create
        console.log('Paid:', event.get('payment_id'), event.get('amount'));
      }
    });
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(error instanceof GatewayError ? error.statusCode || 400 : 400);
  }
});
```

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
  payment_methods: ['qr', 'tigo'],
  reference: 'SUB-2026'
});

await paymentLink.get(link.id);
await paymentLink.list();
await paymentLink.reverse(link.id, 'Out of stock');
```

## Request signing

All API calls and webhooks use the same HMAC-SHA256 canonical format:

1. HTTP method (upper case)
2. URI path + query (no scheme/host)
3. Unix timestamp (`X-Timestamp`)
4. Client ID (`X-Client-ID`)
5. Base64(SHA-256(raw body))

Headers: `X-Client-ID`, `X-Timestamp`, `X-Signature`

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

## Running tests

```bash
cp .env.example tests/.env
# fill CLIENT_ID, PRIVATE_KEY, API_BASE_URL, WEBHOOK_SECRET

npm test
```

- Unit tests always run
- Integration tests hit `API_BASE_URL` (e.g. `http://arnipay.local/api/v1`) and skip if credentials are missing
