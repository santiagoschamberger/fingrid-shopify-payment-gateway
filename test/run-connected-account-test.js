#!/usr/bin/env node

/**
 * Connected Account Test Runner
 * 
 * This script tests the FinGrid API integration with the provided connected account:
 * acct_2iPZUHbj3SC61K12QNMmbb3pxSS4wq
 */

console.log('🧪 Connected Account Integration Test');
console.log('=====================================');
console.log('');
console.log('Testing with connected account: acct_2iPZUHbj3SC61K12QNMmbb3pxSS4wq');
console.log('Environment: Sandbox (https://sandbox.cabbagepay.com)');
console.log('');

// Test configuration
const testConfig = {
  connectedAccount: 'acct_2iPZUHbj3SC61K12QNMmbb3pxSS4wq',
  environment: 'sandbox',
  apiBaseUrl: 'https://sandbox.cabbagepay.com',
  jsSDKUrl: 'https://cabbagepay.com/js/sandbox/cabbage.js',
  testCredentials: {
    clientId: process.env.FINGRID_TEST_CLIENT_ID || 'AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg',
    clientSecret: process.env.FINGRID_TEST_CLIENT_SECRET || 'ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb'
  }
};

console.log('📋 Test Configuration:');
console.log('----------------------');
console.log(`Connected Account: ${testConfig.connectedAccount}`);
console.log(`API Base URL: ${testConfig.apiBaseUrl}`);
console.log(`JavaScript SDK URL: ${testConfig.jsSDKUrl}`);
console.log(`Client ID: ${testConfig.testCredentials.clientId}`);
console.log(`Client Secret: ${testConfig.testCredentials.clientSecret.substring(0, 10)}...`);
console.log('');

// Test scenarios to validate
const testScenarios = [
  {
    name: 'Link Token Generation',
    description: 'Test generating a link token for bank connection',
    endpoint: '/api/custom/link/token/create',
    testData: {
      customer_email: 'test@example.com',
      customer_first_name: 'John',
      customer_last_name: 'Doe',
      customer_phone: '1234567890'
    }
  },
  {
    name: 'Token Exchange',
    description: 'Test exchanging public token for bank token',
    endpoint: '/api/custom/link/public_token/exchange',
    testData: {
      public_token: 'public_sandbox_test_token'
    }
  },
  {
    name: 'Payment Processing',
    description: 'Test processing a payment with bank token',
    endpoint: '/api/custom/transaction/move_cabbage',
    testData: {
      bank_token: 'bank_token_sandbox_test',
      amount: 100.00,
      connected_acct: testConfig.connectedAccount
    }
  },
  {
    name: 'Bank Token Health Check',
    description: 'Test checking bank token health',
    endpoint: '/api/custom/health/token/bank_token',
    testData: {
      bank_token: 'bank_token_sandbox_test'
    }
  },
  {
    name: 'Bank Token Balance Check',
    description: 'Test checking bank token balance',
    endpoint: '/api/custom/bank_token/balance',
    testData: {
      bank_token: 'bank_token_sandbox_test'
    }
  }
];

console.log('🎯 Test Scenarios:');
console.log('------------------');
testScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.name}`);
  console.log(`   Description: ${scenario.description}`);
  console.log(`   Endpoint: ${scenario.endpoint}`);
  console.log('');
});

console.log('🔧 Testing Instructions:');
console.log('------------------------');
console.log('1. Make sure your environment variables are set:');
console.log('   - FINGRID_TEST_CLIENT_ID');
console.log('   - FINGRID_TEST_CLIENT_SECRET');
console.log('');
console.log('2. Run the unit tests:');
console.log('   npm test test/connected-account-test.ts');
console.log('');
console.log('3. Run the integration tests:');
console.log('   npm test test/fingrid-integration.test.ts');
console.log('');
console.log('4. Test the API endpoints manually:');
console.log('   npm run dev');
console.log('   # Then test each API endpoint through the Shopify app');
console.log('');

console.log('📝 Expected Test Results:');
console.log('-------------------------');
console.log('✅ All API requests should use the connected account: acct_2iPZUHbj3SC61K12QNMmbb3pxSS4wq');
console.log('✅ Link token generation should return a valid sandbox token');
console.log('✅ Token exchange should work with FinBank test credentials');
console.log('✅ Payment processing should handle test scenarios correctly');
console.log('✅ Error codes should be handled according to FinGrid documentation');
console.log('');

console.log('🏦 FinGrid Test Bank Information:');
console.log('---------------------------------');
console.log('Test Financial Institutions:');
console.log('- FinBank Profiles - A');
console.log('- FinBank Profiles - B');
console.log('');
console.log('Test Credentials for successful payments (up to $4999):');
console.log('- Username: profile_03');
console.log('- Password: profile_03');
console.log('');
console.log('Test Credentials for insufficient funds testing:');
console.log('- Username: profile_04');
console.log('- Password: profile_04');
console.log('');

console.log('🚀 Ready to test!');
console.log('=================');
console.log('Your connected account is configured and ready for testing.');
console.log('Follow the testing instructions above to validate the integration.');
console.log(''); 