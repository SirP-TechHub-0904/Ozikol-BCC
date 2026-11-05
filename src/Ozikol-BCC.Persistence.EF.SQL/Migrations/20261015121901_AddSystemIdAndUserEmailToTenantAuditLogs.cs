using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddSystemIdAndUserEmailToTenantAuditLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "UserAgent",
                table: "BcpLoginAuditLogs",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "IpAddress",
                table: "BcpLoginAuditLogs",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SystemId",
                table: "BcpLoginAuditLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserId",
                table: "BcpLoginAuditLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "TargetProfileId",
                table: "BcpActivityLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "TargetFullName",
                table: "BcpActivityLogs",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PerformedByProfileId",
                table: "BcpActivityLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PerformedByFullName",
                table: "BcpActivityLogs",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Module",
                table: "BcpActivityLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "IpAddress",
                table: "BcpActivityLogs",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "BcpActivityLogs",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "ActionType",
                table: "BcpActivityLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "PerformedByUserEmail",
                table: "BcpActivityLogs",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SystemId",
                table: "BcpActivityLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserAgent",
                table: "BcpActivityLogs",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpLoginAuditLogs_Email",
                table: "BcpLoginAuditLogs",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_BcpLoginAuditLogs_IpAddress",
                table: "BcpLoginAuditLogs",
                column: "IpAddress");

            migrationBuilder.CreateIndex(
                name: "IX_BcpLoginAuditLogs_SystemId",
                table: "BcpLoginAuditLogs",
                column: "SystemId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpLoginAuditLogs_Timestamp",
                table: "BcpLoginAuditLogs",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_BcpLoginAuditLogs_UserId",
                table: "BcpLoginAuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpActivityLogs_ActionType",
                table: "BcpActivityLogs",
                column: "ActionType");

            migrationBuilder.CreateIndex(
                name: "IX_BcpActivityLogs_Date",
                table: "BcpActivityLogs",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_BcpActivityLogs_IpAddress",
                table: "BcpActivityLogs",
                column: "IpAddress");

            migrationBuilder.CreateIndex(
                name: "IX_BcpActivityLogs_PerformedByProfileId",
                table: "BcpActivityLogs",
                column: "PerformedByProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpActivityLogs_PerformedByUserEmail",
                table: "BcpActivityLogs",
                column: "PerformedByUserEmail");

            migrationBuilder.CreateIndex(
                name: "IX_BcpActivityLogs_SystemId",
                table: "BcpActivityLogs",
                column: "SystemId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BcpLoginAuditLogs_Email",
                table: "BcpLoginAuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_BcpLoginAuditLogs_IpAddress",
                table: "BcpLoginAuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_BcpLoginAuditLogs_SystemId",
                table: "BcpLoginAuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_BcpLoginAuditLogs_Timestamp",
                table: "BcpLoginAuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_BcpLoginAuditLogs_UserId",
                table: "BcpLoginAuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_BcpActivityLogs_ActionType",
                table: "BcpActivityLogs");

            migrationBuilder.DropIndex(
                name: "IX_BcpActivityLogs_Date",
                table: "BcpActivityLogs");

            migrationBuilder.DropIndex(
                name: "IX_BcpActivityLogs_IpAddress",
                table: "BcpActivityLogs");

            migrationBuilder.DropIndex(
                name: "IX_BcpActivityLogs_PerformedByProfileId",
                table: "BcpActivityLogs");

            migrationBuilder.DropIndex(
                name: "IX_BcpActivityLogs_PerformedByUserEmail",
                table: "BcpActivityLogs");

            migrationBuilder.DropIndex(
                name: "IX_BcpActivityLogs_SystemId",
                table: "BcpActivityLogs");

            migrationBuilder.DropColumn(
                name: "SystemId",
                table: "BcpLoginAuditLogs");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "BcpLoginAuditLogs");

            migrationBuilder.DropColumn(
                name: "PerformedByUserEmail",
                table: "BcpActivityLogs");

            migrationBuilder.DropColumn(
                name: "SystemId",
                table: "BcpActivityLogs");

            migrationBuilder.DropColumn(
                name: "UserAgent",
                table: "BcpActivityLogs");

            migrationBuilder.AlterColumn<string>(
                name: "UserAgent",
                table: "BcpLoginAuditLogs",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "IpAddress",
                table: "BcpLoginAuditLogs",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(60)",
                oldMaxLength: 60,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "TargetProfileId",
                table: "BcpActivityLogs",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "TargetFullName",
                table: "BcpActivityLogs",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PerformedByProfileId",
                table: "BcpActivityLogs",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PerformedByFullName",
                table: "BcpActivityLogs",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Module",
                table: "BcpActivityLogs",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "IpAddress",
                table: "BcpActivityLogs",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(60)",
                oldMaxLength: 60,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "BcpActivityLogs",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AlterColumn<string>(
                name: "ActionType",
                table: "BcpActivityLogs",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);
        }
    }
}
