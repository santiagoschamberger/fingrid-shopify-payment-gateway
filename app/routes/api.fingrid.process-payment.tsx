import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';
import { FingridApiService } from '~/services/fingrid-api.server';
import { ShopifyStorageService } from '~/services/shopify-storage.server';
import { validateInput, schemas } from '~/utils/validation.server';
import { TransactionStatus, TransactionType } from '~/types/fingrid';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.public.appProxy(request);
    
    if (!session) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const data = {
      orderId: formData.get('orderId') as string,
      amount: parseFloat(formData.get('amount') as string),
      currency: formData.get('currency') as string || 'USD',
      bankToken: formData.get('bankToken') as string,
      customerId: formData.get('customerId') as string
    };

    // Validate input
    const validatedData = validateInput(schemas.paymentRequest, data);

    // Get app settings
    const storageService = new ShopifyStorageService(session);
    const settings = await storageService.getAppSettings();

    // Process payment
    const fingridApi = new FingridApiService(settings);
    const result = await fingridApi.processPayment({
      orderId: validatedData.orderId,
      amount: validatedData.amount,
      bankToken: validatedData.bankToken,
    });

    // Link transaction to order
    if (result.success && result.transactionId) {
      await storageService.linkTransactionToOrder(validatedData.orderId, {
        transactionId: result.transactionId,
        bankToken: validatedData.bankToken,
        status: TransactionStatus.PROCESSING,
        amount: validatedData.amount,
        currency: validatedData.currency,
        transactionType: TransactionType.CHARGE,
        processedAt: new Date().toISOString()
      });
    }

    return json({
      success: result.success,
      transactionId: result.transactionId,
      message: result.message
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to process payment' 
    }, { status: 400 });
  }
}