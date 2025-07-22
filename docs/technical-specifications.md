# Fingrid Payment Gateway - Technical Specifications & API References

## Table of Contents
1. [Shopify API Requirements](#1-shopify-api-requirements)
2. [Fingrid API Integration Details](#2-fingrid-api-integration-details)
3. [Metafields Storage Strategy](#3-metafields-storage-strategy)
4. [Extension Configuration](#4-extension-configuration)
5. [Webhook Implementation](#5-webhook-implementation)
6. [Security Implementation](#6-security-implementation)
7. [Testing Framework](#7-testing-framework)

## 1. Shopify API Requirements

### 1.1 Required Shopify Permissions
```json
{
  "scopes": [
    "read_orders",
    "write_orders",
    "read_customers", 
    "write_customers",
    "read_checkouts",
    "write_checkouts",
    "read_payment_gateways",
    "write_payment_gateways",
    "read_products",
    "write_script_tags"
  ]
}
```

### 1.2 Shopify Admin API Endpoints Used
```typescript
// Order Management
GET /admin/api/2023-10/orders/{order_id}.json
PUT /admin/api/2023-10/orders/{order_id}.json
POST /admin/api/2023-10/orders/{order_id}/transactions.json

// Customer Management  
GET /admin/api/2023-10/customers/{customer_id}.json
PUT /admin/api/2023-10/customers/{customer_id}.json

// Checkout Management
POST /admin/api/2023-10/checkouts.json
PUT /admin/api/2023-10/checkouts/{checkout_token}.json

// Webhook Management
POST /admin/api/2023-10/webhooks.json
GET /admin/api/2023-10/webhooks.json
DELETE /admin/api/2023-10/webhooks/{webhook_id}.json

// Metafields Management (Key for storage)
GET /admin/api/2023-10/customers/{customer_id}/metafields.json
POST /admin/api/2023-10/customers/{customer_id}/metafields.json
PUT /admin/api/2023-10/metafields/{metafield_id}.json
DELETE /admin/api/2023-10/metafields/{metafield_id}.json

GET /admin/api/2023-10/orders/{order_id}/metafields.json
POST /admin/api/2023-10/orders/{order_id}/metafields.json

GET /admin/api/2023-10/metafields.json?namespace=fingrid_app
POST /admin/api/2023-10/metafields.json
```

### 1.3 GraphQL Storefront API
```graphql
# Customer Bank Accounts Query
query getCustomerBanks($customerId: ID!) {
  customer(id: $customerId) {
    id
    email
    metafields(namespace: "fingrid") {
      edges {
        node {
          key
          value
          type
        }
      }
    }
  }
}

# Order Processing Mutation  
mutation updateOrderFinancialStatus($orderId: ID!, $status: OrderFinancialStatus!) {
  orderUpdate(input: {
    id: $orderId
    financialStatus: $status
  }) {
    order {
      id
      financialStatus
    }
    userErrors {
      field
      message
    }
  }
}
```

## 2. Fingrid API Integration Details

### 2.1 API Endpoints and Methods
```typescript
interface FingridApiEndpoints {
  // Authentication & Token Management
  generateLinkToken: 'POST /link/token/create';
  exchangePublicToken: 'POST /link/public_token/exchange';
  
  // Transaction Processing
  processPayment: 'POST /transaction/move_cabbage';
  cancelTransaction: 'POST /transaction/cancel';
  getTransactions: 'POST /transactions';
  
  // Account Management  
  getAccountInfo: 'POST /account/info';
  updateAccount: 'POST /account/update';
}
```

### 2.2 API Request/Response Schemas
```typescript
// Link Token Generation
interface LinkTokenRequest {
  client_id: string;
  secret: string;
  client_name: string;
  redirect_uri: string;
  cust_email: string;
  cust_first_name: string;
  cust_last_name: string;
  theme_color?: string;
  theme_logo?: string;
}

interface LinkTokenResponse {
  link_token: string;
  expiration: string;
}

// Public Token Exchange
interface PublicTokenRequest {
  client_id: string;
  secret: string;
  public_token: string;
}

interface PublicTokenResponse {
  bank_token: string;
  bank_name: string;
  bank_account_last_four: string;
  account_type: string;
  routing_number: string;
}

// Payment Processing
interface PaymentRequest {
  client_id: string;
  secret: string;
  ip_address: string;
  metadata: string;
  final_amount: number;
  connected_acct: string;
  bank_token: string;
  transaction_type: 'charge' | 'send';
  billing_type: 'single' | 'recurring';
}

interface PaymentResponse {
  cabbage_return_code: string;
  transaction_id: string;
  message: string;
  status: string;
  final_charged_amount: number;
}

// Transaction Query
interface TransactionQueryRequest {
  client_id: string;
  secret: string;
  connected_acct: string;
  start_date: string;
  end_date: string;
}

interface TransactionQueryResponse {
  transfers: Array<{
    transaction_id: string;
    transaction_date: string;
    status: string;
    final_charged_amount: number;
    metadata: string;
    fail_explanation?: string;
  }>;
}
```

### 2.3 Error Handling
```typescript
interface FingridErrorResponse {
  cabbage_return_code: string;
  message: string;
  details?: string;
}

const ERROR_CODES = {
  'pk1998': 'Success',
  '0001': 'Invalid credentials',
  '0002': 'Insufficient funds',
  '0003': 'Account not found',
  '0004': 'Transaction limit exceeded',
  '0005': 'Invalid bank token',
  '0294': 'Transaction already processed',
} as const;

class FingridApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: string
  ) {
    super(`Fingrid API Error ${code}: ${message}`);
  }
}
```

## 3. Metafields Storage Strategy

### 3.1 Storage Service Implementation
```typescript
// app/services/shopify-storage.server.ts
export class ShopifyStorageService {
  constructor(private session: Session) {}

  // Customer Bank Management
  async getSavedBanks(customerId: string): Promise<BankAccount[]> {
    const metafields = await shopify.rest.Metafield.all({
      session: this.session,
      metafield: {
        owner_id: customerId,
        owner_resource: 'customer',
        namespace: 'fingrid',
        key: 'saved_banks'
      }
    });

    return metafields.data[0] 
      ? JSON.parse(metafields.data[0].value) 
      : [];
  }

  async addBankAccount(customerId: string, bankData: BankAccount): Promise<void> {
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

    await shopify.rest.Metafield.save({
      session: this.session,
      namespace: 'fingrid',
      key: 'saved_banks',
      value: JSON.stringify(updatedBanks),
      type: 'json',
      owner_id: customerId,
      owner_resource: 'customer'
    });
  }

  async removeBankAccount(customerId: string, bankToken: string): Promise<void> {
    const existingBanks = await this.getSavedBanks(customerId);
    const updatedBanks = existingBanks.filter(bank => bank.token !== bankToken);

    await shopify.rest.Metafield.save({
      session: this.session,
      namespace: 'fingrid',
      key: 'saved_banks',
      value: JSON.stringify(updatedBanks),
      type: 'json',
      owner_id: customerId,
      owner_resource: 'customer'
    });
  }

  // Transaction Management
  async linkTransactionToOrder(orderId: string, transactionData: TransactionData): Promise<void> {
    await shopify.rest.Metafield.save({
      session: this.session,
      namespace: 'fingrid',
      key: 'transaction_data',
      value: JSON.stringify(transactionData),
      type: 'json',
      owner_id: orderId,
      owner_resource: 'order'
    });
  }

  async getTransactionByOrderId(orderId: string): Promise<TransactionData | null> {
    const metafields = await shopify.rest.Metafield.all({
      session: this.session,
      metafield: {
        owner_id: orderId,
        owner_resource: 'order',
        namespace: 'fingrid',
        key: 'transaction_data'
      }
    });

    return metafields.data[0] 
      ? JSON.parse(metafields.data[0].value)
      : null;
  }

  // App Settings Management
  async getAppSettings(): Promise<AppSettings> {
    const metafields = await shopify.rest.Metafield.all({
      session: this.session,
      metafield: {
        owner_resource: 'shop',
        namespace: 'fingrid_app',
        key: 'settings'
      }
    });

    if (metafields.data[0]) {
      const settings = JSON.parse(metafields.data[0].value);
      return this.decryptSensitiveFields(settings);
    }

    return this.getDefaultSettings();
  }

  async updateAppSettings(settings: AppSettings): Promise<void> {
    const encryptedSettings = this.encryptSensitiveFields(settings);

    await shopify.rest.Metafield.save({
      session: this.session,
      namespace: 'fingrid_app',
      key: 'settings',
      value: JSON.stringify(encryptedSettings),
      type: 'json',
      owner_resource: 'shop'
    });
  }

  // Webhook Event Tracking
  async logWebhookEvent(webhookData: WebhookEventData): Promise<void> {
    const existingEvents = await this.getWebhookEvents();
    const updatedEvents = [...existingEvents, {
      ...webhookData,
      processed: false,
      timestamp: new Date().toISOString()
    }];

    // Keep only last 1000 webhook events to prevent metafield bloat
    const trimmedEvents = updatedEvents.slice(-1000);

    await shopify.rest.Metafield.save({
      session: this.session,
      namespace: 'fingrid_app',
      key: 'webhook_events',
      value: JSON.stringify(trimmedEvents),
      type: 'json',
      owner_resource: 'shop'
    });
  }

  private async getWebhookEvents(): Promise<WebhookEventData[]> {
    const metafields = await shopify.rest.Metafield.all({
      session: this.session,
      metafield: {
        owner_resource: 'shop',
        namespace: 'fingrid_app',
        key: 'webhook_events'
      }
    });

    return metafields.data[0] 
      ? JSON.parse(metafields.data[0].value)
      : [];
  }

  private encryptSensitiveFields(settings: AppSettings): AppSettings {
    return {
      ...settings,
      testClientSecret: settings.testClientSecret ? encrypt(settings.testClientSecret) : undefined,
      liveClientSecret: settings.liveClientSecret ? encrypt(settings.liveClientSecret) : undefined
    };
  }

  private decryptSensitiveFields(settings: AppSettings): AppSettings {
    return {
      ...settings,
      testClientSecret: settings.testClientSecret ? decrypt(settings.testClientSecret) : undefined,
      liveClientSecret: settings.liveClientSecret ? decrypt(settings.liveClientSecret) : undefined
    };
  }
}
```

### 3.2 TypeScript Interfaces
```typescript
// Data structure interfaces
export interface BankAccount {
  token: string;
  bankName: string;
  last4: string;
  routingNumber?: string;
  accountType?: string;
  isActive: boolean;
  dateAdded: string;
}

export interface AppSettings {
  testMode: boolean;
  
  // Test Environment
  testGatewayUrl?: string;
  testClientId?: string;
  testClientSecret?: string;
  testConnectedAccount?: string;
  testScriptUrl?: string;
  testRedirectUrl?: string;
  
  // Production Environment
  liveGatewayUrl?: string;
  liveClientId?: string;
  liveClientSecret?: string;
  liveConnectedAccount?: string;
  liveScriptUrl?: string;
  liveRedirectUrl?: string;
  
  // App Configuration
  clientName?: string;
  discountPercentage: number;
  themeColor?: string;
  themeLogo?: string;
  
  // Status Mappings
  postTransactionStatus: string;
  webhookSuccessStatus: string;
  webhookFailedStatus: string;
}

export interface TransactionData {
  transactionId: string;
  bankToken: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  transactionType: TransactionType;
  fingridResponse?: any;
  processedAt: string;
  updatedAt?: string;
}

export interface WebhookEventData {
  webhookId: string;
  transactionId: string;
  eventType: string;
  payload: any;
  processed: boolean;
  timestamp: string;
  processedAt?: string;
}

export enum TransactionType {
  CHARGE = 'charge',
  SEND = 'send',
  REFUND = 'refund'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}
```

## 4. Extension Configuration

### 4.1 Checkout UI Extension Configuration
```toml
# extensions/checkout-ui/shopify.extension.toml
name = "Fingrid Payment Method"
type = "checkout_ui_extension"

[build]
command = "npm run build"
path = "dist"

[[extensions.metafields]]
namespace = "fingrid"
key = "payment_settings"

[settings]
  [[settings.fields]]
  key = "discount_percentage"
  type = "number_decimal"
  name = "Discount Percentage"
  
  [[settings.fields]]
  key = "theme_color"
  type = "color"
  name = "Theme Color"
  
  [[settings.fields]]
  key = "show_saved_banks"
  type = "boolean"
  name = "Show Saved Bank Accounts"
```

### 4.2 Customer Account Extension Configuration
```toml
# extensions/customer-account/shopify.extension.toml
name = "Bank Account Management"
type = "customer_account_ui_extension"

[build]
command = "npm run build"
path = "dist"

[[extensions.targeting]]
target = "customer-account.order-status.customer-information.render-after"

[[extensions.metafields]]
namespace = "fingrid"
key = "saved_banks"
```

### 4.3 Extension Build Configuration
```javascript
// extensions/checkout-ui/vite.config.js
import { defineConfig } from 'vite';
import { unstable_vitePlugin as remix } from '@remix-run/dev';

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ['**/.*'],
    }),
  ],
  build: {
    rollupOptions: {
      external: ['@shopify/ui-extensions-react/checkout'],
    },
  },
});
```

## 5. Webhook Implementation

### 5.1 Webhook Registration
```typescript
// app/services/webhook-manager.server.ts
export class WebhookManager {
  constructor(private shopify: ShopifyApi) {}

  async registerWebhooks(shopDomain: string) {
    const webhooks = [
      {
        topic: 'orders/paid',
        address: `${process.env.APP_URL}/webhooks/shopify/orders/paid`,
        format: 'json'
      },
      {
        topic: 'orders/cancelled',
        address: `${process.env.APP_URL}/webhooks/shopify/orders/cancelled`,
        format: 'json'
      },
      {
        topic: 'customers/data_request',
        address: `${process.env.APP_URL}/webhooks/shopify/customers/data_request`,
        format: 'json'
      }
    ];

    for (const webhook of webhooks) {
      await this.shopify.rest.Webhook.save({
        session: { shop: shopDomain },
        topic: webhook.topic,
        address: webhook.address,
        format: webhook.format
      });
    }
  }
}
```

### 5.2 Webhook Signature Validation
```typescript
// app/utils/webhook-validator.server.ts
import crypto from 'crypto';

export function verifyShopifyWebhook(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body, 'utf8');
  const hash = hmac.digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(hash)
  );
}

export function verifyFingridWebhook(
  body: string,
  signature: string,
  secret: string
): boolean {
  // Implement Fingrid-specific webhook verification
  // This will depend on Fingrid's webhook signature method
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
    
  return signature === expectedSignature;
}
```

### 5.3 Webhook Handler Implementation
```typescript
// app/routes/webhooks.fingrid.payment-status.tsx
export async function action({ request }: ActionFunctionArgs) {
  const signature = request.headers.get('X-Fingrid-Signature');
  const body = await request.text();
  
  if (!verifyFingridWebhook(body, signature, process.env.FINGRID_WEBHOOK_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = JSON.parse(body);
  const { resourceId, topic, id: webhookId } = payload;

  try {
    // Process webhook
    await processWebhookEvent({
      transactionId: resourceId,
      eventType: topic,
      webhookId,
      payload
    });

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function processWebhookEvent(event: WebhookEventData) {
  const transaction = await db.paymentTransaction.findUnique({
    where: { transactionId: event.transactionId }
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // Update transaction status
  const statusMapping = {
    'transfer_completed': TransactionStatus.COMPLETED,
    'transfer_failed': TransactionStatus.FAILED,
    'transfer_cancelled': TransactionStatus.CANCELLED
  };

  const newStatus = statusMapping[event.eventType] || TransactionStatus.PROCESSING;

  await db.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      status: newStatus,
      fingridStatus: event.eventType,
      updatedAt: new Date()
    }
  });

  // Update Shopify order
  await updateShopifyOrder(transaction.shopDomain, transaction.orderId, newStatus);

  // Log webhook event
  await db.webhookEvent.create({
    data: {
      shopDomain: transaction.shopDomain,
      webhookId: event.webhookId,
      transactionId: event.transactionId,
      eventType: event.eventType,
      payload: event.payload,
      processed: true,
      processedAt: new Date()
    }
  });
}
```

## 6. Security Implementation

### 6.1 API Key Encryption
```typescript
// app/utils/encryption.server.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes key
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  cipher.setAAD(Buffer.from('fingrid-payment-app'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  decipher.setAAD(Buffer.from('fingrid-payment-app'));
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 6.2 Rate Limiting
```typescript
// app/utils/rate-limiter.server.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiters = {
  payment: new RateLimiterMemory({
    keyPrefix: 'fingrid_payment',
    points: 5, // Number of requests
    duration: 60, // Per 60 seconds
  }),
  
  api: new RateLimiterMemory({
    keyPrefix: 'fingrid_api',
    points: 100,
    duration: 60,
  }),
  
  webhook: new RateLimiterMemory({
    keyPrefix: 'fingrid_webhook',
    points: 1000,
    duration: 60,
  })
};

export async function checkRateLimit(
  type: keyof typeof rateLimiters,
  identifier: string
): Promise<void> {
  try {
    await rateLimiters[type].consume(identifier);
  } catch (rejRes) {
    throw new Error(`Rate limit exceeded. Try again in ${rejRes.msBeforeNext}ms`);
  }
}
```

### 6.3 Input Validation
```typescript
// app/utils/validation.server.ts
import { z } from 'zod';

export const schemas = {
  paymentRequest: z.object({
    orderId: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().length(3),
    bankToken: z.string().min(10),
    customerId: z.string().optional()
  }),
  
  linkTokenRequest: z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    shopDomain: z.string().min(1)
  }),
  
  settingsUpdate: z.object({
    testMode: z.boolean(),
    clientName: z.string().optional(),
    discountPercentage: z.number().min(0).max(100),
    themeColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    testGatewayUrl: z.string().url().optional(),
    testClientId: z.string().optional(),
    testClientSecret: z.string().optional()
  })
};

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}
```

## 7. Netlify Deployment Configuration

### 7.1 Project Structure for Netlify
```
shopify-fingrid-app/
├── netlify.toml              # Netlify configuration
├── netlify/
│   └── functions/            # Serverless functions (if needed)
│       └── api/
│           ├── payment-gateway.js
│           └── webhooks.js
├── app/                      # Remix application
│   ├── routes/
│   │   └── api/              # API routes (handled by Remix)
│   ├── services/
│   └── utils/
└── build/                    # Build output
    ├── client/               # Static assets (Netlify publish)
    └── server/               # Server code
```

### 7.2 Netlify Configuration File
```toml
# netlify.toml in project root
[build]
  command = "npm run build"
  publish = "build/client"

[build.environment]
  NODE_VERSION = "18"
  NPM_FLAGS = "--production=false"

# Handle Remix server-side routing
[[redirects]]
  from = "/*"
  to = "/.netlify/functions/server"
  status = 200

[functions]
  node_bundler = "esbuild"
  external_node_modules = ["@shopify/shopify-api", "@shopify/shopify-app-remix"]

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    X-XSS-Protection = "1; mode=block"

# CORS for API routes
[[headers]]
  for = "/api/*"
  [headers.values]
    Access-Control-Allow-Origin = "https://admin.shopify.com"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS"
    Access-Control-Allow-Headers = "Content-Type, Authorization"
```

### 7.3 Environment Variables Setup
```bash
# Set in Netlify Dashboard > Site settings > Environment variables

# Core Shopify App Configuration
SHOPIFY_API_KEY=your_shopify_app_key
SHOPIFY_API_SECRET=your_shopify_app_secret
SHOPIFY_APP_URL=https://your-app-name.netlify.app
SCOPES=read_orders,write_orders,read_customers,write_customers

# Security
SESSION_SECRET=your_32_character_minimum_session_secret

# Production settings
NODE_ENV=production

# Optional webhook verification
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_if_needed
```

### 7.4 Deployment Process
```bash
# 1. Connect Git repository to Netlify
# 2. Set environment variables in Netlify dashboard
# 3. Configure build settings:
#    - Build command: npm run build
#    - Publish directory: build/client
# 4. Deploy automatically on git push

# Or manual deployment via CLI:
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### 7.5 Key Advantages for This Project
✅ **$0 hosting cost** - Netlify free tier is perfect for Shopify apps  
✅ **No database hosting** - Using Shopify metafields saves $25-100/month  
✅ **Automatic SSL** - Included with Netlify  
✅ **Global CDN** - Fast worldwide loading  
✅ **Git-based deployment** - Auto-deploy on push  
✅ **Serverless scaling** - Handles traffic spikes automatically  
✅ **Built-in monitoring** - Basic analytics included  

### 7.6 Total Infrastructure Cost: $0/month
Compared to traditional hosting approaches that could cost $50-200/month:
- Database hosting: $0 (using Shopify metafields)
- Web hosting: $0 (Netlify free tier)  
- SSL certificates: $0 (included)
- CDN: $0 (included)
- Monitoring: $0 (basic Netlify analytics)

**This represents a potential savings of $600-2400/year!**  

## 8. Testing Framework

### 8.1 Unit Test Configuration
```javascript
// jest.config.js
module.exports = {
  preset: '@remix-run/dev/jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testMatch: [
    '<rootDir>/app/**/__tests__/**/*.(test|spec).{ts,tsx}',
    '<rootDir>/test/**/*.(test|spec).{ts,tsx}'
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/entry.client.tsx',
    '!app/entry.server.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### 8.2 Test Utilities
```typescript
// test/utils.ts
import { createRemixStub } from '@remix-run/testing';
import { vi } from 'vitest';

// Mock Shopify session for testing
export function createMockShopifySession(shopDomain: string) {
  return {
    shop: shopDomain,
    accessToken: 'mock-access-token',
    scope: 'read_orders,write_orders',
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };
}

// Mock Fingrid API responses
export function createMockFingridApiResponse(type: 'success' | 'error') {
  if (type === 'success') {
    return {
      cabbage_return_code: 'pk1998',
      transaction_id: 'test-transaction-123',
      message: 'Transaction processed successfully'
    };
  }
  
  return {
    cabbage_return_code: '0001',
    message: 'Invalid credentials'
  };
}

// Mock Shopify metafields API
export function createMockMetafieldsResponse(data: any[]) {
  return {
    data: data.map(item => ({
      id: Math.random().toString(),
      namespace: 'fingrid',
      key: 'test_key',
      value: JSON.stringify(item),
      type: 'json',
      owner_resource: 'customer',
      owner_id: '123'
    }))
  };
}

// Clean up is much simpler - no database to clean!
export async function cleanupTestData() {
  // Since we use Shopify metafields, cleanup happens automatically
  // in test environment when mocks are reset
  vi.clearAllMocks();
}
```

### 7.3 Integration Test Examples
```typescript
// test/integration/payment-flow.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FingridApiService } from '~/services/fingrid-api.server';
import { cleanupTestData, createMockFingridApiResponse } from '../utils';

describe('Payment Flow Integration', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('should process payment successfully', async () => {
    const mockApiService = new FingridApiService({
      shopDomain: 'test-shop.myshopify.com',
      testMode: true,
      testGatewayUrl: 'https://api.test.fingrid.com',
      testClientId: 'test-client-id',
      testClientSecret: 'test-secret'
    });

    // Mock API response
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve(createMockFingridApiResponse('success'))
    } as Response);

    const result = await mockApiService.processPayment({
      orderId: 'test-order-123',
      amount: 100.00,
      bankToken: 'test-bank-token'
    });

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('test-transaction-123');
  });

  it('should handle payment failure', async () => {
    const mockApiService = new FingridApiService({
      shopDomain: 'test-shop.myshopify.com',
      testMode: true,
      testGatewayUrl: 'https://api.test.fingrid.com',
      testClientId: 'invalid-client-id',
      testClientSecret: 'invalid-secret'
    });

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve(createMockFingridApiResponse('error'))
    } as Response);

    const result = await mockApiService.processPayment({
      orderId: 'test-order-123',
      amount: 100.00,
      bankToken: 'test-bank-token'
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid credentials');
  });
});
```

### 7.4 End-to-End Test Configuration
```typescript
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
  ],
};

export default config;
```

This technical specifications document provides the detailed implementation guidelines needed to successfully build the Shopify integration. It covers all the technical aspects including API schemas, database design, security implementations, and testing frameworks that complement the main implementation plan. 