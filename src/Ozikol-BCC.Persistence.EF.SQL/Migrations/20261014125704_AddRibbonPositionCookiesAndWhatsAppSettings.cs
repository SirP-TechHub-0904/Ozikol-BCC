using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddRibbonPositionCookiesAndWhatsAppSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AddToRibon",
                table: "WebPages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RibonCustomDisplayTitle",
                table: "WebPages",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RibonSortOrder",
                table: "WebPages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "BreakingNewsRibonPosition",
                table: "MisWebsiteSettings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BreakingNewsRibonTitle",
                table: "MisWebsiteSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CookieConsentAcceptText",
                table: "MisWebsiteSettings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CookieConsentDeclineText",
                table: "MisWebsiteSettings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CookieConsentMessage",
                table: "MisWebsiteSettings",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CookieConsentPolicyUrl",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CookieConsentTitle",
                table: "MisWebsiteSettings",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "EnableBreakingNewsRibon",
                table: "MisWebsiteSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EnableCookieConsent",
                table: "MisWebsiteSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EnableWhatsAppChat",
                table: "MisWebsiteSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppNumber",
                table: "MisWebsiteSettings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppPromptMessage",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppWidgetSubtitle",
                table: "MisWebsiteSettings",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppWidgetTitle",
                table: "MisWebsiteSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AddToRibon",
                table: "WebPages");

            migrationBuilder.DropColumn(
                name: "RibonCustomDisplayTitle",
                table: "WebPages");

            migrationBuilder.DropColumn(
                name: "RibonSortOrder",
                table: "WebPages");

            migrationBuilder.DropColumn(
                name: "BreakingNewsRibonPosition",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "BreakingNewsRibonTitle",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "CookieConsentAcceptText",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "CookieConsentDeclineText",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "CookieConsentMessage",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "CookieConsentPolicyUrl",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "CookieConsentTitle",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "EnableBreakingNewsRibon",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "EnableCookieConsent",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "EnableWhatsAppChat",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "WhatsAppNumber",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "WhatsAppPromptMessage",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "WhatsAppWidgetSubtitle",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "WhatsAppWidgetTitle",
                table: "MisWebsiteSettings");
        }
    }
}
