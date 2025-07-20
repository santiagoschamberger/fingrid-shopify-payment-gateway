import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';
import { ShopifyStorageService } from '~/services/shopify-storage.server';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { topic, shop, session, payload } = await authenticate.webhook(request);

    if (!session) {
      console.error('No session found for webhook');
      return new Response('OK', { status: 200 });
    }

    const storageService = new ShopifyStorageService(session);
    
    // Handle GDPR data request - retrieve customer's saved bank data
    if (payload.customer && payload.customer.id) {
      const customerId = payload.customer.id.toString();
      const savedBanks = await storageService.getSavedBanks(customerId);
      
      // In a real implementation, you would need to send this data
      // to the merchant or customer as required by GDPR
      console.log(`GDPR data request for customer ${customerId}:`, {
        savedBanks: savedBanks.map(bank => ({
          bankName: bank.bankName,
          last4: bank.last4,
          dateAdded: bank.dateAdded,
          // Note: bank tokens are not included for security
        }))
      });
    }
    
    // Log the webhook event
    await storageService.logWebhookEvent({
      webhookId: payload.id?.toString() || 'unknown',
      transactionId: '',
      eventType: topic,
      payload,
      processed: true,
      timestamp: new Date().toISOString(),
      processedAt: new Date().toISOString()
    });

    console.log(`Processed ${topic} webhook for shop ${shop}`);
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing customers/data_request webhook:', error);
    return new Response('Error', { status: 500 });
  }
}