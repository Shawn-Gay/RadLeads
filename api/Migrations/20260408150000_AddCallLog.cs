using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadLeads.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCallLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CallLogs",
                columns: table => new
                {
                    Id              = table.Column<Guid>(type: "uuid", nullable: false),
                    CalledPhone     = table.Column<string>(type: "text", nullable: false),
                    Outcome         = table.Column<string>(type: "text", nullable: false),
                    Notes           = table.Column<string>(type: "text", nullable: true),
                    CalledAt        = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: true),
                    RecordingUrl    = table.Column<string>(type: "text", nullable: true),
                    PersonId        = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt       = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt       = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeletedAt       = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CallLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CallLogs_LeadPersons_PersonId",
                        column: x => x.PersonId,
                        principalTable: "LeadPersons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CallLogs_PersonId",
                table: "CallLogs",
                column: "PersonId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "CallLogs");
        }
    }
}
