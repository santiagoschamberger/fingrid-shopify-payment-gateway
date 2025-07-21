import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';
import { FingridApiService } from '~/services/fingrid-api.server';
import { ShopifyStorageService } from '~/services/shopify-storage.server';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session, admin } = await authenticate.admin(request);
    
    const requestData = await request.json();
    const { 
      bank_token, 
      amount, 
      currency, 
      customer_id, 
      statement_descriptor, 
      metadata,
      ip_address
    } = requestData;

    if (!bank_token || !amount) {
      return json({ 
        success: false, 
        error: 'Bank token and amount are required' 
      }, { status: 400 });
    }

    // Validate amount is at least $1.00 as per FinGrid requirements
    const numericAmount = parseFloat(amount);
    if (numericAmount < 1.0) {
      return json({ 
        success: false, 
        error: 'Amount must be at least $1.00' 
      }, { status: 400 });
    }

    // Get app settings
    const storageService = new ShopifyStorageService(session, admin);
    const settings = await storageService.getAppSettings();

    // Validate required settings
    if (!settings.testClientId && !settings.liveClientId) {
      return json({ 
        success: false, 
        error: 'FinGrid credentials not configured. Please configure the app settings.' 
      }, { status: 400 });
    }

    if (!settings.testConnectedAccount && !settings.liveConnectedAccount) {
      return json({ 
        success: false, 
        error: 'Connected account not configured. Please configure the merchant account in app settings.' 
      }, { status: 400 });
    }

    // Get client IP address from request headers
    const clientIP = ip_address || 
                    request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    '0.0.0.0';

    // Process payment with Fingrid
    const fingridApi = new FingridApiService(settings);
    const result = await fingridApi.processPayment({
      bank_token,
      amount: numericAmount,
      currency: currency || 'USD',
      customer_id,
      statement_descriptor,
      metadata,
      ip_address: clientIP
    });

    if (result.success) {
      return json({ 
        success: true, 
        transaction_id: result.transaction_id,
        status: result.status,
        message: result.message,
        cabbage_return_code: result.cabbage_return_code
      });
    } else {
      return json({ 
        success: false, 
        error: result.message,
        cabbage_return_code: result.cabbage_return_code
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    
    // Handle specific FinGrid API errors
    if (error && typeof error === 'object' && 'code' in error) {
      let userMessage = 'Payment processing failed.';
      
      switch ((error as any).code) {
        case '1769':
          userMessage = 'Transaction failed. Please try again or use a different payment method.';
          break;
        case '1504':
          userMessage = 'Insufficient funds. Please check your account balance.';
          break;
        case '4851':
          userMessage = 'Bank connection expired. Please reconnect your bank account.';
          break;
        case '5041':
          userMessage = 'Bank token expired. Please reconnect your bank account.';
          break;
        case '5044':
          userMessage = 'Amount must be at least $1.00';
          break;
        case '1599':
          userMessage = 'Invalid transaction type. Please contact support.';
          break;
        case '1598':
          userMessage = 'Invalid billing type. Please contact support.';
          break;
        case '9384':
          userMessage = 'Permission denied. Please check app configuration.';
          break;
        case '0115':
          userMessage = 'Payment service error. Please try again or contact support.';
          break;
      }
      
      return json({ 
        success: false, 
        error: userMessage 
      }, { status: 400 });
    }
    
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Payment processing failed' 
    }, { status: 400 });
  }
}