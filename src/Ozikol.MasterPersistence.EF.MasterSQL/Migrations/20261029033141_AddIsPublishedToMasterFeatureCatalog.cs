using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddIsPublishedToMasterFeatureCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                table: "MasterFeatureCatalogs",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPublished",
                table: "MasterFeatureCatalogs");
        }
    }
}
