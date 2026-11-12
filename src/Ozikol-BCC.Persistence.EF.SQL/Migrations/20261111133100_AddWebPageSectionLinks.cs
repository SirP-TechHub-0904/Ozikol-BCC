using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddWebPageSectionLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WebPageSectionLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WebPageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PageSectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PageSortOrder = table.Column<int>(type: "int", nullable: false),
                    IsVisible = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebPageSectionLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WebPageSectionLinks_PageSections_PageSectionId",
                        column: x => x.PageSectionId,
                        principalTable: "PageSections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WebPageSectionLinks_WebPages_WebPageId",
                        column: x => x.WebPageId,
                        principalTable: "WebPages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WebPageSectionLinks_PageSectionId",
                table: "WebPageSectionLinks",
                column: "PageSectionId");

            migrationBuilder.CreateIndex(
                name: "IX_WebPageSectionLinks_WebPageId_PageSectionId",
                table: "WebPageSectionLinks",
                columns: new[] { "WebPageId", "PageSectionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WebPageSectionLinks");
        }
    }
}
