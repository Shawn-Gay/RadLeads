using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadLeads.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyCadence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CadenceStartedAt",
                table: "Companies",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CadenceStatus",
                table: "Companies",
                type: "text",
                nullable: false,
                defaultValue: "NotStarted");

            migrationBuilder.AddColumn<int>(
                name: "CurrentTouchNumber",
                table: "Companies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "NextTouchAt",
                table: "Companies",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CadenceStartedAt",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "CadenceStatus",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "CurrentTouchNumber",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "NextTouchAt",
                table: "Companies");
        }
    }
}
