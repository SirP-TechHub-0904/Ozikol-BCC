using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddMasterSupportFaqsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MasterSupportFaqs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Question = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Answer = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    SuiteCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Culture = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterSupportFaqs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportFaqs_Category",
                table: "MasterSupportFaqs",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportFaqs_Culture",
                table: "MasterSupportFaqs",
                column: "Culture");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportFaqs_IsPublished",
                table: "MasterSupportFaqs",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportFaqs_SortOrder",
                table: "MasterSupportFaqs",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportFaqs_SuiteCode",
                table: "MasterSupportFaqs",
                column: "SuiteCode");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterSupportFaqs");
        }
    }
}
