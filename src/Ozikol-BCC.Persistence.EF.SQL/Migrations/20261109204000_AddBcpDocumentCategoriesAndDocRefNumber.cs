using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddBcpDocumentCategoriesAndDocRefNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReferenceNumber",
                table: "BcpShiftDocuments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BcpDocumentCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsMandatory = table.Column<bool>(type: "bit", nullable: false),
                    RequiresExpiryDate = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpDocumentCategories", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BcpDocumentCategories_TenantKey_Code",
                table: "BcpDocumentCategories",
                columns: new[] { "TenantKey", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpDocumentCategories_TenantKey_IsActive",
                table: "BcpDocumentCategories",
                columns: new[] { "TenantKey", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpDocumentCategories_TenantKey_SortOrder",
                table: "BcpDocumentCategories",
                columns: new[] { "TenantKey", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BcpDocumentCategories");

            migrationBuilder.DropColumn(
                name: "ReferenceNumber",
                table: "BcpShiftDocuments");
        }
    }
}
