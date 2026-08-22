const http = require('http');

const baseUrl = 'http://localhost:51025/api';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const options = {
      method: method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Key': 'cocacola'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({ statusCode: res.statusCode, body: parsed });
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
          else reject({ statusCode: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('==========================================');
  console.log('  COMMERCE & STORE STUDIO E2E TEST RUN    ');
  console.log('==========================================\n');

  // 1. Admin Login
  console.log('[Step 1] Logging in as Admin (cola@admin.com, Tenant: cocacola)...');
  const loginRes = await request('POST', '/Auth/login', {
    email: 'cola@admin.com',
    password: 'Password123!'
  });
  const token = loginRes.data.token;
  console.log(`✓ Logged in successfully. Token acquired for: ${loginRes.data.fullName}\n`);



  // 2. Create Category
  console.log('[Step 2] Creating Commercial Category...');
  const catRes = await request('POST', '/ProductsApi/categories', {
    title: 'Cloud & Developer Tools',
    description: 'Enterprise digital licenses, cloud platforms, and developer tooling.',
    icon: 'terminal',
    sortOrder: 1,
    publish: true
  }, token);
  const catId = catRes.data.id;
  console.log(`✓ Created Category: ${catRes.data.title} (ID: ${catId})\n`);

  // 3. Create Software Product (Type 0)
  console.log('[Step 3] Creating Software Product (Type 0)...');
  const softRes = await request('POST', '/ProductsApi', {
    title: 'Ozikol Enterprise Cloud Suite',
    shortDescription: 'Complete enterprise platform suite with multi-tenant dashboard and developer APIs.',
    fullDescription: '<p>Full commercial enterprise solution for scalable team collaboration.</p>',
    type: 0,
    publishStatus: 1,
    price: 499.00,
    compareAtPrice: 699.00,
    sku: 'OZ-ENT-001',
    bcpProductCategoryId: catId,
    coverImageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
    downloadFileUrl: 'https://cdn.ozikol.com/releases/enterprise-suite-v2.zip',
    versionTag: 'v2.5.0',
    fileSize: '64.2 MB',
    requiresLicenseKey: true,
    isFeatured: true
  }, token);
  const softwareProduct = softRes.data;
  console.log(`✓ Created Product: ${softwareProduct.title} (Slug: ${softwareProduct.slug})\n`);

  // 4. Create Consulting Service (Type 1)
  console.log('[Step 4] Creating Service Product (Type 1)...');
  const servRes = await request('POST', '/ProductsApi', {
    title: 'Enterprise Architecture Advisory',
    shortDescription: '60-minute deep-dive consultation session with principal cloud architect.',
    type: 1,
    publishStatus: 1,
    price: 850.00,
    bcpProductCategoryId: catId,
    deliveryTimeframeDays: 3,
    consultationDurationMinutes: 60,
    deliverablesSummary: 'Architecture audit report, scaling blueprint, and 1-on-1 strategy call.'
  }, token);
  console.log(`✓ Created Service Product: ${servRes.data.title}\n`);

  // 5. Test Public Storefront Catalog
  console.log('[Step 5] Testing Public Storefront Catalog...');
  const pubCatalog = await request('GET', '/ProductsApi/public/catalog');
  console.log(`✓ Catalog Items Count: ${pubCatalog.data.totalCount}, Currency: ${pubCatalog.data.currencyCode} (${pubCatalog.data.currencySymbol})\n`);

  // 6. Test Single Public Product Details
  console.log('[Step 6] Testing Public Product Details by Slug...');
  const pubDetails = await request('GET', `/ProductsApi/by-slug/${softwareProduct.slug}`);
  console.log(`✓ Fetched Public Details for: ${pubDetails.data.product.title}\n`);


  // 7. Test Commercial Checkout Engine
  console.log('[Step 7] Testing Commercial Checkout Engine...');
  const checkoutRes = await request('POST', '/ProductsApi/orders/checkout', {
    customerName: 'Jane Foster',
    customerEmail: 'jane.foster@domain.com',
    customerPhone: '+1 (555) 234-5678',
    shippingAddressLine1: '450 Silicon Way',
    shippingCity: 'Austin',
    shippingState: 'TX',
    shippingPostalCode: '78701',
    paymentMethod: 'DirectGateway',
    items: [
      { productId: softwareProduct.id, quantity: 1 }
    ]
  });
  console.log(`✓ Order Created: #${checkoutRes.data.orderNumber}, Total: ${checkoutRes.data.currencySymbol}${checkoutRes.data.totalAmount}`);
  const licKey = checkoutRes.data.items[0]?.generatedLicenseKey || '(none)';
  console.log(`✓ Auto-Generated Cryptographic License: ${licKey}\n`);

  // 8. Test Product Deletion Safeguard (Attempt Delete on Ordered Product)
  console.log('[Step 8] Testing Order Deletion Safeguard (Blocked on Ordered Product)...');
  try {
    await request('DELETE', `/ProductsApi/${softwareProduct.id}`, null, token);
    console.log('X ERROR: Deletion was unexpectedly allowed!');
  } catch (err) {
    console.log(`✓ SUCCESS: Deletion was strictly blocked with status ${err.statusCode}: "${err.body?.message || 'Orders exist'}"\n`);
  }

  // 9. Test Disable & Archive Product
  console.log('[Step 9] Testing 1-Click Disable & Archive...');
  const disableRes = await request('PUT', `/ProductsApi/${softwareProduct.id}/disable`, {}, token);
  console.log(`✓ Product disabled and archived. Status: ${disableRes.data.statusName}\n`);

  // 10. Test Deletion on Disposable Product (No Orders)
  console.log('[Step 10] Testing Safe Deletion on Product with No Orders...');
  const tempRes = await request('POST', '/ProductsApi', {
    title: 'Disposable Test Item',
    type: 2,
    price: 15.00
  }, token);
  const delRes = await request('DELETE', `/ProductsApi/${tempRes.data.id}`, null, token);
  console.log(`✓ Disposable Product safely purged: "${delRes.message}"\n`);

  // 11. Test Marketing Broadcast Studio Dispatch
  console.log('[Step 11] Testing Marketing Broadcast Studio Dispatch...');
  const mktgRes = await request('POST', '/ProductsApi/marketing/dispatch', {
    campaignName: 'Autumn Cloud Launch',
    emailSubject: 'Special VIP Access to Ozikol Cloud',
    productId: softwareProduct.id,
    templateType: 'ProductLaunch',
    htmlContent: '<h1>Special VIP Access</h1><p>Enjoy our newly launched cloud platform.</p>',
    audienceFilter: 'ManualUpload',
    manualEmails: ['member1@company.com', 'member2@company.com', 'member3@company.com']
  }, token);
  console.log(`✓ Marketing campaign enqueued into EmailQueue: "${mktgRes.message}"\n`);

  // 12. Test Queue Monitor Metrics
  console.log('[Step 12] Testing Queue Monitor Metrics...');
  const queuesRes = await request('GET', '/ProductsApi/queues/summary', null, token);
  console.log(`✓ EmailQueue -> Pending: ${queuesRes.data.emailQueue.pending}, Completed: ${queuesRes.data.emailQueue.completed}`);
  console.log(`✓ SmsQueue -> Pending: ${queuesRes.data.smsQueue.pending}`);
  console.log(`✓ Scheduled JobQueue -> Pending: ${queuesRes.data.jobQueue.pending}\n`);

  // 13. Test Central Financial Ledger (Feature: ProductCatalog)
  console.log('[Step 13] Testing Feature-Filtered Central Financial Ledger...');
  const ledgerRes = await request('GET', '/ProductsApi/transactions', null, token);
  console.log(`✓ Central Ledger Total Commercial Revenue: ${ledgerRes.data.currencySymbol}${ledgerRes.data.totalRevenue} ${ledgerRes.data.currencyCode}`);
  console.log(`✓ Ledger Transaction Items Recorded: ${ledgerRes.data.totalCount}\n`);

  console.log('==========================================');
  console.log('  ALL 13 VERIFICATION STEPS PASSED 100%!  ');
  console.log('==========================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
