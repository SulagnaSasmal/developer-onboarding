# Quickstart: C#

Create an ACH bank transfer using the Payments API and `System.Net.Http.HttpClient`. This quickstart targets .NET 6 or later and uses `System.Text.Json` for serialization — no third-party packages required.

---

## Prerequisites

- .NET 6 SDK or later (`dotnet --version` to confirm)
- A PaymentsAPI sandbox account and a test secret key (`sk_test_...`)
- [Getting started](../getting-started.md) completed — your key is in a `PAYMENTS_API_KEY` environment variable

---

## Create the project

```bash
dotnet new console -n PaymentsApiQuickstart
cd PaymentsApiQuickstart
```

Replace the contents of `Program.cs` with the code below.

---

## Create the transfer

```csharp
// Program.cs
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

const string BaseUrl = "https://api.paymentsapi.dev/v1";
string apiKey = Environment.GetEnvironmentVariable("PAYMENTS_API_KEY")
    ?? throw new InvalidOperationException("PAYMENTS_API_KEY environment variable is not set.");

// Build a shared HttpClient — do not create a new one per request.
using var httpClient = new HttpClient();
httpClient.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", apiKey);
httpClient.DefaultRequestHeaders.Accept.Add(
    new MediaTypeWithQualityHeaderValue("application/json"));

Console.WriteLine("Creating ACH transfer...");
var transfer = await CreateAchTransferAsync(httpClient, amountCents: 5000, description: "Test transfer — C# quickstart");

Console.WriteLine($"Transfer created: {transfer.Id}");
Console.WriteLine($"Initial status:   {transfer.Status}");

Console.WriteLine("\nPolling for completion (sandbox settles within 30s)...");
var settled = await PollUntilSettledAsync(httpClient, transfer.Id, timeoutSeconds: 120);

if (settled.Status == "completed")
{
    Console.WriteLine($"\n✓ Transfer completed. Amount: ${settled.Amount / 100m:F2}");
}
else
{
    Console.Error.WriteLine($"\n✗ Transfer {settled.Status}: {settled.Failure?.Code} — {settled.Failure?.Message}");
    Environment.Exit(1);
}

// --- Methods ---

static async Task<Transfer> CreateAchTransferAsync(
    HttpClient client,
    int amountCents,
    string description)
{
    var payload = new
    {
        amount = amountCents,
        currency = "usd",
        payment_method = "ach",
        direction = "debit",
        description,
        source = new { bank_account = "ba_test_sandbox_checking" },
    };

    var response = await client.PostAsJsonAsync($"{BaseUrl}/transfers", payload);

    if (!response.IsSuccessStatusCode)
    {
        var error = await response.Content.ReadFromJsonAsync<ApiError>()
            ?? throw new Exception("Unknown API error");
        throw new Exception($"{(int)response.StatusCode} {error.Code}: {error.Message}");
    }

    return await response.Content.ReadFromJsonAsync<Transfer>()
        ?? throw new Exception("Empty response from API");
}

static async Task<Transfer> PollUntilSettledAsync(
    HttpClient client,
    string transferId,
    int timeoutSeconds)
{
    var terminalStates = new HashSet<string> { "completed", "failed", "cancelled", "returned" };
    var deadline = DateTime.UtcNow.AddSeconds(timeoutSeconds);

    while (DateTime.UtcNow < deadline)
    {
        var response = await client.GetAsync($"{BaseUrl}/transfers/{transferId}");
        response.EnsureSuccessStatusCode();

        var transfer = await response.Content.ReadFromJsonAsync<Transfer>()
            ?? throw new Exception("Empty response from API");

        Console.WriteLine($"  Status: {transfer.Status}");

        if (terminalStates.Contains(transfer.Status))
            return transfer;

        await Task.Delay(TimeSpan.FromSeconds(5));
    }

    throw new TimeoutException($"Transfer {transferId} did not settle within {timeoutSeconds}s");
}

// --- Models ---

record Transfer(
    [property: JsonPropertyName("id")]     string Id,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("amount")] int Amount,
    [property: JsonPropertyName("failure")] TransferFailure? Failure);

record TransferFailure(
    [property: JsonPropertyName("code")]    string Code,
    [property: JsonPropertyName("message")] string Message);

record ApiError(
    [property: JsonPropertyName("code")]    string Code,
    [property: JsonPropertyName("message")] string Message);
```

---

## Run the application

```bash
dotnet run
```

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

## Reuse HttpClient correctly

The example creates one `HttpClient` instance for the lifetime of the application. **Do not** instantiate `HttpClient` inside a loop or per request — this exhausts socket connections under load. In ASP.NET Core applications, use `IHttpClientFactory`:

```csharp
// Program.cs (ASP.NET Core)
builder.Services.AddHttpClient("PaymentsApi", client =>
{
    client.BaseAddress = new Uri("https://api.paymentsapi.dev/v1/");
    client.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", Environment.GetEnvironmentVariable("PAYMENTS_API_KEY"));
});
```

Inject `IHttpClientFactory` into your service class and call `CreateClient("PaymentsApi")` to get a configured instance.

---

## Handle API errors

The example throws a generic `Exception` for API error responses. For production code, catch specific HTTP status codes:

```csharp
try
{
    var transfer = await CreateAchTransferAsync(client, 5000, "Test");
}
catch (Exception ex) when (ex.Message.StartsWith("402"))
{
    // R01 insufficient funds — notify the user
    Console.Error.WriteLine("Payment declined: insufficient funds.");
}
catch (Exception ex) when (ex.Message.StartsWith("401"))
{
    // Authentication failure — check the API key
    throw;
}
```

---

## Next steps

- [Webhook catalog](../webhook-catalog.md) — Receive events instead of polling
- [Authentication guide](../authentication-guide.md) — Key rotation and environment variable patterns
- [Quickstart: Node.js](nodejs.md) — The same flow in JavaScript

---

*This document follows Microsoft Writing Style Guide conventions.*
