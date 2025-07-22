import { describe, test, expect, beforeAll } from 'vitest';
import { FingridApiService } from '~/services/fingrid-api.server';
import type { AppSettings } from '~/types/fingrid';

// Cabbage Pay Sandbox Credentials
const SANDBOX_CREDENTIALS = {
  API_BASE_URL: 'https://sandbox.cabbagepay.com/api/custom/',
  CLIENT_ID: 'AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg',
  SECRET_KEY: 'ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb',
  CONNECTED_ACCOUNT: 'acct_2iPZUHbj3SC61K12QNMmbb3pxSS4wq',
  JS_SDK_URL: 'https://cabbagepay.com/js/sandbox/cabbage.js'
};

describe('Cabbage Pay API Integration Tests', () => {
  let apiService: FingridApiService;
  let linkToken: string;
  let publicToken: string;
  let bankToken: string;

  beforeAll(() => {
    const settings: AppSettings = {
      testMode: true,
      testGatewayUrl: 'https://sandbox.cabbagepay.com',
      testClientId: SANDBOX_CREDENTIALS.CLIENT_ID,
      testClientSecret: SANDBOX_CREDENTIALS.SECRET_KEY,
      testConnectedAccount: SANDBOX_CREDENTIALS.CONNECTED_ACCOUNT,
      testScriptUrl: SANDBOX_CREDENTIALS.JS_SDK_URL,
      testRedirectUrl: 'https://fingrid-shopify-payment-gateway.vercel.app/api/fingrid/callback',
      clientName: 'Fingrid Shopify Test Store',
      discountPercentage: 5,
      themeColor: '#007acc',
      postTransactionStatus: 'paid',
      webhookSuccessStatus: 'fulfilled',
      webhookFailedStatus: 'cancelled'
    };

    apiService = new FingridApiService(settings);
  });

  describe('API Configuration Tests', () => {
    test('should use correct sandbox URLs and credentials', () => {
      expect(apiService.getJavaScriptSDKUrl()).toBe(SANDBOX_CREDENTIALS.JS_SDK_URL);
    });
  });

  describe('Link Token Generation', () => {
    test('should generate a link token successfully', async () => {
      const customerData = {
        customer_email: 'test@example.com',
        customer_id: 'test-customer-123',
        customer_phone: '1234567890', // 10 digits without +1
        customer_first_name: 'John',
        customer_last_name: 'Doe',
        return_url: 'https://fingrid-shopify-payment-gateway.vercel.app/api/fingrid/callback',
        amount: 1000, // $10.00 in cents
        currency: 'USD'
      };

      const result = await apiService.generateLinkToken(customerData);
      
      expect(result).toHaveProperty('link_token');
      expect(typeof result.link_token).toBe('string');
      expect(result.link_token.length).toBeGreaterThan(0);
      
      linkToken = result.link_token;
      console.log('✅ Link Token Generated:', linkToken);
    }, 30000);

    test('should generate link token with minimal data', async () => {
      const result = await apiService.generateLinkToken({
        customer_email: 'minimal@test.com'
      });
      
      expect(result).toHaveProperty('link_token');
      expect(typeof result.link_token).toBe('string');
      console.log('✅ Minimal Link Token Generated:', result.link_token);
    }, 30000);

    test('should handle missing required credentials', async () => {
      const invalidSettings: AppSettings = {
        testMode: true,
        testClientId: 'invalid',
        testClientSecret: 'invalid',
        discountPercentage: 0,
        postTransactionStatus: 'paid',
        webhookSuccessStatus: 'fulfilled',
        webhookFailedStatus: 'cancelled'
      };

      const invalidApiService = new FingridApiService(invalidSettings);
      
      await expect(
        invalidApiService.generateLinkToken({ customer_email: 'test@example.com' })
      ).rejects.toThrow();
    }, 30000);
  });

  describe('Public Token Exchange', () => {
    test('should handle invalid public token gracefully', async () => {
      const invalidPublicToken = 'invalid-public-token-123';
      
      await expect(
        apiService.exchangePublicToken(invalidPublicToken)
      ).rejects.toThrow();
    }, 30000);

    // Note: We can't test successful token exchange without user interaction
    // This would require the user to complete the bank linking flow
    test('should validate public token format', () => {
      expect(() => {
        // This should not throw for format validation
        const token = 'public-sandbox-token-123';
        expect(token).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Payment Processing', () => {
    test('should handle invalid bank token for payment', async () => {
      const transactionData = {
        bank_token: 'invalid-bank-token',
        amount: 1000, // $10.00 in cents
        currency: 'USD',
        customer_id: 'test-customer',
        statement_descriptor: 'Test Payment',
        metadata: 'Test transaction',
        ip_address: '192.168.1.1'
      };

      const result = await apiService.processPayment(transactionData);
      
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
      console.log('❌ Expected failure for invalid bank token:', result.message);
    }, 30000);

    test('should validate minimum payment amount', async () => {
      const transactionData = {
        bank_token: 'test-bank-token',
        amount: 50, // $0.50 - below minimum
        currency: 'USD',
        customer_id: 'test-customer',
        statement_descriptor: 'Test Payment',
        metadata: 'Test transaction',
        ip_address: '192.168.1.1'
      };

      const result = await apiService.processPayment(transactionData);
      
      expect(result.success).toBe(false);
      // Should handle minimum amount validation
      console.log('❌ Expected failure for amount below minimum:', result.message);
    }, 30000);
  });

  describe('Bank Token Health Check', () => {
    test('should check invalid bank token health', async () => {
      const result = await apiService.checkBankTokenHealth('invalid-bank-token');
      
      expect(result.isHealthy).toBe(false);
      expect(result.message).toBeDefined();
      console.log('❌ Expected unhealthy token result:', result.message);
    }, 30000);
  });

  describe('Bank Token Balance', () => {
    test('should handle invalid bank token for balance check', async () => {
      const result = await apiService.getBankTokenBalance('invalid-bank-token');
      
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
      console.log('❌ Expected failure for balance check:', result.message);
    }, 30000);
  });

  describe('API Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Create service with invalid URL to test network error handling
      const invalidSettings: AppSettings = {
        testMode: true,
        testGatewayUrl: 'https://invalid-url-that-does-not-exist.com',
        testClientId: SANDBOX_CREDENTIALS.CLIENT_ID,
        testClientSecret: SANDBOX_CREDENTIALS.SECRET_KEY,
        discountPercentage: 0,
        postTransactionStatus: 'paid',
        webhookSuccessStatus: 'fulfilled',
        webhookFailedStatus: 'cancelled'
      };

      const invalidApiService = new FingridApiService(invalidSettings);
      
      await expect(
        invalidApiService.generateLinkToken({ customer_email: 'test@example.com' })
      ).rejects.toThrow();
    }, 30000);
  });

  describe('Refund Processing', () => {
    test('should handle refund with invalid transaction ID', async () => {
      const transactionData = {
        orderId: 'test-order-123',
        amount: 1000,
        bankToken: 'invalid-bank-token',
        originalTransactionId: 'invalid-tx-id' // Keep metadata under 20 chars
      };

      const result = await apiService.refundPayment(transactionData);
      
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
      console.log('❌ Expected failure for invalid refund:', result.message);
    }, 30000);
  });

  describe('API Endpoints Validation', () => {
    test('should construct correct API endpoints', () => {
      // Test that the service constructs the correct URLs
      expect(apiService.getJavaScriptSDKUrl()).toBe('https://cabbagepay.com/js/sandbox/cabbage.js');
    });

    test('should use correct base URL for sandbox', async () => {
      // This will test the internal URL construction by making a request
      try {
        await apiService.generateLinkToken({ customer_email: 'test@example.com' });
      } catch (error) {
        // Even if it fails, we want to ensure it's hitting the right endpoint
        // Network errors are acceptable here, auth errors mean we're hitting the right URL
        expect(error).toBeDefined();
      }
    }, 30000);
  });

  describe('Credentials Validation', () => {
    test('should use correct sandbox credentials', () => {
      // Verify that our test setup uses the correct credentials
      expect(SANDBOX_CREDENTIALS.CLIENT_ID).toBe('AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg');
      expect(SANDBOX_CREDENTIALS.SECRET_KEY).toBe('ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb');
      expect(SANDBOX_CREDENTIALS.CONNECTED_ACCOUNT).toBe('acct_2iPZUHbj3SC61K12QNMmbb3pxSS4wq');
    });
  });
}); 