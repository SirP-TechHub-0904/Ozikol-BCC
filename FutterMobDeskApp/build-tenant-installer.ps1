<#
.SYNOPSIS
  Builds and exports the Windows Desktop Workstation App (Single-Tenant or Multi-Tenant).

.EXAMPLE
  # Build a dedicated single-tenant export (skips workspace selection, locks to CocaCola MKL):
  .\build-tenant-installer.ps1 -TenantKey "cocacolamkl" -BrandName "CocaCola MKL" -ApiBaseUrl "http://localhost:51025"

.EXAMPLE
  # Fast 3-second re-package for another tenant without recompiling C++ (if Release already built):
  .\build-tenant-installer.ps1 -TenantKey "zenith" -BrandName "Zenith Workspace" -SkipFlutterBuild
#>
param(
    [Parameter(Mandatory = $false)]
    [string]$TenantKey = "",

    [Parameter(Mandatory = $false)]
    [string]$BrandName = "Workspace Command Center",

    [Parameter(Mandatory = $false)]
    [string]$PrimaryDomain = "",

    [Parameter(Mandatory = $false)]
    [string]$ApiBaseUrl = "http://localhost:51025",

    [Parameter(Mandatory = $false)]
    [switch]$SkipFlutterBuild
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$releaseDir = Join-Path $scriptDir "build\windows\x64\runner\Release"
$lockFile = Join-Path $releaseDir "tenant.lock.json"

if (-not $SkipFlutterBuild) {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host " 1. Building Flutter Windows Release..." -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan

    $dartDefines = @()
    if ($TenantKey.Trim() -ne "") {
        $dartDefines += "--dart-define=LOCKED_TENANT_KEY=$($TenantKey.Trim())"
        $dartDefines += "--dart-define=LOCKED_TENANT_NAME=$BrandName"
        if ($PrimaryDomain.Trim() -ne "") {
            $dartDefines += "--dart-define=LOCKED_TENANT_DOMAIN=$($PrimaryDomain.Trim())"
        }
    }
    if ($ApiBaseUrl.Trim() -ne "") {
        $dartDefines += "--dart-define=API_BASE_URL=$($ApiBaseUrl.Trim())"
    }

    flutter build windows --release @dartDefines
}

if (-not (Test-Path $releaseDir)) {
    Write-Error "Release build folder not found at $releaseDir. Run without -SkipFlutterBuild first."
}

# Write or remove tenant.lock.json inside Release folder
if ($TenantKey.Trim() -ne "") {
    $domainVal = if ($PrimaryDomain.Trim() -ne "") { $PrimaryDomain.Trim() } else { "$($TenantKey.Trim().ToLower()).local" }
    $lockObj = @{
        tenantKey          = $TenantKey.Trim()
        organizationName   = $BrandName
        primaryDomain      = $domainVal
        apiBaseUrl         = $ApiBaseUrl.Trim()
        isSingleTenantLock = $true
    }
    $lockObj | ConvertTo-Json -Depth 3 | Set-Content -Path $lockFile -Encoding UTF8
    Write-Host "Stamped single-tenant lock manifest: $lockFile" -ForegroundColor Green
} elseif (Test-Path $lockFile) {
    Remove-Item $lockFile -Force
}

$safeBrand = ($BrandName -replace '[^a-zA-Z0-9_-]', '')
if ([string]::IsNullOrWhiteSpace($safeBrand)) { $safeBrand = "Workspace" }
$installerName = "$safeBrand-Workstation-Setup"

# Check if Inno Setup Compiler (ISCC.exe) is installed
$isccPaths = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
)
$iscc = $isccPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($iscc) {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host " 2. Packaging Single-File Setup.exe via Inno Setup..." -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
    & $iscc "/DMyAppName=$BrandName" "/DMyAppPublisher=$BrandName" "/DMyOutputBaseFilename=$installerName" "windows\installer\installer.iss"
    Write-Host "Installer created at: build\installer\$installerName.exe" -ForegroundColor Green
} else {
    Write-Host "==========================================================" -ForegroundColor Yellow
    Write-Host " Inno Setup (ISCC.exe) not detected; creating portable ZIP bundle..." -ForegroundColor Yellow
    Write-Host " (Install Inno Setup 6 from https://jrsoftware.org/isdl.php to output a single .exe Setup Wizard)" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Yellow
    $outDir = Join-Path $scriptDir "build\installer"
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
    $zipPath = Join-Path $outDir "$installerName.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path "$releaseDir\*" -DestinationPath $zipPath
    Write-Host "Portable bundle created at: $zipPath" -ForegroundColor Green
}
