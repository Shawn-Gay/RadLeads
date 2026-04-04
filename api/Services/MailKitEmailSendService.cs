using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using RadLeads.Api.Models;

namespace RadLeads.Api.Services;

public class MailKitEmailSendService : IEmailSendService
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

        // Port 465 = implicit SSL, anything else = STARTTLS
        var socketOptions = account.SmtpPort == 465
            ? SecureSocketOptions.SslOnConnect
            : SecureSocketOptions.StartTls;

        await smtp.ConnectAsync(account.SmtpHost, account.SmtpPort, socketOptions);
        await smtp.AuthenticateAsync(account.Email, plainPassword);
        await smtp.SendAsync(message);
        await smtp.DisconnectAsync(true);

        return message.MessageId;
    }
}
