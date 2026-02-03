import crypto from 'crypto';

const PEPPER = process.env.TEACHER_SERIAL_PEPPER || 'VPR_Music_Center_2024_Secure_Pepper';

export async function hashCode(code) {
  const data = Buffer.from(code.toUpperCase() + PEPPER, 'utf-8');
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function generateSerial(prefix = 'TCH', segments = 3, segmentLength = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let serial = prefix + '-';
  for (let g = 0; g < segments; g++) {
    if (g > 0) serial += '-';
    for (let i = 0; i < segmentLength; i++) {
      serial += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return serial;
}
