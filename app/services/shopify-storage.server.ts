import { encrypt, decrypt } from '~/utils/encryption.server';
import type { 
  BankAccount, 
  AppSettings, 
  TransactionData, 
  WebhookEventData 
} from '~/types/fingrid';

export class ShopifyStorageService {
  constructor(private session: any, private admin: any) {}

  // GraphQL queries and mutations
  private metafieldSetMutation = `#graphql
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          value
          type
          owner {
            ... on Customer { id }
            ... on Order { id }
            ... on Shop { id }
          }
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `;

  private metafieldQuery = `#graphql
    query getMetafields($owner: ID!) {
      node(id: $owner) {
        ... on Customer {
          metafields(first: 50) {
            edges {
              node {
                id
                namespace
                key
                value
                type
              }
            }
          }
        }
        ... on Order {
          metafields(first: 50) {
            edges {
              node {
                id
                namespace
                key
                value
                type
              }
            }
          }
        }
        ... on Shop {
          metafields(first: 50) {
            edges {
              node {
                id
                namespace
                key
                value
                type
              }
            }
          }
        }
      }
    }
  `;

  private shopMetafieldsQuery = `#graphql
    query getShopMetafields {
      shop {
        metafields(namespace: "fingrid_app", first: 10) {
          edges {
            node {
              id
              namespace
              key
              value
              type
            }
          }
        }
      }
    }
  `;

  // Customer Bank Management
  async getSavedBanks(customerId: string): Promise<BankAccount[]> {
    try {
      const gid = `gid://shopify/Customer/${customerId}`;
      const response = await this.admin.graphql(this.metafieldQuery, {
        variables: { owner: gid }
      });

      const data = await response.json();
      
      if (data.data?.node?.metafields?.edges) {
        const metafield = data.data.node.metafields.edges.find(
          (edge: any) => edge.node.namespace === 'fingrid' && edge.node.key === 'saved_banks'
        );
        
        if (metafield) {
          return JSON.parse(metafield.node.value);
        }
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

      const gid = `gid://shopify/Customer/${customerId}`;
      const response = await this.admin.graphql(this.metafieldSetMutation, {
        variables: {
          metafields: [{
            namespace: 'fingrid',
            key: 'saved_banks',
            value: JSON.stringify(updatedBanks),
            type: 'json',
            ownerId: gid
          }]
        }
      });

      const data = await response.json();
      
      if (data.data?.metafieldsSet?.userErrors?.length > 0) {
        console.error('GraphQL errors:', data.data.metafieldsSet.userErrors);
        throw new Error('Failed to save metafield');
      }
    } catch (error) {
      console.error('Error adding bank account:', error);
      throw new Error('Failed to save bank account');
    }
  }

  async removeBankAccount(customerId: string, bankToken: string): Promise<void> {
    try {
      const existingBanks = await this.getSavedBanks(customerId);
      const updatedBanks = existingBanks.filter(bank => bank.token !== bankToken);

      const gid = `gid://shopify/Customer/${customerId}`;
      const response = await this.admin.graphql(this.metafieldSetMutation, {
        variables: {
          metafields: [{
            namespace: 'fingrid',
            key: 'saved_banks',
            value: JSON.stringify(updatedBanks),
            type: 'json',
            ownerId: gid
          }]
        }
      });

      const data = await response.json();
      
      if (data.data?.metafieldsSet?.userErrors?.length > 0) {
        console.error('GraphQL errors:', data.data.metafieldsSet.userErrors);
        throw new Error('Failed to remove metafield');
      }
    } catch (error) {
      console.error('Error removing bank account:', error);
      throw new Error('Failed to remove bank account');
    }
  }

  // Transaction Management
  async linkTransactionToOrder(orderId: string, transactionData: TransactionData): Promise<void> {
    try {
      const gid = `gid://shopify/Order/${orderId}`;
      const response = await this.admin.graphql(this.metafieldSetMutation, {
        variables: {
          metafields: [{
            namespace: 'fingrid',
            key: 'transaction_data',
            value: JSON.stringify(transactionData),
            type: 'json',
            ownerId: gid
          }]
        }
      });

      const data = await response.json();
      
      if (data.data?.metafieldsSet?.userErrors?.length > 0) {
        console.error('GraphQL errors:', data.data.metafieldsSet.userErrors);
        throw new Error('Failed to link transaction to order');
      }
    } catch (error) {
      console.error('Error linking transaction to order:', error);
      throw new Error('Failed to link transaction to order');
    }
  }

  async getTransactionByOrderId(orderId: string): Promise<TransactionData | null> {
    try {
      const gid = `gid://shopify/Order/${orderId}`;
      const response = await this.admin.graphql(this.metafieldQuery, {
        variables: { owner: gid }
      });

      const data = await response.json();
      
      if (data.data?.node?.metafields?.edges) {
        const metafield = data.data.node.metafields.edges.find(
          (edge: any) => edge.node.namespace === 'fingrid' && edge.node.key === 'transaction_data'
        );
        
        if (metafield) {
          return JSON.parse(metafield.node.value);
        }
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
      const response = await this.admin.graphql(this.shopMetafieldsQuery);

      const data = await response.json();
      
      if (data.data?.shop?.metafields?.edges) {
        const metafield = data.data.shop.metafields.edges.find(
          (edge: any) => edge.node.key === 'settings'
        );
        
        if (metafield) {
          const settings = JSON.parse(metafield.node.value);
          return this.decryptSensitiveFields(settings);
        }
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

      // Get shop GID first
      const shopResponse = await this.admin.graphql(`#graphql
        query getShop {
          shop {
            id
          }
        }
      `);

      const shopData = await shopResponse.json();
      const shopGid = shopData.data.shop.id;

      const response = await this.admin.graphql(this.metafieldSetMutation, {
        variables: {
          metafields: [{
            namespace: 'fingrid_app',
            key: 'settings',
            value: JSON.stringify(encryptedSettings),
            type: 'json',
            ownerId: shopGid
          }]
        }
      });

      const data = await response.json();
      
      if (data.data?.metafieldsSet?.userErrors?.length > 0) {
        console.error('GraphQL errors:', data.data.metafieldsSet.userErrors);
        throw new Error('Failed to update app settings');
      }
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

      // Get shop GID first
      const shopResponse = await this.admin.graphql(`#graphql
        query getShop {
          shop {
            id
          }
        }
      `);

      const shopData = await shopResponse.json();
      const shopGid = shopData.data.shop.id;

      const response = await this.admin.graphql(this.metafieldSetMutation, {
        variables: {
          metafields: [{
            namespace: 'fingrid_app',
            key: 'webhook_events',
            value: JSON.stringify(trimmedEvents),
            type: 'json',
            ownerId: shopGid
          }]
        }
      });

      const data = await response.json();
      
      if (data.data?.metafieldsSet?.userErrors?.length > 0) {
        console.error('GraphQL errors:', data.data.metafieldsSet.userErrors);
        throw new Error('Failed to log webhook event');
      }
    } catch (error) {
      console.error('Error logging webhook event:', error);
      throw new Error('Failed to log webhook event');
    }
  }

  private async getWebhookEvents(): Promise<WebhookEventData[]> {
    try {
      const response = await this.admin.graphql(this.shopMetafieldsQuery);

      const data = await response.json();
      
      if (data.data?.shop?.metafields?.edges) {
        const metafield = data.data.shop.metafields.edges.find(
          (edge: any) => edge.node.key === 'webhook_events'
        );
        
        if (metafield) {
          return JSON.parse(metafield.node.value);
        }
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
      testClientId: process.env.FINGRID_TEST_CLIENT_ID || 'AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg',
      testClientSecret: process.env.FINGRID_TEST_CLIENT_SECRET || 'ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb',
      testScriptUrl: process.env.FINGRID_TEST_SCRIPT_URL || 'https://js.test.fingrid.com/cabbage.js',
      
      liveGatewayUrl: process.env.FINGRID_LIVE_GATEWAY_URL || 'https://api.fingrid.com',
      liveClientId: process.env.FINGRID_LIVE_CLIENT_ID || '',
      liveClientSecret: process.env.FINGRID_LIVE_CLIENT_SECRET || '',
      liveScriptUrl: process.env.FINGRID_LIVE_SCRIPT_URL || 'https://js.fingrid.com/cabbage.js'
    };
  }
}