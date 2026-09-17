using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantLifecycleAndAuditColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "MasterTenantCatalogs",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastUpdatedBy",
                table: "MasterTenantCatalogs",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsSuspended",
                table: "MasterTenantCatalogs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "SuspendedUtc",
                table: "MasterTenantCatalogs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SuspendedBy",
                table: "MasterTenantCatalogs",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SuspensionReason",
                table: "MasterTenantCatalogs",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "MasterTenantCatalogs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedUtc",
                table: "MasterTenantCatalogs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                table: "MasterTenantCatalogs",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletionReason",
                table: "MasterTenantCatalogs",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterTenantCatalogs_IsDeleted",
                table: "MasterTenantCatalogs",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTenantCatalogs_IsSuspended",
                table: "MasterTenantCatalogs",
                column: "IsSuspended");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MasterTenantCatalogs_IsDeleted",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropIndex(
                name: "IX_MasterTenantCatalogs_IsSuspended",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "LastUpdatedBy",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "IsSuspended",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "SuspendedUtc",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "SuspendedBy",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "SuspensionReason",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "DeletedUtc",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "DeletionReason",
                table: "MasterTenantCatalogs");
        }
    }
}
