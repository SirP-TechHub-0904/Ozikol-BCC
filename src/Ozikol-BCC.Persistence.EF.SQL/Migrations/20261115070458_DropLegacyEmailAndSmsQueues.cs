using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class DropLegacyEmailAndSmsQueues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BcpEmailQueue");

            migrationBuilder.DropTable(
                name: "BcpSmsQueue");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BcpEmailQueue",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RelatedUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Category = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EventType = table.Column<int>(type: "int", nullable: true),
                    HtmlBody = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastError = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MaxRetries = table.Column<int>(type: "int", nullable: false),
                    PlainBody = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    RecipientEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    RecipientName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Retries = table.Column<int>(type: "int", nullable: false),
                    ScheduledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpEmailQueue", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpEmailQueue_AspNetUsers_RelatedUserId",
                        column: x => x.RelatedUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpSmsQueue",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RelatedUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Category = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EventType = table.Column<int>(type: "int", nullable: true),
                    LastError = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MaxRetries = table.Column<int>(type: "int", nullable: false),
                    Message = table.Column<string>(type: "nvarchar(480)", maxLength: 480, nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    RecipientPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Retries = table.Column<int>(type: "int", nullable: false),
                    ScheduledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpSmsQueue", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpSmsQueue_AspNetUsers_RelatedUserId",
                        column: x => x.RelatedUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_BcpEmailQueue_RelatedUserId",
                table: "BcpEmailQueue",
                column: "RelatedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpSmsQueue_RelatedUserId",
                table: "BcpSmsQueue",
                column: "RelatedUserId");
        }
    }
}
