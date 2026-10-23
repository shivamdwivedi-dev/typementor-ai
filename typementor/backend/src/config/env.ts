import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'typementor_secret_key_12345';
export const ADMIN_SECRET = process.env.ADMIN_SECRET || 'typementor_feedback_secret_key_2026';

const DEFAULT_PERMANENT_ADMINS = [
  'shivamdwivedi.dev@gmail.com',
  'shivamdwivedi280708@gmail.com',
  'shivamdwivedi2807@gmail.com',
  'shivamdwivedi2807082@gmail.com',
];

const adminEmailsRaw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '';
const configuredEmails = adminEmailsRaw
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_EMAILS = Array.from(new Set([...DEFAULT_PERMANENT_ADMINS, ...configuredEmails]));

export const AI_PROVIDER = (process.env.AI_PROVIDER || '').trim().toLowerCase();
export const AI_MODEL = process.env.AI_MODEL || '';
export const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '10000', 10) || 10000;
export const AI_MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES || '2', 10) || 2;

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  SECURITY WARNING: JWT_SECRET environment variable is missing in production!');
  }
  if (!process.env.ADMIN_SECRET) {
    console.warn('⚠️  SECURITY WARNING: ADMIN_SECRET environment variable is missing in production!');
  }
  if (AI_PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
    console.warn('⚠️  AI CONFIG WARNING: AI_PROVIDER=gemini set in production but GEMINI_API_KEY is not configured! Will fall back to local rule coach.');
  }
  if (AI_PROVIDER === 'openai' && !process.env.OPENAI_API_KEY) {
    console.warn('⚠️  AI CONFIG WARNING: AI_PROVIDER=openai set in production but OPENAI_API_KEY is not configured! Will fall back to local rule coach.');
  }
}
