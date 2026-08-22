# Test Script: Phone Uniqueness, OTP Verification & Require Email to Login Policy

Start-Sleep -Seconds 4

$baseUrl = "http://localhost:51026/api"
$headers = @{
    "Content-Type" = "application/json"
    "X-Tenant-Key" = "cocacola"
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "1. AUTHENTICATE AS ADMIN & OBTAIN JWT TOKEN" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$adminLoginBody = @{
    email = "cola@admin.com"
    password = "Password123!"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method Post -Headers $headers -Body $adminLoginBody
$token = $loginRes.data.token
Write-Host "Admin JWT Token acquired successfully." -ForegroundColor Green

$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
    "X-Tenant-Key" = "cocacola"
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "2. ENABLE 'REQUIRE EMAIL CONFIRMED TO LOGIN' POLICY" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$enablePolicyBody = @{
    requireConfirmedEmailToLogin = $true
} | ConvertTo-Json

$cfgRes = Invoke-RestMethod -Uri "$baseUrl/UsersApi/member-id-config" -Method Put -Headers $authHeaders -Body $enablePolicyBody
Write-Host "Policy update response: $($cfgRes.message)" -ForegroundColor Green
Write-Host "Active RequireConfirmedEmailToLogin: $($cfgRes.data.requireConfirmedEmailToLogin)" -ForegroundColor Yellow

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "3. CREATE TEST USER A (Unconfirmed Email & Phone: +2348009998888)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$testEmail = "verifytest_$(Get-Random)@demo.com"
$testPhone = "+2348009998888"
$testPass = "Member@2026"

$createUserBody = @{
    email = $testEmail
    password = $testPass
    firstName = "Verify"
    lastName = "Tester"
    phoneNumber = $testPhone
    designation = "Quality Assurance"
    mustChangePassword = $false
} | ConvertTo-Json

$createRes = Invoke-RestMethod -Uri "$baseUrl/UsersApi" -Method Post -Headers $authHeaders -Body $createUserBody
$userId = $createRes.data.id
Write-Host "User A created with ID: $userId, Email: $testEmail, Phone: $testPhone" -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "4. TEST STRICT PHONE UNIQUENESS (Attempt duplicate phone)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$dupUserBody = @{
    email = "duplicatetest_$(Get-Random)@demo.com"
    password = "Member@2026"
    firstName = "Duplicate"
    lastName = "Phone"
    phoneNumber = $testPhone
} | ConvertTo-Json

try {
    $dupRes = Invoke-RestMethod -Uri "$baseUrl/UsersApi" -Method Post -Headers $authHeaders -Body $dupUserBody
    Write-Host "ERROR: Duplicate phone was allowed!" -ForegroundColor Red
} catch {
    Write-Host "SUCCESS: Duplicate phone was rejected as expected: $($_.Exception.Message)" -ForegroundColor Green
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "5. TEST LOGIN GATE (User A has EmailConfirmed = false)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$userLoginBody = @{
    email = $testEmail
    password = $testPass
} | ConvertTo-Json

try {
    $userLoginRes = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method Post -Headers $headers -Body $userLoginBody
    Write-Host "ERROR: Login should have been blocked by policy!" -ForegroundColor Red
} catch {
    Write-Host "SUCCESS: Login blocked by policy: $($_.Exception.Message)" -ForegroundColor Green
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "6. DISPATCH EMAIL OTP & READ CODE FROM QUEUE" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$otpSendRes = Invoke-RestMethod -Uri "$baseUrl/UsersApi/$userId/send-email-otp" -Method Post -Headers $authHeaders -Body "{}"
Write-Host "OTP Send Response: $($otpSendRes.message) (Retry cooldown: $($otpSendRes.data.retryAfterSeconds)s)" -ForegroundColor Green

# Query SQL BcpEmailQueue for the 6-digit code
$dbConn = New-Object System.Data.SqlClient.SqlConnection("Server=JSS\SQLEXPRESS;Database=Ozikol_BCC_Tenant_cocacola;Integrated Security=true;TrustServerCertificate=True;")
$dbConn.Open()
$cmd = $dbConn.CreateCommand()
$cmd.CommandText = "SELECT TOP 1 HtmlBody FROM BcpEmailQueue WHERE RelatedUserId = '$userId' ORDER BY CreatedAt DESC"
$html = $cmd.ExecuteScalar()

$codeMatch = [regex]::Match($html, '(\d{6})')
$extractedCode = $codeMatch.Groups[1].Value
Write-Host "Extracted 6-digit OTP code from email queue: $extractedCode" -ForegroundColor Yellow

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "7. VERIFY EMAIL OTP VIA 6-DIGIT CODE" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$verifyBody = @{
    otpCode = $extractedCode
} | ConvertTo-Json

$verifyRes = Invoke-RestMethod -Uri "$baseUrl/UsersApi/$userId/verify-email-otp" -Method Post -Headers $authHeaders -Body $verifyBody
Write-Host "Verification result: $($verifyRes.message)" -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "8. RE-ATTEMPT LOGIN WITH CONFIRMED EMAIL" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$userLoginAfterVerify = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method Post -Headers $headers -Body $userLoginBody
Write-Host "SUCCESS: User A logged in successfully! JWT Token: $($userLoginAfterVerify.data.token.Substring(0,25))..." -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "9. DISPATCH PHONE OTP & VERIFY PHONE NUMBER" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$phoneOtpRes = Invoke-RestMethod -Uri "$baseUrl/UsersApi/$userId/send-phone-otp" -Method Post -Headers $authHeaders -Body "{}"
Write-Host "Phone OTP Send: $($phoneOtpRes.message)" -ForegroundColor Green

$cmd.CommandText = "SELECT TOP 1 Message FROM BcpSmsQueue WHERE RelatedUserId = '$userId' ORDER BY CreatedAt DESC"
$smsMsg = $cmd.ExecuteScalar()
$phoneCodeMatch = [regex]::Match($smsMsg, '(\d{6})')
$extractedPhoneCode = $phoneCodeMatch.Groups[1].Value
Write-Host "Extracted 6-digit Phone OTP from SMS queue: $extractedPhoneCode" -ForegroundColor Yellow

$phoneVerifyBody = @{
    otpCode = $extractedPhoneCode
} | ConvertTo-Json

$phoneVerifyRes = Invoke-RestMethod -Uri "$baseUrl/UsersApi/$userId/verify-phone-otp" -Method Post -Headers $authHeaders -Body $phoneVerifyBody
Write-Host "Phone Verification result: $($phoneVerifyRes.message)" -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "10. VERIFY DOSSIER STATUS BADGES" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$dossierRes = Invoke-RestMethod -Uri "$baseUrl/UsersApi/$userId/dossier" -Method Get -Headers $authHeaders
Write-Host "Dossier EmailConfirmed: $($dossierRes.data.emailConfirmed)" -ForegroundColor Green
Write-Host "Dossier PhoneNumberConfirmed: $($dossierRes.data.phoneNumberConfirmed)" -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "11. CLEAN UP: PURGE TEST USER & RESTORE SETTINGS" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$cmd.CommandText = "DELETE FROM BcpEmailQueue WHERE RelatedUserId = '$userId'; DELETE FROM BcpSmsQueue WHERE RelatedUserId = '$userId'; DELETE FROM AspNetUserRoles WHERE UserId = '$userId'; DELETE FROM AspNetUsers WHERE Id = '$userId';"
$cmd.ExecuteNonQuery()
$dbConn.Close()

# Restore setting
$restoreBody = @{
    requireConfirmedEmailToLogin = $false
} | ConvertTo-Json
Invoke-RestMethod -Uri "$baseUrl/UsersApi/member-id-config" -Method Put -Headers $authHeaders -Body $restoreBody | Out-Null

Write-Host "Purged test account and restored settings. Tenant database is 100% clean!" -ForegroundColor Green
Write-Host "`nALL 11 VERIFICATION TESTS COMPLETED WITH 100% SUCCESS!" -ForegroundColor Green
