$connectionStrings = @(
    "Server=JSS\SQLEXPRESS;Database=A-Ozikol;Integrated Security=true;TrustServerCertificate=True;",
    "Server=JSS\SQLEXPRESS;Database=Ozikol_BCC_Tenant_cocacola;Integrated Security=true;TrustServerCertificate=True;"
)

foreach ($cs in $connectionStrings) {
    try {
        $conn = New-Object System.Data.SqlClient.SqlConnection($cs)
        $conn.Open()
        Write-Host "Connected to: $($conn.Database)"
        
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = @"
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BcpMessageTemplates')
BEGIN
    CREATE TABLE BcpMessageTemplates (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        EventType INT NOT NULL,
        Channel INT NOT NULL,
        Name NVARCHAR(150) NOT NULL,
        SubjectTemplate NVARCHAR(255) NULL,
        BodyTemplate NVARCHAR(MAX) NOT NULL,
        AvailablePlaceholders NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedBy NVARCHAR(150) NULL
    );
    CREATE INDEX IX_BcpMessageTemplates_EventType_Channel ON BcpMessageTemplates(EventType, Channel);
    PRINT 'Created BcpMessageTemplates table successfully.';
END
ELSE
BEGIN
    PRINT 'BcpMessageTemplates table already exists.';
END
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Schema synchronized for: $($conn.Database)"
        $conn.Close()
    } catch {
        Write-Host "Error for $($cs): $_"
    }
}
