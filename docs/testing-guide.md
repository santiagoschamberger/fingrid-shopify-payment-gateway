# Testing Guide - Fingrid Payment Gateway

This guide covers how to test the Fingrid Payment Gateway Shopify app in different environments.

## 🧪 Testing Methods

### 1. Local Development Testing

#### Prerequisites
- Shopify CLI installed and configured
- Development store set up
- Fingrid sandbox credentials configured

#### Start Development Server
```bash
npm run dev
```

This will:
- Start the Remix app server
- Start Shopify CLI dev tunnel  
- Set up webhook tunneling
- Initialize the database

#### Access Points
- **App Admin**: Follow the URL provided by Shopify CLI (usually with trycloudflare.com)
- **GraphiQL**: http://localhost:3457 (for testing GraphQL queries)
- **Development Store**: Your connected Shopify development store

### 2. Testing the Admin Interface

1. **Navigate to App Settings**:
   - Go to your Shopify admin
   - Navigate to Apps > usapayments-bank
   - Click on "Settings"

2. **Configure Fingrid Credentials**:
   ```
   Test Mode: ✅ Enabled
   Test Gateway URL: https://api.test.fingrid.com
   Test Client ID: AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg
   Test Client Secret: ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb
   Discount Percentage: 5% (optional)
   Client Name: Your Store Name
   ```

3. **Save Settings**: Click "Save Settings" to store configuration

### 3. Testing API Endpoints

#### Test Link Token Generation
```bash
curl -X POST http://localhost:52942/api/fingrid/generate-link-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=test@example.com&firstName=John&lastName=Doe"
```

Expected Response:
```json
{
  "success": true,
  "linkToken": "link_token_123..."
}
```

#### Test Token Exchange
```bash
curl -X POST http://localhost:52942/api/fingrid/exchange-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "publicToken=public_token_123&customerId=customer_123"
```

#### Test Payment Processing
```bash
curl -X POST http://localhost:52942/api/fingrid/process-payment \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "orderId=order_123&amount=100.00&currency=USD&bankToken=bank_token_123"
```

### 4. Testing Checkout Integration

⚠️ **Note**: The checkout extension currently has dependency issues. For now, test the payment flow through:

1. **Direct API Testing**: Use the curl commands above
2. **Admin Interface**: Test settings and configuration
3. **Webhook Testing**: Use Shopify CLI webhook testing

### 5. Unit Tests

Run the included unit tests:

```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### 6. Database Testing

#### Check Metafields Storage
```bash
# Access GraphiQL at http://localhost:3457
# Query to check customer metafields:
query {
  customer(id: "gid://shopify/Customer/123") {
    metafields(namespace: "fingrid") {
      edges {
        node {
          key
          value
        }
      }
    }
  }
}
```

### 7. Webhook Testing

Test webhook endpoints using Shopify CLI:

```bash
# Test orders/paid webhook
shopify app webhook trigger --topic=orders/paid

# Test orders/cancelled webhook  
shopify app webhook trigger --topic=orders/cancelled

# Test customers/data_request webhook
shopify app webhook trigger --topic=customers/data_request
```

## 🔍 Testing Scenarios

### Scenario 1: New Customer Payment
1. Generate link token for new customer
2. Exchange public token for bank token
3. Save bank account to customer metafields
4. Process payment with saved bank token
5. Verify transaction data stored in order metafields

### Scenario 2: Returning Customer Payment
1. Retrieve saved bank accounts from customer metafields
2. Process payment with existing bank token
3. Verify transaction processing

### Scenario 3: Webhook Processing
1. Simulate Fingrid webhook for payment completion
2. Verify order status update
3. Check webhook event logging

### Scenario 4: Error Handling
1. Test with invalid credentials
2. Test with invalid bank tokens
3. Test rate limiting
4. Test webhook signature validation

## 🐛 Common Issues & Solutions

### Issue: Extension Not Loading
**Solution**: The checkout extension has dependency conflicts. Focus on API testing for now.

### Issue: Scopes Mismatch Warning
**Solution**: Run `shopify app deploy` to sync scopes with Partner Dashboard.

### Issue: Webhook Delivery Failures
**Solution**: 
- Check tunnel URL is accessible
- Verify webhook endpoints return 200 status
- Check Shopify CLI logs for errors

### Issue: Metafields Not Saving
**Solution**:
- Verify app has proper scopes
- Check authentication in API calls
- Ensure customer/order IDs are valid

## 📊 Production Testing

### Pre-Deployment Checklist
- [ ] All unit tests pass
- [ ] API endpoints respond correctly
- [ ] Settings can be saved and retrieved
- [ ] Webhooks process successfully
- [ ] Error handling works properly
- [ ] Rate limiting is functional
- [ ] Encryption/decryption works

### Production Environment Testing
1. Deploy to Vercel/production
2. Configure production Fingrid credentials
3. Test with real Shopify store
4. Verify SSL certificate and security headers
5. Monitor logs for errors

## 🔧 Development Tools

### Useful Commands
```bash
# View app logs
npm run dev --verbose

# Reset app configuration
shopify app dev --reset

# Generate new tunnel URL
shopify app dev --tunnel-url=<custom-url>

# Check app status
shopify app info
```

### Database Inspection
```bash
# Connect to SQLite database
sqlite3 prisma/dev.sqlite

# View sessions table
.tables
SELECT * FROM Session;
```

## 📈 Performance Testing

### Load Testing API Endpoints
```bash
# Install artillery for load testing
npm install -g artillery

# Create test config and run load tests
artillery quick --count 10 --num 5 http://localhost:52942/api/fingrid/generate-link-token
```

### Monitor Response Times
- Check API response times < 2 seconds
- Verify webhook processing < 5 seconds
- Monitor metafields read/write performance

This testing guide ensures comprehensive coverage of all app functionality before production deployment!