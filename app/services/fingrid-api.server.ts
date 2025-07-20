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
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<{ linkToken: string }> {
    const endpoint = `${this.getApiUrl()}/link/token/create`;
    
    const payload: LinkTokenRequest = {
      client_id: this.getClientId(),
      secret: this.getClientSecret(),
      client_name: this.settings.clientName || 'Payment Gateway',
      redirect_uri: this.getRedirectUrl(),
      cust_email: customerData.email,
      cust_first_name: customerData.firstName,
      cust_last_name: customerData.lastName,
      theme_color: this.settings.themeColor,
      theme_logo: this.settings.themeLogo,
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

      const data: LinkTokenResponse | FingridErrorResponse = await response.json();
      
      if (!response.ok || !('link_token' in data)) {
        const error = data as FingridErrorResponse;
        throw new FingridApiError(
          error.cabbage_return_code,
          error.message,
          error.details
        );
      }

      return { linkToken: data.link_token };
    } catch (error) {
      if (error instanceof FingridApiError) {
        throw error;
      }
      console.error('Failed to generate link token:', error);
      throw new Error('Failed to generate link token');
    }
  }

  async exchangePublicToken(publicToken: string): Promise<{
    bankToken: string;
    bankName: string;
    last4: string;
  }> {
    const endpoint = `${this.getApiUrl()}/link/public_token/exchange`;
    
    const payload: PublicTokenRequest = {
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

      const data: PublicTokenResponse | FingridErrorResponse = await response.json();
      
      if (!response.ok || !('bank_token' in data)) {
        const error = data as FingridErrorResponse;
        throw new FingridApiError(
          error.cabbage_return_code,
          error.message,
          error.details
        );
      }

      return {
        bankToken: data.bank_token,
        bankName: data.bank_name,
        last4: data.bank_account_last_four,
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
    orderId: string;
    amount: number;
    bankToken: string;
  }): Promise<{ success: boolean; transactionId?: string; message: string }> {
    const endpoint = `${this.getApiUrl()}/transaction/move_cabbage`;
    
    const payload: PaymentRequest = {
      client_id: this.getClientId(),
      secret: this.getClientSecret(),
      ip_address: 'Shopify App',
      metadata: `OrderId#${transactionData.orderId}`,
      final_amount: transactionData.amount,
      connected_acct: this.getConnectedAccount(),
      bank_token: transactionData.bankToken,
      transaction_type: 'charge',
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
          message: error.message || 'Payment processing failed',
        };
      }

      const paymentResponse = data as PaymentResponse;
      
      if (paymentResponse.cabbage_return_code === 'pk1998') {
        return {
          success: true,
          transactionId: paymentResponse.transaction_id,
          message: 'Payment processed successfully',
        };
      }

      return {
        success: false,
        message: paymentResponse.message || 'Payment processing failed',
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
    const endpoint = `${this.getApiUrl()}/transaction/move_cabbage`;
    
    const payload: PaymentRequest = {
      client_id: this.getClientId(),
      secret: this.getClientSecret(),
      ip_address: 'Shopify App',
      metadata: `Refund-OrderId#${transactionData.orderId}-Original#${transactionData.originalTransactionId}`,
      final_amount: transactionData.amount,
      connected_acct: this.getConnectedAccount(),
      bank_token: transactionData.bankToken,
      transaction_type: 'send',
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

  private getApiUrl(): string {
    if (this.settings.testMode) {
      return this.settings.testGatewayUrl || 'https://api.test.fingrid.com';
    }
    return this.settings.liveGatewayUrl || 'https://api.fingrid.com';
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
}