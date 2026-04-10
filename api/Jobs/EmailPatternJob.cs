using Quartz;
using RadLeads.Api.Data;

namespace RadLeads.Api.Jobs;

/// <summary>
/// Job 4 — Email Pattern Generator (INTENTIONALLY INACTIVE).
///
/// This job is scaffolded but NOT registered, scheduled, or run.
/// Do NOT add it to Program.cs until the implementation is complete.
///
/// When activated, this job should:
///   1. Pick up companies that have contact names but no verified email candidates
///      (e.g. EnrichStatus == Enriched, with People that have 0 Emails).
///   2. Use the shared EmailPatternHelper.GuessEmails() method (Services/EmailPatternHelper.cs)
///      to generate email pattern candidates — do NOT duplicate that logic here.
///   3. Write a new EnrichStatus value when done so downstream jobs can pick up where this left off.
///
/// The shared helpers already available:
///   - EmailPatternHelper.GuessEmails(first, last, domain, source)
///   - EmailPatternHelper.SplitName(fullName)
///   - EmailPatternHelper.Capitalize(s)
/// </summary>
[DisallowConcurrentExecution]
#pragma warning disable CS9113 // Parameter 'db' is unread — scaffold only, will be used when implemented
public class EmailPatternJob(
    AppDbContext db,
    ILogger<EmailPatternJob> logger) : IJob
#pragma warning restore CS9113
{
    public Task Execute(IJobExecutionContext context)
    {
        logger.LogDebug("EmailPatternJob is not yet implemented — skipping");
        return Task.CompletedTask;
    }
}
