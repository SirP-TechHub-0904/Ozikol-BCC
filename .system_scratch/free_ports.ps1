$ports = @(51025, 51026)
foreach ($p in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            try {
                Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "Killed process $($c.OwningProcess) on port $p"
            } catch {
                Write-Host "Could not kill $($c.OwningProcess)"
            }
        }
    } else {
        Write-Host "Port $p is completely free."
    }
}
