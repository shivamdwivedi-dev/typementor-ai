import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    challenge: {
      findMany: vi.fn(),
    },
    userChallengeProgress: {
      upsert: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock('../app', () => ({
  prisma: mockPrisma,
  authLimiter: (_req: any, _res: any, next: any) => next(),
}));

import { emailOtpService } from '../services/email-otp.service';
import { emailService } from '../services/email.service';
import {
  register,
  verifyOtp,
  resendOtp,
  forgotPassword,
  verifyResetOtp,
  resendResetOtp,
  resetPassword,
} from '../controllers/auth.controller';

function createMockRes() {
  const res: any = { statusCode: 200, body: null };
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((payload: any) => {
    res.body = payload;
    return res;
  });
  return res;
}

describe('Email OTP Service & Registration Hardening Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emailOtpService.clearAll();
    mockPrisma.challenge.findMany.mockResolvedValue([]);
  });

  describe('Disposable Email Protection', () => {
    it('detects and blocks known disposable email domains', () => {
      expect(emailOtpService.isDisposableEmail('burner@mailinator.com')).toBe(true);
      expect(emailOtpService.isDisposableEmail('test@tempmail.com')).toBe(true);
      expect(emailOtpService.isDisposableEmail('user@10minutemail.com')).toBe(true);
      expect(emailOtpService.isDisposableEmail('anon@subdomain.mailinator.com')).toBe(true);
      expect(emailOtpService.isDisposableEmail('spam@yopmail.com')).toBe(true);
    });

    it('permits legitimate email domains', () => {
      expect(emailOtpService.isDisposableEmail('john.doe@gmail.com')).toBe(false);
      expect(emailOtpService.isDisposableEmail('developer@outlook.com')).toBe(false);
      expect(emailOtpService.isDisposableEmail('shivam@typementor.ai')).toBe(false);
      expect(emailOtpService.isDisposableEmail('student@mit.edu')).toBe(false);
    });
  });

  describe('Pending Registration & Verification Life-cycle', () => {
    it('creates pending registration with 6-digit code and stages HMAC-protected entry', () => {
      const { code, resendCooldownSeconds } = emailOtpService.createPendingRegistration(
        'alice@example.com',
        'Alice Smith',
        'hashed_pw_123'
      );

      expect(code).toMatch(/^\d{6}$/);
      expect(resendCooldownSeconds).toBe(60);

      const pending = emailOtpService.getPending('alice@example.com');
      expect(pending).toBeDefined();
      expect(pending?.email).toBe('alice@example.com');
      expect(pending?.name).toBe('Alice Smith');
      expect(pending?.attemptsRemaining).toBe(5);
    });

    it('rejects invalid code format', () => {
      emailOtpService.createPendingRegistration('alice@example.com', 'Alice', 'hashed_pw');
      const result = emailOtpService.verifyOtp('alice@example.com', '123');
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be exactly 6 digits');
    });

    it('decrements attempts on wrong code and terminates after 5 failures', () => {
      emailOtpService.createPendingRegistration('alice@example.com', 'Alice', 'hashed_pw');

      for (let i = 1; i <= 4; i++) {
        const result = emailOtpService.verifyOtp('alice@example.com', '000000');
        expect(result.success).toBe(false);
        expect(result.error).toContain(`${5 - i} attempt(s) remaining`);
      }

      // 5th failed attempt should terminate session
      const fifthResult = emailOtpService.verifyOtp('alice@example.com', '000000');
      expect(fifthResult.success).toBe(false);
      expect(fifthResult.error).toContain('Too many incorrect attempts');

      // Entry should now be removed
      expect(emailOtpService.getPending('alice@example.com')).toBeUndefined();
    });

    it('successfully validates correct code and returns stored credentials', () => {
      const { code } = emailOtpService.createPendingRegistration(
        'alice@example.com',
        'Alice',
        'hashed_pw'
      );

      const result = emailOtpService.verifyOtp('alice@example.com', code);
      expect(result.success).toBe(true);
      expect(result.registration?.email).toBe('alice@example.com');
      expect(result.registration?.name).toBe('Alice');
      expect(result.registration?.passwordHash).toBe('hashed_pw');

      // Cleans up after success
      expect(emailOtpService.getPending('alice@example.com')).toBeUndefined();
    });

    it('enforces 60-second cooldown on resend attempts', () => {
      emailOtpService.createPendingRegistration('alice@example.com', 'Alice', 'hashed_pw');

      // Immediate resend should be blocked by cooldown
      const firstResend = emailOtpService.resendOtp('alice@example.com');
      expect(firstResend.success).toBe(false);
      expect(firstResend.error).toContain('Please wait');
      expect(firstResend.resendCooldownSeconds).toBeGreaterThan(0);
    });
  });

  describe('Email Service Fallback', () => {
    it('uses dev console fallback when SMTP credentials are not configured', async () => {
      const isConfiguredSpy = vi.spyOn(emailService, 'isConfigured').mockReturnValue(false);
      const result = await emailService.sendOtpEmail('tester@example.com', '654321', 'Tester');
      expect(result.delivered).toBe(true);
      expect(result.devMode).toBe(true);
      isConfiguredSpy.mockRestore();
    });
  });

  describe('Auth Controller End-to-End Registration Flow', () => {
    beforeEach(() => {
      vi.spyOn(emailService, 'sendOtpEmail').mockResolvedValue({ delivered: true, devMode: false });
    });
    it('rejects registration with disposable email address', async () => {
      const req: any = {
        body: {
          email: 'bot@mailinator.com',
          password: 'Password123!',
          name: 'Botty',
        },
      };
      const res = createMockRes();

      await register(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Temporary or disposable email services are not permitted');
    });

    it('rejects registration if email already exists in database', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id', email: 'alice@example.com' });

      const req: any = {
        body: {
          email: 'alice@example.com',
          password: 'Password123!',
          name: 'Alice',
        },
      };
      const res = createMockRes();

      await register(req, res);
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('successfully initiates registration and returns OTP_REQUIRED', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const req: any = {
        body: {
          email: 'newuser@example.com',
          password: 'Password123!',
          name: 'New User',
        },
      };
      const res = createMockRes();

      await register(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('OTP_REQUIRED');
      expect(res.body.email).toBe('newuser@example.com');
      expect(res.body.resendCooldownSeconds).toBe(60);

      // Verify pending entry exists
      const pending = emailOtpService.getPending('newuser@example.com');
      expect(pending).toBeDefined();
    });

    it('completes registration when verifyOtp is called with correct code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Step 1: Stage user
      const { code } = emailOtpService.createPendingRegistration(
        'verified@example.com',
        'Verified User',
        'hashed_secret_pw'
      );

      // Step 2: Call verifyOtp
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-uuid',
        email: 'verified@example.com',
        name: 'Verified User',
        level: 1,
        xp: 0,
        streak: 0,
        longestStreak: 0,
        lastActiveAt: new Date(0),
        totalCharacters: 0,
        lifetimeWpm: 0,
        lifetimeAccuracy: 0,
        practiceHours: 0,
        academyProgress: null,
        arenaPoints: 100,
      });

      const req: any = {
        body: {
          email: 'verified@example.com',
          code,
        },
      };
      const res = createMockRes();

      await verifyOtp(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('verified@example.com');
      expect(res.body.user.arenaPoints).toBe(100);
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('rejects verifyOtp with invalid 6-digit code', async () => {
      emailOtpService.createPendingRegistration(
        'verified@example.com',
        'Verified User',
        'hashed_secret_pw'
      );

      const req: any = {
        body: {
          email: 'verified@example.com',
          code: '999999',
        },
      };
      const res = createMockRes();

      await verifyOtp(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Incorrect verification code');
    });

    it('rejects resendOtp when within 60s cooldown', async () => {
      emailOtpService.createPendingRegistration(
        'verified@example.com',
        'Verified User',
        'hashed_secret_pw'
      );

      const req: any = {
        body: {
          email: 'verified@example.com',
        },
      };
      const res = createMockRes();

      await resendOtp(req, res);
      expect(res.statusCode).toBe(429);
      expect(res.body.error).toContain('Please wait');
    });
  });

  describe('Password Reset Life-cycle Suite', () => {
    it('creates password reset request and generates 6-digit OTP code', () => {
      const { code, resendCooldownSeconds } = emailOtpService.createPasswordResetRequest(
        'user@example.com',
        'John'
      );

      expect(code).toMatch(/^\d{6}$/);
      expect(resendCooldownSeconds).toBe(60);

      const pending = emailOtpService.getPendingPasswordReset('user@example.com');
      expect(pending).toBeDefined();
      expect(pending?.email).toBe('user@example.com');
      expect(pending?.attemptsRemaining).toBe(5);
    });

    it('verifies valid reset code and issues 15-minute JWT reset token', () => {
      const { code } = emailOtpService.createPasswordResetRequest('user@example.com', 'John');

      const result = emailOtpService.verifyPasswordResetOtp('user@example.com', code);
      expect(result.success).toBe(true);
      expect(result.resetToken).toBeDefined();
      expect(typeof result.resetToken).toBe('string');

      // OTP should be consumed
      expect(emailOtpService.getPendingPasswordReset('user@example.com')).toBeUndefined();

      // Token verification succeeds
      const isValid = emailOtpService.verifyResetToken('user@example.com', result.resetToken!);
      expect(isValid).toBe(true);

      // Wrong email fails verification
      const isWrongEmail = emailOtpService.verifyResetToken('other@example.com', result.resetToken!);
      expect(isWrongEmail).toBe(false);
    });

    it('forgotPassword controller sends reset email when user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'John Doe',
      });
      vi.spyOn(emailService, 'sendPasswordResetEmail').mockResolvedValue({
        delivered: true,
        devMode: true,
      });

      const req: any = { body: { email: 'user@example.com' } };
      const res = createMockRes();

      await forgotPassword(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('OTP_SENT');
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String),
        'John Doe'
      );
    });

    it('forgotPassword controller returns generic success if user does not exist (enumeration protection)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const req: any = { body: { email: 'nonexistent@example.com' } };
      const res = createMockRes();

      await forgotPassword(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('OTP_SENT');
    });

    it('completes full end-to-end reset password flow', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'resetme@example.com',
        name: 'Reset Typist',
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-123',
        email: 'resetme@example.com',
      });

      // 1. Stage reset request
      const { code } = emailOtpService.createPasswordResetRequest('resetme@example.com', 'Reset Typist');

      // 2. Verify OTP via controller
      const verifyReq: any = {
        body: {
          email: 'resetme@example.com',
          code,
        },
      };
      const verifyRes = createMockRes();
      await verifyResetOtp(verifyReq, verifyRes);

      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.resetToken).toBeDefined();

      const { resetToken } = verifyRes.body;

      // 3. Update password with resetToken
      const resetReq: any = {
        body: {
          email: 'resetme@example.com',
          resetToken,
          newPassword: 'BrandNewSecurePassword2026!',
        },
      };
      const resetRes = createMockRes();
      await resetPassword(resetReq, resetRes);

      expect(resetRes.statusCode).toBe(200);
      expect(resetRes.body.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'resetme@example.com' },
          data: expect.objectContaining({
            passwordHash: expect.any(String),
          }),
        })
      );
    });

    it('rejects password update if new password is too short', async () => {
      const req: any = {
        body: {
          email: 'resetme@example.com',
          resetToken: 'some_token',
          newPassword: 'short',
        },
      };
      const res = createMockRes();

      await resetPassword(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('at least 8 characters');
    });

    it('rejects password update if resetToken is invalid or tampered', async () => {
      const req: any = {
        body: {
          email: 'resetme@example.com',
          resetToken: 'invalid.tampered.token',
          newPassword: 'ValidPassword123!',
        },
      };
      const res = createMockRes();

      await resetPassword(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Invalid or expired password reset session');
    });
  });
});
