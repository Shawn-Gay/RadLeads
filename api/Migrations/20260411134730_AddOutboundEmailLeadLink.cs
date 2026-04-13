using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadLeads.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOutboundEmailLeadLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CompanyId",
                table: "OutboundEmails",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PersonId",
                table: "OutboundEmails",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_OutboundEmails_CompanyId",
                table: "OutboundEmails",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_OutboundEmails_PersonId",
                table: "OutboundEmails",
                column: "PersonId");

            migrationBuilder.AddForeignKey(
                name: "FK_OutboundEmails_Companies_CompanyId",
                table: "OutboundEmails",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_OutboundEmails_LeadPersons_PersonId",
                table: "OutboundEmails",
                column: "PersonId",
                principalTable: "LeadPersons",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OutboundEmails_Companies_CompanyId",
                table: "OutboundEmails");

            migrationBuilder.DropForeignKey(
                name: "FK_OutboundEmails_LeadPersons_PersonId",
                table: "OutboundEmails");

            migrationBuilder.DropIndex(
                name: "IX_OutboundEmails_CompanyId",
                table: "OutboundEmails");

            migrationBuilder.DropIndex(
                name: "IX_OutboundEmails_PersonId",
                table: "OutboundEmails");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "OutboundEmails");

            migrationBuilder.DropColumn(
                name: "PersonId",
                table: "OutboundEmails");
        }
    }
}
