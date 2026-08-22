$connectionStrings = @(
    "Server=JSS\SQLEXPRESS;Database=A-Ozikol;Integrated Security=true;TrustServerCertificate=True;",
    "Server=JSS\SQLEXPRESS;Database=Ozikol_BCC_Tenant_cocacola;Integrated Security=true;TrustServerCertificate=True;"
)

foreach ($cs in $connectionStrings) {
    try {
        $conn = New-Object System.Data.SqlClient.SqlConnection($cs)
        $conn.Open()
        Write-Host "Connected to: $($conn.Database)"
        
        # Check if table exists
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BcpSettings'"
        $tableExists = $cmd.ExecuteScalar()
        Write-Host "Table BcpSettings exists: $tableExists"

        # Check existing columns
        $cmd.CommandText = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'BcpSettings'"
        $reader = $cmd.ExecuteReader()
        $cols = @()
        while ($reader.Read()) {
            $cols += $reader.GetString(0)
        }
        $reader.Close()
        Write-Host "Columns: $($cols -join ', ')"

        # Ensure Member ID columns exist
        $colsToAdd = @{
            "MemberIdFormat" = "NVARCHAR(100) NOT NULL DEFAULT 'PrefixYearMonthRandom'"
            "MemberIdPrefix" = "NVARCHAR(50) NOT NULL DEFAULT 'CC'"
            "MemberIdNextNumber" = "INT NOT NULL DEFAULT 1"
            "MemberIdPadding" = "INT NOT NULL DEFAULT 4"
            "MemberIdDelimiter" = "NVARCHAR(10) NOT NULL DEFAULT '-'"
        }

        foreach ($colName in $colsToAdd.Keys) {
            if ($cols -notcontains $colName) {
                Write-Host "Adding column $colName to BcpSettings..."
                $alterCmd = $conn.CreateCommand()
                $alterCmd.CommandText = "ALTER TABLE BcpSettings ADD $colName $($colsToAdd[$colName])"
                $alterCmd.ExecuteNonQuery()
                Write-Host "Added $colName successfully."
            } else {
                Write-Host "Column $colName already exists."
            }
        }

        $conn.Close()
    } catch {
        Write-Host "Error for $($cs): $_"
    }
}
