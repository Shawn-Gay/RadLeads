using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadLeads.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCallSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CallSessionId",
                table: "CallLogs",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CallSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LeadsCalledCount = table.Column<int>(type: "integer", nullable: false),
                    TotalPausedSeconds = table.Column<int>(type: "integer", nullable: false),
                    CallSessionDialerId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CallSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CallSessions_Dialers_CallSessionDialerId",
                        column: x => x.CallSessionDialerId,
                        principalTable: "Dialers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_CallLogs_CallSessionId",
                table: "CallLogs",
                column: "CallSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_CallSessions_CallSessionDialerId",
                table: "CallSessions",
                column: "CallSessionDialerId");

            migrationBuilder.AddForeignKey(
                name: "FK_CallLogs_CallSessions_CallSessionId",
                table: "CallLogs",
                column: "CallSessionId",
                principalTable: "CallSessions",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CallLogs_CallSessions_CallSessionId",
                table: "CallLogs");

            migrationBuilder.DropTable(
                name: "CallSessions");

            migrationBuilder.DropIndex(
                name: "IX_CallLogs_CallSessionId",
                table: "CallLogs");

            migrationBuilder.DropColumn(
                name: "CallSessionId",
                table: "CallLogs");
        }
    }
}
