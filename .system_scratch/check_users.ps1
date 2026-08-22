$conn = New-Object System.Data.SqlClient.SqlConnection("Server=JSS\SQLEXPRESS;Database=Ozikol_BCC_Tenant_cocacola;Integrated Security=true;TrustServerCertificate=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT Email, MustChangePassword, EmailConfirmed FROM AspNetUsers"
$r = $cmd.ExecuteReader()
while ($r.Read()) {
    Write-Host "$($r['Email']) | MustChange=$($r['MustChangePassword']) | Confirmed=$($r['EmailConfirmed'])"
}
$conn.Close()
