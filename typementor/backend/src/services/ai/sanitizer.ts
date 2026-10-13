/**
 * Security and privacy utilities for the AI service.
 * Ensures secrets, authorization headers, and raw PII are never leaked in logs or error traces,
 * and user-supplied strings are neutralized against prompt injection.
 */

// Regex patterns to match common sensitive tokens
const SENSITIVE_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/g, // Google Gemini API Key pattern
  /sk-[a-zA-Z0-9_-]{20,}/g, // OpenAI API Key pattern
  /bearer\s+[a-zA-Z0-9._-]+/gi, // Bearer tokens
  /key=[a-zA-Z0-9_-]+/gi, // Query parameter API keys
  /token=[a-zA-Z0-9_-]+/gi, // Query parameter tokens
];

/**
 * Scrubs API keys, bearer tokens, and secrets from strings, error messages, or URLs.
 */
export function scrubSecrets(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let cleaned = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[REDACTED_SECRET]');
  }
  return cleaned;
}

/**
 * Sanitizes user-provided text (such as user names) so it cannot inject instructions into prompts.
 * Strips control characters, backticks, XML-like delimiters, and limits length.
 */
export function sanitizeUntrustedText(text: string | undefined | null, maxLength = 60): string {
  if (!text || typeof text !== 'string') return 'Typist';

  // Remove potential prompt injection delimiters, control characters, and newlines
  const sanitized = text
    .replace(/[<>`"'\\]/g, '') // remove quote and angle bracket delimiters
    .replace(/[\r\n\t]+/g, ' ') // collapse newlines to single space
    .trim()
    .slice(0, maxLength);

  return sanitized.length > 0 ? sanitized : 'Typist';
}

/**
 * Safe logger for AI pipeline observability without leaking secrets or raw prompts.
 */
export const aiLogger = {
  info: (message: string, context?: Record<string, unknown>): void => {
    const safeContext = context ? scrubContext(context) : undefined;
    console.log(`[AI Coach INFO] ${scrubSecrets(message)}`, safeContext ? JSON.stringify(safeContext) : '');
  },
  warn: (message: string, context?: Record<string, unknown>): void => {
    const safeContext = context ? scrubContext(context) : undefined;
    console.warn(`[AI Coach WARN] ${scrubSecrets(message)}`, safeContext ? JSON.stringify(safeContext) : '');
  },
  error: (message: string, err?: unknown): void => {
    const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error(`[AI Coach ERROR] ${scrubSecrets(message)}: ${scrubSecrets(errMsg)}`);
  },
};

function scrubContext(ctx: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(ctx)) {
    if (typeof val === 'string') {
      clean[key] = scrubSecrets(val);
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = '[OBJECT]';
    } else {
      clean[key] = val;
    }
  }
  return clean;
}
