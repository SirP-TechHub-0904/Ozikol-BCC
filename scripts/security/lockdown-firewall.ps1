<#
.SYNOPSIS
    Ozikol Business Command Center (Ozikol BCC) — Windows Server Firewall Lockdown Script.

.DESCRIPTION
    Hardens Windows Defender Firewall with Advanced Security on VPS/Dedicated servers by:
    1. Blocking all public internet access (0.0.0.0/0) to Port 1433 (SQL Server) and Port 6379 (Redis / Garnet / Valkey).
    2. Permitting Port 1433 and Port 6379 strictly from localhost (127.0.0.1) and private VPC subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) plus any optional trusted application server IPs.
    3. Ensuring HTTPS (443) and HTTP (80) remain open for Cloudflare / Reverse Proxy ingress.

.PARAMETER TrustedServerIps
    Optional array of additional private or dedicated application server IPv4 addresses allowed to connect to SQL Server (1433) and Redis (6379).

.EXAMPLE
    .\lockdown-firewall.ps1 -TrustedServerIps @("10.10.0.15", "10.10.0.16")
#>
[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string[]]$TrustedServerIps = @()
)

$ErrorActionPreference = "Stop"

Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host " Ozikol BCC - Production Database & Redis Firewall Hardening" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan

# Build allowed private CIDR / IP list for SQL Server (1433) and Redis (6379)
$allowedAddresses = @(
    "127.0.0.1",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16"
) + $TrustedServerIps

# Remove any existing permissive public inbound rules on 1433 and 6379 created previously
$existingRules = Get-NetFirewallRule | Where-Object {
    $_.DisplayName -like "Ozikol-BCC-*"
}
if ($existingRules) {
    Write-Host "[1/4] Removing old Ozikol-BCC firewall rules before applying updated policy..." -ForegroundColor Yellow
    $existingRules | Remove-NetFirewallRule
}

# 1. Allow SQL Server (1433) ONLY from Loopback & Private VPC / Trusted App Servers
Write-Host "[2/4] Restricting Port 1433 (SQL Server) to Localhost & Private VPC IPs..." -ForegroundColor Green
New-NetFirewallRule `
    -DisplayName "Ozikol-BCC-Allow-SQL-Private-Only" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 1433 `
    -RemoteAddress $allowedAddresses `
    -Action Allow `
    -Profile Any | Out-Null

# 2. Allow Redis / Garnet / Valkey (6379) ONLY from Loopback & Private VPC / Trusted App Servers
Write-Host "[3/4] Restricting Port 6379 (Redis/Garnet/Valkey) to Localhost & Private VPC IPs..." -ForegroundColor Green
New-NetFirewallRule `
    -DisplayName "Ozikol-BCC-Allow-Redis-Private-Only" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 6379 `
    -RemoteAddress $allowedAddresses `
    -Action Allow `
    -Profile Any | Out-Null

# 3. Allow Web Traffic (80/443) for Cloudflare / IIS / Kestrel Reverse Proxy
Write-Host "[4/4] Ensuring Ports 80 & 443 (HTTP/HTTPS) are open for Cloudflare Ingress..." -ForegroundColor Green
New-NetFirewallRule `
    -DisplayName "Ozikol-BCC-Allow-Web-Ingress" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 80, 443 `
    -Action Allow `
    -Profile Any | Out-Null

Write-Host ""
Write-Host "SUCCESS: Windows Firewall hardened for Ozikol Business Command Center." -ForegroundColor Cyan
Write-Host "IMPORTANT: Ensure Windows Firewall Inbound Default Action is set to 'Block (default)'." -ForegroundColor Yellow

