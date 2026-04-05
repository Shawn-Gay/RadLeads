using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using RadLeads.Api.Models;

namespace RadLeads.Api.Services;

public class MailKitEmailSendService(IConfiguration config) : IEmailSendService
{
    public async Task<string> SendAsync(OutboundEmail email, EmailAccount account, string plainPassword)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(account.Email, account.Email));
        message.To.Add(MailboxAddress.Parse(email.ToAddress));
        message.Subject = email.Subject;
        message.Body = new BodyBuilder
        {
            HtmlBody = email.Body,
            TextBody = "Please view this email in an HTML-capable client."
        }.ToMessageBody();

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(
            config["Brevo:SmtpHost"] ?? "smtp-relay.brevo.com",
            config.GetValue<int>("Brevo:SmtpPort", 587),
            SecureSocketOptions.StartTls);
        await smtp.AuthenticateAsync(config["Brevo:Login"], config["Brevo:ApiKey"]);
        await smtp.SendAsync(message);
        await smtp.DisconnectAsync(true);

        return message.MessageId;
    }
}
