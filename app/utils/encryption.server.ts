import * as CryptoJS from 'crypto-js';

// Use environment variable or fallback to a default key (should be set in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fingrid-payment-app-default-key-32ch';
const APP_IDENTIFIER = 'fingrid-payment-app';

export function encrypt(text: string): string {
  try {
    if (!text || text.trim() === '') {
      return text; // Return empty strings as-is
    }
    
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export function decrypt(encryptedData: string): string {
  try {
    if (!encryptedData || encryptedData.trim() === '') {
      return encryptedData; // Return empty strings as-is
    }
    
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedText && encryptedData.trim() !== '') {
      console.warn('Failed to decrypt data - invalid key or corrupted data');
      return ''; // Return empty string instead of throwing
    }
    
    return decryptedText;
  } catch (error) {
    console.error('Decryption error:', error);
    return ''; // Return empty string instead of throwing
  }
}

export function hashData(data: string): string {
  return CryptoJS.SHA256(data + APP_IDENTIFIER).toString();
}