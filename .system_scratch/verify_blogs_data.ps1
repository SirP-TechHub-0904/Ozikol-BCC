[System.Reflection.Assembly]::LoadWithPartialName("System.Data") | Out-Null
$conn = New-Object System.Data.SqlClient.SqlConnection("Server=JSS\SQLEXPRESS;Database=Ozikol_BCC_Tenant_cocacola;Integrated Security=true;TrustServerCertificate=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT TOP 5 Id, Title, Publish, IsScheduled, ScheduledPublishDate FROM Blogs"
$r = $cmd.ExecuteReader()
while ($r.Read()) {
    Write-Host "Blog: $($r['Title']) | Publish: $($r['Publish']) | IsScheduled: $($r['IsScheduled']) | ScheduledDate: $($r['ScheduledPublishDate'])"
}
$r.Close()
$conn.Close()
