# Fingrid API Documentation - Complete Reference

## Overview
This is the complete API documentation for Fingrid's payment gateway system, including all endpoints for bank transfers, merchant onboarding, and webhook integrations.

## Base URL
- **Sandbox**: `https://sandbox.cabbagepay.com`
- **Production**: `https://production.cabbagepay.com`

Replace `{env_url}` in endpoints with the appropriate base URL.

## Authentication
All requests require:
```json
{
  "client_id": "YOUR_CLIENT_ID",
  "secret": "YOUR_SECRET_KEY"
}
```

## Core Payment Flow

### 1. Generate Link Token
Create a token for customer bank account linking.

**Endpoint**: `{env_url}/api/custom/link/token/create`

**Request Body**:
```json
{
  "client_id": "YOUR_CLIENT_ID",
  "secret": "YOUR_SECRET_KEY",
  "client_name": "Your Business Name",
  "redirect_uri": "https://yourapp.com/callback",
  "cust_email": "customer@example.com",
  "cust_first_name": "John",
  "cust_last_name": "Doe",
  "theme_color": "0066cc",
  "theme_logo": "https://yourapp.com/logo.png"
}
```

**Response**:
```json
{
  "message": "success",
  "link_token": "link_sandbox_abc123def456",
  "expiration": "2024-01-01T12:00:00Z"
}
```

### 2. Exchange Public Token
Convert public token to bank token after customer links account.

**Endpoint**: `{env_url}/api/custom/link/public_token/exchange`

**Request Body**:
```json
{
  "client_id": "YOUR_CLIENT_ID", 
  "secret": "YOUR_SECRET_KEY",
  "public_token": "public_sandbox_xyz789"
}
```

**Response**:
```json
{
  "message": "success",
  "bank_token": "bank_token_sandbox_b1de80d70fab4c659d67f366",
  "bank_name": "Chase Bank",
  "bank_account_last_four": "1234",
  "account_type": "checking",
  "routing_number": "021000021"
}
```

### 3. Process Payment
Charge customer's bank account.

**Endpoint**: `{env_url}/api/custom/transaction/move_cabbage`

**Request Body**:
```json
{
  "client_id": "YOUR_CLIENT_ID",
  "secret": "YOUR_SECRET_KEY", 
  "ip_address": "192.168.1.1",
  "metadata": "Order #12345",
  "final_amount": 100.00,
  "connected_acct": "acct_1234567890",
  "bank_token": "bank_token_sandbox_b1de80d70fab4c659d67f366",
  "transaction_type": "charge",
  "billing_type": "single",
  "speed": "next_day",
  "application_fee_amount": 2.50,
  "statement_descriptor": "ACME Store Purchase"
}
```

**Response**:
```json
{
  "cabbage_return_code": "pk1998",
  "transaction_id": "txn_abc123def456",
  "message": "success",
  "status": "pending",
  "final_charged_amount": 100.00
}
```

## Bank Token Management

### Get Bank Token Balance
**Endpoint**: `{env_url}/api/custom/bank_token/balance`

**Request Body**:
```json
{
  "client_id": "YOUR_CLIENT_ID",
  "secret": "YOUR_SECRET_KEY",
  "bank_token": "bank_token_sandbox_b1de80d70fab4c659d67f366"
}
```

**Response**:
```json
{
  "cabbage_return_code": "pk1998",
  "message": "success",
  "available_balance": "9831.38",
  "currency": "USD"
}
```

**Return Codes**:
- `pk1998`: Success
- `4837`: Token suspended  
- `0857`: Manual token
- `4851`: Bank connection expired
- `9851`: Unable to retrieve live balance
- `9384`: Permission Denied

### Check Bank Token Health
**Endpoint**: `{env_url}/api/custom/health/token/bank_token`

**Request Body**:
```json
{
  "client_id": "YOUR_CLIENT_ID",
  "secret": "YOUR_SECRET_KEY", 
  "bank_token": "bank_token_sandbox_b1de80d70fab4c659d67f366"
}
```

**Response**:
```json
{
  "cabbage_return_code": "pk1998",
  "message": "success"
}
```

**Return Codes**:
- `pk1998`: Success
- `4851`: Token expired
- `5748`: Invalid bank_token
- `9384`: Permission Denied

### Get Bank Token Owner
**Endpoint**: `{env_url}/api/custom/bank_token/owner`

**Request Body**:
```json
{
  "client_id": "YOUR_CLIENT_ID",
  "secret": "YOUR_SECRET_KEY",
  "bank_token": "bank_token_sandbox_b1de80d70fab4c659d67f366"
}
```

**Response**:
```json
{
  "cabbage_return_code": "pk1998", 
  "message": "success",
  "owner_name": "John Doe",
  "owner_address": "100 Wall St, New York, NY 10005"
}
```

**Return Codes**:
- `pk1998`: Success
- `4851`: Unable to retrieve bank token owner details
- `9851`: Unable to retrieve bank token owner details  
- `4769`: Invalid bank token
- `0857`: Manual token
- `4837`: Token suspended
- `9384`: Permission denied

## Merchant Management

### Onboard New Merchant
Create a new MID (Merchant ID).

**Endpoint**: `{env_url}/api/custom/onboard/merchant`

**Request Body**:
```json
{
  "client_id": "YOUR_CLIENT_ID",
  "secret": "YOUR_SECRET_KEY",
  "business_name": "Alpine Inc",
  "business_ein": "00-0000000", 
  "business_email": "xyz@xyz.com",
  "business_website": "xyz.com",
  "business_phone": "9876543210",
  "business_street_address": "210 23rd St",
  "business_city": "New York",
  "business_state": "NY", 
  "business_postal_code": "10005",
  "business_registration_state": "DE",
  "business_classification": "Ask Support",
  "business_type": "llc",
  "business_bank_name": "TD Bank",
  "business_bank_account_number": "3947597435",
  "business_bank_routing_number": "031201360",
  "controller_first_name": "Pratt",
  "controller_last_name": "Khot", 
  "controller_title": "CEO",
  "controller_ssn": "982228383",
  "controller_dob": "1998-09-01",
  "controller_street_address": "234 47th St",
  "controller_city": "New York",
  "controller_state": "NY",
  "controller_postal_code": "10005", 
  "controller_country": "US"
}
```

**Response**:
```json
{
  "cabbage_return_code": "pk1998",
  "message": "success", 
  "onboard_id": "onboard_43aad85e40dca88587da",
  "request_id": "request_99570daad85e40dca88587da"
}
```

**Return Codes**:
- `pk1998`: Onboard request successfully created
- `6274`: Something is missing in the onboard request

### Fetch MID Wallet Balance
**Endpoint**: `{env_url}/api/custom/connected_acct/wallet/balance`

**Request Body**:
```json
{
  "client_id": "YOUR_CLIENT_ID",
  "secret": "YOUR_SECRET_KEY",
  "connected_acct": "acct_b1de80d70fab4c659d67f366"
}
```

**Response**:
```json
{
  "cabbage_return_code": "pk1998",
  "message": "success",
  "balance": "3832.09",
  "last_updated": "2025-03-23T22:04:46.772Z"
}
```

**Return Codes**:
- `pk1998`: Success
- `3452`: Unable to fetch balance  
- `9384`: Permission Denied

### Fetch MID Details
**Endpoint**: `{env_url}/api/custom/connected_acct/details`

**Request Body**:
```json
{
  "client_id": "YOUR_CLIENT_ID",
  "secret": "YOUR_SECRET_KEY", 
  "connected_acct": "acct_b1de80d70fab4c659d67f366"
}
```

**Response**:
```json
{
  "cabbage_return_code": "pk1998",
  "message": "success",
  "bank_name": "TD Bank", 
  "bank_account_number_last_four": "3452"
}
```

**Return Codes**:
- `pk1998`: Success
- `9384`: Permission Denied

### Create MID Payouts
**Endpoint**: `{env_url}/api/custom/connected_acct/payout/create`

**Request Body**:
```json
{
  "client_id": "YOUR_CLIENT_ID",
  "secret": "YOUR_SECRET_KEY",
  "connected_acct": "acct_b1de80d70fab4c659d67f366", 
  "payout_amount": 647.90,
  "speed": "same_day",
  "application_fee_amount": 10.00,
  "statement_descriptor": "Payout to Merchant",
  "metadata": "Weekly payout"
}
```

**Response**:
```json
{
  "cabbage_return_code": "pk1998",
  "message": "success",
  "amount": 647.90,
  "speed": "same_day", 
  "payout_id": "payout_xy398rf59"
}
```

**Return Codes**:
- `pk1998`: Success
- `3412`: Invalid payout amount
- `3452`: Payout request invalid
- `9834`: Permission denied

### Get Connected Accounts
**Endpoint**: `{env_url}/api/custom/connect/connected_accounts`

**Request Body**:
```json
{
  "client_id": "YOUR_CLIENT_ID",
  "secret": "YOUR_SECRET_KEY"
}
```

**Response**:
```json
{
  "cabbage_return_code": "pk1998", 
  "message": "success",
  "connected_accounts": [
    "acct_1234567890",
    "acct_0987654321"
  ]
}
```

**Return Codes**:
- `pk1998`: Success
- `0039`: No connected accounts found
- `9384`: Permission denied

## Webhooks

### Overview
Fingrid sends webhooks for various events. Contact Fingrid Support to configure webhooks for your account.

### Example Webhook Payload
```json
{
  "secret": "YOUR_SECRET",
  "id": "webhook_0cb911a6e37945bf95e4c5f9",
  "resourceId": "transfer_7ed5rj95rc3a64b23b52fa41e",
  "topic": "transfer_completed", 
  "timestamp": "2023-09-12T11:06:04.1004824+00:00"
}
```

### Webhook Events
- `bank_token_created`: Bank token successfully created
- `bank_token_suspended`: Bank token suspended  
- `bank_token_expired`: Bank token expired
- `transfer_completed`: Transaction successfully settled
- `transfer_failed`: Transaction failed
- `payout_initiated`: Payout successfully created
- `payout_completed`: Payout successfully completed
- `payout_failed`: Payout failed

## Common Return Codes

### Success Codes
- `pk1998`: Success

### Error Codes
- `1769`: Transaction failed
- `1504`: Insufficient funds
- `4851`: Bank connection expired
- `5041`: Bank token expired
- `5044`: Amount must be at least $1.00
- `1599`: Invalid transaction type
- `1598`: Invalid billing type
- `9384`: Permission denied / Invalid credentials
- `0857`: Manual token
- `4837`: Token suspended
- `5748`: Invalid bank_token
- `4769`: Invalid bank token
- `6274`: Missing required fields
- `3412`: Invalid payout amount
- `3452`: Unable to fetch balance / Payout request invalid
- `9851`: Unable to retrieve live balance
- `0039`: No connected accounts found
- `9834`: Permission denied

## Integration Notes

### Transaction Types
- `charge`: Charge customer's account
- `send`: Send money to customer (refund)

### Billing Types  
- `single`: One-time transaction
- `recurring`: Recurring transaction

### Speed Options
- `next_day`: Next business day processing
- `same_day`: Same day processing (higher fees)

### Business Types
- `corporation`: Corporation
- `llc`: Limited Liability Company  
- `partnership`: Partnership

### Account Types
- `checking`: Checking account
- `savings`: Savings account

Contact Fingrid Support for additional configuration and webhook setup. 