using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadLeads.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDecisionMakerSearchAndPersonSource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "LeadPersons",
                type: "text",
                nullable: false,
                defaultValue: "ScrapedSite");

            migrationBuilder.AddColumn<int>(
                name: "DecisionMakerFailCount",
                table: "CompanyResearches",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "DecisionMakerSearchJson",
                table: "CompanyResearches",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DecisionMakerSearchedAt",
                table: "CompanyResearches",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Source",
                table: "LeadPersons");

            migrationBuilder.DropColumn(
                name: "DecisionMakerFailCount",
                table: "CompanyResearches");

            migrationBuilder.DropColumn(
                name: "DecisionMakerSearchJson",
                table: "CompanyResearches");

            migrationBuilder.DropColumn(
                name: "DecisionMakerSearchedAt",
                table: "CompanyResearches");
        }
    }
}
