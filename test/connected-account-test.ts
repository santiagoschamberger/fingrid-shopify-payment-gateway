import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FingridApiService } from '~/services/fingrid-api.server';
import type { AppSettings } from '~/types/fingrid';

describe('Connected Account Integration Test', () => {
  let apiService: FingridApiService;
  let testSettings: AppSettings;

  beforeEach(() => {
    testSettings = {
      testMode: true,
      testGatewayUrl: 'https://sandbox.cabbagepay.com',
      testClientId: process.env.FINGRID_TEST_CLIENT_ID || 'AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg',
      testClientSecret: process.env.FINGRID_TEST_CLIENT_SECRET || 'ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb',
      testConnectedAccount: 'acct_2iPZUHbj3SC61K12QNMmbb3pxSS4wq', // Your provided test account
      discountPercentage: 5,
      postTransactionStatus: 'pending',
      webhookSuccessStatus: 'paid',
      webhookFailedStatus: 'cancelled',
      clientName: 'Test Store - Connected Account',
      themeColor: '209913'
    };

    apiService = new FingridApiService(testSettings);
  });

  describe('Connected Account Validation', () => {
    it('should use the correct connected account in payment requests', async () => {
      let capturedPayload: any;
      
      // Mock fetch to capture the request payload
      global.fetch = vi.fn().mockImplementation((url: string, options: any) => {
        capturedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            cabbage_return_code: 'pk1998',
            message: 'success',
            transaction_id: 'transfer_test123',
            status: 'initiated',
            final_charged_amount: 100.00,
            billing_type: 'single',
            transaction_type: 'charge'
          })
        });
      });

      await apiService.processPayment({
        bank_token: 'bank_token_sandbox_test123',
        amount: 100.00,
        currency: 'USD',
        statement_descriptor: 'Test Payment',
        metadata: 'connected-account-test'
      });

      // Verify the connected account is correctly used
      expect(capturedPayload.connected_acct).toBe('acct_2iPZUHbj3SC61K12QNMmbb3pxSS4wq');
      expect(capturedPayload.final_amount).toBe(100.00);
      expect(capturedPayload.transaction_type).toBe('charge');
      expect(capturedPayload.billing_type).toBe('single');
    });
  });

  describe('End-to-End Flow Simulation', () => {
    it('should simulate complete payment flow with connected account', async () => {
      const mockResponses = [
        // Link token generation response
        {
          cabbage_return_code: 'pk1998',
          message: 'success',
          link_token: 'link_sandbox_connected_test_12345',
          request_id: 'request_link_test'
        },
        // Token exchange response
        {
          cabbage_return_code: 'pk1998',
          message: 'success',
          bank_token: 'bank_token_sandbox_connected_test_67890',
          bank_name: 'FinBank Profiles - A',
          bank_account_last_four: '1234',
          request_id: 'request_exchange_test'
        },
        // Payment processing response
        {
          cabbage_return_code: 'pk1998',
          message: 'success',
          transaction_id: 'transfer_connected_test_abcdef',
          create_date: '2024-01-15 10:30:00.000',
          status: 'initiated',
          final_charged_amount: 100.00,
          billing_type: 'single',
          transaction_type: 'charge',
          metadata: 'connected-account-flow-test'
        }
      ];

      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        const response = mockResponses[callCount++];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response)
        });
      });

      // Step 1: Generate link token
      const linkTokenResult = await apiService.generateLinkToken({
        customer_email: 'test@example.com',
        customer_first_name: 'John',
        customer_last_name: 'Doe',
        customer_phone: '1234567890'
      });

      expect(linkTokenResult.link_token).toBe('link_sandbox_connected_test_12345');

      // Step 2: Exchange public token
      const exchangeResult = await apiService.exchangePublicToken('public_sandbox_test_token');

      expect(exchangeResult.bank_token).toBe('bank_token_sandbox_connected_test_67890');
      expect(exchangeResult.bank_name).toBe('FinBank Profiles - A');

      // Step 3: Process payment
      const paymentResult = await apiService.processPayment({
        bank_token: 'bank_token_sandbox_connected_test_67890',
        amount: 100.00,
        currency: 'USD',
        statement_descriptor: 'Connected Account Test',
        metadata: 'connected-account-flow-test'
      });

      expect(paymentResult.transaction_id).toBe('transfer_connected_test_abcdef');
      expect(paymentResult.status).toBe('initiated');
    });
  });

  describe('Bank Token Health Check', () => {
    it('should check bank token health with connected account', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: 'pk1998',
          message: 'success'
        })
      });

      const healthResult = await apiService.checkBankTokenHealth('bank_token_sandbox_test123');

      expect(healthResult.isHealthy).toBe(true);
      expect(healthResult.message).toBe('Bank token is healthy');

      // Verify the request was made with correct credentials
      const [url, options] = (global.fetch as any).mock.calls[0];
      const payload = JSON.parse(options.body);
      expect(payload.client_id).toBe(testSettings.testClientId);
      expect(payload.secret).toBe(testSettings.testClientSecret);
    });
  });

  describe('Bank Token Balance Check', () => {
    it('should get bank token balance with connected account', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: 'pk1998',
          message: 'success',
          available_balance: 5000.00,
          currency: 'USD'
        })
      });

      const balanceResult = await apiService.getBankTokenBalance('bank_token_sandbox_test123');

      expect(balanceResult.success).toBe(true);
      expect(balanceResult.balance).toBe(5000.00);
      expect(balanceResult.currency).toBe('USD');
    });
  });

  describe('Error Handling with Connected Account', () => {
    it('should handle insufficient funds error correctly', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: '1504',
          message: 'Insufficient funds',
          request_id: 'request_insufficient_funds'
        })
      });

      await expect(apiService.processPayment({
        bank_token: 'bank_token_sandbox_test123',
        amount: 10000.00, // Amount higher than available balance
        currency: 'USD'
      })).rejects.toThrow('Insufficient funds');
    });

    it('should handle expired bank token error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: '5041',
          message: 'Expired bank_token',
          request_id: 'request_expired_token'
        })
      });

      await expect(apiService.processPayment({
        bank_token: 'expired_bank_token_123',
        amount: 100.00,
        currency: 'USD'
      })).rejects.toThrow('Expired bank_token');
    });
  });

  describe('Configuration Validation', () => {
    it('should use correct JavaScript SDK URL for sandbox environment', () => {
      expect(apiService.getJavaScriptSDKUrl()).toBe('https://cabbagepay.com/js/sandbox/cabbage.js');
    });
  });
}); 