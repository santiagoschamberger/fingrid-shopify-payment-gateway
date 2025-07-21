import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';
import { ShopifyStorageService } from '~/services/shopify-storage.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customer_id');
    
    if (!customerId) {
      return json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const storageService = new ShopifyStorageService(session, admin);
    const banks = await storageService.getSavedBanks(customerId);

    return json({ 
      success: true, 
      banks,
      count: banks.length 
    });
  } catch (error) {
    console.error('Error fetching saved banks:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch saved banks',
      banks: []
    }, { status: 500 });
  }
};