using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddBcpAiChatHistoriesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BcpAiChatHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    UserEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    PageRoute = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    PageTitle = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ProviderUsed = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PromptText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ResponseText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AttachedImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GeneratedCodeJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreviousSnapshotJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsImplemented = table.Column<bool>(type: "bit", nullable: false),
                    ImplementedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpAiChatHistories", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BcpAiChatHistories");
        }
    }
}
