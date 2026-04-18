using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadLeads.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddScripts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SelectedScriptId",
                table: "Dialers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DialerId",
                table: "CallLogs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ScriptId",
                table: "CallLogs",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Scripts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Body = table.Column<string>(type: "text", nullable: false),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Scripts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ScriptFeedback",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Note = table.Column<string>(type: "text", nullable: false),
                    BodySnapshot = table.Column<string>(type: "text", nullable: true),
                    ScriptId = table.Column<Guid>(type: "uuid", nullable: false),
                    CallLogId = table.Column<Guid>(type: "uuid", nullable: true),
                    DialerId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScriptFeedback", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScriptFeedback_CallLogs_CallLogId",
                        column: x => x.CallLogId,
                        principalTable: "CallLogs",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ScriptFeedback_Dialers_DialerId",
                        column: x => x.DialerId,
                        principalTable: "Dialers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ScriptFeedback_Scripts_ScriptId",
                        column: x => x.ScriptId,
                        principalTable: "Scripts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Dialers_SelectedScriptId",
                table: "Dialers",
                column: "SelectedScriptId");

            migrationBuilder.CreateIndex(
                name: "IX_CallLogs_DialerId",
                table: "CallLogs",
                column: "DialerId");

            migrationBuilder.CreateIndex(
                name: "IX_CallLogs_ScriptId",
                table: "CallLogs",
                column: "ScriptId");

            migrationBuilder.CreateIndex(
                name: "IX_ScriptFeedback_CallLogId",
                table: "ScriptFeedback",
                column: "CallLogId");

            migrationBuilder.CreateIndex(
                name: "IX_ScriptFeedback_DialerId",
                table: "ScriptFeedback",
                column: "DialerId");

            migrationBuilder.CreateIndex(
                name: "IX_ScriptFeedback_ScriptId",
                table: "ScriptFeedback",
                column: "ScriptId");

            migrationBuilder.AddForeignKey(
                name: "FK_CallLogs_Dialers_DialerId",
                table: "CallLogs",
                column: "DialerId",
                principalTable: "Dialers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CallLogs_Scripts_ScriptId",
                table: "CallLogs",
                column: "ScriptId",
                principalTable: "Scripts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Dialers_Scripts_SelectedScriptId",
                table: "Dialers",
                column: "SelectedScriptId",
                principalTable: "Scripts",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CallLogs_Dialers_DialerId",
                table: "CallLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_CallLogs_Scripts_ScriptId",
                table: "CallLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_Dialers_Scripts_SelectedScriptId",
                table: "Dialers");

            migrationBuilder.DropTable(
                name: "ScriptFeedback");

            migrationBuilder.DropTable(
                name: "Scripts");

            migrationBuilder.DropIndex(
                name: "IX_Dialers_SelectedScriptId",
                table: "Dialers");

            migrationBuilder.DropIndex(
                name: "IX_CallLogs_DialerId",
                table: "CallLogs");

            migrationBuilder.DropIndex(
                name: "IX_CallLogs_ScriptId",
                table: "CallLogs");

            migrationBuilder.DropColumn(
                name: "SelectedScriptId",
                table: "Dialers");

            migrationBuilder.DropColumn(
                name: "DialerId",
                table: "CallLogs");

            migrationBuilder.DropColumn(
                name: "ScriptId",
                table: "CallLogs");
        }
    }
}
