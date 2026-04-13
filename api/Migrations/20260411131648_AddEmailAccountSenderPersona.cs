using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadLeads.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailAccountSenderPersona : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CalendarLink",
                table: "EmailAccounts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanyName",
                table: "EmailAccounts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FirstName",
                table: "EmailAccounts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastName",
                table: "EmailAccounts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "EmailAccounts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Signature",
                table: "EmailAccounts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "EmailAccounts",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CalendarLink",
                table: "EmailAccounts");

            migrationBuilder.DropColumn(
                name: "CompanyName",
                table: "EmailAccounts");

            migrationBuilder.DropColumn(
                name: "FirstName",
                table: "EmailAccounts");

            migrationBuilder.DropColumn(
                name: "LastName",
                table: "EmailAccounts");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "EmailAccounts");

            migrationBuilder.DropColumn(
                name: "Signature",
                table: "EmailAccounts");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "EmailAccounts");
        }
    }
}
