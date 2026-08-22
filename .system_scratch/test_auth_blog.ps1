# Login to get JWT token
$loginBody = @{
    email = "cola@admin.com"
    password = "Password123!"
} | ConvertTo-Json

try {
    $loginResp = Invoke-RestMethod -Uri "http://localhost:51025/api/Auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResp.token
    Write-Host "Got token successfully!"

    $headers = @{
        "Authorization" = "Bearer $token"
    }

    $body = @{
        title = "Test Article Community 2026"
        description = "Test summary description"
        fullDescription = "<p>This is a <strong>formatted</strong> test article.</p>"
        publish = $true
        isScheduled = $false
        sortOrder = 0
    } | ConvertTo-Json

    $resp = Invoke-RestMethod -Uri "http://localhost:51025/api/ContentApi/blogs" -Method Post -Body $body -ContentType "application/json" -Headers $headers
    Write-Host "Create Blog response status:" $resp.status
    Write-Host "Blog ID:" $resp.data.id
    Write-Host "Blog Title:" $resp.data.title
} catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Details:" $reader.ReadToEnd()
    }
}
