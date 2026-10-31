<#
.SYNOPSIS
  Builds and exports the Windows Desktop Workstation App (Single-Tenant or Multi-Tenant),
  including automatic tenant icon/logo linking for the .exe, Setup Wizard, Desktop Shortcut, and Title Bar.

.EXAMPLE
  # Build a dedicated single-tenant export (auto-fetches tenant icon/logo from API or uses -IconPath):
  .\build-tenant-installer.ps1 -TenantKey "cocacolamkl" -BrandName "CocaCola MKL" -ApiBaseUrl "http://localhost:51025"

.EXAMPLE
  # Build with an explicit local PNG/ICO logo file:
  .\build-tenant-installer.ps1 -TenantKey "cocacolamkl" -BrandName "CocaCola MKL" -IconPath "C:\brand\coke-logo.png"

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
    [string]$IconPath = "",

    [Parameter(Mandatory = $false)]
    [string]$IconUrl = "",

    [Parameter(Mandatory = $false)]
    [string]$LogoUrl = "",

    [Parameter(Mandatory = $false)]
    [switch]$SkipFlutterBuild
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$releaseDir = Join-Path $scriptDir "build\windows\x64\runner\Release"
$lockFile = Join-Path $releaseDir "tenant.lock.json"
$runnerIconPath = Join-Path $scriptDir "windows\runner\resources\app_icon.ico"
$backupIconPath = Join-Path $scriptDir "windows\runner\resources\app_icon.default.ico"

# Helper: Convert any PNG/JPG/BMP/ICO file into a valid 256x256 PNG-encoded Windows .ico file
function Convert-ToIcoFile {
    param(
        [string]$SourceImagePath,
        [string]$DestinationIcoPath
    )
    $ext = [System.IO.Path]::GetExtension($SourceImagePath).ToLower()
    if ($ext -eq ".ico") {
        Copy-Item -Path $SourceImagePath -Destination $DestinationIcoPath -Force
        return
    }
    Add-Type -AssemblyName System.Drawing
    $srcImg = [System.Drawing.Image]::FromFile($SourceImagePath)
    try {
        $bmp = New-Object System.Drawing.Bitmap(256, 256)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($srcImg, 0, 0, 256, 256)
        $g.Dispose()

        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngBytes = $ms.ToArray()
        $ms.Dispose()
        $bmp.Dispose()

        $fs = [System.IO.File]::Create($DestinationIcoPath)
        $bw = New-Object System.IO.BinaryWriter($fs)
        # ICONDIR header (Reserved=0, Type=1 (ICO), Count=1)
        $bw.Write([uint16]0)
        $bw.Write([uint16]1)
        $bw.Write([uint16]1)
        # ICONDIRENTRY (Width=0 [256], Height=0 [256], Colors=0, Reserved=0, Planes=1, Bpp=32, Size, Offset=22)
        $bw.Write([byte]0)
        $bw.Write([byte]0)
        $bw.Write([byte]0)
        $bw.Write([byte]0)
        $bw.Write([uint16]1)
        $bw.Write([uint16]32)
        $bw.Write([uint32]$pngBytes.Length)
        $bw.Write([uint32]22)
        $bw.Write($pngBytes)
        $bw.Flush()
        $bw.Close()
        $fs.Dispose()
    } finally {
        $srcImg.Dispose()
    }
}

# 0. Auto-fetch live Tenant Branding (Name, IconUrl, LogoUrl) from API when TenantKey is specified
$resolvedIconUrl = $IconUrl.Trim()
$resolvedLogoUrl = $LogoUrl.Trim()
if ($TenantKey.Trim() -ne "" -and $ApiBaseUrl.Trim() -ne "") {
    try {
        $brandEndpoint = "$($ApiBaseUrl.Trim().TrimEnd('/'))/api/SettingsApi/brand"
        $resp = Invoke-RestMethod -Uri $brandEndpoint -Headers @{ "X-Tenant-Key" = $TenantKey.Trim() } -TimeoutSec 5 -ErrorAction Stop
        if ($resp) {
            if ($BrandName -eq "Workspace Command Center" -and $resp.organizationName) {
                $BrandName = $resp.organizationName
            }
            if ($resolvedIconUrl -eq "" -and $resp.iconUrl) {
                $resolvedIconUrl = $resp.iconUrl
            }
            if ($resolvedLogoUrl -eq "" -and $resp.logoUrl) {
                $resolvedLogoUrl = $resp.logoUrl
            }
            Write-Host "Resolved tenant branding from API for '$TenantKey': Brand='$BrandName', Icon='$resolvedIconUrl'" -ForegroundColor Green
        }
    } catch {
        Write-Host "Note: Could not reach $ApiBaseUrl to auto-fetch live tenant branding (using supplied parameters)." -ForegroundColor DarkGray
    }
}

# Resolve relative URLs to full URLs if needed
function Resolve-FullAssetUrl([string]$url) {
    if ([string]::IsNullOrWhiteSpace($url)) { return "" }
    if ($url.StartsWith("http://") -or $url.StartsWith("https://")) { return $url }
    return "$($ApiBaseUrl.Trim().TrimEnd('/'))/$($url.TrimStart('/'))"
}
$resolvedIconUrl = Resolve-FullAssetUrl $resolvedIconUrl
$resolvedLogoUrl = Resolve-FullAssetUrl $resolvedLogoUrl

# Prepare custom .ico file if -IconPath or resolvedIconUrl/resolvedLogoUrl is available
$tempIconSource = ""
$customIcoFile = Join-Path $env:TEMP "tenant_build_icon.ico"
if ($IconPath.Trim() -ne "" -and (Test-Path $IconPath.Trim())) {
    $tempIconSource = (Resolve-Path $IconPath.Trim()).Path
} elseif ($resolvedIconUrl -ne "" -or $resolvedLogoUrl -ne "") {
    $downloadUrl = if ($resolvedIconUrl -ne "") { $resolvedIconUrl } else { $resolvedLogoUrl }
    try {
        $dlTemp = Join-Path $env:TEMP "tenant_dl_img.png"
        Invoke-WebRequest -Uri $downloadUrl -OutFile $dlTemp -TimeoutSec 8 -ErrorAction Stop
        $tempIconSource = $dlTemp
        Write-Host "Downloaded tenant icon from $downloadUrl" -ForegroundColor Green
    } catch {
        Write-Host "Note: Could not download remote icon from $downloadUrl; using default Windows icon." -ForegroundColor Yellow
    }
}

$usingCustomIcon = $false
if ($tempIconSource -ne "" -and (Test-Path $tempIconSource)) {
    try {
        Convert-ToIcoFile -SourceImagePath $tempIconSource -DestinationIcoPath $customIcoFile
        $usingCustomIcon = $true
        Write-Host "Generated Windows .ico for tenant: $customIcoFile" -ForegroundColor Green
    } catch {
        Write-Host "Warning: Failed to convert $tempIconSource to .ico ($_). Falling back to default icon." -ForegroundColor Yellow
    }
}

# Preserve default runner icon before overwriting for C++ compile
if (-not (Test-Path $backupIconPath) -and (Test-Path $runnerIconPath)) {
    Copy-Item -Path $runnerIconPath -Destination $backupIconPath -Force
}

if (-not $SkipFlutterBuild) {
    if ($usingCustomIcon) {
        Copy-Item -Path $customIcoFile -Destination $runnerIconPath -Force
    } elseif (Test-Path $backupIconPath) {
        Copy-Item -Path $backupIconPath -Destination $runnerIconPath -Force
    }

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
        if ($resolvedIconUrl -ne "") {
            $dartDefines += "--dart-define=LOCKED_TENANT_ICON_URL=$resolvedIconUrl"
        }
        if ($resolvedLogoUrl -ne "") {
            $dartDefines += "--dart-define=LOCKED_TENANT_LOGO_URL=$resolvedLogoUrl"
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

# Copy the active .ico into Release\tenant_icon.ico so shortcuts & Setup Wizard always use the tenant's icon
$releaseTenantIcon = Join-Path $releaseDir "tenant_icon.ico"
if ($usingCustomIcon) {
    Copy-Item -Path $customIcoFile -Destination $releaseTenantIcon -Force
} elseif (Test-Path $backupIconPath) {
    Copy-Item -Path $backupIconPath -Destination $releaseTenantIcon -Force
} elseif (Test-Path $runnerIconPath) {
    Copy-Item -Path $runnerIconPath -Destination $releaseTenantIcon -Force
}

# Write or remove tenant.lock.json inside Release folder
if ($TenantKey.Trim() -ne "") {
    $domainVal = if ($PrimaryDomain.Trim() -ne "") { $PrimaryDomain.Trim() } else { "$($TenantKey.Trim().ToLower()).local" }
    $lockObj = @{
        tenantKey          = $TenantKey.Trim()
        organizationName   = $BrandName
        primaryDomain      = $domainVal
        apiBaseUrl         = $ApiBaseUrl.Trim()
        iconUrl            = $resolvedIconUrl
        logoUrl            = $resolvedLogoUrl
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
    & $iscc "/DMyAppName=$BrandName" "/DMyAppPublisher=$BrandName" "/DMyOutputBaseFilename=$installerName" "/DMySetupIconFile=$releaseTenantIcon" "windows\installer\installer.iss"
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
