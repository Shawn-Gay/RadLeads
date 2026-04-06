using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadLeads.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameEnrichStatusFailed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE \"Companies\" SET \"EnrichStatus\" = 'ResearchFailed' WHERE \"EnrichStatus\" = 'Failed'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE \"Companies\" SET \"EnrichStatus\" = 'Failed' WHERE \"EnrichStatus\" = 'ResearchFailed'");
        }
    }
}
