$loginBody = '{"email":"cola@admin.com","password":"Password123!"}'
$loginRes = curl.exe -s -X POST -H "Content-Type: application/json" -H "X-Tenant-Key: cocacola" -d $loginBody http://localhost:51025/api/Auth/login | ConvertFrom-Json
$token = $loginRes.data.token

Write-Host "Got token: $($token.Substring(0, 20))..."

$blogBody = @{
    title = "Annual BCC General Assembly 2026 Scheduled"
    description = "Official announcement for the upcoming assembly."
    fullDescription = "<h2>Assembly Overview</h2><p>We are pleased to invite all community members to the <strong>Annual General Assembly</strong>.</p>"
    publish = $true
    isScheduled = $false
    sortOrder = 0
} | ConvertTo-Json

$res = curl.exe -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $token" -H "X-Tenant-Key: cocacola" -d $blogBody http://localhost:51025/api/ContentApi/blogs

Write-Host "Create Blog Result: $res"
