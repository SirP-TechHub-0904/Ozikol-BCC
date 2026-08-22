Start-Sleep -Seconds 4

$loginBody = @{
    email = "cola@admin.com"
    password = "Password123!"
} | ConvertTo-Json

Write-Host "1. Logging in as Admin..."
$loginRes = Invoke-RestMethod -Uri "http://localhost:51026/api/Auth/login" -Method Post -Body $loginBody -ContentType "application/json" -Headers @{ "X-Tenant-Key" = "cocacola" }
$token = $loginRes.data.token
$headers = @{
    "Authorization" = "Bearer $token"
    "X-Tenant-Key" = "cocacola"
    "Content-Type" = "application/json"
}
Write-Host "Logged in successfully as: $($loginRes.data.fullName)!"

# 2. Get Member ID Config
Write-Host "`n2. Testing GET /api/UsersApi/member-id-config..."
$configRes = Invoke-RestMethod -Uri "http://localhost:51026/api/UsersApi/member-id-config" -Method Get -Headers $headers
Write-Host "Active Format: $($configRes.data.activeFormat)"
Write-Host "Prefix: $($configRes.data.prefix)"
Write-Host "NextNumber: $($configRes.data.nextNumber)"
Write-Host "Found $($configRes.data.previews.Count) format previews."
foreach ($p in $configRes.data.previews) {
    Write-Host "  - [$($p.key)] $($p.name): $($p.previewExample) (Sequential=$($p.isSequential))"
}

# 3. Update Format to Prefix-FullYear-Serial (Format 3) with Prefix "OZK"
Write-Host "`n3. Updating Format to PrefixFullYearSeq (Prefix=OZK, NextNumber=1, Padding=4)..."
$updateBody = @{
    activeFormat = "PrefixFullYearSeq"
    prefix = "OZK"
    nextNumber = 1
    padding = 4
    delimiter = "-"
} | ConvertTo-Json

$updateRes = Invoke-RestMethod -Uri "http://localhost:51026/api/UsersApi/member-id-config" -Method Put -Body $updateBody -Headers $headers
Write-Host "Updated successfully! ActiveFormat=$($updateRes.data.activeFormat), Prefix=$($updateRes.data.prefix)"

# 4. Create 3 new test users sequentially
Write-Host "`n4. Testing Sequential Member ID Generation..."

for ($i = 1; $i -le 3; $i++) {
    $userBody = @{
        email = "serial_test_user_$($i)_$([Guid]::NewGuid().ToString().Substring(0,5))@test.com"
        firstName = "TestUser"
        lastName = "Number$i"
        role = "Member"
        password = "Member@2026"
    } | ConvertTo-Json

    $createRes = Invoke-RestMethod -Uri "http://localhost:51026/api/UsersApi" -Method Post -Body $userBody -Headers $headers
    Write-Host "Created Member $i -> ID: $($createRes.data.memberId) (UserId: $($createRes.data.id))"
}

# 5. Clean up test users so DB stays clean
Write-Host "`n5. Purging test users..."
$conn = New-Object System.Data.SqlClient.SqlConnection("Server=JSS\SQLEXPRESS;Database=Ozikol_BCC_Tenant_cocacola;Integrated Security=true;TrustServerCertificate=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "DELETE FROM AspNetUsers WHERE Email LIKE 'serial_test_user_%'"
$deleted = $cmd.ExecuteNonQuery()
Write-Host "Purged $deleted test records."

# Reset to PrefixYearMonthRandom default for consistency
$resetBody = @{
    activeFormat = "PrefixYearMonthRandom"
    prefix = "CC"
    nextNumber = 1
    padding = 4
    delimiter = "-"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:51026/api/UsersApi/member-id-config" -Method Put -Body $resetBody -Headers $headers | Out-Null
Write-Host "Reset config back to default."

$conn.Close()
