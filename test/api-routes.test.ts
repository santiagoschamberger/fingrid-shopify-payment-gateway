import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Shopify authenticate function
const mockAuthenticate = {
  admin: vi.fn().mockResolvedValue({
    session: { shop: 'test-shop.myshopify.com' },
    admin: {
      graphql: vi.fn()
    }
  })
};

// Mock the services
const mockFingridApiService = {
  generateLinkToken: vi.fn(),
  exchangePublicToken: vi.fn(),
  processPayment: vi.fn(),
  checkBankTokenHealth: vi.fn(),
  getBankTokenBalance: vi.fn()
};

const mockShopifyStorageService = {
  getAppSettings: vi.fn(),
  addBankAccount: vi.fn(),
  getSavedBanks: vi.fn(),
  updateBankAccountStatus: vi.fn()
};

// Mock the modules
vi.mock('~/shopify.server', () => ({
  authenticate: mockAuthenticate
}));

vi.mock('~/services/fingrid-api.server', () => ({
  FingridApiService: vi.fn().mockImplementation(() => mockFingridApiService)
}));

vi.mock('~/services/shopify-storage.server', () => ({
  ShopifyStorageService: vi.fn().mockImplementation(() => mockShopifyStorageService)
}));

describe('API Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock settings
    mockShopifyStorageService.getAppSettings.mockResolvedValue({
      testMode: true,
      testClientId: 'test_client_id',
      testClientSecret: 'test_client_secret',
      testConnectedAccount: 'test_connected_account',
      clientName: 'Test Store'
    });
  });

  describe('Generate Link Token API', () => {
    it('should generate link token successfully', async () => {
      // Mock successful response
      mockFingridApiService.generateLinkToken.mockResolvedValue({
        link_token: 'link_sandbox_99570daad85e40dca88587da',
        expiry: '2024-12-31T23:59:59Z'
      });

      // Import and test the route handler
      const { action } = await import('~/routes/api.fingrid.generate-link-token');
      
      const request = new Request('http://localhost/api/fingrid/generate-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_email: 'test@example.com',
          customer_first_name: 'John',
          customer_last_name: 'Doe'
        })
      });

      const response = await action({ request });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        link_token: 'link_sandbox_99570daad85e40dca88587da'
      });
    });

    it('should handle missing credentials error', async () => {
      // Mock missing credentials
      mockShopifyStorageService.getAppSettings.mockResolvedValue({
        testMode: true,
        // Missing client credentials
      });

      const { action } = await import('~/routes/api.fingrid.generate-link-token');
      
      const request = new Request('http://localhost/api/fingrid/generate-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_email: 'test@example.com'
        })
      });

      const response = await action({ request });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        success: false,
        error: 'FinGrid credentials not configured. Please configure the app settings.'
      });
    });

    it('should handle FinGrid API errors', async () => {
      // Mock API error
      const apiError = new Error('Permission denied');
      apiError.code = '9384';
      mockFingridApiService.generateLinkToken.mockRejectedValue(apiError);

      const { action } = await import('~/routes/api.fingrid.generate-link-token');
      
      const request = new Request('http://localhost/api/fingrid/generate-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_email: 'test@example.com'
        })
      });

      const response = await action({ request });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        success: false,
        error: 'Invalid credentials. Please check app configuration.'
      });
    });
  });

  describe('Exchange Token API', () => {
    it('should exchange public token successfully', async () => {
      // Mock successful response
      mockFingridApiService.exchangePublicToken.mockResolvedValue({
        bank_token: 'bank_token_sandbox_b15d2bd79fab4c659d67f366',
        bank_name: 'TD Bank',
        bank_account_last_four: '1504',
        request_id: 'request_34540daad85e40dca88587da'
      });

      const { action } = await import('~/routes/api.fingrid.exchange-token');
      
      const request = new Request('http://localhost/api/fingrid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_token: 'public_sandbox_6c6114de59334172a2ee57f0',
          customer_id: 'customer_123'
        })
      });

      const response = await action({ request });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        bank_token: 'bank_token_sandbox_b15d2bd79fab4c659d67f366',
        bank_name: 'TD Bank',
        bank_account_last_four: '1504'
      });

      // Should attempt to save bank account
      expect(mockShopifyStorageService.addBankAccount).toHaveBeenCalledWith(
        'customer_123',
        expect.objectContaining({
          token: 'bank_token_sandbox_b15d2bd79fab4c659d67f366',
          bankName: 'TD Bank',
          last4: '1504',
          isActive: true
        })
      );
    });

    it('should handle missing public token', async () => {
      const { action } = await import('~/routes/api.fingrid.exchange-token');
      
      const request = new Request('http://localhost/api/fingrid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: 'customer_123'
          // Missing public_token
        })
      });

      const response = await action({ request });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        success: false,
        error: 'Public token is required'
      });
    });
  });

  describe('Process Payment API', () => {
    it('should process payment successfully', async () => {
      // Mock successful response
      mockFingridApiService.processPayment.mockResolvedValue({
        success: true,
        transaction_id: 'transfer_f6736b3c6f334aa5b579c9de',
        status: 'initiated',
        message: 'Payment processed successfully',
        cabbage_return_code: 'pk1998'
      });

      const { action } = await import('~/routes/api.fingrid.process-payment');
      
      const request = new Request('http://localhost/api/fingrid/process-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1'
        },
        body: JSON.stringify({
          bank_token: 'bank_token_sandbox_b1de80d70fab4c659d67f366',
          amount: 100.00,
          currency: 'USD',
          customer_id: 'customer_123',
          statement_descriptor: 'Test Payment'
        })
      });

      const response = await action({ request });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        transaction_id: 'transfer_f6736b3c6f334aa5b579c9de',
        status: 'initiated',
        message: 'Payment processed successfully'
      });
    });

    it('should validate minimum amount', async () => {
      const { action } = await import('~/routes/api.fingrid.process-payment');
      
      const request = new Request('http://localhost/api/fingrid/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_token: 'bank_token_sandbox_b1de80d70fab4c659d67f366',
          amount: 0.50, // Less than $1.00
          currency: 'USD'
        })
      });

      const response = await action({ request });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        success: false,
        error: 'Amount must be at least $1.00'
      });
    });

    it('should handle missing connected account', async () => {
      // Mock settings without connected account
      mockShopifyStorageService.getAppSettings.mockResolvedValue({
        testMode: true,
        testClientId: 'test_client_id',
        testClientSecret: 'test_client_secret',
        // Missing testConnectedAccount
        clientName: 'Test Store'
      });

      const { action } = await import('~/routes/api.fingrid.process-payment');
      
      const request = new Request('http://localhost/api/fingrid/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_token: 'bank_token_sandbox_b1de80d70fab4c659d67f366',
          amount: 100.00,
          currency: 'USD'
        })
      });

      const response = await action({ request });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        success: false,
        error: 'Connected account not configured. Please configure the merchant account in app settings.'
      });
    });
  });

  describe('Saved Banks API', () => {
    it('should retrieve saved banks successfully', async () => {
      const mockBanks = [
        {
          token: 'bank_token_1',
          bankName: 'Chase Bank',
          last4: '1234',
          isActive: true,
          dateAdded: '2024-01-01T00:00:00Z'
        },
        {
          token: 'bank_token_2',
          bankName: 'Bank of America',
          last4: '5678',
          isActive: true,
          dateAdded: '2024-01-02T00:00:00Z'
        }
      ];

      mockShopifyStorageService.getSavedBanks.mockResolvedValue(mockBanks);

      const { loader } = await import('~/routes/api.fingrid.saved-banks');
      
      const request = new Request('http://localhost/api/fingrid/saved-banks?customer_id=customer_123');

      const response = await loader({ request });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        banks: mockBanks
      });
    });

    it('should add bank account successfully', async () => {
      const { action } = await import('~/routes/api.fingrid.saved-banks');
      
      const request = new Request('http://localhost/api/fingrid/saved-banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          customer_id: 'customer_123',
          bank_token: 'bank_token_new',
          bank_name: 'Wells Fargo',
          last4: '9999'
        })
      });

      const response = await action({ request });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Bank account added successfully'
      });

      expect(mockShopifyStorageService.addBankAccount).toHaveBeenCalledWith(
        'customer_123',
        expect.objectContaining({
          token: 'bank_token_new',
          bankName: 'Wells Fargo',
          last4: '9999',
          isActive: true
        })
      );
    });

    it('should check bank token health', async () => {
      mockFingridApiService.checkBankTokenHealth.mockResolvedValue({
        isHealthy: false,
        message: 'Token expired'
      });

      const { action } = await import('~/routes/api.fingrid.saved-banks');
      
      const request = new Request('http://localhost/api/fingrid/saved-banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_health',
          customer_id: 'customer_123',
          bank_token: 'expired_token'
        })
      });

      const response = await action({ request });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        is_healthy: false,
        message: 'Token expired'
      });

      // Should mark bank as inactive
      expect(mockShopifyStorageService.updateBankAccountStatus).toHaveBeenCalledWith(
        'customer_123',
        'expired_token',
        false
      );
    });
  });
}); 