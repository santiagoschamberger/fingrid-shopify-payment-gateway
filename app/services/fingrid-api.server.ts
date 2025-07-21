import type { 
  AppSettings,
  LinkTokenRequest,
  LinkTokenResponse,
  PublicTokenRequest,
  PublicTokenResponse,
  PaymentRequest,
  PaymentResponse,
  FingridErrorResponse,
  ERROR_CODES
} from '~/types/fingrid';
import { FingridApiError } from '~/types/fingrid';

export class FingridApiService {
  constructor(private settings: AppSettings) {}

  async generateLinkToken(customerData: {
    customer_email?: string;
    customer_id?: string;
    customer_phone?: string;
    customer_first_name?: string;
    customer_last_name?: string;
    return_url?: string;
    amount?: number;
    currency?: string;
  }): Promise<{ link_token: string; expiry?: string }> {
    const endpoint = `${this.getApiUrl()}/api/custom/link/token/create`;
    
    // Prepare payload according to FinGrid documentation
    const payload: any = {
      client_id: this.getClientId(),
      secret: this.getClientSecret(),
      client_name: this.settings.clientName || 'Shopify Store',
      redirect_uri: customerData.return_url || this.getRedirectUrl(),
    };

    // Add customer data if provided
    if (customerData.customer_email) {
      payload.cust_email = customerData.customer_email;
    }
    if (customerData.customer_phone) {
      payload.cust_phone_number = customerData.customer_phone;
    }
    if (customerData.customer_first_name) {
      payload.cust_first_name = customerData.customer_first_name;
    }
    if (customerData.customer_last_name) {
      payload.cust_last_name = customerData.customer_last_name;
    }

    // Add theme customization if provided
    if (this.settings.themeColor) {
      // Remove # from hex color as per documentation
      payload.theme_color = this.settings.themeColor.replace('#', '');
    }
    if (this.settings.themeLogo) {
      payload.theme_logo = this.settings.themeLogo;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Shopify-Fingrid-App/1.0'
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      // Check for success according to FinGrid documentation
      if (data.message !== 'success' || !data.link_token) {
        throw new FingridApiError(
          data.cabbage_return_code || 'UNKNOWN',
          data.message || 'Failed to generate link token'
        );
      }

      return { 
        link_token: data.link_token,
        expiry: data.expiry 
      };
    } catch (error) {
      if (error instanceof FingridApiError) {
        throw error;
      }
      console.error('Failed to generate link token:', error);
      throw new Error('Failed to generate link token');
    }
  }

  async exchangePublicToken(publicToken: string): Promise<{
    bank_token: string;
    bank_name: string;
    bank_account_last_four: string;
    request_id?: string;
  }> {
    const endpoint = `${this.getApiUrl()}/api/custom/link/public_token/exchange`;
    
    const payload = {
      client_id: this.getClientId(),
      secret: this.getClientSecret(),
      public_token: publicToken,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Shopify-Fingrid-App/1.0'
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      // Check for success according to FinGrid documentation
      if (data.message !== 'success' || !data.bank_token) {
        throw new FingridApiError(
          data.cabbage_return_code || 'UNKNOWN',
          data.message || 'Failed to exchange token'
        );
      }

      return {
        bank_token: data.bank_token,
        bank_name: data.bank_name,
        bank_account_last_four: data.bank_account_last_four,
        request_id: data.request_id,
      };
    } catch (error) {
      if (error instanceof FingridApiError) {
        throw error;
      }
      console.error('Failed to exchange public token:', error);
      throw new Error('Failed to exchange public token');
    }
  }

  async processPayment(transactionData: {
    bank_token: string;
    amount: number;
    currency: string;
    customer_id?: string;
    statement_descriptor?: string;
    metadata?: string;
    ip_address?: string;
  }): Promise<{ success: boolean; transaction_id?: string; message: string; status?: string; cabbage_return_code?: string }> {
    const endpoint = `${this.getApiUrl()}/api/custom/transaction/move_cabbage`;
    
    const payload = {
      client_id: this.getClientId(),
      secret: this.getClientSecret(),
      bank_token: transactionData.bank_token,
      connected_acct: this.getConnectedAccount(),
      transaction_type: 'charge',
      billing_type: 'single',
      speed: 'next_day', // FinGrid supports next_day and same_day
      final_amount: transactionData.amount,
      application_fee_amount: 0,
      statement_descriptor: transactionData.statement_descriptor || 'Shopify Order',
      metadata: transactionData.metadata || '',
      ip_address: transactionData.ip_address || '0.0.0.0',
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Shopify-Fingrid-App/1.0'
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      // Check for success according to FinGrid documentation
      if (data.cabbage_return_code === 'pk1998' && data.message === 'success') {
        return {
          success: true,
          transaction_id: data.transaction_id,
          message: 'Payment processed successfully',
          status: data.status,
          cabbage_return_code: data.cabbage_return_code,
        };
      }

      // Handle specific error codes according to FinGrid documentation
      let errorMessage = data.message || 'Payment processing failed';
      
      switch (data.cabbage_return_code) {
        case '1769':
          errorMessage = 'Transaction failed';
          break;
        case '1504':
          errorMessage = 'Insufficient funds';
          break;
        case '4851':
          errorMessage = 'Bank connection expired. Please reconnect your bank account.';
          break;
        case '5041':
          errorMessage = 'Bank token expired. Please reconnect your bank account.';
          break;
        case '5044':
          errorMessage = 'Amount must be at least $1.00';
          break;
        case '1599':
          errorMessage = 'Invalid transaction type';
          break;
        case '1598':
          errorMessage = 'Invalid billing type';
          break;
        case '9384':
          errorMessage = 'Permission denied. Please check your credentials.';
          break;
      }

      return {
        success: false,
        message: errorMessage,
        cabbage_return_code: data.cabbage_return_code,
      };
    } catch (error) {
      console.error('Failed to process payment:', error);
      return {
        success: false,
        message: 'Payment processing failed due to network error',
      };
    }
  }

  async refundPayment(transactionData: {
    orderId: string;
    amount: number;
    bankToken: string;
    originalTransactionId: string;
  }): Promise<{ success: boolean; transactionId?: string; message: string }> {
    const endpoint = `${this.getApiUrl()}/api/custom/transaction/move_cabbage`;
    
    const payload: PaymentRequest = {
      client_id: this.getClientId(),
      secret: this.getClientSecret(),
      ip_address: '0.0.0.0',
      metadata: `Refund-OrderId#${transactionData.orderId}-Original#${transactionData.originalTransactionId}`,
      final_amount: transactionData.amount,
      connected_acct: this.getConnectedAccount(),
      bank_token: transactionData.bankToken,
      transaction_type: 'send', // Send money back to customer
      billing_type: 'single',
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Shopify-Fingrid-App/1.0'
        },
        body: JSON.stringify(payload),
      });

      const data: PaymentResponse | FingridErrorResponse = await response.json();
      
      if (!response.ok) {
        const error = data as FingridErrorResponse;
        return {
          success: false,
          message: error.message || 'Refund processing failed',
        };
      }

      const paymentResponse = data as PaymentResponse;
      
      if (paymentResponse.cabbage_return_code === 'pk1998') {
        return {
          success: true,
          transactionId: paymentResponse.transaction_id,
          message: 'Refund processed successfully',
        };
      }

      return {
        success: false,
        message: paymentResponse.message || 'Refund processing failed',
      };
    } catch (error) {
      console.error('Failed to process refund:', error);
      return {
        success: false,
        message: 'Refund processing failed due to network error',
      };
    }
  }

  // Additional API methods from FinGrid documentation

  async checkBankTokenHealth(bankToken: string): Promise<{ isHealthy: boolean; message: string }> {
    const endpoint = `${this.getApiUrl()}/api/custom/health/token/bank_token`;
    
    const payload = {
      client_id: this.getClientId(),
      secret: this.getClientSecret(),
      bank_token: bankToken,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Shopify-Fingrid-App/1.0'
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.cabbage_return_code === 'pk1998' && data.message === 'success') {
        return {
          isHealthy: true,
          message: 'Bank token is healthy',
        };
      }

      return {
        isHealthy: false,
        message: data.message || 'Bank token is not healthy',
      };
    } catch (error) {
      console.error('Failed to check bank token health:', error);
      return {
        isHealthy: false,
        message: 'Failed to check bank token health',
      };
    }
  }

  async getBankTokenBalance(bankToken: string): Promise<{ success: boolean; balance?: number; currency?: string; message: string }> {
    const endpoint = `${this.getApiUrl()}/api/custom/bank_token/balance`;
    
    const payload = {
      client_id: this.getClientId(),
      secret: this.getClientSecret(),
      bank_token: bankToken,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Shopify-Fingrid-App/1.0'
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.cabbage_return_code === 'pk1998' && data.message === 'success') {
        return {
          success: true,
          balance: parseFloat(data.available_balance),
          currency: data.currency,
          message: 'Balance retrieved successfully',
        };
      }

      return {
        success: false,
        message: data.message || 'Failed to retrieve balance',
      };
    } catch (error) {
      console.error('Failed to get bank token balance:', error);
      return {
        success: false,
        message: 'Failed to retrieve balance due to network error',
      };
    }
  }

  private getApiUrl(): string {
    if (this.settings.testMode) {
      return this.settings.testGatewayUrl || 'https://sandbox.cabbagepay.com';
    }
    return this.settings.liveGatewayUrl || 'https://production.cabbagepay.com';
  }

  private getClientId(): string {
    if (this.settings.testMode) {
      return this.settings.testClientId || '';
    }
    return this.settings.liveClientId || '';
  }

  private getClientSecret(): string {
    if (this.settings.testMode) {
      return this.settings.testClientSecret || '';
    }
    return this.settings.liveClientSecret || '';
  }

  private getConnectedAccount(): string {
    if (this.settings.testMode) {
      return this.settings.testConnectedAccount || '';
    }
    return this.settings.liveConnectedAccount || '';
  }

  private getRedirectUrl(): string {
    if (this.settings.testMode) {
      return this.settings.testRedirectUrl || `${process.env.SHOPIFY_APP_URL}/api/fingrid/callback`;
    }
    return this.settings.liveRedirectUrl || `${process.env.SHOPIFY_APP_URL}/api/fingrid/callback`;
  }

  getJavaScriptSDKUrl(): string {
    if (this.settings.testMode) {
      return this.settings.testScriptUrl || 'https://cabbagepay.com/js/sandbox/cabbage.js';
    }
    return this.settings.liveScriptUrl || 'https://cabbagepay.com/js/production/cabbage.js';
  }
}