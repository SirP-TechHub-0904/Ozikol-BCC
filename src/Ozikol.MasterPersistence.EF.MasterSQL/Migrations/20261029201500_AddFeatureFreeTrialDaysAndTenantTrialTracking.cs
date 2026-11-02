using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <summary>
    /// Adds first-time free trial days (FreeTrialDays) to MasterFeatureCatalogs and
    /// per-tenant free trial overrides and usage tracking (CustomFreeTrialDaysOverride,
    /// HasUsedFreeTrial, IsTrialPeriod) to MasterTenantFeatureSubscriptions.
    /// </summary>
    public partial class AddFeatureFreeTrialDaysAndTenantTrialTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.MasterFeatureCatalogs', 'FreeTrialDays') IS NULL
BEGIN
    ALTER TABLE [dbo].[MasterFeatureCatalogs]
    ADD [FreeTrialDays] INT NOT NULL CONSTRAINT [DF_MasterFeatureCatalogs_FreeTrialDays] DEFAULT (14);
END

IF COL_LENGTH('dbo.MasterTenantFeatureSubscriptions', 'CustomFreeTrialDaysOverride') IS NULL
BEGIN
    ALTER TABLE [dbo].[MasterTenantFeatureSubscriptions]
    ADD [CustomFreeTrialDaysOverride] INT NULL;
END

IF COL_LENGTH('dbo.MasterTenantFeatureSubscriptions', 'HasUsedFreeTrial') IS NULL
BEGIN
    ALTER TABLE [dbo].[MasterTenantFeatureSubscriptions]
    ADD [HasUsedFreeTrial] BIT NOT NULL CONSTRAINT [DF_MasterTenantFeatureSubscriptions_HasUsedFreeTrial] DEFAULT (0);
END

IF COL_LENGTH('dbo.MasterTenantFeatureSubscriptions', 'IsTrialPeriod') IS NULL
BEGIN
    ALTER TABLE [dbo].[MasterTenantFeatureSubscriptions]
    ADD [IsTrialPeriod] BIT NOT NULL CONSTRAINT [DF_MasterTenantFeatureSubscriptions_IsTrialPeriod] DEFAULT (0);
END
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.MasterTenantFeatureSubscriptions', 'IsTrialPeriod') IS NOT NULL
BEGIN
    DECLARE @dfTrial NVARCHAR(128);
    SELECT @dfTrial = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.MasterTenantFeatureSubscriptions') AND c.name = 'IsTrialPeriod';
    IF @dfTrial IS NOT NULL EXEC('ALTER TABLE [dbo].[MasterTenantFeatureSubscriptions] DROP CONSTRAINT [' + @dfTrial + ']');
    ALTER TABLE [dbo].[MasterTenantFeatureSubscriptions] DROP COLUMN [IsTrialPeriod];
END

IF COL_LENGTH('dbo.MasterTenantFeatureSubscriptions', 'HasUsedFreeTrial') IS NOT NULL
BEGIN
    DECLARE @dfUsed NVARCHAR(128);
    SELECT @dfUsed = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.MasterTenantFeatureSubscriptions') AND c.name = 'HasUsedFreeTrial';
    IF @dfUsed IS NOT NULL EXEC('ALTER TABLE [dbo].[MasterTenantFeatureSubscriptions] DROP CONSTRAINT [' + @dfUsed + ']');
    ALTER TABLE [dbo].[MasterTenantFeatureSubscriptions] DROP COLUMN [HasUsedFreeTrial];
END

IF COL_LENGTH('dbo.MasterTenantFeatureSubscriptions', 'CustomFreeTrialDaysOverride') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[MasterTenantFeatureSubscriptions] DROP COLUMN [CustomFreeTrialDaysOverride];
END

IF COL_LENGTH('dbo.MasterFeatureCatalogs', 'FreeTrialDays') IS NOT NULL
BEGIN
    DECLARE @dfFreeDays NVARCHAR(128);
    SELECT @dfFreeDays = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.MasterFeatureCatalogs') AND c.name = 'FreeTrialDays';
    IF @dfFreeDays IS NOT NULL EXEC('ALTER TABLE [dbo].[MasterFeatureCatalogs] DROP CONSTRAINT [' + @dfFreeDays + ']');
    ALTER TABLE [dbo].[MasterFeatureCatalogs] DROP COLUMN [FreeTrialDays];
END
");
        }
    }
}

