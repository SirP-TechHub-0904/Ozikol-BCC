[System.Reflection.Assembly]::LoadWithPartialName("System.Data") | Out-Null
$conn = New-Object System.Data.SqlClient.SqlConnection("Server=JSS\SQLEXPRESS;Database=master;Integrated Security=true;TrustServerCertificate=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT name FROM sys.databases WHERE name LIKE '%Ozikol%' OR name LIKE '%BCC%' OR name LIKE '%Tenant%'"
$r = $cmd.ExecuteReader()
while ($r.Read()) {
    Write-Host "Database:" $r[0]
}
$r.Close()
$conn.Close()
