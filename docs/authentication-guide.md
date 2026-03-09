# Authenticate Your Integration

The Payments API uses API key authentication. Every request must include a secret key in the `Authorization` header. This guide covers key types, secure storage patterns, request signing, and key rotation.

---

## API key types

The Payments API issues two types of keys, each with a distinct scope:

| Key type | Prefix | Scope | Where to use |
|---|---|---|---|
| Secret key | `sk_test_` / `sk_live_` | Full API access — create transfers, manage accounts, retrieve all data | Server-side only. Never in browser code, mobile apps, or version control. |
| Publishable key | `pk_test_` / `pk_live_` | Read-only client-side operations — tokenize bank account data before submission | Safe for client-side code. Cannot create transfers or read sensitive account data. |

Use the `sk_test_` prefix for sandbox and the `sk_live_` prefix for production. The API endpoint is `api.paymentsapi.dev` in both environments — the key controls which mode applies.

> **Warning:** A leaked `sk_live_` key is a critical incident. Anyone with this key can create and cancel transfers on your account. Rotate it immediately if it is exposed in public repositories, CI logs, or error tracking systems.

---

## Retrieve your API keys

1. Sign in to [dashboard.paymentsapi.dev](https://dashboard.paymentsapi.dev).
2. In the left navigation, select **Developers** → **API Keys**.
3. Copy the key value — it is shown only once when you create a new key. Store it immediately.

To generate an additional key, select **Create new key**, enter a label (for example, `ci-pipeline-staging`), and copy the resulting value.

---

## Add the Authorization header

Pass the secret key as a Bearer token in every request:

```
Authorization: Bearer sk_test_YOUR_KEY
```

### cURL

```bash
curl https://api.paymentsapi.dev/v1/transfers \
  -H "Authorization: Bearer $PAYMENTS_API_KEY" \
  -H "Content-Type: application/json"
```

### Python

```python
import os
import requests

SESSION = requests.Session()
SESSION.headers.update({"Authorization": f"Bearer {os.environ['PAYMENTS_API_KEY']}"})

# All requests through SESSION include the Authorization header automatically.
response = SESSION.get("https://api.paymentsapi.dev/v1/transfers")
```

Using a `Session` object applies the header to every call — you do not repeat it per request.

### Node.js

```javascript
// auth.js — import this module wherever you need an authenticated client
const BASE = "https://api.paymentsapi.dev";
const headers = {
  Authorization: `Bearer ${process.env.PAYMENTS_API_KEY}`,
  "Content-Type": "application/json",
};

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${response.status}: ${error.message}`);
  }
  return response.json();
}
```

### Java

```java
// Build a reusable HttpClient that sets the Authorization header on every request.
String apiKey = System.getenv("PAYMENTS_API_KEY");
HttpClient client = HttpClient.newHttpClient();

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.paymentsapi.dev/v1/transfers"))
    .header("Authorization", "Bearer " + apiKey)
    .header("Content-Type", "application/json")
    .GET()
    .build();
```

### C#

```csharp
using System.Net.Http.Headers;

var client = new HttpClient();
client.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", Environment.GetEnvironmentVariable("PAYMENTS_API_KEY"));
```

Setting `DefaultRequestHeaders.Authorization` once on the `HttpClient` instance applies the header to all requests from that client.

---

## Store keys securely

### Environment variables

The recommended pattern is to store API keys as environment variables — never as string literals in source code.

```bash
# macOS / Linux — add to ~/.bashrc or ~/.zshrc for persistence
export PAYMENTS_API_KEY="sk_test_YOUR_KEY"

# Windows PowerShell — add to $PROFILE for persistence
$env:PAYMENTS_API_KEY = "sk_test_YOUR_KEY"
```

### .env files

For local development, use a `.env` file with a library such as `python-dotenv` or `dotenv` for Node.js:

```
# .env — local only, never commit this file
PAYMENTS_API_KEY=sk_test_YOUR_KEY
```

**Always** add `.env` to `.gitignore` before your first commit:

```
# .gitignore
.env
.env.local
.env.*.local
```

### CI/CD pipelines

Use your CI platform's secret management to inject API keys at build time:

| Platform | Where to configure |
|---|---|
| GitHub Actions | Repository → Settings → Secrets and variables → Actions |
| GitLab CI | Settings → CI/CD → Variables |
| CircleCI | Project → Project Settings → Environment Variables |

Reference the secret in your pipeline configuration:

```yaml
# GitHub Actions example
env:
  PAYMENTS_API_KEY: ${{ secrets.PAYMENTS_API_KEY }}
```

---

## Rotate API keys

Rotate keys in these situations:

- A key is exposed in a public repository, CI log, or error tracking system
- A team member with key access leaves the organization
- Your security policy requires periodic rotation

**To rotate:**

1. In the dashboard, select **Developers** → **API Keys**.
2. Select **Create new key** and copy the new key value.
3. Update the environment variable or secret store with the new value.
4. Deploy the updated configuration.
5. Confirm that requests succeed with the new key.
6. Select **Revoke** next to the old key.

Update the old key last — only after you confirm the new key works. Revoking the old key before deploying the new one causes a service interruption.

---

## Identify sandbox versus live traffic

Requests made with `sk_test_` keys do not move real money. To confirm which mode a response came from, check the `mode` field on the returned object:

```json
{
  "id": "tr_01HX7K2V...",
  "mode": "test",
  ...
}
```

The API returns `"test"` for sandbox and `"live"` for production. If you receive unexpected `"live"` responses while developing, you are using production keys — switch to `sk_test_` keys immediately.

---

## Authentication errors

| HTTP status | Error code | Cause | Resolution |
|---|---|---|---|
| `401` | `authentication_required` | No `Authorization` header was included. | Add `Authorization: Bearer YOUR_KEY` to the request. |
| `401` | `invalid_api_key` | The key value is malformed, expired, or revoked. | Retrieve a new key from the dashboard. |
| `401` | `wrong_environment` | A live key was used against a sandbox endpoint, or vice versa. | The API endpoint is the same for both environments — the key prefix (`sk_test_` vs `sk_live_`) determines the environment. Confirm you are using the correct key. |
| `403` | `insufficient_permissions` | A publishable key (`pk_test_`) was used for a server-side operation. | Publishable keys cannot create transfers or read sensitive data. Use the secret key (`sk_test_`) for server-side calls. |

---

## Next steps

- [Quickstart: Python](quickstart/python.md) — Your first ACH transfer, end to end
- [Quickstart: Node.js](quickstart/nodejs.md) — Your first ACH transfer in Node.js
- [Webhook catalog](webhook-catalog.md) — Secure webhook delivery with HMAC-SHA256 verification

---

*This document follows Microsoft Writing Style Guide conventions.*
