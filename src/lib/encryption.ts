import crypto from 'crypto';
import fs from 'fs';

const ALGORITHM = 'aes-256-gcm';
// In a real production app, this should be in .env. 
// We generate a deterministic one here for demo purposes if not provided.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') 
  : crypto.scryptSync('DataArchitectSecret123!', 'salt', 32);

export function encryptBuffer(buffer: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Format: IV (12 bytes) + AuthTag (16 bytes) + Encrypted Data
  return Buffer.concat([iv, authTag, encrypted]);
}

export function decryptBuffer(buffer: Buffer): Buffer {
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function encryptFile(sourcePath: string, destPath: string) {
  const data = fs.readFileSync(sourcePath);
  const encrypted = encryptBuffer(data);
  fs.writeFileSync(destPath, encrypted);
}

export function decryptFile(sourcePath: string, destPath: string) {
  const data = fs.readFileSync(sourcePath);
  const decrypted = decryptBuffer(data);
  fs.writeFileSync(destPath, decrypted);
}
