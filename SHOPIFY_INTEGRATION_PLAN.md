# Fingrid Payment Gateway - Shopify Custom App Implementation Plan

## Executive Summary

This document outlines the streamlined plan to migrate the existing Fingrid payment gateway from WooCommerce to Shopify as a custom app. The integration uses **Shopify's built-in storage (metafields)** instead of a separate database, making it simpler, faster, and more cost-effective to implement. **Timeline: 4 weeks instead of 8 weeks!**

## 1. Analysis of Current WooCommerce Integration

### 1.1 Core Components Analyzed
- **fingrid-gateway.php**: Main plugin file with initialization and hooks
- **fingrid-class-gateway.php**: Core payment gateway class (731 lines)
- **fingrid-class-block.php**: Block checkout integration
- **fingrid-payment-script.js**: Frontend payment processing
- **fingrid-checkout.js**: Block-based checkout JavaScript
- **pages/account-bank-page.php**: Customer account management
- **fingrid-styles.css**: Custom styling

### 1.2 Key Functionalities Identified
1. **Payment Processing**
   - Link token generation for bank account linking
   - Public token exchange to bank tokens
   - Transaction processing via "move_cabbage" API endpoint
   - Multiple transaction types (charge, send/refund)
   - Test/Live mode support

2. **Customer Features**
   - Bank account linking and token storage
   - Multiple saved bank accounts per customer
   - New bank account addition during checkout
   - Customer account management interface

3. **Administrative Features**
   - Transaction reporting with date filtering
   - Refund/cancel transaction functionality  
   - Webhook handling for payment status updates
   - Order status management based on payment states

4. **Frontend Integration**
   - Custom payment method in checkout
   - Modal payment interface using Cabbage library
   - Real-time payment processing with loading states
   - Discount application for bank payments

## 2. Simplified Shopify App Architecture

### 2.1 App Structure (No Database Required!)
```
shopify-fingrid-app/
├── app/                          # Remix application
│   ├── routes/                   # API routes and pages
│   │   ├── app.settings.tsx      # App settings management
│   │   ├── app.transactions.tsx  # Transaction management
│   │   └── api/                  # API endpoints
│   │       ├── payment-gateway.ts
│   │       ├── webhooks.ts
│   │       └── fingrid-api.ts
│   ├── services/                 # Business logic
│   │   ├── fingrid-api.server.ts
│   │   ├── shopify-storage.server.ts  # Metafields storage
│   │   └── webhook-manager.server.ts
│   ├── components/               # React components
│   │   ├── SettingsForm.tsx
│   │   └── TransactionList.tsx
│   └── utils/                    # Utilities
│       ├── encryption.server.ts
│       └── validation.server.ts
├── extensions/                   # Shopify extensions
│   ├── checkout-ui/             # Checkout UI extension
│   │   ├── src/
│   │   │   ├── Checkout.jsx
│   │   │   └── PaymentMethod.jsx
│   │   └── shopify.extension.toml
│   └── customer-account/        # Customer account extension
│       ├── src/
│       │   └── BankAccounts.jsx
│       └── shopify.extension.toml
└── public/                      # Static assets
    ├── fingrid-payment.js      # Payment processing library
    └── styles.css              # Custom styles
```

### 2.2 Technology Stack
- **Backend**: Remix + Node.js
- **Storage**: Shopify Metafields (No separate database!)
- **Frontend**: React + Shopify App Bridge
- **Extensions**: Shopify Checkout UI Extensions
- **Payment Processing**: Fingrid API integration
- **Hosting**: Shopify App hosting or simple cloud hosting

## 3. Data Storage Strategy Using Shopify Metafields

### 3.1 Customer Bank Accounts → Customer Metafields
```typescript
// Store multiple saved bank accounts per customer
const savedBanks = [
  {
    token: 'bank_token_123',
    bankName: 'Chase Bank',
    last4: '1234',
    isActive: true,
    dateAdded: '2024-01-15'
  },
  {
    token: 'bank_token_456', 
    bankName: 'Bank of America',
    last4: '5678',
    isActive: true,
    dateAdded: '2024-02-20'
  }
];

// Store in customer metafield
await shopify.rest.Metafield.save({
  session,
  namespace: 'fingrid',
  key: 'saved_banks',
  value: JSON.stringify(savedBanks),
  type: 'json',
  owner_id: customerId,
  owner_resource: 'customer'
});
```

### 3.2 Transaction Mapping → Order Metafields
```typescript
// Link Fingrid transaction to Shopify order
await shopify.rest.Metafield.save({
  session,
  namespace: 'fingrid',
  key: 'transaction_data',
  value: JSON.stringify({
    transactionId: 'fingrid_txn_123',
    bankToken: 'bank_token_123',
    status: 'completed',
    amount: 99.99,
    processedAt: '2024-01-15T10:30:00Z'
  }),
  type: 'json',
  owner_id: orderId,
  owner_resource: 'order'
});
```

### 3.3 App Settings → Shop Metafields
```typescript
// Store all app configuration in shop metafield
const appSettings = {
  testMode: true,
  testClientId: 'test_client_123',
  testClientSecret: 'encrypted_secret_hash',
  testGatewayUrl: 'https://api.test.fingrid.com',
  testScriptUrl: 'https://js.test.fingrid.com/cabbage.js',
  
  liveClientId: 'live_client_456', 
  liveClientSecret: 'encrypted_live_secret',
  liveGatewayUrl: 'https://api.fingrid.com',
  liveScriptUrl: 'https://js.fingrid.com/cabbage.js',
  
  clientName: 'My Store',
  discountPercentage: 5,
  themeColor: '#1a73e8',
  themeLogo: 'https://mystore.com/logo.png',
  
  postTransactionStatus: 'pending',
  webhookSuccessStatus: 'paid',
  webhookFailedStatus: 'cancelled'
};

await shopify.rest.Metafield.save({
  session,
  namespace: 'fingrid_app',
  key: 'settings',
  value: JSON.stringify(appSettings),
  type: 'json',
  owner_resource: 'shop'
});
```

## 4. Implementation Phases (4 Weeks Total)

### Phase 1: Core App Setup (Week 1)

#### 4.1 Shopify App Initialization
1. **Create Shopify Custom App**
   - Set up Shopify Partner account
   - Create new custom app in partner dashboard
   - Configure app permissions:
     - `read_orders, write_orders` - Order management
     - `read_customers, write_customers` - Customer data
     - `read_payment_gateways, write_payment_gateways` - Payment integration
     - `read_checkouts, write_checkouts` - Checkout modifications

2. **Initialize Remix App**
   ```bash
   npm create @shopify/app@latest fingrid-payment-app
   cd fingrid-payment-app
   npm install
   ```

3. **Create Storage Service**
   - Implement Shopify metafields storage service
   - Set up encryption utilities for sensitive data
   - Create validation schemas for data integrity

#### 4.2 Shopify Storage Service
```typescript
// app/services/shopify-storage.server.ts
export class ShopifyStorageService {
  constructor(private session: Session) {}

  // Customer bank management
  async getSavedBanks(customerId: string) {
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

  async addBankAccount(customerId: string, bankData: BankAccount) {
    const existingBanks = await this.getSavedBanks(customerId);
    
    // Check for duplicate tokens
    if (existingBanks.some(bank => bank.token === bankData.token)) {
      return; // Bank already saved
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

  // Transaction tracking
  async linkTransactionToOrder(orderId: string, transactionData: TransactionData) {
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

  // App settings
  async getAppSettings() {
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
      // Decrypt sensitive data
      return this.decryptSensitiveFields(settings);
    }

    return this.getDefaultSettings();
  }

  async updateAppSettings(settings: AppSettings) {
    // Encrypt sensitive data before storing
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
}
```

### Phase 2: Payment Integration & Extensions (Week 2)

#### 4.3 Fingrid API Integration
1. **API Service Layer**
```typescript
// app/services/fingrid-api.server.ts
export class FingridApiService {
  constructor(private settings: AppSettings) {}

  async generateLinkToken(customerData: {
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<{ linkToken: string }> {
    const endpoint = `${this.getApiUrl()}/link/token/create`;
    
    const payload = {
      client_id: this.getClientId(),
      secret: this.getClientSecret(),
      client_name: this.settings.clientName,
      redirect_uri: this.getRedirectUrl(),
      cust_email: customerData.email,
      cust_first_name: customerData.firstName,
      cust_last_name: customerData.lastName,
      theme_color: this.settings.themeColor,
      theme_logo: this.settings.themeLogo,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!data.link_token) {
      throw new Error('Failed to generate link token');
    }

    return { linkToken: data.link_token };
  }

  async exchangePublicToken(publicToken: string): Promise<{
    bankToken: string;
    bankName: string;
    last4: string;
  }> {
    const endpoint = `${this.getApiUrl()}/link/public_token/exchange`;
    
    const payload = {
      client_id: this.getClientId(),
      secret: this.getClientSecret(),
      public_token: publicToken,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!data.bank_token) {
      throw new Error('Failed to exchange public token');
    }

    return {
      bankToken: data.bank_token,
      bankName: data.bank_name,
      last4: data.bank_account_last_four,
    };
  }

  async processPayment(transactionData: {
    orderId: string;
    amount: number;
    bankToken: string;
  }): Promise<{ success: boolean; transactionId?: string; message: string }> {
    const endpoint = `${this.getApiUrl()}/transaction/move_cabbage`;
    
    const payload = {
      client_id: this.getClientId(),
      secret: this.getClientSecret(),
      ip_address: 'Shopify App',
      metadata: `OrderId#${transactionData.orderId}`,
      final_amount: transactionData.amount,
      connected_acct: this.getConnectedAccount(),
      bank_token: transactionData.bankToken,
      transaction_type: 'charge',
      billing_type: 'single',
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (data.cabbage_return_code === 'pk1998') {
      return {
        success: true,
        transactionId: data.transaction_id,
        message: 'Payment processed successfully',
      };
    }

    return {
      success: false,
      message: data.message || 'Payment processing failed',
    };
  }
}
```

2. **API Routes**
```typescript
// app/routes/api.payment.generate-link-token.ts
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const { shopDomain, email, firstName, lastName } = Object.fromEntries(formData);

  const settings = await getAppSettings(shopDomain as string);
  const fingridApi = new FingridApiService(settings);

  try {
    const result = await fingridApi.generateLinkToken({
      email: email as string,
      firstName: firstName as string,
      lastName: lastName as string,
    });

    return json({ success: true, linkToken: result.linkToken });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 400 });
  }
}

// app/routes/api.payment.exchange-token.ts
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const { shopDomain, publicToken } = Object.fromEntries(formData);

  const settings = await getAppSettings(shopDomain as string);
  const fingridApi = new FingridApiService(settings);

  try {
    const result = await fingridApi.exchangePublicToken(publicToken as string);
    return json({ success: true, ...result });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 400 });
  }
}
```

### Phase 3: Admin Interface & Customer Account (Week 3)

#### 4.4 Checkout UI Extension Development
1. **Create Checkout Extension**
```bash
shopify app generate extension --type=checkout_ui_extension
```

2. **Payment Method Component**
```javascript
// extensions/checkout-ui/src/Checkout.jsx
import {
  reactExtension,
  useSettings,
  useBuyerJourney,
  useOrderLocation,
  useOrderAmount,
  useCustomer,
  useApi,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension('purchase.checkout.payment-method-list.render-before', () => (
  <FingridPaymentMethod />
));

function FingridPaymentMethod() {
  const settings = useSettings();
  const { intercept } = useBuyerJourney();
  const orderAmount = useOrderAmount();
  const customer = useCustomer();
  const { extension } = useApi();

  const [selectedBank, setSelectedBank] = useState(null);
  const [savedBanks, setSavedBanks] = useState([]);
  const [showNewBankForm, setShowNewBankForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Intercept checkout submission
  useEffect(() => {
    return intercept('purchase.checkout.payment-method.submit', async (result) => {
      if (result.paymentMethod.type !== 'fingrid-payment') {
        return result;
      }

      setIsProcessing(true);
      
      try {
        if (!selectedBank) {
          // Need to link new bank account
          const linkToken = await generateLinkToken();
          await openPaymentModal(linkToken);
        } else {
          // Process with selected bank
          await processPayment(selectedBank.token, orderAmount.current.amount);
        }

        return result;
      } catch (error) {
        return {
          ...result,
          behavior: 'block',
          reason: error.message,
        };
      } finally {
        setIsProcessing(false);
      }
    });
  }, [selectedBank, orderAmount]);

  const generateLinkToken = async () => {
    const response = await fetch('/api/payment/generate-link-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopDomain: settings.shopDomain,
        email: customer?.email,
        firstName: customer?.firstName,
        lastName: customer?.lastName,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error);
    }

    return data.linkToken;
  };

  return (
    <BlockStack>
      <Text size="medium" emphasis="strong">
        Pay by Bank - {settings.discountPercentage > 0 && `${settings.discountPercentage}% Off`}
      </Text>
      
      <Text size="small">
        Log in with your online banking credentials to connect and verify your account.
      </Text>

      {savedBanks.length > 0 && (
        <RadioGroup
          name="saved-banks"
          value={selectedBank?.id}
          onChange={(value) => {
            const bank = savedBanks.find(b => b.id === value);
            setSelectedBank(bank);
            setShowNewBankForm(false);
          }}
        >
          {savedBanks.map(bank => (
            <Radio key={bank.id} id={bank.id}>
              {bank.bankName} (**** {bank.last4})
            </Radio>
          ))}
          <Radio id="new-bank" onChange={() => setShowNewBankForm(true)}>
            Add new bank account
          </Radio>
        </RadioGroup>
      )}

      {(showNewBankForm || savedBanks.length === 0) && (
        <Text size="small">
          You'll be prompted to connect your bank account during checkout.
        </Text>
      )}

      {isProcessing && (
        <SkeletonText inlineSize="large" />
      )}
    </BlockStack>
  );
}
```

### Phase 4: Webhooks & Final Integration (Week 4)

#### 4.5 Customer Account Extension
1. **Create Customer Account Extension**
```bash
shopify app generate extension --type=customer_accounts_ui_extension
```

2. **Bank Account Management**
```javascript
// extensions/customer-account/src/BankAccounts.jsx
import {
  reactExtension,
  useApi,
  useCustomer,
} from '@shopify/ui-extensions-react/customer-account';

export default reactExtension('customer-account.order-status.customer-information.render-after', () => (
  <BankAccountManagement />
));

function BankAccountManagement() {
  const { extension } = useApi();
  const customer = useCustomer();
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedBanks();
  }, []);

  const fetchSavedBanks = async () => {
    try {
      const response = await fetch('/api/customer/banks', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await extension.sessionToken()}`,
        },
      });

      const data = await response.json();
      setBanks(data.banks || []);
    } catch (error) {
      console.error('Failed to fetch banks:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeBank = async (bankId) => {
    try {
      const response = await fetch(`/api/customer/banks/${bankId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await extension.sessionToken()}`,
        },
      });

      if (response.ok) {
        setBanks(banks.filter(bank => bank.id !== bankId));
      }
    } catch (error) {
      console.error('Failed to remove bank:', error);
    }
  };

  if (loading) {
    return <SkeletonText />;
  }

  return (
    <BlockStack>
      <Text size="large" emphasis="strong">
        Saved Bank Accounts
      </Text>

      {banks.length === 0 ? (
        <Text>No bank accounts saved.</Text>
      ) : (
        <BlockStack>
          {banks.map(bank => (
            <InlineLayout key={bank.id} columns={['fill', 'auto']}>
              <Text>
                {bank.bankName} (**** {bank.last4})
              </Text>
              <Button
                kind="secondary"
                size="small"
                onPress={() => removeBank(bank.id)}
              >
                Remove
              </Button>
            </InlineLayout>
          ))}
        </BlockStack>
      )}
    </BlockStack>
  );
}
```

#### 4.7 Netlify Deployment Setup
1. **Create Netlify Configuration**
```toml
# netlify.toml in project root
[build]
  command = "npm run build"
  publish = "build/client"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[functions]
  node_bundler = "esbuild"
```

2. **Environment Variables (Set in Netlify Dashboard)**
```bash
# Required for Shopify integration
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret  
SHOPIFY_APP_URL=https://your-app-name.netlify.app
SCOPES=read_orders,write_orders,read_customers,write_customers

# App security
SESSION_SECRET=your_session_secret_32_chars_min

# Optional for advanced features
NODE_ENV=production
```

3. **Deployment Steps**
```bash
# Connect to Git and auto-deploy
netlify init
netlify env:set SHOPIFY_API_KEY "your_key"
netlify env:set SHOPIFY_API_SECRET "your_secret"

# Manual deployment
npm run build
netlify deploy --prod --dir=build
```

4. **Update Shopify Configuration**
```bash
# Update app.toml with Netlify URL
shopify app config use production
# Edit shopify.app.production.toml:
# application_url = "https://your-app-name.netlify.app"
shopify app deploy
```

## 5. Key Benefits of Metafields Approach

### 5.1 Simplified Architecture
| Traditional Database | Shopify Metafields |
|---------------------|-------------------|
| Separate database server | Uses Shopify's storage |
| Database migrations | No migrations needed |
| Backup/restore setup | Auto-backed up by Shopify |
| Security configuration | Secured by Shopify |
| GDPR compliance work | Handled by Shopify |

### 5.2 Cost Comparison
| Item | Database Approach | Metafields Approach |
|------|------------------|-------------------|
| Database hosting | $25-100/month | **$0** |
| Backup storage | $10-50/month | **$0** |
| Setup time | 2-3 weeks | **3-5 days** |
| Maintenance | Ongoing | **Minimal** |

### 5.3 Benefits Summary
✅ **Faster Implementation**: 4 weeks instead of 8  
✅ **Lower Cost**: No database hosting fees  
✅ **Simpler Architecture**: Less infrastructure to manage  
✅ **Better Integration**: Native Shopify data storage  
✅ **Automatic Scaling**: Shopify handles the infrastructure  
✅ **GDPR Compliant**: Data deletion handled by Shopify  
✅ **Security**: Encrypted and secured by Shopify
// app/routes/app.settings.tsx
export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [formData, setFormData] = useState(settings);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submit(formData, { method: 'POST' });
  };

  return (
    <Page title="Payment Gateway Settings">
      <Layout>
        <Layout.Section>
          <Card>
            <FormLayout>
              <Checkbox
                label="Test Mode"
                checked={formData.testMode}
                onChange={(value) => setFormData({ ...formData, testMode: value })}
              />

              <TextField
                label="Client Name"
                value={formData.clientName}
                onChange={(value) => setFormData({ ...formData, clientName: value })}
              />

              <RangeSlider
                label="Discount Percentage"
                value={formData.discountPercentage}
                min={0}
                max={20}
                step={0.5}
                onChange={(value) => setFormData({ ...formData, discountPercentage: value })}
                suffix="%"
              />

              {/* Test Mode Settings */}
              {formData.testMode && (
                <Card title="Test Environment Settings" sectioned>
                  <FormLayout>
                    <TextField
                      label="Test Gateway URL"
                      value={formData.testGatewayUrl}
                      onChange={(value) => setFormData({ ...formData, testGatewayUrl: value })}
                    />
                    <TextField
                      label="Test Client ID"
                      type="password"
                      value={formData.testClientId}
                      onChange={(value) => setFormData({ ...formData, testClientId: value })}
                    />
                  </FormLayout>
                </Card>
              )}

              <Button primary onClick={handleSubmit}>
                Save Settings
              </Button>
            </FormLayout>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
```

2. **Transaction Management**
```typescript
// app/routes/app.transactions.tsx
export default function Transactions() {
  const { transactions } = useLoaderData<typeof loader>();
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date(),
  });

  const resourceName = {
    singular: 'transaction',
    plural: 'transactions',
  };

  return (
    <Page title="Transaction Report">
      <Layout>
        <Layout.Section>
          <Card>
            <Card.Section>
              <InlineStack gap="400">
                <DatePicker
                  selected={dateRange}
                  onMonthChange={(month, year) => {
                    setDateRange({
                      start: new Date(year, month, 1),
                      end: new Date(year, month + 1, 0),
                    });
                  }}
                />
                <Button onClick={fetchTransactions}>
                  Fetch Transactions
                </Button>
              </InlineStack>
            </Card.Section>

            <DataTable
              columnContentTypes={[
                'text',
                'text',
                'text',
                'numeric',
                'text',
                'text',
                'text',
              ]}
              headings={[
                'Date',
                'Order',
                'Customer',
                'Amount',
                'Status',
                'Transaction ID',
                'Actions',
              ]}
              rows={transactions.map(transaction => [
                new Date(transaction.createdAt).toLocaleDateString(),
                transaction.orderId,
                transaction.customerEmail,
                `$${transaction.amount}`,
                transaction.status,
                transaction.transactionId,
                transaction.status === 'completed' && (
                  <Button
                    destructive
                    size="slim"
                    onClick={() => refundTransaction(transaction.id)}
                  >
                    Refund
                  </Button>
                ),
              ])}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
```

### Phase 6: Webhook Integration (Week 6)

#### 4.7 Webhook Handler
```typescript
// app/routes/webhooks.fingrid.tsx
export async function action({ request }: ActionFunctionArgs) {
  const payload = await request.json();
  
  // Verify webhook authenticity (implement signature validation)
  const isValid = verifyWebhookSignature(request, payload);
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { resourceId, topic, id: webhookId } = payload;
  
  // Find the transaction
  const transaction = await getTransactionById(resourceId);
  if (!transaction) {
    return new Response('Transaction not found', { status: 404 });
  }

  // Update transaction status
  let newStatus;
  switch (topic.toLowerCase()) {
    case 'transfer_completed':
      newStatus = 'completed';
      break;
    case 'transfer_failed':
      newStatus = 'failed';
      break;
    default:
      newStatus = 'processing';
  }

  // Update transaction in database
  await updateTransaction(transaction.id, {
    status: newStatus,
    fingridStatus: topic,
  });

  // Update Shopify order
  const shopify = new shopify.rest.Order({
    session: { shop: transaction.shopDomain },
  });

  if (newStatus === 'completed') {
    // Mark order as paid
    await shopify.financial_status = 'paid';
    await shopify.save();
  } else if (newStatus === 'failed') {
    // Mark order as cancelled
    await shopify.cancel();
  }

  // Log webhook event
  await logWebhookEvent({
    webhookId,
    transactionId: resourceId,
    eventType: topic,
    payload,
    processed: true,
  });

  return new Response('OK', { status: 200 });
}
```

### Phase 7: Testing & Deployment (Week 7-8)

#### 4.8 Testing Strategy
1. **Unit Tests**
   - API service methods
   - Database operations
   - Webhook processing
   - Payment logic

2. **Integration Tests**
   - End-to-end payment flow
   - Webhook handling
   - Order status updates
   - Customer bank management

3. **Manual Testing**
   - Test mode payment processing
   - Customer account management
   - Admin transaction management
   - Error handling scenarios

#### 4.9 Deployment Configuration
1. **Environment Variables**
```env
# Database
DATABASE_URL=postgresql://...

# Shopify App
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_SCOPES=read_orders,write_orders,read_customers,write_customers

# Fingrid API
FINGRID_WEBHOOK_SECRET=your_webhook_secret

# App Configuration
NODE_ENV=production
SESSION_SECRET=your_session_secret
```

2. **Database Migration**
```bash
npx prisma migrate deploy
npx prisma generate
```

## 5. Key Differences from WooCommerce Integration

### 5.1 Architecture Differences
| Aspect | WooCommerce | Shopify |
|--------|-------------|---------|
| **Integration Type** | WordPress Plugin | Custom App + Extensions |
| **Backend Language** | PHP | Node.js/TypeScript |
| **Frontend Framework** | jQuery | React |
| **Database** | WordPress Tables | Custom Database |
| **Payment Processing** | WooCommerce Hooks | Shopify Admin API |
| **Checkout Integration** | Payment Gateway Class | Checkout UI Extensions |
| **Customer Management** | WordPress Users | Shopify Customer API |

### 5.2 Shopify-Specific Considerations
1. **Order Management**
   - Use Shopify Admin API for order updates
   - Map WooCommerce order statuses to Shopify equivalents
   - Handle Shopify's financial status system

2. **Customer Data**
   - Store bank tokens linked to Shopify customer IDs
   - Handle customer data through Shopify Customer API
   - Respect Shopify's customer privacy settings

3. **Checkout Flow**
   - Implement as Checkout UI Extension
   - Handle payment method selection differently
   - Integrate with Shopify's payment processing flow

## 6. Implementation Timeline: 4 Weeks

### Detailed 4-Week Timeline
- **Week 1**: App setup, metafields storage service, Fingrid API integration
- **Week 2**: Checkout extension, customer bank management
- **Week 3**: Admin interface, settings, transaction reporting
- **Week 4**: Netlify deployment, webhooks, testing

## 7. Security Considerations

### 7.1 Data Protection
- Encrypt sensitive API keys and tokens
- Implement proper authentication for all endpoints
- Validate webhook signatures
- Use HTTPS for all communications
- Follow Shopify's security best practices

### 7.2 PCI Compliance
- Never store payment card data
- Use Fingrid's secure token system
- Implement proper access controls
- Regular security audits

## 8. Maintenance & Support

### 8.1 Ongoing Requirements
- Monitor payment processing success rates
- Handle API version updates
- Maintain compatibility with Shopify updates
- Regular security updates
- Customer support for payment issues

### 8.2 Monitoring & Logging
- Transaction success/failure rates
- API response times
- Webhook delivery status
- Error tracking and alerting
- User activity monitoring

## 9. Budget & Resource Estimates

### 9.1 Development Resources
- **Senior Full-Stack Developer**: 4 weeks
- **UI/UX Developer**: 1 week (overlapping)
- **QA Engineer**: 1 week (overlapping)
- **DevOps Engineer**: 2 days (simple deployment)

### 9.2 Infrastructure Costs
- **Hosting**: $0/month (Netlify free tier)
- **Monitoring Tools**: $0-25/month (Netlify analytics included)
- **SSL Certificates**: $0 (included with Netlify)

### 9.3 Third-Party Services
- **Shopify App Store Fees**: 20% of revenue (if public app)
- **Fingrid API Fees**: As per existing contract
- **Development Tools**: $100-500/month

## 10. Success Metrics

### 10.1 Technical Metrics
- Payment success rate > 95%
- API response time < 2 seconds
- System uptime > 99.5%
- Zero security incidents

### 10.2 Business Metrics
- Transaction volume growth
- Customer adoption rate
- Merchant satisfaction scores
- Support ticket volume

## Conclusion

This streamlined approach using Shopify metafields provides:

✅ **Faster Implementation**: 4 weeks instead of 8  
✅ **Lower Cost**: No database hosting fees  
✅ **Simpler Architecture**: Less infrastructure to manage  
✅ **Better Integration**: Native Shopify data storage  
✅ **Automatic Scaling**: Shopify handles the infrastructure  

The metafields approach maintains **100% feature parity** with your current WooCommerce integration while being much simpler to implement and maintain. This includes:

- Multiple saved bank accounts per customer
- Real-time payment processing
- Transaction reporting and refunds
- Webhook status updates
- Discount applications
- Admin management tools

You can always migrate to a separate database later if you need advanced analytics or multi-tenant capabilities, but for most use cases, this approach is perfect and will get you to market much faster. 