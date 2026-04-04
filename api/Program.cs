using Microsoft.EntityFrameworkCore;
using Quartz;
using RadLeads.Api.Data;
using RadLeads.Api.Jobs;
using RadLeads.Api.Models;
using RadLeads.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddSingleton<EncryptionService>();
builder.Services.AddSingleton<EmailConnectionService>();
builder.Services.AddScoped<IEmailSendService, MailKitEmailSendService>();
builder.Services.AddScoped<IWarmupService, WarmupService>();
builder.Services.AddScoped<ICampaignDispatchService, CampaignDispatchService>();

builder.Services.AddHttpClient("scraper", c =>
{
    c.DefaultRequestHeaders.UserAgent.ParseAdd(
        "Mozilla/5.0 (compatible; RadLeads-Enrichment/1.0)");
    c.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddSingleton<IScrapingService, WebCrawlerService>();
builder.Services.AddSingleton<IAiService, OpenAiService>();

builder.Services.AddQuartz(q =>
{
    q.AddJob<EmailDispatchJob>(j => j
        .WithIdentity("EmailDispatchJob")
        .StoreDurably())
     .AddTrigger(t => t
        .ForJob("EmailDispatchJob")
        .WithIdentity("EmailDispatchTrigger")
        .WithSimpleSchedule(s => s
            .WithIntervalInMinutes(5)
            .RepeatForever()
            .WithMisfireHandlingInstructionNextWithRemainingCount()));

    q.AddJob<WarmupScheduleJob>(j => j
        .WithIdentity("WarmupScheduleJob")
        .StoreDurably())
     .AddTrigger(t => t
        .ForJob("WarmupScheduleJob")
        .WithIdentity("WarmupScheduleTrigger")
        .WithCronSchedule("0 0 8 * * ?"));   // 8 AM UTC — schedules the day's sends

    q.AddJob<WarmupEngageJob>(j => j
        .WithIdentity("WarmupEngageJob")
        .StoreDurably())
     .AddTrigger(t => t
        .ForJob("WarmupEngageJob")
        .WithIdentity("WarmupEngageTrigger")
        .WithSimpleSchedule(s => s
            .WithIntervalInHours(1)
            .RepeatForever()
            .WithMisfireHandlingInstructionNextWithRemainingCount()));

    q.AddJob<CampaignScheduleJob>(j => j
        .WithIdentity("CampaignScheduleJob")
        .StoreDurably())
     .AddTrigger(t => t
        .ForJob("CampaignScheduleJob")
        .WithIdentity("CampaignScheduleTrigger")
        .WithCronSchedule("0 5 8 * * ?"));   // 8:05 AM UTC — after warmup schedule

    // Lead enrichment — scrape every 2 min, AI summarize every 5 min
    q.AddJob<ScrapeLeadsJob>(j => j
        .WithIdentity("ScrapeLeadsJob")
        .StoreDurably())
     .AddTrigger(t => t
        .ForJob("ScrapeLeadsJob")
        .WithIdentity("ScrapeLeadsTrigger")
        .WithSimpleSchedule(s => s
            .WithIntervalInMinutes(2)
            .RepeatForever()
            .WithMisfireHandlingInstructionNextWithRemainingCount()));

    q.AddJob<SummarizeLeadsJob>(j => j
        .WithIdentity("SummarizeLeadsJob")
        .StoreDurably())
     .AddTrigger(t => t
        .ForJob("SummarizeLeadsJob")
        .WithIdentity("SummarizeLeadsTrigger")
        .WithSimpleSchedule(s => s
            .WithIntervalInMinutes(5)
            .RepeatForever()
            .WithMisfireHandlingInstructionNextWithRemainingCount()));


});

builder.Services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);

builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"])
     .AllowAnyHeader()
     .AllowAnyMethod()));

var app = builder.Build();

// Auto-apply migrations on startup
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

app.UseCors();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok("healthy"));

app.Run();
