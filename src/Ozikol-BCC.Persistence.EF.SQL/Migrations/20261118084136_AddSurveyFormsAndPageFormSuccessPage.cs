using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddSurveyFormsAndPageFormSuccessPage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ShowSuccessPage",
                table: "PageForms",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SuccessPageButtonText",
                table: "PageForms",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SuccessPageTitle",
                table: "PageForms",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SuccessRedirectUrl",
                table: "PageForms",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BcpSurveyForms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    AllowAnonymous = table.Column<bool>(type: "bit", nullable: false),
                    ShowSuccessPage = table.Column<bool>(type: "bit", nullable: false),
                    SuccessPageTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SuccessMessage = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    SuccessPageButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpSurveyForms", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpSurveyFormFields",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpSurveyFormId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FieldKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Placeholder = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    FieldType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    OptionsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpSurveyFormFields", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpSurveyFormFields_BcpSurveyForms_BcpSurveyFormId",
                        column: x => x.BcpSurveyFormId,
                        principalTable: "BcpSurveyForms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpSurveySubmissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpSurveyFormId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DataJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RespondentUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AdminNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    SubmittedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpSurveySubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpSurveySubmissions_BcpSurveyForms_BcpSurveyFormId",
                        column: x => x.BcpSurveyFormId,
                        principalTable: "BcpSurveyForms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BcpSurveyFormFields_BcpSurveyFormId",
                table: "BcpSurveyFormFields",
                column: "BcpSurveyFormId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpSurveyForms_Slug",
                table: "BcpSurveyForms",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpSurveySubmissions_BcpSurveyFormId",
                table: "BcpSurveySubmissions",
                column: "BcpSurveyFormId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BcpSurveyFormFields");

            migrationBuilder.DropTable(
                name: "BcpSurveySubmissions");

            migrationBuilder.DropTable(
                name: "BcpSurveyForms");

            migrationBuilder.DropColumn(
                name: "ShowSuccessPage",
                table: "PageForms");

            migrationBuilder.DropColumn(
                name: "SuccessPageButtonText",
                table: "PageForms");

            migrationBuilder.DropColumn(
                name: "SuccessPageTitle",
                table: "PageForms");

            migrationBuilder.DropColumn(
                name: "SuccessRedirectUrl",
                table: "PageForms");
        }
    }
}
