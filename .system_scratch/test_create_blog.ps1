$body = @{
    title = "Test Article 2026"
    description = "Test summary"
    fullDescription = "<p>This is a <strong>formatted</strong> test article.</p>"
    publish = $true
    isScheduled = $false
    sortOrder = 0
} | ConvertTo-Json

try {
    $resp = Invoke-RestMethod -Uri "http://localhost:51025/api/ContentApi/blogs" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Create Blog response:" ($resp | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Details:" $reader.ReadToEnd()
    }
}
