import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FingridApiService } from '~/services/fingrid-api.server';
import { createMockFingridApiResponse } from './setup';
import type { AppSettings } from '~/types/fingrid';

describe('FingridApiService', () => {
  let apiService: FingridApiService;
  let mockSettings: AppSettings;

  beforeEach(() => {
    mockSettings = {
      testMode: true,
      testGatewayUrl: 'https://sandbox.cabbagepay.com',
      testClientId: 'AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg',
      testClientSecret: 'ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb',
      testConnectedAccount: 'test-account',
      discountPercentage: 5,
      postTransactionStatus: 'pending',
      webhookSuccessStatus: 'paid',
      webhookFailedStatus: 'cancelled',
      clientName: 'Test Store'
    };

    apiService = new FingridApiService(mockSettings);
  });

  describe('generateLinkToken', () => {
    it('should generate link token successfully', async () => {
      // Mock successful API response according to FinGrid documentation
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
        customer_email: 'test@example.com',
        customer_first_name: 'John',
        customer_last_name: 'Doe'
      });

      expect(result.link_token).toBe('link_sandbox_99570daad85e40dca88587da');
      expect(fetch).toHaveBeenCalledWith(
        'https://sandbox.cabbagepay.com/api/custom/link/token/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'Shopify-Fingrid-App/1.0'
          })
        })
      );
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: '9384',
          message: 'Permission Denied',
          request_id: 'request_99570daad85e40dca88587da'
        })
      });

      await expect(apiService.generateLinkToken({
        customer_email: 'test@example.com',
        customer_first_name: 'John',
        customer_last_name: 'Doe'
      })).rejects.toThrow('Fingrid API Error 9384: Permission Denied');
    });
  });

  describe('exchangePublicToken', () => {
    it('should exchange public token successfully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: 'pk1998',
          message: 'success',
          bank_token: 'bank_token_sandbox_b15d2bd79fab4c659d67f366',
          bank_name: 'TD Bank',
          bank_account_last_four: '1504',
          request_id: 'request_34540daad85e40dca88587da'
        })
      });

      const result = await apiService.exchangePublicToken('public_sandbox_6c6114de59334172a2ee57f0');

      expect(result.bank_token).toBe('bank_token_sandbox_b15d2bd79fab4c659d67f366');
      expect(result.bank_name).toBe('TD Bank');
      expect(result.bank_account_last_four).toBe('1504');
    });

    it('should handle exchange errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: '5748',
          message: 'Invalid public_token',
          request_id: 'request_99570daad85e40dca88587da'
        })
      });

      await expect(apiService.exchangePublicToken('invalid_token')).rejects.toThrow('Fingrid API Error 5748: Invalid public_token');
    });
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: 'pk1998',
          message: 'success',
          transaction_id: 'transfer_f6736b3c6f334aa5b579c9de',
          create_date: '2023-09-16 01:57:03.810',
          status: 'initiated',
          final_charged_amount: 83.94,
          billing_type: 'single',
          transaction_type: 'charge',
          metadata: '483745'
        })
      });

      const result = await apiService.processPayment({
        bank_token: 'bank_token_sandbox_b1de80d70fab4c659d67f366',
        amount: 83.94,
        currency: 'USD',
        customer_id: 'customer_123',
        statement_descriptor: 'Test Payment',
        metadata: '483745'
      });

      expect(result.success).toBe(true);
      expect(result.transaction_id).toBe('transfer_f6736b3c6f334aa5b579c9de');
      expect(result.status).toBe('initiated');
    });

    it('should handle payment failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: '1504',
          message: 'Insufficient funds',
          request_id: 'request_99570daad85e40dca88587da'
        })
      });

      const result = await apiService.processPayment({
        bank_token: 'bank_token_sandbox_b1de80d70fab4c659d67f366',
        amount: 83.94,
        currency: 'USD',
        customer_id: 'customer_123'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Insufficient funds');
      expect(result.cabbage_return_code).toBe('1504');
    });
  });

  describe('checkBankTokenHealth', () => {
    it('should check bank token health successfully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: 'pk1998',
          message: 'success'
        })
      });

      const result = await apiService.checkBankTokenHealth('bank_token_sandbox_b1de80d70fab4c659d67f366');

      expect(result.isHealthy).toBe(true);
      expect(result.message).toBe('Bank token is healthy');
    });

    it('should handle unhealthy bank token', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: '4851',
          message: 'Token expired'
        })
      });

      const result = await apiService.checkBankTokenHealth('expired_token');

      expect(result.isHealthy).toBe(false);
      expect(result.message).toBe('Token expired');
    });
  });

  describe('getBankTokenBalance', () => {
    it('should get bank token balance successfully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: 'pk1998',
          message: 'success',
          available_balance: '9831.38',
          currency: 'USD'
        })
      });

      const result = await apiService.getBankTokenBalance('bank_token_sandbox_b1de80d70fab4c659d67f366');

      expect(result.success).toBe(true);
      expect(result.balance).toBe(9831.38);
      expect(result.currency).toBe('USD');
    });

    it('should handle balance retrieval errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          cabbage_return_code: '9851',
          message: 'Unable to retrieve live balance at this time'
        })
      });

      const result = await apiService.getBankTokenBalance('invalid_token');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unable to retrieve live balance at this time');
    });
  });
});