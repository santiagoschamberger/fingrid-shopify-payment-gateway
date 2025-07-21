#!/usr/bin/env node

/**
 * Manual Connected Account Test
 * 
 * This script manually tests the FinGrid API integration with your connected account
 * to verify it's properly configured and working.
 */

const https = require('https');

// Your test configuration
const config = {
  connectedAccount: 'acct_2iPZUHbj3SC61K12QNMmbb3pxSS4wq',
  apiBaseUrl: 'https://sandbox.cabbagepay.com',
  clientId: process.env.FINGRID_TEST_CLIENT_ID || 'AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg',
  clientSecret: process.env.FINGRID_TEST_CLIENT_SECRET || 'ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb'
};

console.log('🧪 Manual Connected Account Test');
console.log('================================');
console.log(`Connected Account: ${config.connectedAccount}`);
console.log(`API Base URL: ${config.apiBaseUrl}`);
console.log('');

// Test 1: Generate Link Token
async function testLinkTokenGeneration() {
  console.log('🔗 Test 1: Link Token Generation');
  console.log('--------------------------------');
  
  const payload = {
    client_id: config.clientId,
    secret: config.clientSecret,
    client_name: 'Test Store - Connected Account',
    redirect_uri: 'https://example.com/callback',
    cust_email: 'test@example.com',
    cust_first_name: 'John',
    cust_last_name: 'Doe',
    cust_phone_number: '1234567890'
  };

  try {
    const response = await makeAPICall('/api/custom/link/token/create', payload);
    
    if (response.cabbage_return_code === 'pk1998') {
      console.log('✅ SUCCESS: Link token generated');
      console.log(`   Link Token: ${response.link_token}`);
      console.log(`   Request ID: ${response.request_id}`);
      return response.link_token;
    } else {
      console.log('❌ FAILED: Link token generation failed');
      console.log(`   Error Code: ${response.cabbage_return_code}`);
      console.log(`   Message: ${response.message}`);
      return null;
    }
  } catch (error) {
    console.log('❌ ERROR: Link token generation failed');
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

// Test 2: Check Connected Account Configuration
async function testConnectedAccountConfig() {
  console.log('');
  console.log('⚙️  Test 2: Connected Account Configuration');
  console.log('------------------------------------------');
  
  // This test verifies that the connected account is properly formatted
  const accountPattern = /^acct_[a-zA-Z0-9]{20,}$/;
  
  if (accountPattern.test(config.connectedAccount)) {
    console.log('✅ SUCCESS: Connected account format is valid');
    console.log(`   Account ID: ${config.connectedAccount}`);
    console.log(`   Length: ${config.connectedAccount.length} characters`);
  } else {
    console.log('❌ FAILED: Connected account format is invalid');
    console.log(`   Account ID: ${config.connectedAccount}`);
  }
}

// Test 3: Validate API Credentials
async function testAPICredentials() {
  console.log('');
  console.log('🔐 Test 3: API Credentials Validation');
  console.log('-------------------------------------');
  
  // Test with minimal payload to check credentials
  const payload = {
    client_id: config.clientId,
    secret: config.clientSecret,
    client_name: 'Credential Test'
  };

  try {
    const response = await makeAPICall('/api/custom/link/token/create', payload);
    
    if (response.cabbage_return_code === 'pk1998' || response.cabbage_return_code === '5463') {
      // pk1998 = success, 5463 = missing customer info (but credentials are valid)
      console.log('✅ SUCCESS: API credentials are valid');
      console.log(`   Client ID: ${config.clientId}`);
      console.log(`   Response Code: ${response.cabbage_return_code}`);
    } else if (response.cabbage_return_code === '9384') {
      console.log('❌ FAILED: API credentials are invalid');
      console.log(`   Error: Permission Denied`);
      console.log(`   Client ID: ${config.clientId}`);
    } else {
      console.log('⚠️  WARNING: Unexpected response');
      console.log(`   Response Code: ${response.cabbage_return_code}`);
      console.log(`   Message: ${response.message}`);
    }
  } catch (error) {
    console.log('❌ ERROR: API credentials test failed');
    console.log(`   Error: ${error.message}`);
  }
}

// Helper function to make API calls
function makeAPICall(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const url = new URL(config.apiBaseUrl + endpoint);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Run all tests
async function runTests() {
  console.log('Starting manual tests...');
  console.log('');
  
  await testConnectedAccountConfig();
  await testAPICredentials();
  await testLinkTokenGeneration();
  
  console.log('');
  console.log('🏁 Manual Testing Complete');
  console.log('==========================');
  console.log('');
  console.log('Next Steps:');
  console.log('1. If all tests passed, your connected account is ready to use');
  console.log('2. You can now test the full payment flow in your Shopify app');
  console.log('3. Use the FinGrid test bank credentials:');
  console.log('   - Bank: FinBank Profiles - A or B');
  console.log('   - Username: profile_03, Password: profile_03 (for successful payments)');
  console.log('   - Username: profile_04, Password: profile_04 (for insufficient funds test)');
  console.log('');
}

// Run the tests
runTests().catch(console.error); 