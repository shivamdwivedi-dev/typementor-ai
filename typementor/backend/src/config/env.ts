import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'typementor_secret_key_12345';
export const ADMIN_SECRET = process.env.ADMIN_SECRET || 'typementor_feedback_secret_key_2026';

const adminEmailsRaw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'shivamdwivedi.dev@gmail.com';
export const ADMIN_EMAILS = adminEmailsRaw
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  SECURITY WARNING: JWT_SECRET environment variable is missing in production!');
  }
  if (!process.env.ADMIN_SECRET) {
    console.warn('⚠️  SECURITY WARNING: ADMIN_SECRET environment variable is missing in production!');
  }
}
