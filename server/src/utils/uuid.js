import { randomUUID } from 'crypto';

export function bufferToUuid(buf) {
  if (buf == null) return null;
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  if (b.length !== 16) {
    return b.toString('hex');
  }
  const hex = b.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function uuidToBuffer(uuidStr) {
  const hex = String(uuidStr).replace(/-/g, '');
  if (hex.length !== 32) {
    throw new Error('Invalid UUID');
  }
  return Buffer.from(hex, 'hex');
}

export function newUuidString() {
  return randomUUID();
}
