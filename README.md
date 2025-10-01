# Payment Gateway JavaScript/TypeScript SDK

This SDK provides a simple and easy-to-use interface for integrating with our payment processing system using JavaScript or TypeScript.

You can find the full API documentation [here](https://docs.yourdomain.com/api).

## Installation

```bash
npm install gw-sdk
# or
yarn add gw-sdk
```

## Usage

### Initialization

```typescript
import { Client, PaymentLink, Webhook } from 'gw-sdk';

// Initialize the client
const client = new Client(
  'your-client-id',
  'your-private-key',
  'https://yourdomain.com/api/v1'
);
```

### Creating a Payment Link

```typescript
const paymentLink = new PaymentLink(client);

try {
  const link = await paymentLink.create(
    150000, // price
    'Premium Subscription', // title
    '1 year access to all premium content', // description
    {
      payment_methods: ['qr', 'tigo'],
      reference: `SUB-${new Date().getFullYear()}`,
      approved_redirection_url: 'https://example.com/success',
      failed_redirection_url: 'https://example.com/failed'
    }
  );
  
  console.log(`Payment link created with ID: ${link.id}`);
  console.log(`Payment URL: ${link.url}`);
} catch (error) {
  if (error instanceof GatewayError) {
    console.error(`Error: ${error.message}`);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
  } else {
    console.error(`Unexpected error: ${error}`);
  }
}
```

### Getting a Specific Payment Link

```typescript
const paymentLink = new PaymentLink(client);

try {
  const link = await paymentLink.get('payment-link-uuid');
  
  console.log('Payment link details:');
  console.log(`Title: ${link.title}`);
  console.log(`Price: ${link.price}`);
  console.log(`Is Paid: ${link.is_paid ? 'Yes' : 'No'}`);
} catch (error) {
  console.error(`Error: ${error.message}`);
}
```

### Listing All Payment Links

```typescript
const paymentLink = new PaymentLink(client);

try {
  const links = await paymentLink.list();
  
  console.log('Payment links:');
  links.forEach(link => {
    console.log(`- ${link.title} (${link.id}): ${link.price}`);
    console.log(`  Created: ${link.created_at}`);
    console.log(`  Status: ${link.is_paid ? 'Paid' : 'Not paid'}`);
  });
} catch (error) {
  console.error(`Error: ${error.message}`);
}
```

### Handling Webhooks

```typescript
import express from 'express';
import { Webhook, WebhookEvent } from 'gw-sdk';

const app = express();
const webhook = new Webhook('your-webhook-secret');

// Use express.raw to get the raw request body for signature verification
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const headers = req.headers;
  const rawBody = req.body.toString('utf8');
  const event = webhook.processEvent(rawBody, headers, {
    path: req.originalUrl,
    method: req.method
  });
  
  if (!event) {
    return res.status(403).json({ error: 'Invalid webhook' });
  }
  
  // Process based on event type
  switch (event.event) {
    case 'payment.completed':
      // Handle successful payment
      const { link_id, payment_id, amount } = event.data;
      console.log(`Payment ${payment_id} for link ${link_id} completed: ${amount}`);
      
      // Update your database or take appropriate action
      break;
      
    case 'payment.failed':
      // Handle failed payment
      console.log(`Payment for link ${event.data.link_id} failed`);
      break;
      
    case 'payment.pending':
      // Handle pending payment
      console.log(`Payment for link ${event.data.link_id} is pending`);
      break;
  }
  
  // Send a success response
  return res.status(200).json({ status: 'success' });
});

app.listen(3000, () => {
  console.log('Webhook handler listening on port 3000');
});
```

## Request Signing

All signed requests (client-initiated calls and incoming webhooks) share the same canonical representation:

1. HTTP method in upper case (e.g. `GET`, `POST`)
2. URI path + query string (no scheme/host)
3. Unix timestamp (seconds) matching `X-Timestamp`
4. Stable identifier from the `X-Client-ID` header
5. Base64-encoded SHA-256 hash of the raw request body (use the hash of an empty string for requests without body)

The signature is produced with `HMAC-SHA256` using your private key:

```typescript
const canonical = [
  method.toUpperCase(),
  "${path}${query}",
  timestamp,
  clientId,
  base64Sha256(body)
].join("\n");

const signature = crypto
  .createHmac('sha256', privateKey)
  .update(canonical, 'utf8')
  .digest('hex');
```

Include the following headers in every signed request:

- `X-Client-ID`: your stable identifier
- `X-Timestamp`: Unix timestamp in seconds (requests expire after 15 minutes)
- `X-Signature`: hex-encoded HMAC generated from the canonical string

### Client usage example

```typescript
const timestamp = Math.floor(Date.now() / 1000).toString();
const pathAndQuery = '/payment';
const rawBody = JSON.stringify(payload);
const bodyHash = crypto.createHash('sha256').update(rawBody, 'utf8').digest('base64');
const canonical = ['POST', pathAndQuery, timestamp, clientId, bodyHash].join('\n');

const signature = crypto
  .createHmac('sha256', privateKey)
  .update(canonical, 'utf8')
  .digest('hex');

await axios.post(`${baseUrl}${pathAndQuery}`, payload, {
  headers: {
    'X-Client-ID': clientId,
    'X-Timestamp': timestamp,
    'X-Signature': signature,
    'Content-Type': 'application/json'
  }
});
```

### Webhook validation example

```typescript
const headers = req.headers;
const rawBody = req.body.toString('utf8');

const canonical = [
  req.method.toUpperCase(),
  req.originalUrl,
  headers['x-timestamp'],
  headers['x-client-id'],
  crypto.createHash('sha256').update(rawBody, 'utf8').digest('base64')
].join('\n');

const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(canonical, 'utf8')
  .digest('hex');

if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(headers['x-signature'] as string))) {
  return res.status(403).json({ error: 'Invalid webhook' });
}
```

Remember to reject requests when `X-Timestamp` is older than 15 minutes, or when any required header is missing. Webhooks also include `X-Webhook-ID`, which you must echo in the canonical URI.

## Error Handling

The SDK throws `GatewayError` when an API error occurs. This error provides:

- Error message
- HTTP status code
- Validation errors (if available)

```typescript
import { GatewayError } from 'gw-sdk';

try {
  // SDK operation
} catch (error) {
  if (error instanceof GatewayError) {
    console.error(`API Error: ${error.message}`);
    console.error(`Status Code: ${error.statusCode}`);
    
    if (error.errors) {
      console.error('Validation Errors:');
      console.error(error.errors);
    }
  } else {
    console.error(`Unexpected error: ${error}`);
  }
}
```

## Running Tests

To run the test suite, you'll need to set up your environment variables first.

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and provide your credentials:
   ```
   CLIENT_ID=your-client-id
   PRIVATE_KEY=your-private-key
   API_BASE_URL=https://yourdomain.com/api/v1
   WEBHOOK_SECRET=your-webhook-secret
   ```

3. Run the tests:
   ```bash
   npm test
   # or
   yarn test
   ```

## TypeScript Support

This SDK is built with TypeScript and includes type definitions for all functions and objects.
