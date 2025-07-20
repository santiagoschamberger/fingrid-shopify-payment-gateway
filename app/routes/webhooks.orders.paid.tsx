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

    console.log(`Processed ${topic} webhook for shop ${shop}:`, payload.id);
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing orders/paid webhook:', error);
    return new Response('Error', { status: 500 });
  }
}