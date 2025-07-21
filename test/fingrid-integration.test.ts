import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FingridApiService } from '~/services/fingrid-api.server';
import type { AppSettings } from '~/types/fingrid';

describe('FinGrid API Integration Tests', () => {
  let apiService: FingridApiService;
  let mockSettings: AppSettings;

  beforeEach(() => {
    mockSettings = {
      testMode: true,
      testGatewayUrl: 'https://sandbox.cabbagepay.com',
      testClientId: 'AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg',
      testClientSecret: 'ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb',
      testConnectedAccount: 'acct_034ae0d999f78e43de32',
      discountPercentage: 5,
      postTransactionStatus: 'pending',
      webhookSuccessStatus: 'paid',
      webhookFailedStatus: 'cancelled',
      clientName: 'Test Store'
    };

    apiService = new FingridApiService(mockSettings);
  });

  describe('API URL Generation', () => {
    it('should use correct sandbox URL in test mode', () => {
      const url = apiService.getJavaScriptSDKUrl();
      expect(url).toBe('https://cabbagepay.com/js/sandbox/cabbage.js');
    });

    it('should use correct production URL in live mode', () => {
      mockSettings.testMode = false;
      apiService = new FingridApiService(mockSettings);
      const url = apiService.getJavaScriptSDKUrl();
      expect(url).toBe('https://cabbagepay.com/js/production/cabbage.js');
    });
  });

  describe('Request Payload Structure', () => {
    it('should structure link token request correctly', async () => {
      let capturedPayload: any;
      
      global.fetch = vi.fn().mockImplementation((url, options) => {
        capturedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            cabbage_return_code: 'pk1998',
            message: 'success',
            link_token: 'link_sandbox_99570daad85e40dca88587da'
          })
        });
      });

      await apiService.generateLinkToken({
        customer_email: 'test@example.com',
        customer_first_name: 'John',
        customer_last_name: 'Doe',
        customer_phone: '1234567890'
      });

      expect(capturedPayload).toMatchObject({
        client_id: 'AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg',
        secret: 'ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb',
        client_name: 'Test Store',
        cust_email: 'test@example.com',
        cust_first_name: 'John',
        cust_last_name: 'Doe',
        cust_phone_number: '1234567890'
      });
    });

    it('should structure payment request correctly', async () => {
      let capturedPayload: any;
      
      global.fetch = vi.fn().mockImplementation((url, options) => {
        capturedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            cabbage_return_code: 'pk1998',
            message: 'success',
            transaction_id: 'transfer_f6736b3c6f334aa5b579c9de',
            status: 'initiated'
          })
        });
      });

      await apiService.processPayment({
        bank_token: 'bank_token_sandbox_b1de80d70fab4c659d67f366',
        amount: 100.00,
        currency: 'USD',
        statement_descriptor: 'Test Payment',
        metadata: 'test-metadata'
      });

      expect(capturedPayload).toMatchObject({
        client_id: 'AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg',
        secret: 'ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb',
        bank_token: 'bank_token_sandbox_b1de80d70fab4c659d67f366',
        connected_acct: 'acct_034ae0d999f78e43de32',
        transaction_type: 'charge',
        billing_type: 'single',
        speed: 'next_day',
        final_amount: 100.00,
        application_fee_amount: 0,
        statement_descriptor: 'Test Payment',
        metadata: 'test-metadata'
      });
    });
  });

  describe('Error Code Handling', () => {
    const errorTestCases = [
      { code: '9450', message: 'Required: six digit HEX code for theme_color', expectedMessage: 'Required: six digit HEX code for theme_color' },
      { code: '5463', message: 'Required: cust_phone_number or cust_email', expectedMessage: 'Required: cust_phone_number or cust_email' },
      { code: '3957', message: 'Required: client_name', expectedMessage: 'Required: client_name' },
      { code: '9384', message: 'Permission Denied', expectedMessage: 'Permission Denied' },
      { code: '0113', message: 'Something went wrong. Contact FinGrid Dev team.', expectedMessage: 'Something went wrong. Contact FinGrid Dev team.' },
    ];

    errorTestCases.forEach(({ code, message, expectedMessage }) => {
      it(`should handle error code ${code} correctly`, async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            cabbage_return_code: code,
            message: message,
            request_id: 'request_test'
          })
        });

        await expect(apiService.generateLinkToken({
          customer_email: 'test@example.com'
        })).rejects.toThrow(expectedMessage);
      });
    });
  });

  describe('Network Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      await expect(apiService.generateLinkToken({
        customer_email: 'test@example.com'
      })).rejects.toThrow('Failed to generate link token');
    });

    it('should handle malformed JSON responses', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token'))
      });

      await expect(apiService.generateLinkToken({
        customer_email: 'test@example.com'
      })).rejects.toThrow('Failed to generate link token');
    });
  });

  describe('Response Validation', () => {
    it('should reject responses without required fields', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: 'pk1998',
          message: 'success'
          // Missing link_token field
        })
      });

      await expect(apiService.generateLinkToken({
        customer_email: 'test@example.com'
      })).rejects.toThrow('Failed to generate link token');
    });

    it('should handle success responses correctly', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: 'pk1998',
          message: 'success',
          link_token: 'link_sandbox_99570daad85e40dca88587da',
          request_id: 'request_99570daad85e40dca88587da'
        })
      });

      const result = await apiService.generateLinkToken({
        customer_email: 'test@example.com'
      });

      expect(result).toMatchObject({
        link_token: 'link_sandbox_99570daad85e40dca88587da'
      });
    });
  });
}); 