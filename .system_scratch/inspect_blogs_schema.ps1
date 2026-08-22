[System.Reflection.Assembly]::LoadWithPartialName("System.Data") | Out-Null

function CheckDb($dbName) {
    Write-Host "=== Checking Database: $dbName ==="
    $conn = New-Object System.Data.SqlClient.SqlConnection("Server=JSS\SQLEXPRESS;Database=$dbName;Integrated Security=true;TrustServerCertificate=True;")
    try {
        $conn.Open()
        
        # Check Blogs columns
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Blogs'"
        $r = $cmd.ExecuteReader()
        Write-Host "Blogs columns:"
        $cols = @()
        while ($r.Read()) {
            $cols += "$($r[0]) ($($r[1]))"
        }
        $r.Close()
        Write-Host ($cols -join ", ")
        
        # Check if BcpScheduledJobQueues table exists
        $cmd2 = $conn.CreateCommand()
        $cmd2.CommandText = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BcpScheduledJobQueues'"
        $hasQueue = $cmd2.ExecuteScalar()
        Write-Host "BcpScheduledJobQueues table exists: $hasQueue"

        # Check if BlogCategories table exists
        $cmd3 = $conn.CreateCommand()
        $cmd3.CommandText = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BlogCategories'"
        $hasBlogCat = $cmd3.ExecuteScalar()
        Write-Host "BlogCategories table exists: $hasBlogCat"

        $conn.Close()
    } catch {
        Write-Host "Error checking $dbName : $_"
    }
}

CheckDb("Ozikol_BCC_Tenant_cocacola")
CheckDb("A-Ozikol")
