using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddMasterAiApiKeyPoolAndUsageLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterNotificationPreferences");

            migrationBuilder.CreateTable(
                name: "MasterAiApiKeys",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    KeyAlias = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ApiKey = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    DailyQuotaLimit = table.Column<int>(type: "int", nullable: false),
                    TodayRequestsCount = table.Column<int>(type: "int", nullable: false),
                    TotalRequestsCount = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    RateLimitCooldownUntilUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastUsedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterAiApiKeys", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterAiApiKeyUsageLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MasterAiApiKeyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActionName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RequestTimestampUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResponseTimeMs = table.Column<int>(type: "int", nullable: false),
                    StatusCode = table.Column<int>(type: "int", nullable: false),
                    PromptTokens = table.Column<int>(type: "int", nullable: true),
                    CompletionTokens = table.Column<int>(type: "int", nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterAiApiKeyUsageLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterAiApiKeyUsageLogs_MasterAiApiKeys_MasterAiApiKeyId",
                        column: x => x.MasterAiApiKeyId,
                        principalTable: "MasterAiApiKeys",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterAiApiKeys_IsActive",
                table: "MasterAiApiKeys",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAiApiKeys_Provider",
                table: "MasterAiApiKeys",
                column: "Provider");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAiApiKeys_RateLimitCooldownUntilUtc",
                table: "MasterAiApiKeys",
                column: "RateLimitCooldownUntilUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAiApiKeys_Status",
                table: "MasterAiApiKeys",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAiApiKeyUsageLogs_ActionName",
                table: "MasterAiApiKeyUsageLogs",
                column: "ActionName");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAiApiKeyUsageLogs_MasterAiApiKeyId",
                table: "MasterAiApiKeyUsageLogs",
                column: "MasterAiApiKeyId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAiApiKeyUsageLogs_RequestTimestampUtc",
                table: "MasterAiApiKeyUsageLogs",
                column: "RequestTimestampUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAiApiKeyUsageLogs_StatusCode",
                table: "MasterAiApiKeyUsageLogs",
                column: "StatusCode");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterAiApiKeyUsageLogs");

            migrationBuilder.DropTable(
                name: "MasterAiApiKeys");

            migrationBuilder.CreateTable(
                name: "MasterNotificationPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    EmailDigestEnabled = table.Column<bool>(type: "bit", nullable: false),
                    InAppEnabled = table.Column<bool>(type: "bit", nullable: false),
                    InstantEmailEnabled = table.Column<bool>(type: "bit", nullable: false),
                    PushEnabled = table.Column<bool>(type: "bit", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterNotificationPreferences", x => x.Id);
                });
        }
    }
}
