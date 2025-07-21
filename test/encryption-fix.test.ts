import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt } from '../app/utils/encryption.server';

// Set up environment variable for testing
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';

describe('Encryption Fix', () => {
  describe('encrypt function', () => {
    it('should encrypt non-empty strings successfully', () => {
      const plaintext = 'test-secret-value';
      const encrypted = encrypt(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should handle empty strings', () => {
      expect(encrypt('')).toBe('');
      expect(encrypt('   ')).toBe('   ');
    });

    it('should handle undefined/null gracefully', () => {
      // These should not throw errors
      expect(() => encrypt('')).not.toThrow();
    });
  });

  describe('decrypt function', () => {
    it('should decrypt encrypted strings successfully', () => {
      const plaintext = 'test-secret-value';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      expect(decrypt('')).toBe('');
      expect(decrypt('   ')).toBe('   ');
    });

    it('should handle invalid encrypted data gracefully', () => {
      const result = decrypt('invalid-encrypted-data');
      expect(result).toBe(''); // Should return empty string, not throw
    });
  });

  describe('round-trip encryption', () => {
    it('should successfully encrypt and decrypt various strings', () => {
      const testCases = [
        'simple-string',
        'AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg',
        'ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb',
        'special-chars-!@#$%^&*()',
        '123456789',
        'very-long-string-that-might-cause-issues-with-encryption-algorithms'
      ];

      testCases.forEach(testCase => {
        const encrypted = encrypt(testCase);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(testCase);
      });
    });
  });

  describe('error handling', () => {
    it('should not throw errors for edge cases', () => {
      expect(() => encrypt('')).not.toThrow();
      expect(() => decrypt('')).not.toThrow();
      expect(() => decrypt('invalid-data')).not.toThrow();
    });
  });
}); 