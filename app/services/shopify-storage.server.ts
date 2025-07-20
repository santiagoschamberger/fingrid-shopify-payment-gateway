import { shopifyApi } from '~/shopify.server';
import { encrypt, decrypt } from '~/utils/encryption.server';
import type { 
  BankAccount, 
  AppSettings, 
  TransactionData, 
  WebhookEventData 
} from '~/types/fingrid';
import type { Session } from '@shopify/shopify-app-remix';

export class ShopifyStorageService {
  constructor(private session: Session) {}

  // Customer Bank Management
  async getSavedBanks(customerId: string): Promise<BankAccount[]> {
    try {
      const response = await shopifyApi.rest.Metafield.all({
        session: this.session,
        owner_id: customerId,
        owner_resource: 'customer',
        namespace: 'fingrid',
        key: 'saved_banks'
      });

      if (response.data && response.data.length > 0) {
        const metafield = response.data[0];
        return JSON.parse(metafield.value as string);
      }

      return [];
    } catch (error) {
      console.error('Error fetching saved banks:', error);
      return [];
    }
  }

  async addBankAccount(customerId: string, bankData: BankAccount): Promise<void> {
    try {
      const existingBanks = await this.getSavedBanks(customerId);
      
      // Prevent duplicate tokens
      if (existingBanks.some(bank => bank.token === bankData.token)) {
        return;
      }

      const updatedBanks = [...existingBanks, {
        ...bankData,
        isActive: true,
        dateAdded: new Date().toISOString()
      }];

      const metafield = new shopifyApi.rest.Metafield({
        session: this.session,
        namespace: 'fingrid',
        key: 'saved_banks',
        value: JSON.stringify(updatedBanks),
        type: 'json',
        owner_id: customerId,
        owner_resource: 'customer'
      });

      await metafield.save();
    } catch (error) {
      console.error('Error adding bank account:', error);
      throw new Error('Failed to save bank account');
    }
  }

  async removeBankAccount(customerId: string, bankToken: string): Promise<void> {
    try {
      const existingBanks = await this.getSavedBanks(customerId);
      const updatedBanks = existingBanks.filter(bank => bank.token !== bankToken);

      const metafield = new shopifyApi.rest.Metafield({
        session: this.session,
        namespace: 'fingrid',
        key: 'saved_banks',
        value: JSON.stringify(updatedBanks),
        type: 'json',
        owner_id: customerId,
        owner_resource: 'customer'
      });

      await metafield.save();
    } catch (error) {
      console.error('Error removing bank account:', error);
      throw new Error('Failed to remove bank account');
    }
  }

  // Transaction Management
  async linkTransactionToOrder(orderId: string, transactionData: TransactionData): Promise<void> {
    try {
      const metafield = new shopifyApi.rest.Metafield({
        session: this.session,
        namespace: 'fingrid',
        key: 'transaction_data',
        value: JSON.stringify(transactionData),
        type: 'json',
        owner_id: orderId,
        owner_resource: 'order'
      });

      await metafield.save();
    } catch (error) {
      console.error('Error linking transaction to order:', error);
      throw new Error('Failed to link transaction to order');
    }
  }

  async getTransactionByOrderId(orderId: string): Promise<TransactionData | null> {
    try {
      const response = await shopifyApi.rest.Metafield.all({
        session: this.session,
        owner_id: orderId,
        owner_resource: 'order',
        namespace: 'fingrid',
        key: 'transaction_data'
      });

      if (response.data && response.data.length > 0) {
        const metafield = response.data[0];
        return JSON.parse(metafield.value as string);
      }

      return null;
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      return null;
    }
  }

  // App Settings Management
  async getAppSettings(): Promise<AppSettings> {
    try {
      const response = await shopifyApi.rest.Metafield.all({
        session: this.session,
        owner_resource: 'shop',
        namespace: 'fingrid_app',
        key: 'settings'
      });

      if (response.data && response.data.length > 0) {
        const metafield = response.data[0];
        const settings = JSON.parse(metafield.value as string);
        return this.decryptSensitiveFields(settings);
      }

      return this.getDefaultSettings();
    } catch (error) {
      console.error('Error fetching app settings:', error);
      return this.getDefaultSettings();
    }
  }

  async updateAppSettings(settings: AppSettings): Promise<void> {
    try {
      const encryptedSettings = this.encryptSensitiveFields(settings);

      const metafield = new shopifyApi.rest.Metafield({
        session: this.session,
        namespace: 'fingrid_app',
        key: 'settings',
        value: JSON.stringify(encryptedSettings),
        type: 'json',
        owner_resource: 'shop'
      });

      await metafield.save();
    } catch (error) {
      console.error('Error updating app settings:', error);
      throw new Error('Failed to update app settings');
    }
  }

  // Webhook Event Tracking
  async logWebhookEvent(webhookData: WebhookEventData): Promise<void> {
    try {
      const existingEvents = await this.getWebhookEvents();
      const updatedEvents = [...existingEvents, {
        ...webhookData,
        processed: false,
        timestamp: new Date().toISOString()
      }];

      // Keep only last 1000 webhook events to prevent metafield bloat
      const trimmedEvents = updatedEvents.slice(-1000);

      const metafield = new shopifyApi.rest.Metafield({
        session: this.session,
        namespace: 'fingrid_app',
        key: 'webhook_events',
        value: JSON.stringify(trimmedEvents),
        type: 'json',
        owner_resource: 'shop'
      });

      await metafield.save();
    } catch (error) {
      console.error('Error logging webhook event:', error);
      throw new Error('Failed to log webhook event');
    }
  }

  private async getWebhookEvents(): Promise<WebhookEventData[]> {
    try {
      const response = await shopifyApi.rest.Metafield.all({
        session: this.session,
        owner_resource: 'shop',
        namespace: 'fingrid_app',
        key: 'webhook_events'
      });

      if (response.data && response.data.length > 0) {
        const metafield = response.data[0];
        return JSON.parse(metafield.value as string);
      }

      return [];
    } catch (error) {
      console.error('Error fetching webhook events:', error);
      return [];
    }
  }

  private encryptSensitiveFields(settings: AppSettings): AppSettings {
    return {
      ...settings,
      testClientSecret: settings.testClientSecret ? encrypt(settings.testClientSecret) : undefined,
      liveClientSecret: settings.liveClientSecret ? encrypt(settings.liveClientSecret) : undefined
    };
  }

  private decryptSensitiveFields(settings: AppSettings): AppSettings {
    try {
      return {
        ...settings,
        testClientSecret: settings.testClientSecret ? decrypt(settings.testClientSecret) : undefined,
        liveClientSecret: settings.liveClientSecret ? decrypt(settings.liveClientSecret) : undefined
      };
    } catch (error) {
      console.warn('Failed to decrypt some sensitive fields:', error);
      return {
        ...settings,
        testClientSecret: undefined,
        liveClientSecret: undefined
      };
    }
  }

  private getDefaultSettings(): AppSettings {
    return {
      testMode: true,
      discountPercentage: 0,
      postTransactionStatus: 'pending',
      webhookSuccessStatus: 'paid',
      webhookFailedStatus: 'cancelled',
      clientName: 'Payment Gateway',
      themeColor: '#1a73e8',
      
      // Pre-populate with environment variables if available
      testGatewayUrl: process.env.FINGRID_TEST_GATEWAY_URL || 'https://api.test.fingrid.com',
      testClientId: process.env.FINGRID_TEST_CLIENT_ID || '',
      testClientSecret: process.env.FINGRID_TEST_CLIENT_SECRET || '',
      testScriptUrl: process.env.FINGRID_TEST_SCRIPT_URL || 'https://js.test.fingrid.com/cabbage.js',
      
      liveGatewayUrl: process.env.FINGRID_LIVE_GATEWAY_URL || 'https://api.fingrid.com',
      liveClientId: process.env.FINGRID_LIVE_CLIENT_ID || '',
      liveClientSecret: process.env.FINGRID_LIVE_CLIENT_SECRET || '',
      liveScriptUrl: process.env.FINGRID_LIVE_SCRIPT_URL || 'https://js.fingrid.com/cabbage.js'
    };
  }
}