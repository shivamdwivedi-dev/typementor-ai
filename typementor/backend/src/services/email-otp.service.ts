import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';

export interface PendingRegistration {
  email: string;
  name: string;
  passwordHash: string;
  otpHash: string;
  expiresAt: number;
  resendAvailableAt: number;
  attemptsRemaining: number;
  createdAt: number;
}

export interface PendingPasswordReset {
  email: string;
  name: string;
  otpHash: string;
  expiresAt: number;
  resendAvailableAt: number;
  attemptsRemaining: number;
  createdAt: number;
}

export interface VerifyOtpResult {
  success: boolean;
  error?: string;
  registration?: {
    email: string;
    name: string;
    passwordHash: string;
  };
}

export interface VerifyPasswordResetResult {
  success: boolean;
  error?: string;
  resetToken?: string;
}

export interface ResendOtpResult {
  success: boolean;
  error?: string;
  code?: string;
  resendCooldownSeconds?: number;
}

// Common disposable / burner email provider domains
const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'dispostable.com',
  'yopmail.com',
  'fakeinbox.com',
  'throwawaymail.com',
  'temp-mail.org',
  'generator.email',
  'mohmal.com',
  'burnermail.io',
  'nada.ltd',
  'inboxkitten.com',
  'crazymailing.com',
  'trashmail.net',
  'tempinbox.com',
  'mytemp.email',
  'emailondeck.com',
  'minuteinbox.com',
  'fakemailgenerator.com',
  'throwaway.email',
  'disposablemail.com',
  'trashmail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'spam4.me',
  'grr.la',
  'maildrop.cc',
  'tempmailaddress.com',
  'guerrillamailblock.com',
  'pokemail.net',
  'dropmail.me',
  'disposable.com',
  'trash-mail.com',
]);

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_PENDING_REGISTRATIONS = 10000;

export class EmailOtpService {
  private pending = new Map<string, PendingRegistration>();
  private pendingPasswordResets = new Map<string, PendingPasswordReset>();

  /**
   * Checks whether the given email belongs to a known disposable or burner domain.
   */
  public isDisposableEmail(email: string): boolean {
    if (!email || !email.includes('@')) return false;
    const domain = email.trim().toLowerCase().split('@')[1];
    if (!domain) return false;

    // Check exact domain and subdomains (e.g. sub.mailinator.com)
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
    for (const disposable of DISPOSABLE_EMAIL_DOMAINS) {
      if (domain.endsWith('.' + disposable)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generates a cryptographically strong 6-digit numeric OTP string (100000 - 999999).
   */
  public generateCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Produces a secure HMAC-SHA256 signature of the OTP code tied to the specific email.
   */
  private hashOtp(email: string, code: string): string {
    return crypto
      .createHmac('sha256', JWT_SECRET || 'typementor_otp_salt_fallback')
      .update(`${email.trim().toLowerCase()}:${code.trim()}`)
      .digest('hex');
  }

  /**
   * Memory housekeeping: evicts expired entries if cache reaches capacity.
   */
  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.pending.entries()) {
      if (entry.expiresAt <= now) {
        this.pending.delete(key);
      }
    }
    for (const [key, entry] of this.pendingPasswordResets.entries()) {
      if (entry.expiresAt <= now) {
        this.pendingPasswordResets.delete(key);
      }
    }

    if (this.pending.size >= MAX_PENDING_REGISTRATIONS) {
      // Force prune oldest 20%
      const keys = Array.from(this.pending.keys()).slice(0, Math.floor(MAX_PENDING_REGISTRATIONS * 0.2));
      for (const k of keys) {
        this.pending.delete(k);
      }
    }
    if (this.pendingPasswordResets.size >= MAX_PENDING_REGISTRATIONS) {
      const keys = Array.from(this.pendingPasswordResets.keys()).slice(0, Math.floor(MAX_PENDING_REGISTRATIONS * 0.2));
      for (const k of keys) {
        this.pendingPasswordResets.delete(k);
      }
    }
  }

  /**
   * Stores a new pending registration and returns the generated 6-digit code.
   */
  public createPendingRegistration(
    email: string,
    name: string,
    passwordHash: string
  ): { code: string; resendCooldownSeconds: number } {
    this.pruneExpired();

    const normalizedEmail = email.trim().toLowerCase();
    const code = this.generateCode();
    const otpHash = this.hashOtp(normalizedEmail, code);
    const now = Date.now();

    const record: PendingRegistration = {
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      otpHash,
      expiresAt: now + OTP_TTL_MS,
      resendAvailableAt: now + RESEND_COOLDOWN_MS,
      attemptsRemaining: MAX_VERIFY_ATTEMPTS,
      createdAt: now,
    };

    this.pending.set(normalizedEmail, record);

    return {
      code,
      resendCooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    };
  }

  /**
   * Validates a submitted 6-digit OTP code against pending registration.
   */
  public verifyOtp(email: string, submittedCode: string): VerifyOtpResult {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const cleanCode = (submittedCode || '').trim();

    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return { success: false, error: 'Verification code must be exactly 6 digits.' };
    }

    const entry = this.pending.get(normalizedEmail);
    if (!entry) {
      return {
        success: false,
        error: 'No pending registration found for this email, or the code has expired. Please sign up again.',
      };
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.pending.delete(normalizedEmail);
      return {
        success: false,
        error: 'Verification code has expired. Please request a new code or sign up again.',
      };
    }

    if (entry.attemptsRemaining <= 0) {
      this.pending.delete(normalizedEmail);
      return {
        success: false,
        error: 'Too many incorrect attempts. Please restart registration.',
      };
    }

    const submittedHash = this.hashOtp(normalizedEmail, cleanCode);
    const expectedBuffer = Buffer.from(entry.otpHash, 'hex');
    const submittedBuffer = Buffer.from(submittedHash, 'hex');

    // Constant-time comparison to prevent timing side-channel attacks
    const isMatch =
      expectedBuffer.length === submittedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, submittedBuffer);

    if (!isMatch) {
      entry.attemptsRemaining -= 1;
      if (entry.attemptsRemaining <= 0) {
        this.pending.delete(normalizedEmail);
        return {
          success: false,
          error: 'Too many incorrect attempts. This verification session has been terminated.',
        };
      }
      return {
        success: false,
        error: `Incorrect verification code. ${entry.attemptsRemaining} attempt(s) remaining.`,
      };
    }

    // Success! Return user data and clear pending entry
    const registration = {
      email: entry.email,
      name: entry.name,
      passwordHash: entry.passwordHash,
    };

    this.pending.delete(normalizedEmail);

    return {
      success: true,
      registration,
    };
  }

  /**
   * Resends a fresh 6-digit OTP code if cooldown has elapsed.
   */
  public resendOtp(email: string): ResendOtpResult {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const entry = this.pending.get(normalizedEmail);

    if (!entry) {
      return {
        success: false,
        error: 'No pending registration found for this email. Please sign up again.',
      };
    }

    const now = Date.now();
    if (now < entry.resendAvailableAt) {
      const waitSeconds = Math.ceil((entry.resendAvailableAt - now) / 1000);
      return {
        success: false,
        error: `Please wait ${waitSeconds} second(s) before requesting another code.`,
        resendCooldownSeconds: waitSeconds,
      };
    }

    // Generate new code and reset cooldown
    const newCode = this.generateCode();
    entry.otpHash = this.hashOtp(normalizedEmail, newCode);
    entry.expiresAt = now + OTP_TTL_MS;
    entry.resendAvailableAt = now + RESEND_COOLDOWN_MS;
    entry.attemptsRemaining = MAX_VERIFY_ATTEMPTS;

    return {
      success: true,
      code: newCode,
      resendCooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    };
  }

  public getPending(email: string): PendingRegistration | undefined {
    return this.pending.get((email || '').trim().toLowerCase());
  }

  public clearPending(email: string): void {
    this.pending.delete((email || '').trim().toLowerCase());
  }

  /**
   * Initiates a password reset session for an existing user.
   */
  public createPasswordResetRequest(
    email: string,
    name: string
  ): { code: string; resendCooldownSeconds: number } {
    this.pruneExpired();

    const normalizedEmail = email.trim().toLowerCase();
    const code = this.generateCode();
    const otpHash = this.hashOtp(normalizedEmail, code);
    const now = Date.now();

    const record: PendingPasswordReset = {
      email: normalizedEmail,
      name: name.trim(),
      otpHash,
      expiresAt: now + OTP_TTL_MS,
      resendAvailableAt: now + RESEND_COOLDOWN_MS,
      attemptsRemaining: MAX_VERIFY_ATTEMPTS,
      createdAt: now,
    };

    this.pendingPasswordResets.set(normalizedEmail, record);

    return {
      code,
      resendCooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    };
  }

  /**
   * Verifies the 6-digit OTP code for a password reset request.
   * On success, generates a signed 15-minute JWT resetToken.
   */
  public verifyPasswordResetOtp(email: string, submittedCode: string): VerifyPasswordResetResult {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const cleanCode = (submittedCode || '').trim();

    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return { success: false, error: 'Verification code must be exactly 6 digits.' };
    }

    const entry = this.pendingPasswordResets.get(normalizedEmail);
    if (!entry) {
      return {
        success: false,
        error: 'No active password reset request found for this email, or the code has expired.',
      };
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.pendingPasswordResets.delete(normalizedEmail);
      return {
        success: false,
        error: 'Verification code has expired. Please request a new password reset code.',
      };
    }

    if (entry.attemptsRemaining <= 0) {
      this.pendingPasswordResets.delete(normalizedEmail);
      return {
        success: false,
        error: 'Too many incorrect attempts. Please request a new reset code.',
      };
    }

    const submittedHash = this.hashOtp(normalizedEmail, cleanCode);
    const expectedBuffer = Buffer.from(entry.otpHash, 'hex');
    const submittedBuffer = Buffer.from(submittedHash, 'hex');

    const isMatch =
      expectedBuffer.length === submittedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, submittedBuffer);

    if (!isMatch) {
      entry.attemptsRemaining -= 1;
      if (entry.attemptsRemaining <= 0) {
        this.pendingPasswordResets.delete(normalizedEmail);
        return {
          success: false,
          error: 'Too many incorrect attempts. This password reset session has been terminated.',
        };
      }
      return {
        success: false,
        error: `Incorrect verification code. ${entry.attemptsRemaining} attempt(s) remaining.`,
      };
    }

    // Success! Consume OTP entry so it cannot be re-used, and issue a cryptographic 15-minute reset token
    this.pendingPasswordResets.delete(normalizedEmail);

    const resetToken = jwt.sign(
      { email: normalizedEmail, purpose: 'PASSWORD_RESET' },
      JWT_SECRET || 'typementor_otp_salt_fallback',
      { expiresIn: '15m' }
    );

    return {
      success: true,
      resetToken,
    };
  }

  /**
   * Cryptographically verifies the reset token provided during the final password update step.
   */
  public verifyResetToken(email: string, resetToken: string): boolean {
    if (!email || !resetToken) return false;
    try {
      const decoded = jwt.verify(
        resetToken,
        JWT_SECRET || 'typementor_otp_salt_fallback'
      ) as { email?: string; purpose?: string };

      return (
        decoded &&
        decoded.purpose === 'PASSWORD_RESET' &&
        decoded.email?.toLowerCase() === email.trim().toLowerCase()
      );
    } catch {
      return false;
    }
  }

  /**
   * Resends a fresh password reset OTP code if cooldown has elapsed.
   */
  public resendPasswordResetOtp(email: string): ResendOtpResult {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const entry = this.pendingPasswordResets.get(normalizedEmail);

    if (!entry) {
      return {
        success: false,
        error: 'No active password reset request found for this email. Please request a new reset.',
      };
    }

    const now = Date.now();
    if (now < entry.resendAvailableAt) {
      const waitSeconds = Math.ceil((entry.resendAvailableAt - now) / 1000);
      return {
        success: false,
        error: `Please wait ${waitSeconds} second(s) before requesting another code.`,
        resendCooldownSeconds: waitSeconds,
      };
    }

    const newCode = this.generateCode();
    entry.otpHash = this.hashOtp(normalizedEmail, newCode);
    entry.expiresAt = now + OTP_TTL_MS;
    entry.resendAvailableAt = now + RESEND_COOLDOWN_MS;
    entry.attemptsRemaining = MAX_VERIFY_ATTEMPTS;

    return {
      success: true,
      code: newCode,
      resendCooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    };
  }

  public getPendingPasswordReset(email: string): PendingPasswordReset | undefined {
    return this.pendingPasswordResets.get((email || '').trim().toLowerCase());
  }

  public clearPasswordReset(email: string): void {
    this.pendingPasswordResets.delete((email || '').trim().toLowerCase());
  }

  public clearAll(): void {
    this.pending.clear();
    this.pendingPasswordResets.clear();
  }
}

export const emailOtpService = new EmailOtpService();
