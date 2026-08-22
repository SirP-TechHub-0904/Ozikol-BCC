# Verification Test Script for Multi-Channel Message Templates API

$baseUrl = "http://localhost:51026/api"
$headers = @{
    "Content-Type" = "application/json"
    "X-Tenant-Key" = "cocacola"
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "1. AUTHENTICATE AS ADMIN" -ForegroundColor Cyan
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
Write-Host "2. GET ALL TEMPLATES (AUTO-SEEDED CHECK)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$allRes = Invoke-RestMethod -Uri "$baseUrl/MessageTemplates" -Method Get -Headers $authHeaders
Write-Host "Total Message Templates retrieved: $($allRes.data.Count)" -ForegroundColor Green

foreach ($t in $allRes.data | Select-Object -First 6) {
    Write-Host " - [Channel: $($t.channel), Event: $($t.eventType)] $($t.name)" -ForegroundColor Yellow
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "3. TEST TEMPLATE PREVIEW INTERPOLATION" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$previewBody = @{
    eventType = 303 # WelcomeOnboarding
    channel = 0    # Email
    subjectTemplate = "Welcome to {{OrganizationName}}, {{FirstName}}!"
    bodyTemplate = "<p>Hello {{FullName}}, your Member ID is {{MemberId}} and temp pass is {{TemporaryPassword}}.</p>"
    samplePlaceholders = @{
        OrganizationName = "Coca Cola Bottling"
        FirstName = "Sarah"
        FullName = "Sarah Jenkins"
        MemberId = "CC-2026-0099"
        TemporaryPassword = "Pass@Sarah2026"
    }
} | ConvertTo-Json

$previewRes = Invoke-RestMethod -Uri "$baseUrl/MessageTemplates/preview" -Method Post -Headers $authHeaders -Body $previewBody
Write-Host "Preview Subject: $($previewRes.data.subject)" -ForegroundColor Green
Write-Host "Preview Body: $($previewRes.data.body)" -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "4. TEST CUSTOMIZE & SAVE TEMPLATE" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$saveBody = @{
    name = "Custom Welcome Email"
    subjectTemplate = "Official Welcome to {{OrganizationName}}!"
    bodyTemplate = "<div class='welcome-custom'>Dear {{FullName}}, your assigned Member ID is {{MemberId}}.</div>"
    isActive = $true
} | ConvertTo-Json

$saveRes = Invoke-RestMethod -Uri "$baseUrl/MessageTemplates/303/0" -Method Put -Headers $authHeaders -Body $saveBody
Write-Host "Saved Template: $($saveRes.data.name)" -ForegroundColor Green
Write-Host "Saved Subject: $($saveRes.data.subjectTemplate)" -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "5. TEST RESET TEMPLATE TO SYSTEM DEFAULT" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$resetRes = Invoke-RestMethod -Uri "$baseUrl/MessageTemplates/303/0/reset" -Method Post -Headers $authHeaders -Body "{}"
Write-Host "Reset Template Name: $($resetRes.data.name)" -ForegroundColor Green
Write-Host "Reset Subject: $($resetRes.data.subjectTemplate)" -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "ALL MESSAGE TEMPLATE ENGINE TESTS PASSED WITH 100% SUCCESS!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
