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
        $cmd.CommandText = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'BcpSettings' AND COLUMN_NAME = 'RequireConfirmedEmailToLogin'"
        $exists = $cmd.ExecuteScalar()
        if ($exists -eq 0) {
            Write-Host "Adding RequireConfirmedEmailToLogin column to BcpSettings..."
            $alterCmd = $conn.CreateCommand()
            $alterCmd.CommandText = "ALTER TABLE BcpSettings ADD RequireConfirmedEmailToLogin BIT NOT NULL DEFAULT 0"
            $alterCmd.ExecuteNonQuery()
            Write-Host "Added successfully."
        } else {
            Write-Host "RequireConfirmedEmailToLogin already exists."
        }

        $conn.Close()
    } catch {
        Write-Host "Error for $($cs): $_"
    }
}
