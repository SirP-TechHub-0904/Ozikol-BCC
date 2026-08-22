$login = Invoke-RestMethod -Uri "http://localhost:51026/api/Auth/login" -Method POST -Body (@{ email = "cola@admin.com"; password = "Password123!" } | ConvertTo-Json) -ContentType "application/json"
$t = $login.data.token
Write-Host "Token obtained length:" $t.Length

$authHeader = "Authorization: Bearer $t"
$tenantHeader = "X-Tenant-Key: cocacola"

Write-Host "`nTesting CmsDashboardApi/stats with curl..."
$stats = & curl.exe -k -s -H $authHeader -H $tenantHeader https://localhost:51025/api/CmsDashboardApi/stats
Write-Host "Stats Response:" $stats

Write-Host "`nTesting DashboardApi/metrics with curl..."
$metrics = & curl.exe -k -s -H $authHeader -H $tenantHeader https://localhost:51025/api/DashboardApi/metrics
Write-Host "Metrics Response:" $metrics

Write-Host "`nTesting IdentityApi/roles with curl..."
$roles = & curl.exe -k -s -H $authHeader -H $tenantHeader https://localhost:51025/api/IdentityApi/roles
Write-Host "Roles Response:" $roles
