# Webhook Event Catalog

The Payments API sends webhooks to notify your application when events occur asynchronously. This catalog covers every event type, its payload schema, the delivery and retry policy, and how to verify webhook signatures with HMAC-SHA256.

---

## Overview

When an event occurs — a transfer completes, a payment fails, or a return is received — the API sends an HTTP `POST` request to your configured webhook endpoint. Your endpoint must return a `2xx` status within **30 seconds** or the delivery is marked as failed and retried.

To configure a webhook endpoint:

1. Sign in to [dashboard.paymentsapi.dev](https://dashboard.paymentsapi.dev).
2. Select **Developers** → **Webhooks** → **Add endpoint**.
3. Enter your endpoint URL and select the events you want to receive.
4. Copy the **Signing secret** shown after saving — you need it to verify signatures.

---

## Webhook event structure

Every webhook delivery has the same outer envelope:

```json
{
  "id": "evt_01HX9M3P2W...",
  "type": "payment.completed",
  "created": "2026-03-08T14:22:10Z",
  "livemode": false,
  "api_version": "2024-11-01",
  "data": {
    "object": { ... }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique event identifier. Events are idempotent — the same event is never delivered twice under the same `id`. |
| `type` | string | Event type in `resource.action` format. See [Event types](#event-types) below. |
| `created` | string (ISO 8601) | Timestamp of when the event was created, in UTC. |
| `livemode` | boolean | `true` for production events; `false` for sandbox events. |
| `api_version` | string | The API version used to serialize the event payload. |
| `data.object` | object | The resource that triggered the event. The schema varies by event type. |

---

## Event types

### Payment events

#### `payment.created`

A payment has been initiated but not yet submitted to the payment network.

```json
{
  "id": "evt_01HX9M3P2W...",
  "type": "payment.created",
  "data": {
    "object": {
      "id": "pay_01HX7K2V...",
      "mode": "test",
      "amount": 150000,
      "currency": "usd",
      "status": "pending",
      "payment_method": "ach",
      "description": "Invoice #1042",
      "created_at": "2026-03-08T14:22:10Z",
      "source_account": "ba_01HX7K2V...",
      "destination_account": "ba_01HX7K2W..."
    }
  }
}
```

> **Note:** `amount` is in the smallest currency unit — cents for USD. A value of `150000` represents $1,500.00.

#### `payment.processing`

The payment has been submitted to the payment network and is awaiting settlement. For ACH transfers, this status typically persists for one to two business days.

```json
{
  "id": "evt_01HX9M3P3Q...",
  "type": "payment.processing",
  "data": {
    "object": {
      "id": "pay_01HX7K2V...",
      "status": "processing",
      "network_trace_id": "20260308PAYMENTSAPI00012345",
      "estimated_settlement": "2026-03-10"
    }
  }
}
```

#### `payment.completed`

The payment settled successfully. Funds have moved.

```json
{
  "id": "evt_01HX9M3P4R...",
  "type": "payment.completed",
  "data": {
    "object": {
      "id": "pay_01HX7K2V...",
      "status": "completed",
      "settled_at": "2026-03-10T09:00:00Z",
      "network_trace_id": "20260308PAYMENTSAPI00012345"
    }
  }
}
```

#### `payment.failed`

The payment could not be completed. The `failure` object contains the reason.

```json
{
  "id": "evt_01HX9M3P5S...",
  "type": "payment.failed",
  "data": {
    "object": {
      "id": "pay_01HX7K2V...",
      "status": "failed",
      "failure": {
        "code": "insufficient_funds",
        "message": "The source account has insufficient funds to complete this transfer.",
        "network_return_code": "R01"
      }
    }
  }
}
```

Common `failure.code` values:

| Code | Meaning | What to do |
|---|---|---|
| `insufficient_funds` | Source account balance is too low. | Notify the payer and request an updated payment method. |
| `account_closed` | The destination account has been closed. | Contact the recipient; do not retry without an updated account number. |
| `invalid_account_number` | The account number is invalid or formatted incorrectly. | Validate the account number before retrying. |
| `payment_stopped` | A stop payment was placed by the account holder. | Do not retry — contact the account holder. |

#### `payment.cancelled`

A payment was cancelled before it reached the processing state.

---

### Return events

#### `payment.returned`

An ACH transfer was returned by the receiving financial institution.

```json
{
  "id": "evt_01HX9M3Q1T...",
  "type": "payment.returned",
  "data": {
    "object": {
      "id": "pay_01HX7K2V...",
      "status": "returned",
      "return_code": "R03",
      "return_reason": "No account/unable to locate account",
      "returned_at": "2026-03-12T06:00:00Z",
      "original_amount": 150000,
      "original_trace_id": "20260308PAYMENTSAPI00012345"
    }
  }
}
```

NACHA return codes included in `return_code`: R01 through R85. The most common:

| Code | Meaning |
|---|---|
| `R01` | Insufficient funds |
| `R02` | Account closed |
| `R03` | No account / unable to locate account |
| `R04` | Invalid account number |
| `R10` | Customer advises not authorized |
| `R29` | Corporate customer advises not authorized |

---

### Account events

#### `account.verified`

A bank account has passed micro-deposit or instant verification and is ready for use.

#### `account.verification_failed`

Bank account verification failed. The `failure.code` field indicates the reason.

---

## Delivery and retry policy

The API attempts delivery to your endpoint and expects a `2xx` HTTP response within **30 seconds**. Non-`2xx` responses and connection errors are treated as failures.

**Retry schedule** (for failed deliveries):

| Attempt | Time after previous failure |
|---|---|
| 1 (initial) | Immediate |
| 2 | 5 minutes |
| 3 | 30 minutes |
| 4 | 2 hours |
| 5 | 8 hours |
| 6 (final) | 24 hours |

After six failed attempts, the event is marked as failed and is no longer retried. You can manually replay failed events from **Developers** → **Webhooks** → **Events** in the dashboard.

> **Tip:** Return `200 OK` immediately, then process the event asynchronously — for example, by placing it on an internal queue. Do not do long-running work inside the request handler. A slow response is treated the same as a failed one if it exceeds 30 seconds.

---

## Verify webhook signatures

Every delivery includes two headers that you use to verify the payload came from the Payments API:

| Header | Value |
|---|---|
| `Payments-Signature` | HMAC-SHA256 hex digest of the raw request body, signed with your endpoint's signing secret |
| `Payments-Timestamp` | Unix timestamp (seconds) of when the signature was generated |

### Verification algorithm

1. Concatenate the timestamp and the raw request body: `{timestamp}.{raw_body}`
2. Compute HMAC-SHA256 of that string using your signing secret as the key.
3. Compare the result to the value in `Payments-Signature`.
4. Reject the request if the computed digest does not match, or if the timestamp is more than **300 seconds** (5 minutes) older than the current time.

**Always verify against the raw request body** — parse the JSON only after verification. Parsing first and re-serializing changes whitespace and may invalidate the signature.

### Python

```python
import hashlib
import hmac
import time
from flask import Flask, request, abort

app = Flask(__name__)
WEBHOOK_SECRET = os.environ["PAYMENTS_WEBHOOK_SECRET"]

@app.route("/webhooks/payments", methods=["POST"])
def handle_webhook():
    signature = request.headers.get("Payments-Signature", "")
    timestamp = request.headers.get("Payments-Timestamp", "")
    raw_body = request.get_data()  # raw bytes — do not parse yet

    # Reject stale deliveries (replay protection)
    if abs(time.time() - int(timestamp)) > 300:
        abort(400, "Webhook timestamp too old")

    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        f"{timestamp}.".encode() + raw_body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        abort(400, "Signature verification failed")

    event = request.get_json()
    # Process event here or enqueue for async processing
    return "", 200
```

### Node.js

```javascript
import crypto from "crypto";
import express from "express";

const WEBHOOK_SECRET = process.env.PAYMENTS_WEBHOOK_SECRET;
const app = express();

// Use express.raw() — not express.json() — to preserve the raw body for verification.
app.post("/webhooks/payments", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["payments-signature"];
  const timestamp = req.headers["payments-timestamp"];

  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return res.status(400).send("Timestamp too old");
  }

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${req.body}`)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return res.status(400).send("Signature verification failed");
  }

  const event = JSON.parse(req.body);
  // Enqueue event for async processing
  res.sendStatus(200);
});
```

> **Important:** Use `crypto.timingSafeEqual` (Node.js) or `hmac.compare_digest` (Python) for the comparison — not `===`. String equality checks are vulnerable to timing attacks.

---

## Test webhook delivery in sandbox

The dashboard includes a **Send test event** button for each endpoint. Use it to deliver a sample payload without creating a real payment. You can also use the Webhook Tester tool at **Developers** → **Webhooks** → **Tester** to select any event type and inspect the full request and response.

---

## Next steps

- [Getting started](../getting-started.md) — Make your first API call
- [Authentication guide](../authentication-guide.md) — Key types and secure storage
- [Quickstart: Python](../quickstart/python.md) — Full ACH transfer walkthrough

---

*This document follows Microsoft Writing Style Guide conventions.*
