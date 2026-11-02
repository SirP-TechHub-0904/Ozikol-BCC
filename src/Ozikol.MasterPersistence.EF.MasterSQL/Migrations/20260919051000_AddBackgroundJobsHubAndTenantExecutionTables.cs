using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddBackgroundJobsHubAndTenantExecutionTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MasterBackgroundJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    JobKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Scope = table.Column<int>(type: "int", nullable: false),
                    TargetTenantCatalogId = table.Column<int>(type: "int", nullable: true),
                    ScheduleCron = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IntervalSeconds = table.Column<int>(type: "int", nullable: false),
                    JobParametersJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    LastRunUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NextRunUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastDurationMs = table.Column<long>(type: "bigint", nullable: false),
                    LastResultSummary = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterBackgroundJobs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterBackgroundJobs_MasterTenantCatalogs_TargetTenantCatalogId",
                        column: x => x.TargetTenantCatalogId,
                        principalTable: "MasterTenantCatalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "MasterBackgroundJobLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    JobId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetTenantCatalogId = table.Column<int>(type: "int", nullable: true),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    StartedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DurationMs = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ItemsProcessedCount = table.Column<int>(type: "int", nullable: false),
                    SummaryMessage = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    LogOutput = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ErrorDetails = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterBackgroundJobLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterBackgroundJobLogs_MasterBackgroundJobs_JobId",
                        column: x => x.JobId,
                        principalTable: "MasterBackgroundJobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MasterBackgroundJobLogs_MasterTenantCatalogs_TargetTenantCatalogId",
                        column: x => x.TargetTenantCatalogId,
                        principalTable: "MasterTenantCatalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackgroundJobLogs_JobId",
                table: "MasterBackgroundJobLogs",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackgroundJobLogs_StartedAtUtc",
                table: "MasterBackgroundJobLogs",
                column: "StartedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackgroundJobLogs_Status",
                table: "MasterBackgroundJobLogs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackgroundJobLogs_TargetTenantCatalogId",
                table: "MasterBackgroundJobLogs",
                column: "TargetTenantCatalogId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackgroundJobLogs_TenantKey",
                table: "MasterBackgroundJobLogs",
                column: "TenantKey");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackgroundJobs_IsEnabled",
                table: "MasterBackgroundJobs",
                column: "IsEnabled");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackgroundJobs_JobKey",
                table: "MasterBackgroundJobs",
                column: "JobKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackgroundJobs_NextRunUtc",
                table: "MasterBackgroundJobs",
                column: "NextRunUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackgroundJobs_Scope",
                table: "MasterBackgroundJobs",
                column: "Scope");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackgroundJobs_Status",
                table: "MasterBackgroundJobs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBackgroundJobs_TargetTenantCatalogId",
                table: "MasterBackgroundJobs",
                column: "TargetTenantCatalogId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterBackgroundJobLogs");

            migrationBuilder.DropTable(
                name: "MasterBackgroundJobs");
        }
    }
}
