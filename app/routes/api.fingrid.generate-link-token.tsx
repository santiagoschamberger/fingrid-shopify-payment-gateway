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
      customer_id, 
      customer_email, 
      customer_phone,
      customer_first_name,
      customer_last_name,
      return_url, 
      amount, 
      currency 
    } = requestData;

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

    // Generate link token with proper Fingrid API parameters
    const fingridApi = new FingridApiService(settings);
    const result = await fingridApi.generateLinkToken({
      customer_email,
      customer_id,
      customer_phone,
      customer_first_name,
      customer_last_name,
      return_url,
      amount,
      currency
    });

    return json({ 
      success: true, 
      link_token: result.link_token,
      expiry: result.expiry 
    });
  } catch (error) {
    console.error('Error generating link token:', error);
    
    // Handle specific FinGrid API errors
    if (error && typeof error === 'object' && 'code' in error) {
      let userMessage = 'Failed to initialize payment.';
      
      switch ((error as any).code) {
        case '9450':
          userMessage = 'Invalid theme color configuration.';
          break;
        case '5463':
          userMessage = 'Customer email or phone number is required.';
          break;
        case '3957':
          userMessage = 'Store name is required for payment initialization.';
          break;
        case '9384':
          userMessage = 'Invalid credentials. Please check app configuration.';
          break;
        case '0113':
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
      error: error instanceof Error ? error.message : 'Failed to generate link token' 
    }, { status: 400 });
  }
}