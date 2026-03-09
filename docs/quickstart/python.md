# Quickstart: Python

Create an ACH bank transfer using the Payments API and the `requests` library. This quickstart runs end to end in about 10 minutes.

**What you build:** A Python script that authenticates, creates an ACH debit transfer, and polls for completion.

---

## Prerequisites

- Python 3.9 or later
- `requests` library (`pip install requests`)
- A PaymentsAPI sandbox account and a test secret key (`sk_test_...`)
- [Getting started](../getting-started.md) completed — your key is in a `PAYMENTS_API_KEY` environment variable

---

## Install the dependency

```bash
pip install requests
```

No official SDK is required — the Payments API is a plain REST API over HTTPS.

---

## Create the transfer

Save the following as `create_transfer.py`:

```python
import os
import time
import requests

BASE_URL = "https://api.paymentsapi.dev/v1"
API_KEY = os.environ["PAYMENTS_API_KEY"]

session = requests.Session()
session.headers.update({
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
})


def create_ach_transfer(amount_cents: int, description: str) -> dict:
    """Create a sandbox ACH debit transfer and return the transfer object."""
    payload = {
        "amount": amount_cents,
        "currency": "usd",
        "payment_method": "ach",
        "direction": "debit",
        "description": description,
        "source": {
            # Use the test account token provided in your sandbox dashboard.
            "bank_account": "ba_test_sandbox_checking",
        },
    }
    response = session.post(f"{BASE_URL}/transfers", json=payload)
    response.raise_for_status()
    return response.json()


def poll_until_settled(transfer_id: str, timeout_seconds: int = 120) -> dict:
    """Poll the transfer until it reaches a terminal state or the timeout expires."""
    terminal_states = {"completed", "failed", "cancelled", "returned"}
    deadline = time.time() + timeout_seconds

    while time.time() < deadline:
        response = session.get(f"{BASE_URL}/transfers/{transfer_id}")
        response.raise_for_status()
        transfer = response.json()

        status = transfer["status"]
        print(f"  Status: {status}")

        if status in terminal_states:
            return transfer

        time.sleep(5)

    raise TimeoutError(f"Transfer {transfer_id} did not settle within {timeout_seconds}s")


if __name__ == "__main__":
    print("Creating ACH transfer...")
    transfer = create_ach_transfer(
        amount_cents=5000,      # $50.00
        description="Test transfer — Python quickstart",
    )

    transfer_id = transfer["id"]
    print(f"Transfer created: {transfer_id}")
    print(f"Initial status:   {transfer['status']}")

    print("\nPolling for completion (sandbox settles within 30s)...")
    settled = poll_until_settled(transfer_id)

    if settled["status"] == "completed":
        print(f"\n✓ Transfer completed. Amount: ${settled['amount'] / 100:.2f}")
    else:
        failure = settled.get("failure", {})
        print(f"\n✗ Transfer {settled['status']}: {failure.get('code')} — {failure.get('message')}")
```

---

## Run the script

```bash
python create_transfer.py
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

## Handle errors

The `raise_for_status()` call raises `requests.exceptions.HTTPError` for `4xx` and `5xx` responses. Add explicit error handling for production code:

```python
try:
    transfer = create_ach_transfer(5000, "Test")
except requests.exceptions.HTTPError as e:
    error_body = e.response.json()
    print(f"API error {e.response.status_code}: {error_body['code']} — {error_body['message']}")
    raise
```

Common errors when creating transfers:

| Status | Code | Cause |
|---|---|---|
| `400` | `invalid_amount` | Amount is zero, negative, or exceeds the account limit. |
| `400` | `invalid_bank_account` | The bank account token is invalid or not verified. |
| `402` | `insufficient_funds` | The source account has insufficient balance. |
| `403` | `live_mode_required` | Attempting to use a test bank account token in live mode. |

---

## Next steps

- [Webhook catalog](../webhook-catalog.md) — Receive `payment.completed` events instead of polling
- [Authentication guide](../authentication-guide.md) — Key rotation and environment variable patterns
- [Quickstart: Node.js](nodejs.md) — The same transfer flow in JavaScript

---

*This document follows Microsoft Writing Style Guide conventions.*
