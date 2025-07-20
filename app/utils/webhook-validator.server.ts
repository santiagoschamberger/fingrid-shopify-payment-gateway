import * as CryptoJS from 'crypto-js';

export function verifyShopifyWebhook(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hash = CryptoJS.HmacSHA256(body, secret).toString(CryptoJS.enc.Base64);
    
    // Use timing-safe comparison
    return timingSafeEqual(signature, hash);
  } catch (error) {
    console.error('Error verifying Shopify webhook:', error);
    return false;
  }
}

export function verifyFingridWebhook(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Implement Fingrid-specific webhook verification
    // This will depend on Fingrid's webhook signature method
    const expectedSignature = CryptoJS.HmacSHA256(body, secret).toString(CryptoJS.enc.Hex);
    
    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    console.error('Error verifying Fingrid webhook:', error);
    return false;
  }
}

// Timing-safe string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

export function generateWebhookSignature(body: string, secret: string): string {
  return CryptoJS.HmacSHA256(body, secret).toString(CryptoJS.enc.Base64);
}