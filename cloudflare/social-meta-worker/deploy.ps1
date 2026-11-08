# Quick deploy script for Ozikol Social Meta Worker
$token = (Get-Content "$PSScriptRoot/../../.env" | Select-String -Pattern "CLOUDFLARE_API_TOKEN=").ToString().Split('=')[1].Trim()
$accountId = "edd3e27d73f391991df0f3d9ce22c4e5"
$zone = "66104652bc74411279ca90930425b49e"

Write-Host "Deploying worker script to Cloudflare..." -ForegroundColor Cyan
curl.exe -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$accountId/workers/scripts/ozikol-social-meta-worker" `
  -H "Authorization: Bearer $token" `
  -F "metadata=@$PSScriptRoot/metadata.json;type=application/json" `
  -F "worker.js=@$PSScriptRoot/worker.js;type=application/javascript+module"

Write-Host "`nWorker deployed successfully!" -ForegroundColor Green
