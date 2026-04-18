using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadLeads.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TrackingId",
                table: "OutboundEmails",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "EmailEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OutboundEmailId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "text", nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ClickedUrl = table.Column<string>(type: "text", nullable: true),
                    UserAgent = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmailEvents_OutboundEmails_OutboundEmailId",
                        column: x => x.OutboundEmailId,
                        principalTable: "OutboundEmails",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Backfill existing rows that got the zero-guid default
            migrationBuilder.Sql(@"UPDATE ""OutboundEmails"" SET ""TrackingId"" = gen_random_uuid() WHERE ""TrackingId"" = '00000000-0000-0000-0000-000000000000'");

            migrationBuilder.CreateIndex(
                name: "IX_OutboundEmails_TrackingId",
                table: "OutboundEmails",
                column: "TrackingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmailEvents_OutboundEmailId",
                table: "EmailEvents",
                column: "OutboundEmailId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmailEvents");

            migrationBuilder.DropIndex(
                name: "IX_OutboundEmails_TrackingId",
                table: "OutboundEmails");

            migrationBuilder.DropColumn(
                name: "TrackingId",
                table: "OutboundEmails");
        }
    }
}
