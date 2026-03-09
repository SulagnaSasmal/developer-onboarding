# Get Started with the Payments API

This guide takes you from zero to a confirmed sandbox API call in under 15 minutes. By the end, you have a working API integration and understand the request–response cycle well enough to build on it.

---

## Prerequisites

Before you begin, make sure you have:

- An internet connection and a terminal (macOS Terminal, Windows PowerShell, or Linux bash)
- One of the following runtimes installed:
  - **Python** 3.9 or later (`python --version` to confirm)
  - **Node.js** 16 or later (`node --version` to confirm)
  - **Java** 11 or later with Maven or Gradle
  - **cURL** — available by default on macOS and Linux; install on Windows via [curl.se](https://curl.se)
- A PaymentsAPI account — if you don't have one, see [Create an account](#step-1-create-your-account)

---

## Step 1: Create your account

1. Go to [dashboard.paymentsapi.dev](https://dashboard.paymentsapi.dev) and select **Create Account**.
2. Verify your email address.
3. Complete the business profile form. Sandbox access is available immediately; live access requires KYB review.

---

## Step 2: Retrieve your sandbox API keys

1. Sign in to [dashboard.paymentsapi.dev](https://dashboard.paymentsapi.dev).
2. In the left navigation, select **Developers** → **API Keys**.
3. Copy your **test secret key** — it uses the prefix `sk_test_`.

> **Important:** Your secret key grants full API access. Never include it in client-side code, version control, or application logs. If it is exposed, rotate it immediately from the dashboard.

Store the key in an environment variable:

```bash
# macOS / Linux
export PAYMENTS_API_KEY="sk_test_YOUR_KEY_HERE"

# Windows PowerShell
$env:PAYMENTS_API_KEY = "sk_test_YOUR_KEY_HERE"
```

For persistent storage, add the export line to your shell profile (`.bashrc`, `.zshrc`) or use a `.env` file — and ensure `.env` is in `.gitignore`.

---

## Step 3: Make your first API call

The `/v1/accounts/me` endpoint returns the account details associated with your API key. Use it as a quick connectivity check.

### cURL

```bash
curl https://api.paymentsapi.dev/v1/accounts/me \
  -H "Authorization: Bearer $PAYMENTS_API_KEY"
```

### Python

```python
import os
import requests

api_key = os.environ["PAYMENTS_API_KEY"]

response = requests.get(
    "https://api.paymentsapi.dev/v1/accounts/me",
    headers={"Authorization": f"Bearer {api_key}"},
)
response.raise_for_status()
print(response.json())
```

### Node.js

```javascript
const apiKey = process.env.PAYMENTS_API_KEY;

const response = await fetch("https://api.paymentsapi.dev/v1/accounts/me", {
  headers: { Authorization: `Bearer ${apiKey}` },
});

if (!response.ok) {
  throw new Error(`API error: ${response.status}`);
}

const account = await response.json();
console.log(account);
```

---

## Step 4: Confirm the response

A successful response returns HTTP `200` and a JSON object. The fields most relevant during setup:

```json
{
  "id": "acct_01HX7K2V...",
  "mode": "test",
  "business_name": "Acme Corp",
  "status": "active",
  "capabilities": {
    "ach_transfers": "enabled",
    "wire_transfers": "pending_review",
    "rtp": "disabled"
  }
}
```

| Field | What to check |
|---|---|
| `mode` | Must be `"test"` for sandbox credentials. If it returns `"live"`, you are using production keys — stop and switch keys. |
| `status` | Must be `"active"`. A value of `"restricted"` means a required KYB document is missing. |
| `capabilities.ach_transfers` | Must be `"enabled"` before creating ACH transfers in sandbox. |

If you receive an error response, see [Common first-call errors](#common-first-call-errors) below.

---

## Common first-call errors

| HTTP status | Error code | Cause | Resolution |
|---|---|---|---|
| `401` | `authentication_required` | The `Authorization` header is missing or the key has been revoked. | Confirm the environment variable is set: `echo $PAYMENTS_API_KEY`. Retrieve a new key from the dashboard if needed. |
| `401` | `invalid_api_key` | The key value is malformed or you are using a live key against the sandbox endpoint. | Sandbox keys use the prefix `sk_test_`. Live keys use `sk_live_`. |
| `403` | `insufficient_permissions` | Your API key is a publishable key (`pk_test_`). | Use the secret key (`sk_test_`) for server-side calls. Publishable keys are for client-side tokenization only. |
| `429` | `rate_limit_exceeded` | More than 100 requests per minute from the same key. | Add retry logic with exponential backoff. Sandbox limits are the same as production. |

---

## Next steps

- [Authentication guide](authentication-guide.md) — Key types, environment variable patterns, key rotation procedures
- [Quickstart: Python](quickstart/python.md) — Create your first ACH transfer in Python
- [Quickstart: Node.js](quickstart/nodejs.md) — Create your first ACH transfer in Node.js
- [Webhook catalog](webhook-catalog.md) — Event types, payload schemas, and HMAC-SHA256 verification

---

*This document follows Microsoft Writing Style Guide conventions.*
