using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class SyncCentralPendingModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MasterMessagePools')
BEGIN
    CREATE TABLE [MasterMessagePools] (
        [Id] uniqueidentifier NOT NULL,
        [TenantKey] nvarchar(100) NOT NULL,
        [OrganizationName] nvarchar(255) NULL,
        [Channel] nvarchar(50) NOT NULL,
        [Provider] nvarchar(50) NOT NULL,
        [RecipientAddress] nvarchar(255) NOT NULL,
        [RecipientName] nvarchar(255) NULL,
        [Subject] nvarchar(500) NULL,
        [Content] nvarchar(max) NOT NULL,
        [PlainTextFallback] nvarchar(max) NULL,
        [ActionUrl] nvarchar(500) NULL,
        [Category] nvarchar(100) NOT NULL,
        [Severity] nvarchar(50) NOT NULL,
        [Priority] nvarchar(50) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [Retries] int NOT NULL,
        [MaxRetries] int NOT NULL,
        [LastError] nvarchar(max) NULL,
        [ProviderMessageId] nvarchar(255) NULL,
        [SenderOrTemplateName] nvarchar(255) NULL,
        [MetadataJson] nvarchar(max) NULL,
        [ScheduledAt] datetime2 NULL,
        [SentAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_MasterMessagePools] PRIMARY KEY ([Id])
    );

    CREATE INDEX [IX_MasterMessagePools_CreatedAt] ON [MasterMessagePools] ([CreatedAt]);
    CREATE INDEX [IX_MasterMessagePools_RecipientAddress] ON [MasterMessagePools] ([RecipientAddress]);
    CREATE INDEX [IX_MasterMessagePools_Status_Channel_Provider] ON [MasterMessagePools] ([Status], [Channel], [Provider]);
    CREATE INDEX [IX_MasterMessagePools_TenantKey_CreatedAt] ON [MasterMessagePools] ([TenantKey], [CreatedAt]);
END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MasterMessagePools')
BEGIN
    DROP TABLE [MasterMessagePools];
END");
        }
    }
}
