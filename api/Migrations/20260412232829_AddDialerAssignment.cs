using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadLeads.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDialerAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AssignedAt",
                table: "Companies",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AssignedToId",
                table: "Companies",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DialDisposition",
                table: "Companies",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "Dialers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Dialers", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Companies_AssignedToId",
                table: "Companies",
                column: "AssignedToId");

            migrationBuilder.AddForeignKey(
                name: "FK_Companies_Dialers_AssignedToId",
                table: "Companies",
                column: "AssignedToId",
                principalTable: "Dialers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Companies_Dialers_AssignedToId",
                table: "Companies");

            migrationBuilder.DropTable(
                name: "Dialers");

            migrationBuilder.DropIndex(
                name: "IX_Companies_AssignedToId",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "AssignedAt",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "AssignedToId",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "DialDisposition",
                table: "Companies");
        }
    }
}
