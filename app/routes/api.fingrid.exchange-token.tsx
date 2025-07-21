import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';
import { FingridApiService } from '~/services/fingrid-api.server';
import { ShopifyStorageService } from '~/services/shopify-storage.server';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session, admin } = await authenticate.admin(request);
    
    const requestData = await request.json();
    const { public_token, customer_id } = requestData;

    if (!public_token) {
      return json({ success: false, error: 'Public token is required' }, { status: 400 });
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

    // Exchange public token for bank token
    const fingridApi = new FingridApiService(settings);
    const result = await fingridApi.exchangePublicToken(public_token);

    // Save bank account if customer ID is provided
    if (customer_id) {
      try {
        await storageService.addBankAccount(customer_id, {
          token: result.bank_token,
          bankName: result.bank_name,
          last4: result.bank_account_last_four,
          isActive: true,
          dateAdded: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Failed to save bank account:', error);
        // Don't fail the whole request if saving fails
      }
    }

    return json({ 
      success: true, 
      bank_token: result.bank_token,
      bank_name: result.bank_name,
      bank_account_last_four: result.bank_account_last_four,
      request_id: result.request_id
    });
  } catch (error) {
    console.error('Error exchanging public token:', error);
    
    // Handle specific FinGrid API errors
    if (error && typeof error === 'object' && 'code' in error) {
      let userMessage = 'Failed to connect bank account.';
      
      switch ((error as any).code) {
        case '5748':
          userMessage = 'Invalid public token. Please try connecting your bank account again.';
          break;
        case '9384':
          userMessage = 'Permission denied. Please check app configuration.';
          break;
        case '0114':
          userMessage = 'Bank connection service error. Please try again or contact support.';
          break;
      }
      
      return json({ 
        success: false, 
        error: userMessage 
      }, { status: 400 });
    }
    
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to exchange token' 
    }, { status: 400 });
  }
}