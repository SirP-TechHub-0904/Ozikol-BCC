$conn = New-Object System.Data.SqlClient.SqlConnection('Server=JSS\SQLEXPRESS;Database=Ozikol_BCC_Tenant_cocacola;Integrated Security=true;TrustServerCertificate=True;')
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = @"
DELETE FROM AspNetUserRoles WHERE UserId IN (SELECT Id FROM AspNetUsers WHERE Email LIKE 'serial_test_user_%');
DELETE FROM BcpActivityLogs WHERE Description LIKE '%serial_test_user_%' OR PerformedByFullName LIKE '%TestUser%' OR TargetFullName LIKE '%TestUser%';
DELETE FROM AspNetUsers WHERE Email LIKE 'serial_test_user_%';
"@
$deleted = $cmd.ExecuteNonQuery()
Write-Host "Cleaned test records: $deleted"
$conn.Close()
