using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddNewsAndCreatorTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MasterCreatorApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatorCode = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StudioOrBrandName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    PortfolioUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Specialization = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProposalPitch = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TermsAgreed = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReviewNotes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterCreatorApplications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterNewsCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Key = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    BadgeClass = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterNewsCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterNewsArticles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    CategoryKey = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    MasterNewsCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Excerpt = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ContentHtml = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AuthorName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AuthorRole = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReadTimeText = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IsFeatured = table.Column<bool>(type: "bit", nullable: false),
                    TagsJson = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CoverGradientClass = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterNewsArticles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterNewsArticles_MasterNewsCategories_MasterNewsCategoryId",
                        column: x => x.MasterNewsCategoryId,
                        principalTable: "MasterNewsCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterCreatorApplications_CreatedUtc",
                table: "MasterCreatorApplications",
                column: "CreatedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterCreatorApplications_CreatorCode",
                table: "MasterCreatorApplications",
                column: "CreatorCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterCreatorApplications_Email",
                table: "MasterCreatorApplications",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_MasterCreatorApplications_Status",
                table: "MasterCreatorApplications",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsArticles_CategoryKey",
                table: "MasterNewsArticles",
                column: "CategoryKey");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsArticles_IsFeatured",
                table: "MasterNewsArticles",
                column: "IsFeatured");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsArticles_IsPublished",
                table: "MasterNewsArticles",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsArticles_MasterNewsCategoryId",
                table: "MasterNewsArticles",
                column: "MasterNewsCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsArticles_PublishedAtUtc",
                table: "MasterNewsArticles",
                column: "PublishedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsArticles_Slug",
                table: "MasterNewsArticles",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsCategories_IsActive",
                table: "MasterNewsCategories",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsCategories_Key",
                table: "MasterNewsCategories",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsCategories_Slug",
                table: "MasterNewsCategories",
                column: "Slug");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterCreatorApplications");

            migrationBuilder.DropTable(
                name: "MasterNewsArticles");

            migrationBuilder.DropTable(
                name: "MasterNewsCategories");
        }
    }
}
