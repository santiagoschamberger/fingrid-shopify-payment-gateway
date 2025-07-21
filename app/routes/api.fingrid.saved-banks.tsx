import { json } from '@remix-run/node';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';
import { FingridApiService } from '~/services/fingrid-api.server';
import { ShopifyStorageService } from '~/services/shopify-storage.server';

// GET - Retrieve saved bank accounts for a customer
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session, admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customer_id');

    if (!customerId) {
      return json({ success: false, error: 'Customer ID is required' }, { status: 400 });
    }

    // Get saved bank accounts
    const storageService = new ShopifyStorageService(session, admin);
    const savedBanks = await storageService.getSavedBanks(customerId);

    return json({ 
      success: true, 
      banks: savedBanks 
    });
  } catch (error) {
    console.error('Error retrieving saved banks:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to retrieve saved banks' 
    }, { status: 400 });
  }
}

// POST - Add a new bank account or manage existing ones
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session, admin } = await authenticate.admin(request);
    
    const requestData = await request.json();
    const { action, customer_id, bank_token, bank_name, last4 } = requestData;

    if (!customer_id) {
      return json({ success: false, error: 'Customer ID is required' }, { status: 400 });
    }

    const storageService = new ShopifyStorageService(session, admin);
    const settings = await storageService.getAppSettings();

    switch (action) {
      case 'add':
        if (!bank_token || !bank_name || !last4) {
          return json({ 
            success: false, 
            error: 'Bank token, bank name, and last 4 digits are required' 
          }, { status: 400 });
        }

        // Add new bank account
        await storageService.addBankAccount(customer_id, {
          token: bank_token,
          bankName: bank_name,
          last4: last4,
          isActive: true,
          dateAdded: new Date().toISOString()
        });

        return json({ 
          success: true, 
          message: 'Bank account added successfully' 
        });

      case 'remove':
        const { bank_token: tokenToRemove } = requestData;
        if (!tokenToRemove) {
          return json({ 
            success: false, 
            error: 'Bank token is required for removal' 
          }, { status: 400 });
        }

        await storageService.removeBankAccount(customer_id, tokenToRemove);
        return json({ 
          success: true, 
          message: 'Bank account removed successfully' 
        });

      case 'check_health':
        const { bank_token: tokenToCheck } = requestData;
        if (!tokenToCheck) {
          return json({ 
            success: false, 
            error: 'Bank token is required for health check' 
          }, { status: 400 });
        }

        // Check bank token health using FinGrid API
        const fingridApi = new FingridApiService(settings);
        const healthCheck = await fingridApi.checkBankTokenHealth(tokenToCheck);

        if (!healthCheck.isHealthy) {
          // Mark bank as inactive if not healthy
          await storageService.updateBankAccountStatus(customer_id, tokenToCheck, false);
        }

        return json({ 
          success: true, 
          is_healthy: healthCheck.isHealthy,
          message: healthCheck.message
        });

      case 'get_balance':
        const { bank_token: tokenForBalance } = requestData;
        if (!tokenForBalance) {
          return json({ 
            success: false, 
            error: 'Bank token is required for balance check' 
          }, { status: 400 });
        }

        // Get bank token balance using FinGrid API
        const fingridApiForBalance = new FingridApiService(settings);
        const balanceResult = await fingridApiForBalance.getBankTokenBalance(tokenForBalance);

        return json({ 
          success: balanceResult.success, 
          balance: balanceResult.balance,
          currency: balanceResult.currency,
          message: balanceResult.message
        });

      default:
        return json({ 
          success: false, 
          error: 'Invalid action. Supported actions: add, remove, check_health, get_balance' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing saved banks:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to manage saved banks' 
    }, { status: 400 });
  }
}