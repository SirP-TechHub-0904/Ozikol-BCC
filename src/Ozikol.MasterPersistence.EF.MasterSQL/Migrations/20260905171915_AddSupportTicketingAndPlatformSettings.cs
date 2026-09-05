using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddSupportTicketingAndPlatformSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AutoClosedReason",
                table: "MasterSupportInquiries",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ClosedAtUtc",
                table: "MasterSupportInquiries",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastActivityUtc",
                table: "MasterSupportInquiries",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateTable(
                name: "MasterPlatformSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    PlatformName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SupportContactEmail = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    DefaultFromEmail = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    EnableAdminNotifications = table.Column<bool>(type: "bit", nullable: false),
                    SupportAdminEmails = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PartnerAdminEmails = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatorAdminEmails = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CareersAdminEmails = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CertificationAdminEmails = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TicketAutoCloseHours = table.Column<int>(type: "int", nullable: false),
                    EnableTicketAutoClose = table.Column<bool>(type: "bit", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterPlatformSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterTicketReplies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterSupportInquiryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SenderName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    SenderEmail = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    IsStaffReply = table.Column<bool>(type: "bit", nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterTicketReplies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterTicketReplies_MasterSupportInquiries_MasterSupportInquiryId",
                        column: x => x.MasterSupportInquiryId,
                        principalTable: "MasterSupportInquiries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportInquiries_LastActivityUtc",
                table: "MasterSupportInquiries",
                column: "LastActivityUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTicketReplies_CreatedUtc",
                table: "MasterTicketReplies",
                column: "CreatedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTicketReplies_MasterSupportInquiryId",
                table: "MasterTicketReplies",
                column: "MasterSupportInquiryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterPlatformSettings");

            migrationBuilder.DropTable(
                name: "MasterTicketReplies");

            migrationBuilder.DropIndex(
                name: "IX_MasterSupportInquiries_LastActivityUtc",
                table: "MasterSupportInquiries");

            migrationBuilder.DropColumn(
                name: "AutoClosedReason",
                table: "MasterSupportInquiries");

            migrationBuilder.DropColumn(
                name: "ClosedAtUtc",
                table: "MasterSupportInquiries");

            migrationBuilder.DropColumn(
                name: "LastActivityUtc",
                table: "MasterSupportInquiries");
        }
    }
}
