using System.Text;
using System.Text.Json;
using RadLeads.Api.Models;

namespace RadLeads.Api.Services;

public class BrevoEmailSendService(IHttpClientFactory http, IConfiguration config) : IEmailSendService
{
    public async Task<string> SendAsync(OutboundEmail email, EmailAccount account, string plainPassword)
    {
        var messageId = $"<{Guid.NewGuid():N}@brevo>";

        var payload = new
        {
            sender      = new { email = account.Email, name = account.Email },
            to          = new[] { new { email = email.ToAddress } },
            subject     = email.Subject,
            htmlContent = email.Body,
            headers     = new Dictionary<string, string> { ["Message-ID"] = messageId },
        };

        await PostAsync(payload);
        return messageId;
    }

    // Used by WarmupService for replies (supports In-Reply-To threading)
    public async Task SendReplyAsync(
        string fromEmail, string toEmail, string subject,
        string textBody, string? inReplyTo, IEnumerable<string>? references)
    {
        var headers = new Dictionary<string, string>();
        if (!string.IsNullOrEmpty(inReplyTo))
            headers["In-Reply-To"] = inReplyTo;
        if (references != null)
        {
            var refs = string.Join(" ", references);
            if (!string.IsNullOrEmpty(refs)) headers["References"] = refs;
        }

        var payload = new
        {
            sender      = new { email = fromEmail, name = fromEmail },
            to          = new[] { new { email = toEmail } },
            subject,
            textContent = textBody,
            headers     = headers.Count > 0 ? headers : null,
        };

        await PostAsync(payload);
    }

    private async Task PostAsync(object payload)
    {
        var client  = http.CreateClient("brevo");
        var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8, "application/json");

        var response = await client.PostAsync("v3/smtp/email", content);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException(
                $"Brevo API {(int)response.StatusCode}: {body}");
        }
    }
}
