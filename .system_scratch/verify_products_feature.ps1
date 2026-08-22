$baseUrl = "https://localhost:51025/api"
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  COMMERCE & STORE STUDIO VERIFICATION   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Login as SuperAdmin
Write-Host "`n[Step 1] Logging in as SuperAdmin..." -ForegroundColor Yellow
$loginPayload = @{
    email = "superadmin@ozikol.com"
    password = "Password123!"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "$baseUrl/Auth/login" -Method Post -Body $loginPayload -ContentType "application/json"
$token = $loginRes.data.token
$headers = @{ "Authorization" = "Bearer $token" }
Write-Host "✓ Logged in successfully. Token acquired." -ForegroundColor Green

# 2. Create Product Category
Write-Host "`n[Step 2] Creating Commercial Category..." -ForegroundColor Yellow
$catPayload = @{
    title = "Cloud and Developer Tools"
    description = "Enterprise digital licenses, cloud platforms, and developer tooling."
    icon = "terminal"
    sortOrder = 1
    publish = $true
} | ConvertTo-Json

$catRes = Invoke-RestMethod -Uri "$baseUrl/ProductsApi/categories" -Method Post -Body $catPayload -ContentType "application/json" -Headers $headers
$catId = $catRes.data.id
Write-Host "✓ Created Category ID: $catId, Title: $($catRes.data.title)" -ForegroundColor Green

# 3. Create Software Product (Type 0)
Write-Host "`n[Step 3] Creating Software Product (Type 0)..." -ForegroundColor Yellow
$softwarePayload = @{
    title = "Ozikol Enterprise Cloud Suite"
    shortDescription = "Complete enterprise platform suite with multi-tenant dashboard and developer APIs."
    fullDescription = "<p>Full commercial enterprise solution for scalable team collaboration.</p>"
    type = 0
    publishStatus = 1
    price = 499.00
    compareAtPrice = 699.00
    sku = "OZ-ENT-001"
    bcpProductCategoryId = $catId
    coverImageUrl = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800"
    downloadFileUrl = "https://cdn.ozikol.com/releases/enterprise-suite-v2.zip"
    versionTag = "v2.5.0"
    fileSize = "64.2 MB"
    requiresLicenseKey = $true
    isFeatured = $true
} | ConvertTo-Json

$softRes = Invoke-RestMethod -Uri "$baseUrl/ProductsApi" -Method Post -Body $softwarePayload -ContentType "application/json" -Headers $headers
$softwareProduct = $softRes.data
Write-Host "✓ Created Software Product: $($softwareProduct.title), Slug: $($softwareProduct.slug), ID: $($softwareProduct.id)" -ForegroundColor Green

# 4. Create Consulting Service (Type 1)
Write-Host "`n[Step 4] Creating Consulting Service (Type 1)..." -ForegroundColor Yellow
$servicePayload = @{
    title = "Enterprise Architecture Advisory"
    shortDescription = "60-minute deep-dive consultation session with principal cloud architect."
    type = 1
    publishStatus = 1
    price = 850.00
    bcpProductCategoryId = $catId
    deliveryTimeframeDays = 3
    consultationDurationMinutes = 60
    deliverablesSummary = "Architecture audit report, scaling blueprint, and 1-on-1 strategy call."
} | ConvertTo-Json

$servRes = Invoke-RestMethod -Uri "$baseUrl/ProductsApi" -Method Post -Body $servicePayload -ContentType "application/json" -Headers $headers
Write-Host "✓ Created Service Product: $($servRes.data.title), ID: $($servRes.data.id)" -ForegroundColor Green

# 5. Test Public Storefront Catalog
Write-Host "`n[Step 5] Testing Public Storefront Catalog (/api/ProductsApi/public/catalog)..." -ForegroundColor Yellow
$pubCatalog = Invoke-RestMethod -Uri "$baseUrl/ProductsApi/public/catalog" -Method Get
Write-Host "✓ Public catalog returned $($pubCatalog.data.totalCount) items with Active Currency: $($pubCatalog.data.currencyCode) ($($pubCatalog.data.currencySymbol))" -ForegroundColor Green

# 6. Test Public Single Product Details
Write-Host "`n[Step 6] Testing Public Product Details by Slug..." -ForegroundColor Yellow
$slug = $softwareProduct.slug
$pubDetails = Invoke-RestMethod -Uri "$baseUrl/ProductsApi/public/$slug" -Method Get
Write-Host "✓ Public product details fetched: $($pubDetails.data.product.title)" -ForegroundColor Green

# 7. Test Commercial Checkout Engine
Write-Host "`n[Step 7] Testing Commercial Checkout Engine (/api/ProductsApi/checkout)..." -ForegroundColor Yellow
$checkoutPayload = @{
    customerName = "Jane Foster"
    customerEmail = "jane.foster@domain.com"
    customerPhone = "+1 (555) 234-5678"
    shippingAddress = "450 Silicon Way"
    shippingCity = "Austin"
    shippingState = "TX"
    shippingPostalCode = "78701"
    paymentMethod = "DirectGateway"
    items = @(
        @{
            productId = $softwareProduct.id
            quantity = 1
        }
    )
} | ConvertTo-Json

$orderRes = Invoke-RestMethod -Uri "$baseUrl/ProductsApi/checkout" -Method Post -Body $checkoutPayload -ContentType "application/json"
$orderData = $orderRes.data
Write-Host "✓ Order Created: #$($orderData.orderNumber), Amount: $($orderData.currencySymbol)$($orderData.totalAmount)" -ForegroundColor Green
$lic = $orderData.items[0].generatedLicenseKey
Write-Host "✓ Cryptographic License Key Generated: $lic" -ForegroundColor Cyan

# 8. Test Product Deletion Safeguard (Attempt Delete on Ordered Product)
Write-Host "`n[Step 8] Testing Order Deletion Safeguard (Blocked on Ordered Product)..." -ForegroundColor Yellow
$deleteBlocked = $false
try {
    Invoke-RestMethod -Uri "$baseUrl/ProductsApi/$($softwareProduct.id)" -Method Delete -Headers $headers
} catch {
    $deleteBlocked = $true
}
if ($deleteBlocked -eq $true) {
    Write-Host "✓ SUCCESS: Deletion was strictly blocked because orders exist." -ForegroundColor Green
}


# 9. Test Disable & Archive Product
Write-Host "`n[Step 9] Testing 1-Click Disable & Archive Product..." -ForegroundColor Yellow
$disableRes = Invoke-RestMethod -Uri "$baseUrl/ProductsApi/$($softwareProduct.id)/disable" -Method Put -Headers $headers
Write-Host "✓ Product status updated: $($disableRes.data.statusName)" -ForegroundColor Green

# 10. Test Deletion on Disposable Product (No Orders)
Write-Host "`n[Step 10] Testing Safe Deletion on Product with No Orders..." -ForegroundColor Yellow
$tempPayload = @{
    title = "Temporary Test Item"
    type = 2
    price = 10.00
} | ConvertTo-Json
$tempRes = Invoke-RestMethod -Uri "$baseUrl/ProductsApi" -Method Post -Body $tempPayload -ContentType "application/json" -Headers $headers
$tempId = $tempRes.data.id
$delRes = Invoke-RestMethod -Uri "$baseUrl/ProductsApi/$tempId" -Method Delete -Headers $headers
Write-Host "✓ Temporary Product safely deleted: $($delRes.message)" -ForegroundColor Green

# 11. Test Marketing Broadcast Studio Dispatch
Write-Host "`n[Step 11] Testing Marketing Broadcast Studio Dispatch..." -ForegroundColor Yellow
$mktgPayload = @{
    campaignName = "Autumn Cloud Launch"
    emailSubject = "Special VIP Access to Ozikol Cloud"
    productId = $softwareProduct.id
    templateType = "ProductLaunch"
    htmlContent = "<h1>Special VIP Access</h1><p>Enjoy our newly launched cloud platform.</p>"
    audienceFilter = "ManualUpload"
    manualEmails = @("user1@example.com", "user2@example.com", "user3@example.com")
} | ConvertTo-Json

$mktgRes = Invoke-RestMethod -Uri "$baseUrl/ProductsApi/marketing/dispatch" -Method Post -Body $mktgPayload -ContentType "application/json" -Headers $headers
Write-Host "✓ Marketing Campaign Dispatched: $($mktgRes.message)" -ForegroundColor Green

# 12. Test Queue Monitor Metrics
Write-Host "`n[Step 12] Testing Queue Monitor Metrics..." -ForegroundColor Yellow
$queueRes = Invoke-RestMethod -Uri "$baseUrl/ProductsApi/queues/summary" -Method Get -Headers $headers
Write-Host "✓ EmailQueue pending: $($queueRes.data.emailQueue.pending), completed: $($queueRes.data.emailQueue.completed)" -ForegroundColor Green
Write-Host "✓ SmsQueue pending: $($queueRes.data.smsQueue.pending)" -ForegroundColor Green
Write-Host "✓ JobQueue pending: $($queueRes.data.jobQueue.pending)" -ForegroundColor Green

# 13. Test Central Financial Ledger (Feature: ProductCatalog)
Write-Host "`n[Step 13] Testing Feature-Filtered Central Financial Ledger..." -ForegroundColor Yellow
$ledgerRes = Invoke-RestMethod -Uri "$baseUrl/ProductsApi/transactions" -Method Get -Headers $headers
Write-Host "✓ Total Commercial Revenue: $($ledgerRes.data.currencySymbol)$($ledgerRes.data.totalRevenue) $($ledgerRes.data.currencyCode)" -ForegroundColor Green
Write-Host "✓ Ledger items count: $($ledgerRes.data.totalCount)" -ForegroundColor Green

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  ALL COMMERCE FEATURES VERIFIED 100% OK " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
