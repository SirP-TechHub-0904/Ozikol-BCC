Write-Host "==============================================================="
Write-Host "TESTING 3-TIER ROLE SECURITY & TOKEN AUTHORIZATION"
Write-Host "Roles: SuperAdmin | Admin | Feature Role (e.g. CmsManager, IdentityManager)"
Write-Host "==============================================================="

$baseUrl = "http://localhost:51026/api"

# Helper function for unauthenticated test
function Test-UnauthEndpoint($url, $testName) {
    Write-Host "`n[$testName] Accessing $url WITHOUT Token..."
    try {
        $req = [System.Net.HttpWebRequest]::Create($url)
        $req.Method = "GET"
        $resp = $req.GetResponse()
        Write-Host " ❌ FAIL: Expected 401 but request succeeded with 200" -ForegroundColor Red
        $resp.Close()
    } catch [System.Net.WebException] {
        $httpResp = $_.Exception.Response -as [System.Net.HttpWebResponse]
        if ($httpResp -and $httpResp.StatusCode -eq [System.Net.HttpStatusCode]::Unauthorized) {
            Write-Host " ✅ PASS: Endpoint correctly blocked unauthenticated request with (401) Unauthorized!" -ForegroundColor Green
        } else {
            Write-Host " ⚠️ Result:" $_.Exception.Message
        }
    }
}

# TEST 1: Unauthenticated CmsDashboardApi/stats
Test-UnauthEndpoint "$baseUrl/CmsDashboardApi/stats" "TEST 1"

# TEST 2: Unauthenticated DashboardApi/metrics
Test-UnauthEndpoint "$baseUrl/DashboardApi/metrics" "TEST 2"

# TEST 3: Login to get JWT Token
Write-Host "`n[TEST 3] Logging in with Admin credentials to get JWT Bearer token..."
$loginBody = @{
    email = "cola@admin.com"
    password = "Password123!"
} | ConvertTo-Json

$token = $null
try {
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginRes.data.token
    Write-Host " ✅ PASS: Login successful!" -ForegroundColor Green
    Write-Host "    User:" $loginRes.data.fullName
    Write-Host "    Tenant:" $loginRes.data.tenantKey
    Write-Host "    Token Received (Length: $($token.Length) characters)"
} catch {
    Write-Host " ❌ FAIL: Login failed:" $_.Exception.Message -ForegroundColor Red
}

if ($token) {
    $headers = @{
        "Authorization" = "Bearer $token"
        "X-Tenant-Key" = "cocacola"
    }

    # TEST 4: Authorized request to CmsDashboardApi/stats WITH Bearer token
    Write-Host "`n[TEST 4] Accessing CmsDashboardApi/stats WITH Bearer Token (SuperAdmin/Admin/CmsManager)..."
    try {
        $statsRes = Invoke-RestMethod -Uri "$baseUrl/CmsDashboardApi/stats" -Method GET -Headers $headers
        Write-Host " ✅ PASS: Authorized request succeeded (HTTP 200)!" -ForegroundColor Green
        Write-Host "    Total Web Pages:" $statsRes.data.totalPages
        Write-Host "    Total Categories:" $statsRes.data.totalCategories
        Write-Host "    Total Sliders:" $statsRes.data.totalSliders
    } catch {
        Write-Host " ❌ FAIL: Authorized request failed:" $_.Exception.Message -ForegroundColor Red
    }

    # TEST 5: Authorized request to DashboardApi/metrics WITH Bearer token
    Write-Host "`n[TEST 5] Accessing DashboardApi/metrics WITH Bearer Token (SuperAdmin/Admin)..."
    try {
        $metricsRes = Invoke-RestMethod -Uri "$baseUrl/DashboardApi/metrics" -Method GET -Headers $headers
        Write-Host " ✅ PASS: Authorized request succeeded (HTTP 200)!" -ForegroundColor Green
        Write-Host "    Resolved DB:" $metricsRes.data.resolvedDatabase
        Write-Host "    Total Members:" $metricsRes.data.totalMembers
    } catch {
        Write-Host " ❌ FAIL: Authorized request failed:" $_.Exception.Message -ForegroundColor Red
    }

    # TEST 6: Authorized request to IdentityApi/roles WITH Bearer token
    Write-Host "`n[TEST 6] Accessing IdentityApi/roles WITH Bearer Token (SuperAdmin/Admin/IdentityManager)..."
    try {
        $rolesRes = Invoke-RestMethod -Uri "$baseUrl/IdentityApi/roles" -Method GET -Headers $headers
        Write-Host " ✅ PASS: Authorized request succeeded (HTTP 200)!" -ForegroundColor Green
        Write-Host "    Available Roles:" ($rolesRes.data -join ", ")
    } catch {
        Write-Host " ❌ FAIL: Authorized request failed:" $_.Exception.Message -ForegroundColor Red
    }
}

# TEST 7: Public Website Request (GET pages) WITHOUT Token
Write-Host "`n[TEST 7] Accessing public ContentApi/pages WITHOUT Token (Public Website Access)..."
try {
    $pagesRes = Invoke-RestMethod -Uri "$baseUrl/ContentApi/pages" -Method GET
    Write-Host " ✅ PASS: Public website visitor can view pages (Count: $($pagesRes.data.Count))!" -ForegroundColor Green
} catch {
    Write-Host " ❌ FAIL: Public page request failed:" $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n==============================================================="
Write-Host "ALL SECURITY & AUTHORIZATION TESTS COMPLETED"
Write-Host "==============================================================="
