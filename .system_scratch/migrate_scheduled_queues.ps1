[System.Reflection.Assembly]::LoadWithPartialName("System.Data") | Out-Null

$dbs = @("Ozikol_BCC_Tenant_cocacola", "A-Ozikol", "A-web-Ozikol")

foreach ($db in $dbs) {
    Write-Host "Migrating database $db..."
    $conn = New-Object System.Data.SqlClient.SqlConnection("Server=JSS\SQLEXPRESS;Database=$db;Integrated Security=true;TrustServerCertificate=True;")
    try {
        $conn.Open()

        # 1. Add ScheduledPublishDate to Blogs if not exists
        $cmd1 = $conn.CreateCommand()
        $cmd1.CommandText = @"
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Blogs' AND COLUMN_NAME = 'ScheduledPublishDate')
BEGIN
    ALTER TABLE Blogs ADD ScheduledPublishDate DATETIME2 NULL;
    PRINT 'Added ScheduledPublishDate to Blogs';
END
"@
        $cmd1.ExecuteNonQuery()

        # 2. Add IsScheduled to Blogs if not exists
        $cmd2 = $conn.CreateCommand()
        $cmd2.CommandText = @"
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Blogs' AND COLUMN_NAME = 'IsScheduled')
BEGIN
    ALTER TABLE Blogs ADD IsScheduled BIT NOT NULL DEFAULT 0;
    PRINT 'Added IsScheduled to Blogs';
END
"@
        $cmd2.ExecuteNonQuery()

        # 3. Create BcpScheduledJobQueues table if not exists
        $cmd3 = $conn.CreateCommand()
        $cmd3.CommandText = @"
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BcpScheduledJobQueues')
BEGIN
    CREATE TABLE BcpScheduledJobQueues (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        SourceId NVARCHAR(100) NOT NULL,
        SourceModel NVARCHAR(100) NOT NULL,
        ActionType NVARCHAR(100) NOT NULL,
        Payload NVARCHAR(MAX) NULL,
        ScheduledAt DATETIME2 NOT NULL,
        ExecutedAt DATETIME2 NULL,
        Status INT NOT NULL DEFAULT 0,
        Retries INT NOT NULL DEFAULT 0,
        MaxRetries INT NOT NULL DEFAULT 3,
        LastError NVARCHAR(MAX) NULL,
        TenantKey NVARCHAR(100) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_BcpScheduledJobQueues_Status_ScheduledAt ON BcpScheduledJobQueues(Status, ScheduledAt);
    CREATE INDEX IX_BcpScheduledJobQueues_SourceId_SourceModel ON BcpScheduledJobQueues(SourceId, SourceModel);
    PRINT 'Created BcpScheduledJobQueues table';
END
"@
        $cmd3.ExecuteNonQuery()

        Write-Host "Migration succeeded on $db!"
        $conn.Close()
    } catch {
        Write-Host "Error migrating $db : $_"
    }
}
