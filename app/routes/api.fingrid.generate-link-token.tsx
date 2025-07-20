import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';
import { FingridApiService } from '~/services/fingrid-api.server';
import { ShopifyStorageService } from '~/services/shopify-storage.server';
import { validateInput, schemas } from '~/utils/validation.server';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.public.appProxy(request);
    
    if (!session) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const data = {
      email: formData.get('email') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      shopDomain: session.shop
    };

    // Validate input
    const validatedData = validateInput(schemas.linkTokenRequest, data);

    // Get app settings
    const storageService = new ShopifyStorageService(session);
    const settings = await storageService.getAppSettings();

    // Generate link token
    const fingridApi = new FingridApiService(settings);
    const result = await fingridApi.generateLinkToken({
      email: validatedData.email,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
    });

    return json({ success: true, linkToken: result.linkToken });
  } catch (error) {
    console.error('Error generating link token:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate link token' 
    }, { status: 400 });
  }
}