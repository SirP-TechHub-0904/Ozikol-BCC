using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddCareersAndJobApplicationTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MasterJobOpenings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Department = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Location = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    EmploymentType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ExperienceLevel = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    LanguageRequirements = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    DescriptionHtml = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ResponsibilitiesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QualificationsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BenefitsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterJobOpenings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterJobApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterJobOpeningId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ApplicationReference = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Country = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LinkedInOrPortfolioUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CoverLetter = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CvFileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CvUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CvFileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    PassportFileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    PassportUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    PassportFileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReviewNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    TermsAgreed = table.Column<bool>(type: "bit", nullable: false),
                    ClientIp = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SubmittedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterJobApplications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterJobApplications_MasterJobOpenings_MasterJobOpeningId",
                        column: x => x.MasterJobOpeningId,
                        principalTable: "MasterJobOpenings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobApplications_ApplicationReference",
                table: "MasterJobApplications",
                column: "ApplicationReference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobApplications_Email",
                table: "MasterJobApplications",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobApplications_MasterJobOpeningId",
                table: "MasterJobApplications",
                column: "MasterJobOpeningId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobApplications_Status",
                table: "MasterJobApplications",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobApplications_SubmittedUtc",
                table: "MasterJobApplications",
                column: "SubmittedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobOpenings_Department",
                table: "MasterJobOpenings",
                column: "Department");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobOpenings_IsActive",
                table: "MasterJobOpenings",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobOpenings_LanguageRequirements",
                table: "MasterJobOpenings",
                column: "LanguageRequirements");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobOpenings_Location",
                table: "MasterJobOpenings",
                column: "Location");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobOpenings_Slug",
                table: "MasterJobOpenings",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobOpenings_SortOrder",
                table: "MasterJobOpenings",
                column: "SortOrder");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterJobApplications");

            migrationBuilder.DropTable(
                name: "MasterJobOpenings");
        }
    }
}
