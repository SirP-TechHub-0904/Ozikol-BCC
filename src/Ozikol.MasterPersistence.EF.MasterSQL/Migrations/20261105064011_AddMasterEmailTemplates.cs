using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddMasterEmailTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MasterEmailTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TemplateType = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    BodyHtml = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterEmailTemplates", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterEmailTemplates_IsActive",
                table: "MasterEmailTemplates",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterEmailTemplates_TemplateType",
                table: "MasterEmailTemplates",
                column: "TemplateType",
                unique: true);

            // Seed canonical default Welcome Email template directly in migration
            migrationBuilder.InsertData(
                table: "MasterEmailTemplates",
                columns: new[] { "Id", "TemplateType", "Name", "Subject", "BodyHtml", "IsActive", "CreatedUtc", "UpdatedUtc" },
                values: new object[]
                {
                    new Guid("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"),
                    1,
                    "Welcome Email",
                    "Welcome to Ozikol Business Command Center — {{businessname}}",
                    @"<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 36px; border: 1px solid #e2e8f0; border-radius: 12px;"">
    <div style=""text-align: center; margin-bottom: 28px;"">
        <img src=""https://ozikol.cloud/assets/images/ozikol.png"" alt=""Ozikol Business Command Center"" style=""height: 40px; margin-bottom: 16px;"" />
        <h1 style=""color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 8px;"">Welcome to Ozikol, {{businessname}}!</h1>
        <p style=""color: #64748b; font-size: 14.5px; margin: 0;"">We are thrilled to welcome you to the Ozikol Business Command Center.</p>
    </div>
    <div style=""background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin-bottom: 24px; line-height: 1.6; font-size: 14.5px; color: #334155;"">
        <p style=""margin-top: 0;"">Dear <strong>{{businessname}}</strong>,</p>
        <p>Thank you for choosing <strong>Ozikol Business Command Center</strong> to power your enterprise operations. Your workspace is configured to help your organization manage operations, team collaboration, finances, and multi-channel customer communications from one unified center.</p>
        <p>You will shortly receive your workspace setup details with direct credentials and dedicated portal links to access your workspace anytime.</p>
        <p style=""margin-bottom: 0;"">If you ever need guidance or have questions, our specialist support engineering team is always here to assist you.</p>
    </div>
    <div style=""text-align: center; margin-bottom: 28px;"">
        <a href=""https://ozikol.cloud"" style=""display: inline-block; background: #0050e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none;"">Explore Ozikol &rarr;</a>
    </div>
    <hr style=""border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px;"" />
    <p style=""color: #94a3b8; font-size: 12px; text-align: center; margin: 0;"">
        Ozikol Business Command Center &bull; Enterprise Operations Suite
    </p>
</div>",
                    true,
                    new DateTime(2026, 11, 5, 0, 0, 0, 0, DateTimeKind.Utc),
                    null
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterEmailTemplates");
        }
    }
}
