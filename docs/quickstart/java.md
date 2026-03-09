# Quickstart: Java

Create an ACH bank transfer using the Payments API and the `java.net.http` package available in Java 11+. This quickstart uses no third-party dependencies beyond Jackson for JSON serialization.

---

## Prerequisites

- Java 11 or later (`java --version` to confirm)
- Maven 3.6+ or Gradle 7+
- A PaymentsAPI sandbox account and a test secret key (`sk_test_...`)
- [Getting started](../getting-started.md) completed — your key is in a `PAYMENTS_API_KEY` environment variable

---

## Add the Jackson dependency

**Maven (`pom.xml`):**

```xml
<dependency>
  <groupId>com.fasterxml.jackson.core</groupId>
  <artifactId>jackson-databind</artifactId>
  <version>2.17.0</version>
</dependency>
```

**Gradle (`build.gradle`):**

```groovy
implementation 'com.fasterxml.jackson.core:jackson-databind:2.17.0'
```

---

## Create the transfer

Save the following as `CreateTransfer.java`:

```java
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;

public class CreateTransfer {

    private static final String BASE_URL = "https://api.paymentsapi.dev/v1";
    private static final String API_KEY = System.getenv("PAYMENTS_API_KEY");
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public static void main(String[] args) throws Exception {
        if (API_KEY == null || API_KEY.isBlank()) {
            System.err.println("Error: PAYMENTS_API_KEY environment variable is not set.");
            System.exit(1);
        }

        System.out.println("Creating ACH transfer...");
        JsonNode transfer = createAchTransfer(5000, "Test transfer — Java quickstart");

        String transferId = transfer.get("id").asText();
        System.out.println("Transfer created: " + transferId);
        System.out.println("Initial status:   " + transfer.get("status").asText());

        System.out.println("\nPolling for completion (sandbox settles within 30s)...");
        JsonNode settled = pollUntilSettled(transferId, 120);

        String finalStatus = settled.get("status").asText();
        if ("completed".equals(finalStatus)) {
            long cents = settled.get("amount").asLong();
            System.out.printf("%n✓ Transfer completed. Amount: $%.2f%n", cents / 100.0);
        } else {
            JsonNode failure = settled.path("failure");
            System.err.printf("%n✗ Transfer %s: %s — %s%n",
                    finalStatus,
                    failure.path("code").asText("unknown"),
                    failure.path("message").asText("no details"));
            System.exit(1);
        }
    }

    /**
     * Creates a sandbox ACH debit transfer.
     *
     * @param amountCents Transfer amount in cents (e.g. 5000 = $50.00)
     * @param description Human-readable label for this transfer
     * @return The created transfer object as a JsonNode
     */
    static JsonNode createAchTransfer(int amountCents, String description) throws Exception {
        ObjectNode source = MAPPER.createObjectNode();
        source.put("bank_account", "ba_test_sandbox_checking");

        ObjectNode body = MAPPER.createObjectNode();
        body.put("amount", amountCents);
        body.put("currency", "usd");
        body.put("payment_method", "ach");
        body.put("direction", "debit");
        body.put("description", description);
        body.set("source", source);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/transfers"))
                .header("Authorization", "Bearer " + API_KEY)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(MAPPER.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 400) {
            JsonNode error = MAPPER.readTree(response.body());
            throw new RuntimeException(
                    response.statusCode() + " " + error.path("code").asText()
                    + ": " + error.path("message").asText());
        }

        return MAPPER.readTree(response.body());
    }

    /**
     * Polls a transfer every 5 seconds until it reaches a terminal state.
     *
     * @param transferId     The transfer ID to poll
     * @param timeoutSeconds Maximum seconds to wait
     * @return The settled transfer object
     */
    static JsonNode pollUntilSettled(String transferId, int timeoutSeconds) throws Exception {
        Set<String> terminal = Set.of("completed", "failed", "cancelled", "returned");
        long deadline = System.currentTimeMillis() + (timeoutSeconds * 1000L);

        while (System.currentTimeMillis() < deadline) {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + "/transfers/" + transferId))
                    .header("Authorization", "Bearer " + API_KEY)
                    .GET()
                    .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode transfer = MAPPER.readTree(response.body());
            String status = transfer.get("status").asText();
            System.out.println("  Status: " + status);

            if (terminal.contains(status)) {
                return transfer;
            }

            Thread.sleep(5000);
        }

        throw new RuntimeException("Transfer " + transferId + " did not settle within " + timeoutSeconds + "s");
    }
}
```

---

## Compile and run

```bash
# Compile (adjust the classpath to your Jackson jar path if not using Maven/Gradle)
javac -cp .:jackson-databind-2.17.0.jar:jackson-core-2.17.0.jar:jackson-annotations-2.17.0.jar CreateTransfer.java

# Run
java -cp .:jackson-databind-2.17.0.jar:jackson-core-2.17.0.jar:jackson-annotations-2.17.0.jar CreateTransfer
```

With Maven, use `mvn exec:java -Dexec.mainClass=CreateTransfer` from your project root.

Expected output:

```
Creating ACH transfer...
Transfer created: tr_01HX7K2V3P...
Initial status:   pending

Polling for completion (sandbox settles within 30s)...
  Status: processing
  Status: completed

✓ Transfer completed. Amount: $50.00
```

---

## Handle HTTP errors

The example throws a `RuntimeException` for API errors. In production code, define a custom exception class:

```java
public class PaymentsApiException extends RuntimeException {
    private final int statusCode;
    private final String errorCode;

    public PaymentsApiException(int statusCode, String errorCode, String message) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }

    public int getStatusCode() { return statusCode; }
    public String getErrorCode() { return errorCode; }
}
```

Throw `PaymentsApiException` instead of `RuntimeException` in `createAchTransfer`, then catch by status code at the call site:

```java
try {
    JsonNode transfer = createAchTransfer(5000, "Test");
} catch (PaymentsApiException e) {
    if (e.getStatusCode() == 402) {
        // Insufficient funds — notify user
    } else {
        throw e; // unexpected — re-throw
    }
}
```

---

## Next steps

- [Webhook catalog](../webhook-catalog.md) — Receive events instead of polling
- [Authentication guide](../authentication-guide.md) — Key rotation and secure storage
- [Quickstart: C#](csharp.md) — The same flow with `System.Net.Http`

---

*This document follows Microsoft Writing Style Guide conventions.*
