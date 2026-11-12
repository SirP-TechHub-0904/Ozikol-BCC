using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddUnifiedBcpMessagePool : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BcpMessagePools",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Channel = table.Column<int>(type: "int", nullable: false),
                    RelatedUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    RecipientAddress = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    RecipientName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Subject = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PlainTextFallback = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ActionUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Icon = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    Category = table.Column<int>(type: "int", nullable: false),
                    Severity = table.Column<int>(type: "int", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    EventType = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Retries = table.Column<int>(type: "int", nullable: false),
                    MaxRetries = table.Column<int>(type: "int", nullable: false),
                    LastError = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProviderMessageId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    SenderOrTemplateName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MetadataJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ScheduledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpMessagePools", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpMessagePools_AspNetUsers_RelatedUserId",
                        column: x => x.RelatedUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BcpMessagePools_Channel",
                table: "BcpMessagePools",
                column: "Channel");

            migrationBuilder.CreateIndex(
                name: "IX_BcpMessagePools_Channel_Status",
                table: "BcpMessagePools",
                columns: new[] { "Channel", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpMessagePools_CreatedAt",
                table: "BcpMessagePools",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_BcpMessagePools_RecipientAddress",
                table: "BcpMessagePools",
                column: "RecipientAddress");

            migrationBuilder.CreateIndex(
                name: "IX_BcpMessagePools_RelatedUserId",
                table: "BcpMessagePools",
                column: "RelatedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpMessagePools_ScheduledAt",
                table: "BcpMessagePools",
                column: "ScheduledAt");

            migrationBuilder.CreateIndex(
                name: "IX_BcpMessagePools_Status",
                table: "BcpMessagePools",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BcpMessagePools");
        }
    }
}
