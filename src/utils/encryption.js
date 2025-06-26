import CryptoJS from 'crypto-js';

// Encrypt note content with password
export const encryptNote = (content, password) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(content, password).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt note');
  }
};

// Decrypt note content with password
export const decryptNote = (encryptedContent, password) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedContent, password);
    const originalContent = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!originalContent) {
      throw new Error('Invalid password');
    }
    
    return originalContent;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Invalid password or corrupted data');
  }
};

// Generate a secure hash for password verification
export const hashPassword = (password) => {
  return CryptoJS.SHA256(password).toString();
};

// Verify password against hash
export const verifyPassword = (password, hash) => {
  return hashPassword(password) === hash;
};