using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadLeads.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixDialDispositionDefault : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Fix existing rows that got the empty-string default from the AddDialerAssignment migration.
            migrationBuilder.Sql(
                "UPDATE \"Companies\" SET \"DialDisposition\" = 'None' WHERE \"DialDisposition\" = ''");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
