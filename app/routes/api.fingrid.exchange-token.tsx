import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';
import { FingridApiService } from '~/services/fingrid-api.server';
import { ShopifyStorageService } from '~/services/shopify-storage.server';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session, admin } = await authenticate.public.appProxy(request);
    
    if (!session) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const publicToken = formData.get('publicToken') as string;
    const customerId = formData.get('customerId') as string;

    if (!publicToken) {
      return json({ success: false, error: 'Public token is required' }, { status: 400 });
    }

    // Get app settings
    const storageService = new ShopifyStorageService(session, admin);
    const settings = await storageService.getAppSettings();

    // Exchange public token for bank token
    const fingridApi = new FingridApiService(settings);
    const result = await fingridApi.exchangePublicToken(publicToken);

    // Save bank account if customer ID is provided
    if (customerId) {
      await storageService.addBankAccount(customerId, {
        token: result.bankToken,
        bankName: result.bankName,
        last4: result.last4,
        isActive: true,
        dateAdded: new Date().toISOString()
      });
    }

    return json({ 
      success: true, 
      bankToken: result.bankToken,
      bankName: result.bankName,
      last4: result.last4
    });
  } catch (error) {
    console.error('Error exchanging public token:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to exchange token' 
    }, { status: 400 });
  }
}