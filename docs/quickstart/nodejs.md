# Quickstart: Node.js

Create an ACH bank transfer using the Payments API and the native `fetch` function available in Node.js 18+. This quickstart runs end to end in about 10 minutes.

**What you build:** A Node.js script that authenticates, creates an ACH debit transfer, and polls for completion.

---

## Prerequisites

- Node.js 18 or later (for built-in `fetch`)
- A PaymentsAPI sandbox account and a test secret key (`sk_test_...`)
- [Getting started](../getting-started.md) completed — your key is in a `PAYMENTS_API_KEY` environment variable

If you are on Node.js 16 or 17, install `node-fetch` and import it at the top of the file: `import fetch from "node-fetch";`

---

## Create the transfer

Save the following as `create-transfer.mjs` (the `.mjs` extension enables ES module syntax):

```javascript
// create-transfer.mjs
const BASE = "https://api.paymentsapi.dev/v1";
const API_KEY = process.env.PAYMENTS_API_KEY;

if (!API_KEY) {
  console.error("Error: PAYMENTS_API_KEY environment variable is not set.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

/**
 * Creates a sandbox ACH debit transfer.
 * @param {number} amountCents - Transfer amount in cents (e.g. 5000 = $50.00)
 * @param {string} description - Human-readable label for this transfer
 * @returns {Promise<object>} The created transfer object
 */
async function createAchTransfer(amountCents, description) {
  const response = await fetch(`${BASE}/transfers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      amount: amountCents,
      currency: "usd",
      payment_method: "ach",
      direction: "debit",
      description,
      source: {
        // Use the test account token from your sandbox dashboard.
        bank_account: "ba_test_sandbox_checking",
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`${response.status} ${err.code}: ${err.message}`);
  }

  return response.json();
}

/**
 * Polls a transfer until it reaches a terminal state.
 * @param {string} transferId
 * @param {number} timeoutMs - Maximum wait time in milliseconds
 * @returns {Promise<object>} The settled transfer object
 */
async function pollUntilSettled(transferId, timeoutMs = 120_000) {
  const terminalStates = new Set(["completed", "failed", "cancelled", "returned"]);
  const deadline = Date.now() + timeoutMs;
  const intervalMs = 5_000;

  while (Date.now() < deadline) {
    const response = await fetch(`${BASE}/transfers/${transferId}`, { headers });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`${response.status} ${err.code}: ${err.message}`);
    }

    const transfer = await response.json();
    console.log(`  Status: ${transfer.status}`);

    if (terminalStates.has(transfer.status)) {
      return transfer;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Transfer ${transferId} did not settle within ${timeoutMs}ms`);
}

// --- Main ---
console.log("Creating ACH transfer...");
const transfer = await createAchTransfer(5000, "Test transfer — Node.js quickstart");

console.log(`Transfer created: ${transfer.id}`);
console.log(`Initial status:   ${transfer.status}`);

console.log("\nPolling for completion (sandbox settles within 30s)...");
const settled = await pollUntilSettled(transfer.id);

if (settled.status === "completed") {
  console.log(`\n✓ Transfer completed. Amount: $${(settled.amount / 100).toFixed(2)}`);
} else {
  const { code, message } = settled.failure ?? {};
  console.error(`\n✗ Transfer ${settled.status}: ${code} — ${message}`);
  process.exit(1);
}
```

---

## Run the script

```bash
node create-transfer.mjs
```

Expected output:

```
Creating ACH transfer...
Transfer created: tr_01HX7K2V3P...
Initial status:   pending

Polling for completion (sandbox settles within 30s)...
  Status: processing
  Status: processing
  Status: completed

✓ Transfer completed. Amount: $50.00
```

In sandbox, ACH transfers settle within 30 seconds rather than the one-to-two business days of production.

---

## Use with Express (receiving webhooks)

Instead of polling, configure a webhook endpoint to receive `payment.completed` events. See the full example in the [webhook catalog](../webhook-catalog.md#nodejs).

```javascript
// server.mjs — minimal Express webhook receiver
import express from "express";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.PAYMENTS_WEBHOOK_SECRET;
const app = express();

app.post(
  "/webhooks/payments",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["payments-signature"];
    const ts = req.headers["payments-timestamp"];
    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(`${ts}.${req.body}`)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(req.body);
    console.log(`Received: ${event.type}`, event.data.object.id);
    res.sendStatus(200);
  }
);

app.listen(3000, () => console.log("Listening on :3000"));
```

---

## Handle errors

Throw on non-`2xx` responses and catch at the call site:

```javascript
try {
  const transfer = await createAchTransfer(5000, "Test");
} catch (error) {
  // error.message contains "status code: message"
  console.error("Transfer creation failed:", error.message);
  process.exit(1);
}
```

---

## Next steps

- [Webhook catalog](../webhook-catalog.md) — Receive events instead of polling
- [Authentication guide](../authentication-guide.md) — Key rotation and secure storage
- [Quickstart: Python](python.md) — The same transfer flow in Python
- [Quickstart: Java](java.md) — Java 11+ HttpClient example

---

*This document follows Microsoft Writing Style Guide conventions.*
