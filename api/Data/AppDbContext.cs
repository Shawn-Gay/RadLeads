using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Models;

namespace RadLeads.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<CompanyGenericEmail> CompanyGenericEmails => Set<CompanyGenericEmail>();
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
    }

    protected override void OnModelCreating(ModelBuilder model)
    {
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
    }
}
