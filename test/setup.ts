// Test setup file
import { vi } from 'vitest';

// Mock Shopify session for testing
export function createMockShopifySession(shopDomain: string) {
  return {
    shop: shopDomain,
    accessToken: 'mock-access-token',
    scope: 'read_orders,write_orders',
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };
}

// Mock Fingrid API responses
export function createMockFingridApiResponse(type: 'success' | 'error') {
  if (type === 'success') {
    return {
      cabbage_return_code: 'pk1998',
      transaction_id: 'test-transaction-123',
      message: 'Transaction processed successfully'
    };
  }
  
  return {
    cabbage_return_code: '0001',
    message: 'Invalid credentials'
  };
}

// Mock Shopify metafields API
export function createMockMetafieldsResponse(data: any[]) {
  return {
    data: data.map(item => ({
      id: Math.random().toString(),
      namespace: 'fingrid',
      key: 'test_key',
      value: JSON.stringify(item),
      type: 'json',
      owner_resource: 'customer',
      owner_id: '123'
    }))
  };
}

// Clean up is much simpler - no database to clean!
export async function cleanupTestData() {
  // Since we use Shopify metafields, cleanup happens automatically
  // in test environment when mocks are reset
  vi.clearAllMocks();
}