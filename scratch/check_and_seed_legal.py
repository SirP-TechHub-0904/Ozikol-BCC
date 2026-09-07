import pyodbc
import re
import uuid
from datetime import datetime

conn_str = 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=JSS\\SQLEXPRESS;DATABASE=Ozikol_MasterCatalogDb;Trusted_Connection=yes;TrustServerCertificate=yes;'

def run():
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()

    # 1. Create table if not exists
    create_table_sql = """
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MasterLegalDocuments')
    BEGIN
        CREATE TABLE [dbo].[MasterLegalDocuments] (
            [Id] uniqueidentifier NOT NULL,
            [Slug] nvarchar(100) NOT NULL,
            [Title] nvarchar(200) NOT NULL,
            [Category] nvarchar(80) NOT NULL,
            [Summary] nvarchar(500) NOT NULL,
            [ContentHtml] nvarchar(max) NOT NULL,
            [Version] nvarchar(20) NOT NULL,
            [EffectiveDate] datetime2 NOT NULL,
            [LastUpdatedUtc] datetime2 NOT NULL,
            [Culture] nvarchar(10) NOT NULL,
            [IsPublished] bit NOT NULL,
            [SortOrder] int NOT NULL,
            [CreatedUtc] datetime2 NOT NULL,
            CONSTRAINT [PK_MasterLegalDocuments] PRIMARY KEY ([Id])
        );

        CREATE INDEX [IX_MasterLegalDocuments_Category] ON [dbo].[MasterLegalDocuments] ([Category]);
        CREATE INDEX [IX_MasterLegalDocuments_IsPublished] ON [dbo].[MasterLegalDocuments] ([IsPublished]);
        CREATE UNIQUE INDEX [IX_MasterLegalDocuments_Slug_Culture] ON [dbo].[MasterLegalDocuments] ([Slug], [Culture]);
        CREATE INDEX [IX_MasterLegalDocuments_SortOrder] ON [dbo].[MasterLegalDocuments] ([SortOrder]);

        PRINT 'Created MasterLegalDocuments table and indexes.';
    END
    """
    cursor.execute(create_table_sql)
    conn.commit()

    # 2. Record migration in __EFMigrationsHistory
    migration_sql = """
    IF NOT EXISTS (SELECT * FROM [__EFMigrationsHistory] WHERE [MigrationId] = '20260905175206_AddMasterLegalDocuments')
    BEGIN
        INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
        VALUES ('20260905175206_AddMasterLegalDocuments', '9.0.0');
        PRINT 'Recorded 20260905175206_AddMasterLegalDocuments in __EFMigrationsHistory.';
    END
    """
    cursor.execute(migration_sql)
    conn.commit()

    print("Table and migration record verified.")

if __name__ == '__main__':
    run()
