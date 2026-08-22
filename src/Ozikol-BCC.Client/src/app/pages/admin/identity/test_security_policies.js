const http = require('http');

const baseUrl = 'http://localhost:51025';
const tenantKey = 'cocacola';

function request(method, path, body = null, token = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Key': tenantKey,
        ...headers
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => { reject(err); });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('==========================================');
  console.log('  IDENTITY & SECURITY CONTROL PANEL TEST  ');
  console.log('==========================================');

  // Step 1: Login
  console.log('[Step 1] Logging in as Admin...');
  const loginRes = await request('POST', '/api/Auth/login', {
    email: 'cola@admin.com',
    password: 'Password123!'
  });

  if (loginRes.statusCode !== 200 || !loginRes.data || !loginRes.data.isSuccess) {
    console.error('Login failed. Status Code:', loginRes.statusCode, 'Data:', loginRes.data, 'Raw:', loginRes.raw);
    process.exit(1);
  }

  const token = loginRes.data.data.token;
  console.log('✓ Logged in successfully.');

  // Step 2: Fetch & Update Password Policy
  console.log('\n[Step 2] Testing Password Complexity Policy Endpoints...');
  const getPolicyRes = await request('GET', '/api/IdentityApi/password-policy', null, token);
  if (getPolicyRes.statusCode !== 200) {
    console.error('Failed to get password policy:', getPolicyRes.data);
    process.exit(1);
  }
  console.log('✓ Current policy loaded:', getPolicyRes.data.data);

  const testPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireDigit: true,
    requireNonAlphanumeric: true,
    maxFailedAccessAttempts: 5,
    defaultLockoutTimeSpanMinutes: 15
  };

  console.log('Updating password policy settings...');
  const updatePolicyRes = await request('PUT', '/api/IdentityApi/password-policy', testPolicy, token);
  if (updatePolicyRes.statusCode !== 200) {
    console.error('Failed to update password policy:', updatePolicyRes.data);
    process.exit(1);
  }
  console.log('✓ Password policy updated successfully.');

  // Step 3: Fetch & Update MFA Global Enforcement Rules
  console.log('\n[Step 3] Testing MFA Enforcement Policy Endpoints...');
  const getMfaRes = await request('GET', '/api/IdentityApi/mfa-policy', null, token);
  if (getMfaRes.statusCode !== 200) {
    console.error('Failed to get MFA policy:', getMfaRes.data);
    process.exit(1);
  }
  console.log('✓ Current MFA settings:', getMfaRes.data.data);

  const testMfaPolicy = {
    enforceMfaForAllUsers: false,
    enforceMfaForAdmins: true,
    allowedMethods: ['GoogleAuthenticator', 'MicrosoftAuthenticator', 'Email', 'SMS']
  };

  console.log('Updating MFA enforcement rules...');
  const updateMfaRes = await request('PUT', '/api/IdentityApi/mfa-policy', testMfaPolicy, token);
  if (updateMfaRes.statusCode !== 200) {
    console.error('Failed to update MFA policy:', updateMfaRes.data);
    process.exit(1);
  }
  console.log('✓ MFA policy settings saved.');

  // Step 4: Search users autocomplete (SuperAdmin isolation)
  console.log('\n[Step 4] Testing Autocomplete User Search & RBAC isolation...');
  const searchRes = await request('GET', '/api/IdentityApi/users/search?term=cola', null, token);
  if (searchRes.statusCode !== 200) {
    console.error('Failed to search users:', searchRes.data);
    process.exit(1);
  }
  
  const users = searchRes.data.data || [];
  console.log(`✓ User search returned ${users.length} match(es).`);
  users.forEach(u => {
    console.log(`  - User: ${u.fullName} (Email: ${u.email}, Designation: ${u.designation})`);
  });

  if (users.length > 0) {
    const targetUser = users[0];
    console.log(`Loading permissions matrix for selected user: ${targetUser.fullName}...`);
    const getRolesRes = await request('GET', `/api/IdentityApi/users/${targetUser.id}/feature-roles`, null, token);
    if (getRolesRes.statusCode !== 200) {
      console.warn('Could not read user feature roles (possibly SuperAdmin restricted):', getRolesRes.data);
    } else {
      console.log('✓ Feature roles data loaded:', getRolesRes.data.data);

      console.log('Updating feature scope levels...');
      const payload = getRolesRes.data.data;
      // Let's modify a scope to test write compatibility
      if (payload.featureRoles && payload.featureRoles.length > 0) {
        payload.featureRoles[0].scope = 'ReadOnly';
      }
      const saveRolesRes = await request('POST', `/api/IdentityApi/users/${targetUser.id}/feature-roles`, payload, token);
      if (saveRolesRes.statusCode !== 200) {
        console.error('Failed to save permissions:', saveRolesRes.data);
        process.exit(1);
      }
      console.log('✓ User feature roles successfully updated.');
    }
  }

  // Step 5: Telemetry stats
  console.log('\n[Step 5] Checking telemetry stats provider...');
  const statsRes = await request('GET', '/api/IdentityApi/telemetry', null, token);
  if (statsRes.statusCode !== 200) {
    console.error('Failed to load telemetry stats:', statsRes.data);
    process.exit(1);
  }
  console.log('✓ Telemetry Stats loaded successfully:', statsRes.data.data);

  // Step 6: Security Login Audit Trail
  console.log('\n[Step 6] Retrieving Security Login Audit Logs...');
  const logsRes = await request('GET', '/api/IdentityApi/login-audit', null, token);
  if (logsRes.statusCode !== 200) {
    console.error('Failed to fetch login audit logs:', logsRes.data);
    process.exit(1);
  }
  console.log(`✓ Fetched ${logsRes.data.data ? logsRes.data.data.length : 0} security events log entries.`);

  console.log('\n==========================================');
  console.log('  INTEGRATION TEST SUCCESSFULLY COMPLETED  ');
  console.log('==========================================');
}

run().catch(err => {
  console.error('An unexpected error occurred during tests:', err);
  process.exit(1);
});
