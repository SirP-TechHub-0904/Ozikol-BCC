using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class ChangeMasterTenantCatalogIdToGuid : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // In SQL Server, an IDENTITY column cannot be altered to a non-identity GUID directly via ALTER COLUMN.
            // We drop FK constraints, create a temporary GUID column, backfill child tables, swap the PK column, and recreate constraints.
            migrationBuilder.Sql(@"
-- 1. Drop referencing foreign keys if they exist
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_MasterTenantFeatureSubscriptions_MasterTenantCatalogs_MasterTenantCatalogId')
    ALTER TABLE [MasterTenantFeatureSubscriptions] DROP CONSTRAINT [FK_MasterTenantFeatureSubscriptions_MasterTenantCatalogs_MasterTenantCatalogId];

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_MasterCouponRedemptions_MasterTenantCatalogs_MasterTenantCatalogId')
    ALTER TABLE [MasterCouponRedemptions] DROP CONSTRAINT [FK_MasterCouponRedemptions_MasterTenantCatalogs_MasterTenantCatalogId];

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_MasterBillingTransactions_MasterTenantCatalogs_MasterTenantCatalogId')
    ALTER TABLE [MasterBillingTransactions] DROP CONSTRAINT [FK_MasterBillingTransactions_MasterTenantCatalogs_MasterTenantCatalogId];

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_MasterBackgroundJobs_MasterTenantCatalogs_TargetTenantCatalogId')
    ALTER TABLE [MasterBackgroundJobs] DROP CONSTRAINT [FK_MasterBackgroundJobs_MasterTenantCatalogs_TargetTenantCatalogId];

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_MasterBackgroundJobLogs_MasterTenantCatalogs_TargetTenantCatalogId')
    ALTER TABLE [MasterBackgroundJobLogs] DROP CONSTRAINT [FK_MasterBackgroundJobLogs_MasterTenantCatalogs_TargetTenantCatalogId];

-- 2. Drop Primary Key constraint on MasterTenantCatalogs
DECLARE @pkName NVARCHAR(200);
SELECT @pkName = name FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID('MasterTenantCatalogs') AND type = 'PK';
IF @pkName IS NOT NULL
    EXEC('ALTER TABLE [MasterTenantCatalogs] DROP CONSTRAINT [' + @pkName + ']');

-- 3. In MasterTenantCatalogs: Add temporary Guid column and populate with NEWID()
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MasterTenantCatalogs') AND name = 'TempGuidId')
    ALTER TABLE [MasterTenantCatalogs] ADD [TempGuidId] uniqueidentifier NOT NULL DEFAULT NEWID();

-- 4. In child tables: Add temporary Guid column and populate from parent's TempGuidId matching on old int Id
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MasterTenantFeatureSubscriptions') AND name = 'TempMasterTenantCatalogId')
BEGIN
    ALTER TABLE [MasterTenantFeatureSubscriptions] ADD [TempMasterTenantCatalogId] uniqueidentifier NULL;
    EXEC('UPDATE s SET s.[TempMasterTenantCatalogId] = t.[TempGuidId] FROM [MasterTenantFeatureSubscriptions] s INNER JOIN [MasterTenantCatalogs] t ON s.[MasterTenantCatalogId] = t.[Id]');
    ALTER TABLE [MasterTenantFeatureSubscriptions] DROP COLUMN [MasterTenantCatalogId];
    EXEC sp_rename 'MasterTenantFeatureSubscriptions.TempMasterTenantCatalogId', 'MasterTenantCatalogId', 'COLUMN';
    ALTER TABLE [MasterTenantFeatureSubscriptions] ALTER COLUMN [MasterTenantCatalogId] uniqueidentifier NOT NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MasterCouponRedemptions') AND name = 'TempMasterTenantCatalogId')
BEGIN
    ALTER TABLE [MasterCouponRedemptions] ADD [TempMasterTenantCatalogId] uniqueidentifier NULL;
    EXEC('UPDATE c SET c.[TempMasterTenantCatalogId] = t.[TempGuidId] FROM [MasterCouponRedemptions] c INNER JOIN [MasterTenantCatalogs] t ON c.[MasterTenantCatalogId] = t.[Id]');
    ALTER TABLE [MasterCouponRedemptions] DROP COLUMN [MasterTenantCatalogId];
    EXEC sp_rename 'MasterCouponRedemptions.TempMasterTenantCatalogId', 'MasterTenantCatalogId', 'COLUMN';
    ALTER TABLE [MasterCouponRedemptions] ALTER COLUMN [MasterTenantCatalogId] uniqueidentifier NOT NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MasterBillingTransactions') AND name = 'TempMasterTenantCatalogId')
BEGIN
    ALTER TABLE [MasterBillingTransactions] ADD [TempMasterTenantCatalogId] uniqueidentifier NULL;
    EXEC('UPDATE b SET b.[TempMasterTenantCatalogId] = t.[TempGuidId] FROM [MasterBillingTransactions] b INNER JOIN [MasterTenantCatalogs] t ON b.[MasterTenantCatalogId] = t.[Id]');
    ALTER TABLE [MasterBillingTransactions] DROP COLUMN [MasterTenantCatalogId];
    EXEC sp_rename 'MasterBillingTransactions.TempMasterTenantCatalogId', 'MasterTenantCatalogId', 'COLUMN';
    ALTER TABLE [MasterBillingTransactions] ALTER COLUMN [MasterTenantCatalogId] uniqueidentifier NOT NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MasterBackgroundJobs') AND name = 'TempTargetTenantCatalogId')
BEGIN
    ALTER TABLE [MasterBackgroundJobs] ADD [TempTargetTenantCatalogId] uniqueidentifier NULL;
    EXEC('UPDATE j SET j.[TempTargetTenantCatalogId] = t.[TempGuidId] FROM [MasterBackgroundJobs] j INNER JOIN [MasterTenantCatalogs] t ON j.[TargetTenantCatalogId] = t.[Id]');
    ALTER TABLE [MasterBackgroundJobs] DROP COLUMN [TargetTenantCatalogId];
    EXEC sp_rename 'MasterBackgroundJobs.TempTargetTenantCatalogId', 'TargetTenantCatalogId', 'COLUMN';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MasterBackgroundJobLogs') AND name = 'TempTargetTenantCatalogId')
BEGIN
    ALTER TABLE [MasterBackgroundJobLogs] ADD [TempTargetTenantCatalogId] uniqueidentifier NULL;
    EXEC('UPDATE l SET l.[TempTargetTenantCatalogId] = t.[TempGuidId] FROM [MasterBackgroundJobLogs] l INNER JOIN [MasterTenantCatalogs] t ON l.[TargetTenantCatalogId] = t.[Id]');
    ALTER TABLE [MasterBackgroundJobLogs] DROP COLUMN [TargetTenantCatalogId];
    EXEC sp_rename 'MasterBackgroundJobLogs.TempTargetTenantCatalogId', 'TargetTenantCatalogId', 'COLUMN';
END

-- 5. Drop old int Id column in MasterTenantCatalogs, rename TempGuidId to Id, and add primary key constraint
ALTER TABLE [MasterTenantCatalogs] DROP COLUMN [Id];
EXEC sp_rename 'MasterTenantCatalogs.TempGuidId', 'Id', 'COLUMN';
ALTER TABLE [MasterTenantCatalogs] ADD CONSTRAINT [PK_MasterTenantCatalogs] PRIMARY KEY CLUSTERED ([Id] ASC);

-- 6. Re-create foreign key constraints referencing the new uniqueidentifier PK
ALTER TABLE [MasterTenantFeatureSubscriptions] WITH CHECK ADD CONSTRAINT [FK_MasterTenantFeatureSubscriptions_MasterTenantCatalogs_MasterTenantCatalogId]
    FOREIGN KEY ([MasterTenantCatalogId]) REFERENCES [MasterTenantCatalogs] ([Id]) ON DELETE CASCADE;

ALTER TABLE [MasterCouponRedemptions] WITH CHECK ADD CONSTRAINT [FK_MasterCouponRedemptions_MasterTenantCatalogs_MasterTenantCatalogId]
    FOREIGN KEY ([MasterTenantCatalogId]) REFERENCES [MasterTenantCatalogs] ([Id]) ON DELETE CASCADE;

ALTER TABLE [MasterBillingTransactions] WITH CHECK ADD CONSTRAINT [FK_MasterBillingTransactions_MasterTenantCatalogs_MasterTenantCatalogId]
    FOREIGN KEY ([MasterTenantCatalogId]) REFERENCES [MasterTenantCatalogs] ([Id]) ON DELETE CASCADE;

ALTER TABLE [MasterBackgroundJobs] WITH CHECK ADD CONSTRAINT [FK_MasterBackgroundJobs_MasterTenantCatalogs_TargetTenantCatalogId]
    FOREIGN KEY ([TargetTenantCatalogId]) REFERENCES [MasterTenantCatalogs] ([Id]) ON DELETE SET NULL;

ALTER TABLE [MasterBackgroundJobLogs] WITH CHECK ADD CONSTRAINT [FK_MasterBackgroundJobLogs_MasterTenantCatalogs_TargetTenantCatalogId]
    FOREIGN KEY ([TargetTenantCatalogId]) REFERENCES [MasterTenantCatalogs] ([Id]) ON DELETE SET NULL;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "MasterTenantCatalogId",
                table: "MasterTenantFeatureSubscriptions",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "MasterTenantCatalogs",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier")
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AlterColumn<int>(
                name: "MasterTenantCatalogId",
                table: "MasterCouponRedemptions",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<int>(
                name: "MasterTenantCatalogId",
                table: "MasterBillingTransactions",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<int>(
                name: "TargetTenantCatalogId",
                table: "MasterBackgroundJobs",
                type: "int",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "TargetTenantCatalogId",
                table: "MasterBackgroundJobLogs",
                type: "int",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}
