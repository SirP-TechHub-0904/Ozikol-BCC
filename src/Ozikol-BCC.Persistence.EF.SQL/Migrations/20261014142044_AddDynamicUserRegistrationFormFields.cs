using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddDynamicUserRegistrationFormFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowPublicRegistration",
                table: "MisConfigurationSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RegistrationSuccessMessage",
                table: "MisConfigurationSettings",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RegistrationWelcomeMessage",
                table: "MisConfigurationSettings",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "RequireApprovalBeforeLogin",
                table: "MisConfigurationSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "CustomAttributesJson",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BcpRegistrationFormFields",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FieldKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Placeholder = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    FieldType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    OptionsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    BcpUserCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    HelpText = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ShowInWorkspaceProfile = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpRegistrationFormFields", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpRegistrationFormFields_BcpUserCategories_BcpUserCategoryId",
                        column: x => x.BcpUserCategoryId,
                        principalTable: "BcpUserCategories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_BcpRegistrationFormFields_BcpUserCategoryId",
                table: "BcpRegistrationFormFields",
                column: "BcpUserCategoryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BcpRegistrationFormFields");

            migrationBuilder.DropColumn(
                name: "AllowPublicRegistration",
                table: "MisConfigurationSettings");

            migrationBuilder.DropColumn(
                name: "RegistrationSuccessMessage",
                table: "MisConfigurationSettings");

            migrationBuilder.DropColumn(
                name: "RegistrationWelcomeMessage",
                table: "MisConfigurationSettings");

            migrationBuilder.DropColumn(
                name: "RequireApprovalBeforeLogin",
                table: "MisConfigurationSettings");

            migrationBuilder.DropColumn(
                name: "CustomAttributesJson",
                table: "AspNetUsers");
        }
    }
}
