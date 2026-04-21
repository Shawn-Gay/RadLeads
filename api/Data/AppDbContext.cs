using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Models;

namespace RadLeads.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Dialer> Dialers => Set<Dialer>();
    public DbSet<LeadPerson> LeadPersons => Set<LeadPerson>();
    public DbSet<LeadEmail> LeadEmails => Set<LeadEmail>();
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<CampaignStep> CampaignSteps => Set<CampaignStep>();
    public DbSet<CampaignSend> CampaignSends => Set<CampaignSend>();
    public DbSet<EmailAccount> EmailAccounts => Set<EmailAccount>();
    public DbSet<WarmupActivity> WarmupActivities => Set<WarmupActivity>();
    public DbSet<CompanyResearch> CompanyResearches => Set<CompanyResearch>();
    public DbSet<OutboundEmail> OutboundEmails => Set<OutboundEmail>();
    public DbSet<InboxReply> InboxReplies => Set<InboxReply>();
    public DbSet<CallLog> CallLogs => Set<CallLog>();
    public DbSet<Script> Scripts => Set<Script>();
    public DbSet<ScriptFeedback> ScriptFeedback => Set<ScriptFeedback>();
    public DbSet<EmailTemplate> EmailTemplates => Set<EmailTemplate>();
    public DbSet<EmailTemplateOutcome> EmailTemplateOutcomes => Set<EmailTemplateOutcome>();
    public DbSet<EmailEvent> EmailEvents => Set<EmailEvent>();

    // Auto-set UpdatedAt on every save
    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<IBaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTimeOffset.UtcNow;
        }
        return base.SaveChangesAsync(ct);
    }

    // Store all enums as their string name in the DB (readable, not magic ints)
    protected override void ConfigureConventions(ModelConfigurationBuilder config)
    {
        config.Properties<EnrichStatus>().HaveConversion<string>();
        config.Properties<EmailSource>().HaveConversion<string>();
        config.Properties<EmailStatus>().HaveConversion<string>();
        config.Properties<CampaignStatus>().HaveConversion<string>();
        config.Properties<AccountProvider>().HaveConversion<string>();
        config.Properties<AccountStatus>().HaveConversion<string>();
        config.Properties<WarmupAction>().HaveConversion<string>();
        config.Properties<OutboundEmailStatus>().HaveConversion<string>();
        config.Properties<EmailEventType>().HaveConversion<string>();
        config.Properties<CallOutcome>().HaveConversion<string>();
        config.Properties<DialDisposition>().HaveConversion<string>();
        config.Properties<CadenceStatus>().HaveConversion<string>();
    }

    protected override void OnModelCreating(ModelBuilder model)
    {
        // Company → Dialer (optional assignment)
        model.Entity<Company>()
            .HasOne(o => o.AssignedTo)
            .WithMany(o => o.AssignedCompanies)
            .HasForeignKey("AssignedToId")
            .IsRequired(false);

        // Implicit many-to-many: LeadPerson ↔ Campaign
        model.Entity<LeadPerson>()
            .HasMany(o => o.Campaigns)
            .WithMany(o => o.People);

        // Implicit many-to-many: Campaign ↔ EmailAccount (senders)
        model.Entity<Campaign>()
            .HasMany(o => o.Senders)
            .WithMany(o => o.Campaigns);

        // 1:1 Company ↔ CompanyResearch (shadow FK CompanyId on research)
        model.Entity<CompanyResearch>()
            .HasOne(o => o.Company)
            .WithOne(o => o.Research)
            .HasForeignKey<CompanyResearch>("CompanyId");

        // Unique index on CampaignSend.Token (used for tracking pixel / click lookups)
        model.Entity<CampaignSend>()
            .HasIndex(o => o.Token)
            .IsUnique();

        // CallLog: optional Person + optional Company (at least one set at API level)
        model.Entity<CallLog>()
            .HasOne(o => o.Person)
            .WithMany(o => o.CallLogs)
            .HasForeignKey("PersonId")
            .IsRequired(false);

        model.Entity<CallLog>()
            .HasOne(o => o.Company)
            .WithMany()
            .HasForeignKey("CompanyId")
            .IsRequired(false);

        // CallLog → Script (nullable: call may predate script selection)
        model.Entity<CallLog>()
            .HasOne(o => o.Script)
            .WithMany(o => o.CallLogs)
            .HasForeignKey("ScriptId")
            .IsRequired(false);

        // CallLog → Dialer (who made the call)
        model.Entity<CallLog>()
            .HasOne(o => o.Dialer)
            .WithMany()
            .HasForeignKey("DialerId")
            .IsRequired(false);

        // Dialer → SelectedScript (nullable)
        model.Entity<Dialer>()
            .HasOne(o => o.SelectedScript)
            .WithMany()
            .HasForeignKey("SelectedScriptId")
            .IsRequired(false);

        // ScriptFeedback → Script (required), CallLog (optional), Dialer (optional)
        model.Entity<ScriptFeedback>()
            .HasOne(o => o.Script)
            .WithMany(o => o.Feedback)
            .HasForeignKey("ScriptId")
            .IsRequired();

        model.Entity<ScriptFeedback>()
            .HasOne(o => o.CallLog)
            .WithMany()
            .HasForeignKey("CallLogId")
            .IsRequired(false);

        model.Entity<ScriptFeedback>()
            .HasOne(o => o.Dialer)
            .WithMany()
            .HasForeignKey("DialerId")
            .IsRequired(false);

        // OutboundEmail: optional link back to Person/Company (set for dialer follow-ups)
        model.Entity<OutboundEmail>()
            .HasOne(o => o.Person)
            .WithMany()
            .HasForeignKey("PersonId")
            .IsRequired(false);

        model.Entity<OutboundEmail>()
            .HasOne(o => o.Company)
            .WithMany()
            .HasForeignKey("CompanyId")
            .IsRequired(false);

        // OutboundEmail → EmailTemplate (nullable: campaigns + legacy follow-ups)
        model.Entity<OutboundEmail>()
            .HasOne(o => o.EmailTemplate)
            .WithMany(o => o.OutboundEmails)
            .HasForeignKey("EmailTemplateId")
            .IsRequired(false);

        // EmailEvent → OutboundEmail (cascade delete)
        model.Entity<EmailEvent>()
            .HasOne(o => o.OutboundEmail)
            .WithMany(o => o.Events)
            .HasForeignKey(o => o.OutboundEmailId)
            .IsRequired();

        // Unique index on OutboundEmail.TrackingId for fast pixel/click lookups
        model.Entity<OutboundEmail>()
            .HasIndex(o => o.TrackingId)
            .IsUnique();

        // EmailTemplateOutcome → EmailTemplate (cascade)
        model.Entity<EmailTemplateOutcome>()
            .HasOne(o => o.Template)
            .WithMany(o => o.OutcomeAssignments)
            .HasForeignKey("EmailTemplateId")
            .IsRequired();

        // Index helps look up "what templates for outcome X"
        model.Entity<EmailTemplateOutcome>()
            .HasIndex(o => o.Outcome);
    }
}
