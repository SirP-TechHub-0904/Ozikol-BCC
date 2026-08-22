[System.Reflection.Assembly]::LoadWithPartialName("System.Data") | Out-Null

$masterConn = New-Object System.Data.SqlClient.SqlConnection("Server=JSS\SQLEXPRESS;Database=A-MasterCatalog;Integrated Security=true;TrustServerCertificate=True;")
$masterConn.Open()
$cmd = $masterConn.CreateCommand()
$cmd.CommandText = "SELECT Name, ConnectionString FROM Tenants"
$r = $cmd.ExecuteReader()

$tenants = @()
while ($r.Read()) {
    $tenants += @{ Name = $r[0]; ConnStr = $r[1] }
}
$r.Close()
$masterConn.Close()

# Also include default databases
$tenants += @{ Name = "A-Ozikol"; ConnStr = "Server=JSS\SQLEXPRESS;Database=A-Ozikol;Integrated Security=true;TrustServerCertificate=True;" }

foreach ($t in $tenants) {
    Write-Host "Updating database: $($t.Name)..." -ForegroundColor Yellow
    try {
        $conn = New-Object System.Data.SqlClient.SqlConnection($t.ConnStr)
        $conn.Open()
        $c = $conn.CreateCommand()

        # Add CurrencyCode and CurrencySymbol to BcpSettings if missing
        $c.CommandText = @"
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BcpSettings') AND name = 'CurrencyCode')
BEGIN
    ALTER TABLE BcpSettings ADD CurrencyCode NVARCHAR(10) NULL CONSTRAINT DF_BcpSettings_CurrencyCode DEFAULT 'USD';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BcpSettings') AND name = 'CurrencySymbol')
BEGIN
    ALTER TABLE BcpSettings ADD CurrencySymbol NVARCHAR(10) NULL CONSTRAINT DF_BcpSettings_CurrencySymbol DEFAULT '$';
END

UPDATE BcpSettings SET CurrencyCode = 'USD', CurrencySymbol = '$' WHERE CurrencyCode IS NULL;
"@
        $c.ExecuteNonQuery() | Out-Null
        $conn.Close()
        Write-Host "✓ Added CurrencyCode & CurrencySymbol to $($t.Name)" -ForegroundColor Green
    } catch {
        Write-Host "X Failed on $($t.Name): $_" -ForegroundColor Red
    }
}
