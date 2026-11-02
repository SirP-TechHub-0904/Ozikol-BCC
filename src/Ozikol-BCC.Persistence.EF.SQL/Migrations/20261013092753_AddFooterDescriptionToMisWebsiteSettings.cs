using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddFooterDescriptionToMisWebsiteSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "AddressOne",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "AddressTwo",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "BillingEmail",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "City",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "ContactEmail",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "EmailOne",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "EmailTwo",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "FacebookPage",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "FacebookUrl",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "GitHubUrl",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "GoogleMapUrl",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "InstagramPage",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "InstagramUrl",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "LinkedInUrl",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "PhoneOne",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "PhoneTwo",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "PrimaryPhone",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "SalesEmail",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "SecondaryPhone",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "State",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "SupportEmail",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "TikTokUrl",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "TiktokPage",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "TwitterPage",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "TwitterUrl",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "WhatsAppNumber",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "WorkingHours",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "YouTubeUrl",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "YoutubeChannel",
                table: "MisWebsiteSettings");

            migrationBuilder.AddColumn<string>(
                name: "FooterDescription",
                table: "MisWebsiteSettings",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FooterNote",
                table: "MisWebsiteSettings",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FooterDescription",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "FooterNote",
                table: "MisWebsiteSettings");

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressOne",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressTwo",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BillingEmail",
                table: "MisWebsiteSettings",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "MisWebsiteSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContactEmail",
                table: "MisWebsiteSettings",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "MisWebsiteSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmailOne",
                table: "MisWebsiteSettings",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmailTwo",
                table: "MisWebsiteSettings",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FacebookPage",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FacebookUrl",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GitHubUrl",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GoogleMapUrl",
                table: "MisWebsiteSettings",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InstagramPage",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InstagramUrl",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LinkedInUrl",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneOne",
                table: "MisWebsiteSettings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneTwo",
                table: "MisWebsiteSettings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrimaryPhone",
                table: "MisWebsiteSettings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SalesEmail",
                table: "MisWebsiteSettings",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SecondaryPhone",
                table: "MisWebsiteSettings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "MisWebsiteSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupportEmail",
                table: "MisWebsiteSettings",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TikTokUrl",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TiktokPage",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TwitterPage",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TwitterUrl",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppNumber",
                table: "MisWebsiteSettings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkingHours",
                table: "MisWebsiteSettings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "YouTubeUrl",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "YoutubeChannel",
                table: "MisWebsiteSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);
        }
    }
}
