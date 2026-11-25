using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddMasterBackupRecordsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MasterBackupRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DatabaseName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    BackupType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    CompressedSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    LocalFilePath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CloudStorageKey = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CloudBucketName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ChecksumSha256 = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    IsEncrypted = table.Column<bool>(type: "bit", nullable: false),
                    EncryptionAlgorithm = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PurgedFromLocalUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterBackupRecords", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackupRecords_BackupType",
                table: "MasterBackupRecords",
                column: "BackupType");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackupRecords_CreatedAtUtc",
                table: "MasterBackupRecords",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackupRecords_DatabaseName",
                table: "MasterBackupRecords",
                column: "DatabaseName");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackupRecords_Status",
                table: "MasterBackupRecords",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackupRecords_TenantKey",
                table: "MasterBackupRecords",
                column: "TenantKey");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackupRecords_TenantKey_CreatedAtUtc",
                table: "MasterBackupRecords",
                columns: new[] { "TenantKey", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterBackupRecords");
        }
    }
}
