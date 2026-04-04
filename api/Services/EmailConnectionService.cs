using MailKit.Net.Smtp;
using MailKit.Net.Imap;
using MailKit.Security;

namespace RadLeads.Api.Services;

public record ConnectionTestResult(bool Success, string? Error = null);

public class EmailConnectionService
{
    public async Task<ConnectionTestResult> TestAsync(
        string email, string password,
        string smtpHost, int smtpPort,
        string imapHost, int imapPort)
    {
        try
        {
            await TestSmtpAsync(email, password, smtpHost, smtpPort);
            await TestImapAsync(email, password, imapHost, imapPort);
            return new ConnectionTestResult(true);
        }
        catch (Exception ex)
        {
            return new ConnectionTestResult(false, ex.Message);
        }
    }

    private static async Task TestSmtpAsync(string email, string password, string host, int port)
    {
        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, SecureSocketOptions.SslOnConnect);
        await client.AuthenticateAsync(email, password);
        await client.DisconnectAsync(true);
    }

    private static async Task TestImapAsync(string email, string password, string host, int port)
    {
        using var client = new ImapClient();
        await client.ConnectAsync(host, port, SecureSocketOptions.SslOnConnect);
        await client.AuthenticateAsync(email, password);
        await client.DisconnectAsync(true);
    }
}
