[System.Reflection.Assembly]::LoadWithPartialName("System.Data") | Out-Null

$dbs = @("Ozikol_BCC_Tenant_cocacola", "A-Ozikol", "A-web-Ozikol")

foreach ($db in $dbs) {
    Write-Host "Migrating database $db..."
    $conn = New-Object System.Data.SqlClient.SqlConnection("Server=JSS\SQLEXPRESS;Database=$db;Integrated Security=true;TrustServerCertificate=True;")
    try {
        $conn.Open()

        $cmd = $conn.CreateCommand()
        $cmd.CommandText = @"
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'BcpSettings' AND COLUMN_NAME = 'EnableUserDeletion')
BEGIN
    ALTER TABLE BcpSettings ADD EnableUserDeletion BIT NOT NULL DEFAULT 0;
    PRINT 'Added EnableUserDeletion to BcpSettings';
END
"@
        $cmd.ExecuteNonQuery()
        Write-Host "Migration succeeded on $db!"
        $conn.Close()
    } catch {
        Write-Host "Error migrating $db : $_"
    }
}
