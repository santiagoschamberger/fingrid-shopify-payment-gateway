// Data structure interfaces for Fingrid payment integration

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

// Fingrid API Request/Response Types
export interface LinkTokenRequest {
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

export interface LinkTokenResponse {
  link_token: string;
  expiration: string;
}

export interface PublicTokenRequest {
  client_id: string;
  secret: string;
  public_token: string;
}

export interface PublicTokenResponse {
  bank_token: string;
  bank_name: string;
  bank_account_last_four: string;
  account_type: string;
  routing_number: string;
}

export interface PaymentRequest {
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

export interface PaymentResponse {
  cabbage_return_code: string;
  transaction_id: string;
  message: string;
  status: string;
  final_charged_amount: number;
}

export interface FingridErrorResponse {
  cabbage_return_code: string;
  message: string;
  details?: string;
}

export const ERROR_CODES = {
  'pk1998': 'Success',
  '0001': 'Invalid credentials',
  '0002': 'Insufficient funds',
  '0003': 'Account not found',
  '0004': 'Transaction limit exceeded',
  '0005': 'Invalid bank token',
  '0294': 'Transaction already processed',
} as const;

export class FingridApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: string
  ) {
    super(`Fingrid API Error ${code}: ${message}`);
  }
}