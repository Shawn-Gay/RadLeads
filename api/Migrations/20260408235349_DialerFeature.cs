using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadLeads.Api.Migrations
{
    /// <inheritdoc />
    public partial class DialerFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CallLogs_LeadPersons_PersonId",
                table: "CallLogs");

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Companies",
                type: "text",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "PersonId",
                table: "CallLogs",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "CompanyId",
                table: "CallLogs",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CallLogs_CompanyId",
                table: "CallLogs",
                column: "CompanyId");

            migrationBuilder.AddForeignKey(
                name: "FK_CallLogs_Companies_CompanyId",
                table: "CallLogs",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CallLogs_LeadPersons_PersonId",
                table: "CallLogs",
                column: "PersonId",
                principalTable: "LeadPersons",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CallLogs_Companies_CompanyId",
                table: "CallLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_CallLogs_LeadPersons_PersonId",
                table: "CallLogs");

            migrationBuilder.DropIndex(
                name: "IX_CallLogs_CompanyId",
                table: "CallLogs");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "CallLogs");

            migrationBuilder.AlterColumn<Guid>(
                name: "PersonId",
                table: "CallLogs",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_CallLogs_LeadPersons_PersonId",
                table: "CallLogs",
                column: "PersonId",
                principalTable: "LeadPersons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
