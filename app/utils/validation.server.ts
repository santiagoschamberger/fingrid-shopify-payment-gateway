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
    testClientSecret: z.string().optional(),
    liveGatewayUrl: z.string().url().optional(),
    liveClientId: z.string().optional(),
    liveClientSecret: z.string().optional(),
    postTransactionStatus: z.string(),
    webhookSuccessStatus: z.string(),
    webhookFailedStatus: z.string()
  }),

  bankAccountData: z.object({
    token: z.string().min(1),
    bankName: z.string().min(1),
    last4: z.string().length(4),
    routingNumber: z.string().optional(),
    accountType: z.string().optional()
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