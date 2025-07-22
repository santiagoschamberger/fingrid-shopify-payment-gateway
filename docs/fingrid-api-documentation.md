# Fingrid Payment Gateway API Documentation

## Overview

This document provides comprehensive documentation for the Fingrid Payment Gateway API integration used in the Shopify app. The Fingrid API (powered by CabbagePay) enables secure bank transfer payments with real-time processing.

## Base URLs

- **Sandbox**: `https://sandbox.cabbagepay.com`
- **Production**: `https://production.cabbagepay.com`

## Authentication

All API requests use Basic Authentication with client credentials:

```
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/json
User-Agent: Shopify-Fingrid-App/1.0
```

## API Endpoints

### 1. Generate Link Token

Creates a link token for customer bank account connection.

**Endpoint**: `POST /api/custom/link/token/create`

**Request Body**:
```json
{
  "client_id": "string",
  "secret": "string", 
  "client_name": "string",
  "redirect_uri": "string",
  "cust_email": "string",
  "cust_phone_number": "string",
  "cust_first_name": "string", 
  "cust_last_name": "string",
  "theme_color": "string",
  "theme_logo": "string"
}
```

**Response**:
```json
{
  "message": "success",
  "link_token": "string",
  "expiry": "string"
}
```

**Error Response**:
```json
{
  "cabbage_return_code": "string",
  "message": "string"
}
```

### 2. Exchange Public Token

Exchanges a public token for a bank token after customer bank connection.

**Endpoint**: `POST /api/custom/link/public_token/exchange`

**Request Body**:
```json
{
  "client_id": "string",
  "secret": "string",
  "public_token": "string"
}
```

**Response**:
```json
{
  "message": "success",
  "bank_token": "string",
  "bank_name": "string", 
  "bank_account_last_four": "string",
  "request_id": "string"
}
```

### 3. Process Payment

Processes a payment transaction using a bank token.

**Endpoint**: `POST /api/custom/transaction/move_cabbage`

**Request Body**:
```json
{
  "client_id": "string",
  "secret": "string",
  "bank_token": "string",
  "connected_acct": "string",
  "transaction_type": "charge",
  "billing_type": "single",
  "speed": "next_day",
  "final_amount": 0,
  "application_fee_amount": 0,
  "statement_descriptor": "string",
  "metadata": "string",
  "ip_address": "string"
}
```

**Response**:
```json
{
  "cabbage_return_code": "pk1998",
  "transaction_id": "string",
  "message": "success", 
  "status": "string",
  "final_charged_amount": 0
}
```

### 4. Process Refund

Processes a refund by sending money back to customer.

**Endpoint**: `POST /api/custom/transaction/move_cabbage`

**Request Body**:
```json
{
  "client_id": "string",
  "secret": "string",
  "bank_token": "string",
  "connected_acct": "string", 
  "transaction_type": "send",
  "billing_type": "single",
  "final_amount": 0,
  "metadata": "string",
  "ip_address": "string"
}
```

### 5. Check Bank Token Health

Validates if a bank token is still active and healthy.

**Endpoint**: `POST /api/custom/health/token/bank_token`

**Request Body**:
```json
{
  "client_id": "string",
  "secret": "string", 
  "bank_token": "string"
}
```

**Response**:
```json
{
  "cabbage_return_code": "pk1998",
  "message": "success"
}
```

### 6. Get Bank Token Balance

Retrieves the available balance for a bank token.

**Endpoint**: `POST /api/custom/bank_token/balance`

**Request Body**:
```json
{
  "client_id": "string",
  "secret": "string",
  "bank_token": "string"
}
```

**Response**:
```json
{
  "cabbage_return_code": "pk1998",
  "message": "success",
  "available_balance": "string",
  "currency": "string"
}
```

## Error Codes

The Fingrid API uses specific error codes to indicate different failure scenarios:

| Code | Description |
|------|-------------|
| `pk1998` | Success |
| `1769` | Transaction failed |
| `1504` | Insufficient funds |
| `4851` | Bank connection expired |
| `5041` | Bank token expired |
| `5044` | Amount must be at least $1.00 |
| `1599` | Invalid transaction type |
| `1598` | Invalid billing type |
| `9384` | Permission denied / Invalid credentials |
| `9450` | Invalid theme color configuration |
| `5463` | Customer email or phone number required |
| `3957` | Store name required |
| `0113` | Payment service error |

## JavaScript SDK

### Sandbox SDK
```html
<script src="https://cabbagepay.com/js/sandbox/cabbage.js"></script>
```

### Production SDK  
```html
<script src="https://cabbagepay.com/js/production/cabbage.js"></script>
```

## Configuration Parameters

### Environment Settings

**Test Environment**:
- **Gateway URL**: `https://sandbox.cabbagepay.com`
- **Client ID**: Provided by Fingrid for testing
- **Client Secret**: Provided by Fingrid for testing  
- **Connected Account**: Test account ID
- **Script URL**: `https://cabbagepay.com/js/sandbox/cabbage.js`

**Production Environment**:
- **Gateway URL**: `https://production.cabbagepay.com`
- **Client ID**: Production client ID from Fingrid
- **Client Secret**: Production client secret from Fingrid
- **Connected Account**: Production account ID
- **Script URL**: `https://cabbagepay.com/js/production/cabbage.js`

### App Configuration

- **Client Name**: Display name for your store
- **Discount Percentage**: Percentage discount for bank transfer payments
- **Theme Color**: Hex color for payment UI (without #)
- **Theme Logo**: URL to logo image for payment UI
- **Redirect URL**: Callback URL after bank connection

### Status Mappings

- **Post Transaction Status**: Shopify order status after payment
- **Webhook Success Status**: Status for successful webhook processing
- **Webhook Failed Status**: Status for failed webhook processing

## Transaction Flow

1. **Generate Link Token**: Create a secure token for customer bank connection
2. **Customer Bank Connection**: Customer connects their bank account using Fingrid's UI
3. **Exchange Public Token**: Convert public token to secure bank token
4. **Store Bank Token**: Save encrypted bank token in Shopify metafields
5. **Process Payment**: Use bank token to charge customer's account
6. **Handle Webhooks**: Process real-time payment status updates

## Security Considerations

- All sensitive data is encrypted before storage in Shopify metafields
- Bank tokens are never exposed to frontend JavaScript
- API credentials are stored securely in app settings
- All API requests use HTTPS with proper authentication
- User-Agent header identifies requests from Shopify app

## Rate Limits

- Follow standard API rate limiting practices
- Implement retry logic with exponential backoff
- Monitor API response codes for rate limit indicators

## Testing

Use the provided test credentials:
- **Client ID**: `AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg`
- **Secret Key**: `ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb`
- **Test Account**: `acct_2iPZUHbj3SC61K12QNMmbb3pxSS4wq`
- **Base URL**: `https://sandbox.cabbagepay.com/api/custom/`

## Support

For API issues or questions:
- Review error codes and messages in API responses
- Check network connectivity and authentication
- Verify API credentials and account configuration
- Contact Fingrid support for account-specific issues

## Implementation Notes

- Always validate API responses for success indicators
- Implement proper error handling for all API calls  
- Store sensitive data securely using encryption
- Use appropriate HTTP status codes in API responses
- Log API interactions for debugging and monitoring 