# Verification Test Script for Multi-Tenant & Role-Based Auth Suite

$baseUrl = "http://localhost:51026/api"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "1. TEST ADMIN LOGIN (cola@admin.com)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$adminLoginBody = @{
    email = "cola@admin.com"
    password = "Password123!"
} | ConvertTo-Json

try {
    $adminRes = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method Post -Body $adminLoginBody -ContentType "application/json"
    Write-Host "Admin Login SUCCESS!" -ForegroundColor Green
    Write-Host " - Full Name: $($adminRes.data.fullName)" -ForegroundColor Yellow
    Write-Host " - Tenant Key: $($adminRes.data.tenantKey)" -ForegroundColor Yellow
    Write-Host " - Organization: $($adminRes.data.organizationName)" -ForegroundColor Yellow
    Write-Host " - Roles: $($adminRes.data.roles -join ', ')" -ForegroundColor Yellow
    Write-Host " - Token: $($adminRes.data.token.Substring(0, 35))..." -ForegroundColor Yellow
} catch {
    Write-Host "Admin login test error: $_" -ForegroundColor Red
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "2. TEST AUTO-TENANT USER LOGIN (Without X-Tenant-Key)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Check if onwukaemeka41@gmail.com logs in with Admin@123 or Password123!
foreach ($pwd in @("Admin@123", "Password123!")) {
    $userLoginBody = @{
        email = "onwukaemeka41@gmail.com"
        password = $pwd
    } | ConvertTo-Json

    try {
        $userRes = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method Post -Body $userLoginBody -ContentType "application/json"
        Write-Host "User Login SUCCESS with password: $pwd" -ForegroundColor Green
        Write-Host " - Full Name: $($userRes.data.fullName)" -ForegroundColor Yellow
        Write-Host " - Auto-Discovered Tenant: $($userRes.data.tenantKey)" -ForegroundColor Yellow
        Write-Host " - Roles: $($userRes.data.roles -join ', ')" -ForegroundColor Yellow
        Write-Host " - MustChangePassword: $($userRes.data.mustChangePassword)" -ForegroundColor Yellow
        break
    } catch {
        Write-Host "Login with $pwd failed: $($_.Exception.Message)" -ForegroundColor DarkGray
    }
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "AUTH SUITE VERIFICATION COMPLETED!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
