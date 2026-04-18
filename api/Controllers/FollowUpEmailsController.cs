using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Dtos;
using RadLeads.Api.Models;

namespace RadLeads.Api.Controllers;

[ApiController]
[Route("api/follow-up-emails")]
public class FollowUpEmailsController(AppDbContext db) : ControllerBase
{
    // Queues a one-off follow-up email triggered from the dialer.
    // Stored as a regular OutboundEmail row with Pending status; the
    // EmailDispatchJob picks it up on its next tick and sends via SMTP.
    [HttpPost]
    public async Task<IActionResult> Send([FromBody] SendFollowUpEmailRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.ToEmail)) return BadRequest("ToEmail is required.");
        if (string.IsNullOrWhiteSpace(req.Subject)) return BadRequest("Subject is required.");
        if (string.IsNullOrWhiteSpace(req.Body))    return BadRequest("Body is required.");

        var account = await db.EmailAccounts.FindAsync(req.FromAccountId);
        if (account is null) return NotFound("Sender account not found.");

        var company = await db.Companies.FindAsync(req.CompanyId);
        if (company is null) return NotFound("Company not found.");

        var email = new OutboundEmail
        {
            ToAddress    = req.ToEmail.Trim(),
            Subject      = req.Subject,
            Body         = req.Body,
            EmailAccount = account,
            Status       = OutboundEmailStatus.Pending,
            Company      = company,
        };

        if (req.PersonId is not null)
        {
            var person = await db.LeadPersons.FindAsync(req.PersonId.Value);
            if (person is null) return NotFound("Person not found.");
            email.Person = person;
        }

        if (req.EmailTemplateId is not null)
        {
            var template = await db.EmailTemplates.FindAsync(req.EmailTemplateId.Value);
            if (template is null) return NotFound("EmailTemplate not found.");
            email.EmailTemplate = template;
        }

        db.OutboundEmails.Add(email);
        await db.SaveChangesAsync();

        return Accepted(new { id = email.Id, status = email.Status.ToString() });
    }

    // Lists follow-up sends for a company (excludes campaign sends).
    [HttpGet("company/{companyId:guid}")]
    public async Task<IActionResult> GetByCompany(Guid companyId)
    {
        var emails = await db.OutboundEmails
            .Where(o => o.CampaignId == null
                     && EF.Property<Guid?>(o, "CompanyId") == companyId)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new FollowUpEmailDto(
                o.Id,
                EF.Property<Guid?>(o, "PersonId"),
                EF.Property<Guid?>(o, "CompanyId"),
                o.EmailAccountId,
                o.ToAddress,
                o.Subject,
                o.Status,
                o.SentAt,
                o.CreatedAt,
                o.ErrorMessage,
                o.Events.Count(e => e.EventType == EmailEventType.Opened),
                o.Events.Count(e => e.EventType == EmailEventType.Clicked)))
            .ToListAsync();

        return Ok(emails);
    }
}
