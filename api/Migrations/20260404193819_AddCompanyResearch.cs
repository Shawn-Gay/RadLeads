using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadLeads.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyResearch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EmailAccounts_WarmupBatches_WarmupBatchId",
                table: "EmailAccounts");

            migrationBuilder.DropTable(
                name: "WarmupBatches");

            migrationBuilder.DropIndex(
                name: "IX_EmailAccounts_WarmupBatchId",
                table: "EmailAccounts");

            migrationBuilder.DropColumn(
                name: "SentToday",
                table: "EmailAccounts");

            migrationBuilder.DropColumn(
                name: "WarmupBatchId",
                table: "EmailAccounts");

            migrationBuilder.AddColumn<Guid>(
                name: "CampaignSendId",
                table: "OutboundEmails",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MessageId",
                table: "OutboundEmails",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CampaignSends",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<Guid>(type: "uuid", nullable: false),
                    MessageId = table.Column<string>(type: "text", nullable: true),
                    SentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    OpenedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ClickedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RepliedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    BouncedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CampaignId = table.Column<Guid>(type: "uuid", nullable: false),
                    StepId = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CampaignSends", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CampaignSends_CampaignSteps_StepId",
                        column: x => x.StepId,
                        principalTable: "CampaignSteps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CampaignSends_Campaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "Campaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CampaignSends_EmailAccounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "EmailAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CampaignSends_LeadPersons_PersonId",
                        column: x => x.PersonId,
                        principalTable: "LeadPersons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CompanyResearches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RawText = table.Column<string>(type: "text", nullable: true),
                    MeetingLink = table.Column<string>(type: "text", nullable: true),
                    PagesCrawledJson = table.Column<string>(type: "text", nullable: true),
                    ScrapedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    SummaryJson = table.Column<string>(type: "text", nullable: true),
                    SummarizedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompanyResearches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CompanyResearches_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OutboundEmails_CampaignSendId",
                table: "OutboundEmails",
                column: "CampaignSendId");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignSends_AccountId",
                table: "CampaignSends",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignSends_CampaignId",
                table: "CampaignSends",
                column: "CampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignSends_PersonId",
                table: "CampaignSends",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignSends_StepId",
                table: "CampaignSends",
                column: "StepId");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignSends_Token",
                table: "CampaignSends",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CompanyResearches_CompanyId",
                table: "CompanyResearches",
                column: "CompanyId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_OutboundEmails_CampaignSends_CampaignSendId",
                table: "OutboundEmails",
                column: "CampaignSendId",
                principalTable: "CampaignSends",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OutboundEmails_CampaignSends_CampaignSendId",
                table: "OutboundEmails");

            migrationBuilder.DropTable(
                name: "CampaignSends");

            migrationBuilder.DropTable(
                name: "CompanyResearches");

            migrationBuilder.DropIndex(
                name: "IX_OutboundEmails_CampaignSendId",
                table: "OutboundEmails");

            migrationBuilder.DropColumn(
                name: "CampaignSendId",
                table: "OutboundEmails");

            migrationBuilder.DropColumn(
                name: "MessageId",
                table: "OutboundEmails");

            migrationBuilder.AddColumn<int>(
                name: "SentToday",
                table: "EmailAccounts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "WarmupBatchId",
                table: "EmailAccounts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WarmupBatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Name = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WarmupBatches", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmailAccounts_WarmupBatchId",
                table: "EmailAccounts",
                column: "WarmupBatchId");

            migrationBuilder.AddForeignKey(
                name: "FK_EmailAccounts_WarmupBatches_WarmupBatchId",
                table: "EmailAccounts",
                column: "WarmupBatchId",
                principalTable: "WarmupBatches",
                principalColumn: "Id");
        }
    }
}
