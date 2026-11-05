-- ==============================================================================
-- Ozikol Business Command Center: Server Master Database Migration & Settings
-- 1. Apply Migration 20261105091800_AddCentralPlatformServicesAndSecrets (if not applied)
-- 2. Populate MasterPlatformSettings (Id = 1) with AES-256-GCM encrypted credentials
-- ==============================================================================

USE [Ozikol_MasterCatalogDb];
GO

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20261105091800_AddCentralPlatformServicesAndSecrets')
BEGIN
    BEGIN TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MasterPlatformSettings]') AND name = N'AiGatewayUrl')
        ALTER TABLE [MasterPlatformSettings] ADD [AiGatewayUrl] nvarchar(500) NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MasterPlatformSettings]') AND name = N'EmailFromName')
        ALTER TABLE [MasterPlatformSettings] ADD [EmailFromName] nvarchar(150) NOT NULL DEFAULT N'Ozikol Cloud Security';

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MasterPlatformSettings]') AND name = N'EmailProvider')
        ALTER TABLE [MasterPlatformSettings] ADD [EmailProvider] nvarchar(50) NOT NULL DEFAULT N'Postmark';

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MasterPlatformSettings]') AND name = N'GoogleReCaptchaSecretKey')
        ALTER TABLE [MasterPlatformSettings] ADD [GoogleReCaptchaSecretKey] nvarchar(255) NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MasterPlatformSettings]') AND name = N'GoogleReCaptchaSiteKey')
        ALTER TABLE [MasterPlatformSettings] ADD [GoogleReCaptchaSiteKey] nvarchar(255) NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MasterPlatformSettings]') AND name = N'HtmlExtractorApiUrl')
        ALTER TABLE [MasterPlatformSettings] ADD [HtmlExtractorApiUrl] nvarchar(500) NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MasterPlatformSettings]') AND name = N'OneSignalRestApiKey')
        ALTER TABLE [MasterPlatformSettings] ADD [OneSignalRestApiKey] nvarchar(255) NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MasterPlatformSettings]') AND name = N'PostmarkDefaultFrom')
        ALTER TABLE [MasterPlatformSettings] ADD [PostmarkDefaultFrom] nvarchar(150) NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MasterPlatformSettings]') AND name = N'PostmarkServerToken')
        ALTER TABLE [MasterPlatformSettings] ADD [PostmarkServerToken] nvarchar(255) NULL;

    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261105091800_AddCentralPlatformServicesAndSecrets', N'9.0.0');

    COMMIT;
    PRINT 'Migration 20261105091800_AddCentralPlatformServicesAndSecrets applied successfully.';
END
ELSE
BEGIN
    PRINT 'Migration 20261105091800_AddCentralPlatformServicesAndSecrets already applied.';
END
GO

-- Populate credentials into row 1
UPDATE [dbo].[MasterPlatformSettings]
SET 
    [GoogleReCaptchaSiteKey] = N'6LdBsb8tAAAAAPuXWg5SLjjbPVZd0_-v1w4WbK6H',
    [GoogleReCaptchaSecretKey] = N'enc:v1:z7WPVdMRhK6vThRu:sajws3ns1sQc607hx2QMq1+ROE/nLevxegex2EmgvOSwVEzCy87sYw==:psaG3sNhpKt9l6JeZT+eAQ==',
    [EmailProvider] = N'Postmark',
    [PostmarkServerToken] = N'enc:v1:u8hI7h/BkQixCWVL:DH77wgetuBONSWmlKOImXUgUkOuD2ItWuE3Qb0KtWps9qpRo:8I2kgHINH+LP9lqE+OzXQg==',
    [PostmarkDefaultFrom] = N'notifications@ozikol.cloud',
    [EmailFromName] = N'Ozikol Cloud Security',
    [SentryDsn] = N'https://f41ad3e714e948457c3757e24b10adf6@o4512105675882496.ingest.de.sentry.io/4512105762324560',
    [OneSignalAppId] = N'your-onesignal-app-id-here',
    [OneSignalRestApiKey] = N'enc:v1:ExXHkTvOZxoKbHOI:gkCm65G8fCT+YIhTWPSKRNtqDz4gWhwe24QCxW81Cy4=:zTpXTUMb/x8AD8iBj87DdQ==',
    [AiGatewayUrl] = N'https://ai.ozikol.cloud',
    [HtmlExtractorApiUrl] = N'https://ai.ozikol.cloud',
    [CloudinaryCloudName] = N'pcbhnjad',
    [CloudinaryApiKey] = N'159842435718116',
    [CloudinaryApiSecret] = N'enc:v1:pvW3HAnB0vWWeokw:tGLl8surQU7r2xHjSNqyIyyhvj3xFety4CJp:Ufdg/0Pim88FxnOcVoxzzw==',
    [MongoLogsConnectionString] = N'enc:v1:+XX3mGiqPG6GxKwn:dpBJRvUVP3PrNoww9EBLv5dSdX1aXRrtT6GzUoMhnkB2WitCNMWiIvVaai23HAJ5Abk/73qN7VaSuke0mQTPJUH8qy2zQ4XVizz2i5Ys6N/khudHjMrkZppkSsiHmIYN7V4jHFoBY/hKBA==:2a66Fx+XnjQDgjOGDkoUTw==',
    [MongoLogsDatabaseName] = N'OzikolLogsDb',
    [MongoLogsCollectionName] = N'central_system_logs',
    [UpdatedUtc] = SYSUTCDATETIME()
WHERE [Id] = 1;
GO

PRINT 'MasterPlatformSettings updated with centralized credentials successfully.';
GO
