// Quick local test for settings functionality
const { encrypt, decrypt } = require('../app/utils/encryption.server.ts');

console.log('🧪 Testing encryption functionality...\n');

// Test the exact values from your logs
const testValues = [
  'AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg',
  'ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb',
  'Payment Gateway',
  'https://api.test.fingrid.com',
  ''
];

testValues.forEach((value, index) => {
  try {
    console.log(`Test ${index + 1}: "${value}"`);
    const encrypted = encrypt(value);
    console.log(`  ✅ Encrypted: ${encrypted.substring(0, 20)}...`);
    
    const decrypted = decrypt(encrypted);
    console.log(`  ✅ Decrypted: ${decrypted}`);
    console.log(`  ✅ Match: ${value === decrypted ? 'YES' : 'NO'}\n`);
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
  }
});

console.log('🎉 All encryption tests completed!');
console.log('\nIf all tests show "Match: YES", the encryption fix is working correctly.');
console.log('You should now be able to save settings in the Shopify admin interface.'); 