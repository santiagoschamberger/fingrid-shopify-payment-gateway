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
      testGatewayUrl: 'https://api.test.fingrid.com',
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
      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          link_token: 'test-link-token-123',
          expiration: '2024-12-31T23:59:59Z'
        })
      });

      const result = await apiService.generateLinkToken({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(result.linkToken).toBe('test-link-token-123');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.fingrid.com/link/token/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          cabbage_return_code: '0001',
          message: 'Invalid credentials'
        })
      });

      await expect(apiService.generateLinkToken({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      })).rejects.toThrow('Fingrid API Error 0001: Invalid credentials');
    });
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockFingridApiResponse('success'))
      });

      const result = await apiService.processPayment({
        orderId: 'test-order-123',
        amount: 100.00,
        bankToken: 'test-bank-token'
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('test-transaction-123');
    });

    it('should handle payment failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(createMockFingridApiResponse('error'))
      });

      const result = await apiService.processPayment({
        orderId: 'test-order-123',
        amount: 100.00,
        bankToken: 'test-bank-token'
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid credentials');
    });
  });
});