using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddMasterApiErrorLogsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MasterApiErrorLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterTenantCatalogId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    OrganizationName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SourceScope = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ErrorCode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CustomError = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    RealError = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StackTrace = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HttpMethod = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Endpoint = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    HttpStatusCode = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    UserEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    TraceId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterApiErrorLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterApiErrorLogs_MasterTenantCatalogs_MasterTenantCatalogId",
                        column: x => x.MasterTenantCatalogId,
                        principalTable: "MasterTenantCatalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterApiErrorLogs_CreatedUtc",
                table: "MasterApiErrorLogs",
                column: "CreatedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterApiErrorLogs_ErrorCode",
                table: "MasterApiErrorLogs",
                column: "ErrorCode");

            migrationBuilder.CreateIndex(
                name: "IX_MasterApiErrorLogs_MasterTenantCatalogId",
                table: "MasterApiErrorLogs",
                column: "MasterTenantCatalogId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterApiErrorLogs_SourceScope",
                table: "MasterApiErrorLogs",
                column: "SourceScope");

            migrationBuilder.CreateIndex(
                name: "IX_MasterApiErrorLogs_TenantKey",
                table: "MasterApiErrorLogs",
                column: "TenantKey");

            migrationBuilder.CreateIndex(
                name: "IX_MasterApiErrorLogs_TraceId",
                table: "MasterApiErrorLogs",
                column: "TraceId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterApiErrorLogs");
        }
    }
}
