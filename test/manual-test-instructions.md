# Manual Testing Instructions

## Testing the GraphQL Fix

### Prerequisites
1. Shopify development store set up
2. App installed in the development store
3. Local development environment running

### Test Scenarios

#### 1. Settings Page Loading
**Test**: Verify the settings page loads without GraphQL errors

**Steps**:
1. Start local development: `npm run dev`
2. Open the app in your Shopify admin
3. Navigate to Settings page
4. **Expected**: Page loads without 500 errors
5. **Expected**: Default settings are displayed

#### 2. Settings Save Functionality
**Test**: Verify settings can be saved successfully

**Steps**:
1. On the settings page, make changes to:
   - Client Name
   - Discount Percentage
   - Theme Color
   - Test credentials
2. Click "Save Settings"
3. **Expected**: Success message appears
4. **Expected**: No 400 Bad Request errors
5. **Expected**: Settings are persisted

#### 3. API Endpoints
**Test**: Verify API endpoints work correctly

**Steps**:
1. Test generate link token endpoint
2. Test exchange token endpoint
3. Test process payment endpoint
4. **Expected**: Proper error codes (400/401) not 500
5. **Expected**: No "shopify.graphql is not a function" errors

#### 4. Webhook Processing
**Test**: Verify webhooks process correctly

**Steps**:
1. Trigger order.paid webhook
2. Trigger order.cancelled webhook
3. Check logs for processing
4. **Expected**: Webhooks process without GraphQL errors

### Error Verification

#### Before Fix (Expected Errors)
- `TypeError: shopify.graphql is not a function`
- 500 Internal Server Error on settings save
- Failed metafield operations

#### After Fix (Expected Behavior)
- Settings page loads successfully
- Settings save without errors
- Proper error handling (400/401 instead of 500)
- GraphQL operations work correctly

### Local Testing Commands

```bash
# Run unit tests
npm test -- test/settings-integration.test.ts

# Start development server
npm run dev

# Check for GraphQL errors in logs
# Look for absence of "shopify.graphql is not a function"
```

### Production Testing

**Note**: Production testing requires proper Shopify authentication context. Simple curl requests will return 500 because they lack the required Shopify session/authentication.

**Proper Production Test**:
1. Install the app in a Shopify store
2. Access through Shopify admin interface
3. Navigate to app settings
4. Attempt to save settings

### Success Criteria

✅ **Unit tests pass** (6/6 tests)
✅ **Settings page loads** without 500 errors
✅ **Settings save successfully** without 400 errors
✅ **No GraphQL function errors** in logs
✅ **API endpoints return proper error codes**
✅ **Webhooks process correctly**

### Troubleshooting

If issues persist:
1. Check Vercel deployment logs
2. Verify environment variables are set
3. Check Shopify app configuration
4. Ensure proper authentication flow 