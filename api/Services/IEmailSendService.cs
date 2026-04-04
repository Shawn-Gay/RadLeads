using RadLeads.Api.Models;

namespace RadLeads.Api.Services;

public interface IEmailSendService
{
    /// <summary>Sends the email and returns the SMTP Message-ID assigned to the message.</summary>
    Task<string> SendAsync(OutboundEmail email, EmailAccount account, string plainPassword);
}
