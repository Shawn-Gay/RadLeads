using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Dtos;
using RadLeads.Api.Models;
using RadLeads.Api.Services;

namespace RadLeads.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmailAccountsController(
    AppDbContext db,
    EmailConnectionService connection,
    EncryptionService encryption,
    IConfiguration config) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var todayStart = new DateTimeOffset(DateTimeOffset.UtcNow.Date, TimeSpan.Zero);
        var accounts = await db.EmailAccounts.ToListAsync();

        var sentToday = await db.OutboundEmails
            .Where(o => o.SentAt >= todayStart)
            .GroupBy(o => o.EmailAccountId)
            .Select(g => new { AccountId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(o => o.AccountId, o => o.Count);

        return Ok(accounts.Select(o => EmailAccountDto.From(o, sentToday.GetValueOrDefault(o.Id, 0))));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var account = await db.EmailAccounts.FirstOrDefaultAsync(o => o.Id == id);
        if (account is null) return NotFound();

        var todayStart = new DateTimeOffset(DateTimeOffset.UtcNow.Date, TimeSpan.Zero);
        var sentToday = await db.OutboundEmails
            .CountAsync(o => o.EmailAccountId == id && o.SentAt >= todayStart);

        return Ok(EmailAccountDto.From(account, sentToday));
    }

    // Tests SMTP + IMAP credentials without saving anything.
    [HttpPost("test")]
    public async Task<IActionResult> Test(TestConnectionRequest req)
    {
        var result = await connection.TestAsync(
            req.Email, req.Password,
            req.SmtpHost, req.SmtpPort,
            req.ImapHost, req.ImapPort);

        return result.Success
            ? Ok(new { success = true })
            : BadRequest(new { success = false, error = result.Error });
    }

    // Creates an account after a successful test. Password is encrypted before storage.
    [HttpPost]
    public async Task<IActionResult> Create(CreateEmailAccountRequest req)
    {
        var account = new EmailAccount
        {
            Email             = req.Email,
            Provider          = req.Provider,
            Status            = AccountStatus.Warming,
            WarmupDay         = 1,
            DailyLimit        = req.DailyLimit,
            SmtpHost          = req.SmtpHost,
            SmtpPort          = req.SmtpPort,
            ImapHost          = req.ImapHost,
            ImapPort          = req.ImapPort,
            EncryptedPassword = encryption.Encrypt(req.Password),
            FirstName         = req.FirstName,
            LastName          = req.LastName,
            Title             = req.Title,
            CompanyName       = req.CompanyName,
            Phone             = req.Phone,
            CalendarLink      = req.CalendarLink,
            Signature         = req.Signature,
        };

        db.EmailAccounts.Add(account);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = account.Id }, EmailAccountDto.From(account, 0));
    }

    // Updates only sender persona fields used for token replacement.
    // Separate from PUT so the password and connection settings cannot be touched.
    [HttpPatch("{id:guid}/sender-info")]
    public async Task<IActionResult> PatchSenderInfo(Guid id, UpdateSenderInfoRequest req)
    {
        var account = await db.EmailAccounts.FindAsync(id);
        if (account is null) return NotFound();

        account.FirstName    = req.FirstName;
        account.LastName     = req.LastName;
        account.Title        = req.Title;
        account.CompanyName  = req.CompanyName;
        account.Phone        = req.Phone;
        account.CalendarLink = req.CalendarLink;
        account.Signature    = req.Signature;

        await db.SaveChangesAsync();

        var todayStart = new DateTimeOffset(DateTimeOffset.UtcNow.Date, TimeSpan.Zero);
        var sentToday = await db.OutboundEmails
            .CountAsync(o => o.EmailAccountId == id && o.SentAt >= todayStart);

        return Ok(EmailAccountDto.From(account, sentToday));
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> PatchStatus(Guid id, [FromBody] AccountStatus status)
    {
        var account = await db.EmailAccounts.FindAsync(id);
        if (account is null) return NotFound();
        account.Status = status;
        await db.SaveChangesAsync();

        var todayStart = new DateTimeOffset(DateTimeOffset.UtcNow.Date, TimeSpan.Zero);
        var sentToday = await db.OutboundEmails
            .CountAsync(o => o.EmailAccountId == id && o.SentAt >= todayStart);

        return Ok(EmailAccountDto.From(account, sentToday));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, EmailAccount updated)
    {
        var account = await db.EmailAccounts.FindAsync(id);
        if (account is null) return NotFound();
        updated.Id = id;
        db.Entry(account).CurrentValues.SetValues(updated);
        await db.SaveChangesAsync();

        var todayStart = new DateTimeOffset(DateTimeOffset.UtcNow.Date, TimeSpan.Zero);
        var sentToday = await db.OutboundEmails
            .CountAsync(o => o.EmailAccountId == id && o.SentAt >= todayStart);

        return Ok(EmailAccountDto.From(account, sentToday));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var account = await db.EmailAccounts.FindAsync(id);
        if (account is null) return NotFound();
        db.EmailAccounts.Remove(account);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Diagnostic: POST /api/email-accounts/test-brevo-smtp
    // Pings the Brevo HTTP API to verify the api-key is valid and reachable.
    [HttpPost("test-brevo-smtp")]
    public async Task<IActionResult> TestBrevoSmtp([FromServices] IHttpClientFactory http)
    {
        var keyPresent = !string.IsNullOrEmpty(config["Brevo:HttpApiKey"]);
        try
        {
            var client   = http.CreateClient("brevo");
            var response = await client.GetAsync("v3/account");
            var body     = await response.Content.ReadAsStringAsync();

            return Ok(new { success = response.IsSuccessStatusCode, status = (int)response.StatusCode, keyPresent, body });
        }
        catch (Exception ex)
        {
            return Ok(new { success = false, keyPresent, error = ex.Message, type = ex.GetType().Name });
        }
    }
}
