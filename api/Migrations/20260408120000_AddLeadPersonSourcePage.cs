using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadLeads.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLeadPersonSourcePage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SourcePage",
                table: "LeadPersons",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SourcePage",
                table: "LeadPersons");
        }
    }
}
