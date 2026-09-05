using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddSupportAndHelpdeskTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MasterSupportInquiries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Organization = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    JobTitle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    InquiryType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SuiteCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    FeatureCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Subject = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Culture = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterSupportInquiries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterHelpdeskArticles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SuiteCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    FeatureCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ContentHtml = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Culture = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    EstimatedReadMinutes = table.Column<int>(type: "int", nullable: false),
                    ViewCount = table.Column<int>(type: "int", nullable: false),
                    HelpfulCount = table.Column<int>(type: "int", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterHelpdeskArticles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterVideoGuides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SuiteCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    FeatureCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    YouTubeVideoId = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ThumbnailUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DurationSeconds = table.Column<int>(type: "int", nullable: false),
                    Culture = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    ViewCount = table.Column<int>(type: "int", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterVideoGuides", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportInquiries_ReferenceNumber",
                table: "MasterSupportInquiries",
                column: "ReferenceNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportInquiries_Email",
                table: "MasterSupportInquiries",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportInquiries_InquiryType",
                table: "MasterSupportInquiries",
                column: "InquiryType");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportInquiries_Status",
                table: "MasterSupportInquiries",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportInquiries_Culture",
                table: "MasterSupportInquiries",
                column: "Culture");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportInquiries_CreatedUtc",
                table: "MasterSupportInquiries",
                column: "CreatedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterHelpdeskArticles_Slug",
                table: "MasterHelpdeskArticles",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterHelpdeskArticles_SuiteCode",
                table: "MasterHelpdeskArticles",
                column: "SuiteCode");

            migrationBuilder.CreateIndex(
                name: "IX_MasterHelpdeskArticles_FeatureCode",
                table: "MasterHelpdeskArticles",
                column: "FeatureCode");

            migrationBuilder.CreateIndex(
                name: "IX_MasterHelpdeskArticles_Category",
                table: "MasterHelpdeskArticles",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_MasterHelpdeskArticles_Culture",
                table: "MasterHelpdeskArticles",
                column: "Culture");

            migrationBuilder.CreateIndex(
                name: "IX_MasterHelpdeskArticles_IsPublished",
                table: "MasterHelpdeskArticles",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_MasterHelpdeskArticles_SortOrder",
                table: "MasterHelpdeskArticles",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_MasterVideoGuides_SuiteCode",
                table: "MasterVideoGuides",
                column: "SuiteCode");

            migrationBuilder.CreateIndex(
                name: "IX_MasterVideoGuides_FeatureCode",
                table: "MasterVideoGuides",
                column: "FeatureCode");

            migrationBuilder.CreateIndex(
                name: "IX_MasterVideoGuides_Culture",
                table: "MasterVideoGuides",
                column: "Culture");

            migrationBuilder.CreateIndex(
                name: "IX_MasterVideoGuides_IsPublished",
                table: "MasterVideoGuides",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_MasterVideoGuides_SortOrder",
                table: "MasterVideoGuides",
                column: "SortOrder");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterSupportInquiries");

            migrationBuilder.DropTable(
                name: "MasterHelpdeskArticles");

            migrationBuilder.DropTable(
                name: "MasterVideoGuides");
        }
    }
}
