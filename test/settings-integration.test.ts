import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShopifyStorageService } from '../app/services/shopify-storage.server';
import type { AppSettings } from '../app/types/fingrid';

// Mock encryption functions
vi.mock('../app/utils/encryption.server', () => ({
  encrypt: vi.fn((data: string) => `encrypted_${data}`),
  decrypt: vi.fn((data: string) => data.replace('encrypted_', '')),
  hashData: vi.fn((data: string) => `hashed_${data}`)
}));

// Mock the admin GraphQL client
const mockAdmin = {
  graphql: vi.fn()
};

// Mock session
const mockSession = {
  shop: 'test-shop.myshopify.com',
  accessToken: 'test-token'
};

// Set up environment variables
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';

describe('Settings Integration', () => {
  let storageService: ShopifyStorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    storageService = new ShopifyStorageService(mockSession, mockAdmin);
  });

  describe('getAppSettings', () => {
    it('should return default settings when no metafield exists', async () => {
      // Mock empty metafields response
      mockAdmin.graphql.mockResolvedValueOnce({
        json: () => Promise.resolve({
          data: {
            shop: {
              metafields: {
                edges: []
              }
            }
          }
        })
      });

      const settings = await storageService.getAppSettings();

      expect(settings).toEqual({
        testMode: true,
        discountPercentage: 0,
        postTransactionStatus: 'pending',
        webhookSuccessStatus: 'paid',
        webhookFailedStatus: 'cancelled',
        clientName: 'Payment Gateway',
        themeColor: '#1a73e8',
        testGatewayUrl: 'https://api.test.fingrid.com',
        testClientId: 'AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg',
        testClientSecret: 'ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb',
        testScriptUrl: 'https://js.test.fingrid.com/cabbage.js',
        liveGatewayUrl: 'https://api.fingrid.com',
        liveClientId: '',
        liveClientSecret: '',
        liveScriptUrl: 'https://js.fingrid.com/cabbage.js'
      });
    });

    it('should return saved settings when metafield exists', async () => {
      const savedSettings = {
        testMode: false,
        clientName: 'Custom Gateway',
        themeColor: '#ff0000'
      };

      // Mock metafields response with saved settings
      mockAdmin.graphql.mockResolvedValueOnce({
        json: () => Promise.resolve({
          data: {
            shop: {
              metafields: {
                edges: [{
                  node: {
                    key: 'settings',
                    value: JSON.stringify(savedSettings)
                  }
                }]
              }
            }
          }
        })
      });

      const settings = await storageService.getAppSettings();

      expect(settings.testMode).toBe(false);
      expect(settings.clientName).toBe('Custom Gateway');
      expect(settings.themeColor).toBe('#ff0000');
    });
  });

  describe('updateAppSettings', () => {
    it('should successfully update app settings', async () => {
      const newSettings: AppSettings = {
        testMode: true,
        clientName: 'Updated Gateway',
        themeColor: '#00ff00',
        discountPercentage: 5,
        postTransactionStatus: 'pending',
        webhookSuccessStatus: 'paid',
        webhookFailedStatus: 'cancelled',
        testGatewayUrl: 'https://api.test.fingrid.com',
        testClientId: 'test-client-id',
        testClientSecret: 'test-client-secret',
        testScriptUrl: 'https://js.test.fingrid.com/cabbage.js',
        liveGatewayUrl: 'https://api.fingrid.com',
        liveClientId: '',
        liveClientSecret: '',
        liveScriptUrl: 'https://js.fingrid.com/cabbage.js'
      };

      // Mock shop ID query
      mockAdmin.graphql.mockResolvedValueOnce({
        json: () => Promise.resolve({
          data: {
            shop: {
              id: 'gid://shopify/Shop/123'
            }
          }
        })
      });

      // Mock metafield update mutation
      mockAdmin.graphql.mockResolvedValueOnce({
        json: () => Promise.resolve({
          data: {
            metafieldsSet: {
              metafields: [{
                id: 'gid://shopify/Metafield/456',
                namespace: 'fingrid_app',
                key: 'settings'
              }],
              userErrors: []
            }
          }
        })
      });

      await expect(storageService.updateAppSettings(newSettings)).resolves.not.toThrow();

      // Verify the GraphQL calls
      expect(mockAdmin.graphql).toHaveBeenCalledTimes(2);
      
      // Check shop ID query
      expect(mockAdmin.graphql).toHaveBeenNthCalledWith(1, expect.stringContaining('query getShop'));
      
      // Check metafield update mutation
      expect(mockAdmin.graphql).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('mutation metafieldsSet'),
        expect.objectContaining({
          variables: expect.objectContaining({
            metafields: expect.arrayContaining([
              expect.objectContaining({
                namespace: 'fingrid_app',
                key: 'settings',
                type: 'json',
                ownerId: 'gid://shopify/Shop/123'
              })
            ])
          })
        })
      );
    });

    it('should handle GraphQL errors', async () => {
      const newSettings: AppSettings = {
        testMode: true,
        clientName: 'Test Gateway',
        discountPercentage: 0,
        postTransactionStatus: 'pending',
        webhookSuccessStatus: 'paid',
        webhookFailedStatus: 'cancelled',
        themeColor: '#1a73e8',
        testGatewayUrl: 'https://api.test.fingrid.com',
        testClientId: 'test-id',
        testClientSecret: 'test-secret',
        testScriptUrl: 'https://js.test.fingrid.com/cabbage.js',
        liveGatewayUrl: 'https://api.fingrid.com',
        liveClientId: '',
        liveClientSecret: '',
        liveScriptUrl: 'https://js.fingrid.com/cabbage.js'
      };

      // Mock shop ID query
      mockAdmin.graphql.mockResolvedValueOnce({
        json: () => Promise.resolve({
          data: {
            shop: {
              id: 'gid://shopify/Shop/123'
            }
          }
        })
      });

      // Mock metafield update mutation with error
      mockAdmin.graphql.mockResolvedValueOnce({
        json: () => Promise.resolve({
          data: {
            metafieldsSet: {
              metafields: [],
              userErrors: [{
                field: 'value',
                message: 'Value is too long',
                code: 'TOO_LONG'
              }]
            }
          }
        })
      });

      await expect(storageService.updateAppSettings(newSettings)).rejects.toThrow('Failed to update app settings');
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockAdmin.graphql.mockRejectedValueOnce(new Error('Network error'));

      const settings = await storageService.getAppSettings();

      // Should return default settings on error
      expect(settings.testMode).toBe(true);
      expect(settings.clientName).toBe('Payment Gateway');
    });

    it('should handle malformed JSON in metafields', async () => {
      // Mock metafields response with invalid JSON
      mockAdmin.graphql.mockResolvedValueOnce({
        json: () => Promise.resolve({
          data: {
            shop: {
              metafields: {
                edges: [{
                  node: {
                    key: 'settings',
                    value: 'invalid json'
                  }
                }]
              }
            }
          }
        })
      });

      const settings = await storageService.getAppSettings();

      // Should return default settings when JSON is invalid
      expect(settings.testMode).toBe(true);
      expect(settings.clientName).toBe('Payment Gateway');
    });
  });
}); 