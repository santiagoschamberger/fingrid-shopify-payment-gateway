import * as CryptoJS from 'crypto-js';

// Use environment variable or fallback to a default key (should be set in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fingrid-payment-app-default-key-32ch';
const APP_IDENTIFIER = 'fingrid-payment-app';

export function isEncrypted(data: string): boolean {
  if (!data || data.length < 20) return false;
  
  // Check if it looks like base64 encrypted data (typical CryptoJS output)
  // CryptoJS AES encryption typically produces base64 strings with specific patterns
  const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
  return base64Pattern.test(data) && data.length > 40;
}

export function encrypt(text: string): string {
  try {
    if (!text || text.trim() === '') {
      return text; // Return empty strings as-is
    }
    
    // Don't encrypt if already encrypted
    if (isEncrypted(text)) {
      console.log('Data appears to already be encrypted, skipping encryption');
      return text;
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
    
    // If data doesn't look encrypted, return as-is
    if (!isEncrypted(encryptedData)) {
      console.log('Data does not appear to be encrypted, returning as-is');
      return encryptedData;
    }
    
    // Check if the encrypted data looks valid
    if (typeof encryptedData !== 'string' || encryptedData.length < 10) {
      console.warn('Invalid encrypted data format, returning empty string');
      return '';
    }
    
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Check if decryption was successful
    if (!decrypted) {
      console.warn('Decryption returned undefined, returning empty string');
      return '';
    }
    
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