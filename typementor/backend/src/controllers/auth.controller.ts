import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Challenge } from '@prisma/client';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth.middleware';
import { getStreakOnLogin, resolveStreakTransition, getLevelFromCumulativeXp } from '../services/gamification.service';
import { profileCache, invalidateUserCaches } from '../utils/cache';
import { emailService } from '../services/email.service';
import { emailOtpService } from '../services/email-otp.service';

import { JWT_SECRET } from '../config/env';

/**
 * Initiates user registration by verifying email format, ensuring uniqueness,
 * filtering disposable emails, and sending a secure 6-digit OTP to the email address.
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    // Block disposable / temporary emails to prevent database pollution & bot registrations
    if (emailOtpService.isDisposableEmail(normalizedEmail)) {
      return res.status(400).json({
        error: 'Temporary or disposable email services are not permitted. Please register with a permanent email address.',
      });
    }

    // Validate name length
    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    // Pre-hash password before staging in memory
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Staging registration in secure memory with HMAC-hashed OTP
    const { code, resendCooldownSeconds } = emailOtpService.createPendingRegistration(
      normalizedEmail,
      name.trim(),
      passwordHash
    );

    // Send OTP email
    const emailResult = await emailService.sendOtpEmail(normalizedEmail, code, name.trim());
    if (!emailResult.delivered) {
      emailOtpService.clearPending(normalizedEmail);
      return res.status(503).json({
        error: emailResult.error
          ? `Failed to deliver verification email: ${emailResult.error}`
          : 'Failed to deliver verification email. Please check your email address or try again shortly.',
      });
    }

    return res.status(200).json({
      status: 'OTP_REQUIRED',
      message: 'A 6-digit verification code has been sent to your email address.',
      email: normalizedEmail,
      resendCooldownSeconds,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Registration error:', message, error);
    return res.status(500).json({ error: 'Failed to process registration. Please try again shortly.' });
  }
};

/**
 * Completes registration by verifying the submitted 6-digit OTP.
 * On success, creates the User record, seeds active challenges, and returns a 7-day JWT.
 */
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    const result = emailOtpService.verifyOtp(normalizedEmail, String(code));

    if (!result.success || !result.registration) {
      return res.status(400).json({ error: result.error || 'Invalid or expired verification code.' });
    }

    // Double-check if user was created concurrently
    const existingUser = await prisma.user.findUnique({
      where: { email: result.registration.email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        email: result.registration.email,
        passwordHash: result.registration.passwordHash,
        name: result.registration.name,
        streak: 0,
        lastActiveAt: new Date(0),
        arenaPoints: 100,
      },
    });

    // Create initial challenge progress entries (non-blocking)
    try {
      const activeChallenges = await prisma.challenge.findMany({
        where: { expiresAt: { gt: new Date() } },
      });

      if (activeChallenges.length > 0) {
        await prisma.userChallengeProgress.createMany({
          data: activeChallenges.map((ch: Challenge) => ({
            userId: newUser.id,
            challengeId: ch.id,
            currentValue: 0,
            isCompleted: false,
          })),
          skipDuplicates: true,
        });
      }
    } catch (chErr) {
      console.warn('[Verify OTP] Challenge seed error:', chErr);
    }

    // Sign token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        level: newUser.level,
        xp: newUser.xp,
        streak: newUser.streak,
        longestStreak: newUser.longestStreak,
        lastActiveAt: newUser.lastActiveAt,
        totalCharacters: newUser.totalCharacters,
        lifetimeWpm: newUser.lifetimeWpm,
        lifetimeAccuracy: newUser.lifetimeAccuracy,
        practiceHours: newUser.practiceHours,
        academyProgress: newUser.academyProgress,
        arenaPoints: newUser.arenaPoints,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Verify OTP error:', message, error);
    return res.status(500).json({ error: 'Failed to verify account. Please try again.' });
  }
};

/**
 * Resends a fresh 6-digit OTP code to the staged user if cooldown has elapsed.
 */
export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    const result = emailOtpService.resendOtp(normalizedEmail);

    if (!result.success || !result.code) {
      const statusCode = result.resendCooldownSeconds ? 429 : 400;
      return res.status(statusCode).json({
        error: result.error || 'Could not resend verification code.',
        resendCooldownSeconds: result.resendCooldownSeconds,
      });
    }

    const pending = emailOtpService.getPending(normalizedEmail);
    const emailResult = await emailService.sendOtpEmail(
      normalizedEmail,
      result.code,
      pending?.name || 'Typist'
    );
    if (!emailResult.delivered) {
      return res.status(503).json({
        error: emailResult.error
          ? `Failed to deliver verification email: ${emailResult.error}`
          : 'Failed to deliver verification email. Please check your email address or try again shortly.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
      resendCooldownSeconds: result.resendCooldownSeconds,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Resend OTP error:', message, error);
    return res.status(500).json({ error: 'Failed to resend verification code. Please try again shortly.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // ── Account lockout check ─────────────────────────────────────────────────
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      return res.status(429).json({
        error: `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Increment failed attempts
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const shouldLock = newAttempts >= 5;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockoutUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null
        }
      });
      if (shouldLock) {
        return res.status(429).json({ error: 'Too many failed attempts. Account locked for 15 minutes.' });
      }
      return res.status(401).json({ error: `Invalid email or password. ${5 - newAttempts} attempt(s) remaining.` });
    }

    // ── Successful login: reset lockout counters & validate streak without incrementing ──
    const newStreak = resolveStreakTransition(user.lastActiveAt, user.streak, 'login');
    const newLongestStreak = Math.max(user.longestStreak, newStreak);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        streak: newStreak,
        longestStreak: newLongestStreak,
        failedLoginAttempts: 0,
        lockoutUntil: null
      }
    });

    // Seed any new active challenges that user doesn't have progress records for yet
    const activeChallenges = await prisma.challenge.findMany({
      where: { expiresAt: { gt: new Date() } }
    });

    for (const ch of activeChallenges) {
      await prisma.userChallengeProgress.upsert({
        where: {
          userId_challengeId: {
            userId: user.id,
            challengeId: ch.id
          }
        },
        update: {},
        create: {
          userId: user.id,
          challengeId: ch.id,
          currentValue: 0,
          isCompleted: false
        }
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        level: updatedUser.level,
        xp: updatedUser.xp,
        streak: updatedUser.streak,
        longestStreak: updatedUser.longestStreak,
        lastActiveAt: updatedUser.lastActiveAt,
        totalCharacters: updatedUser.totalCharacters,
        lifetimeWpm: updatedUser.lifetimeWpm,
        lifetimeAccuracy: updatedUser.lifetimeAccuracy,
        practiceHours: updatedUser.practiceHours,
        academyProgress: updatedUser.academyProgress
      }
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'An error occurred during login.' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token.' });
    }

    const cacheKey = `profile:${userId}`;
    const cachedProfile = profileCache.get(cacheKey);
    if (cachedProfile) {
      return res.status(200).json(cachedProfile);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        achievements: {
          include: {
            achievement: true
          }
        },
        challenges: {
          where: {
            challenge: {
              expiresAt: { gt: new Date() }
            }
          },
          include: {
            challenge: true
          }
        }
      }
    });

    if (!user) {
      return res.status(444).json({ error: 'User not found.' });
    }

    // Refresh and validate streak on profile fetch so frontend always receives true DB streak
    const validatedStreak = resolveStreakTransition(user.lastActiveAt, user.streak, 'login');
    const validatedLongestStreak = Math.max(user.longestStreak, validatedStreak);
    if (validatedStreak !== user.streak || validatedLongestStreak !== user.longestStreak) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          streak: validatedStreak,
          longestStreak: validatedLongestStreak
        }
      });
      user.streak = updated.streak;
      user.longestStreak = updated.longestStreak;
    }

    // Strip passwordHash before sending
    const { passwordHash, ...profileData } = user;

    profileCache.set(cacheKey, profileData);
    return res.status(200).json(profileData);
  } catch (error: unknown) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ error: 'An error occurred fetching user profile.' });
  }
};

import { verifyGoogleToken } from '../services/oauth.service';

export const googleLogin = async (req: Request, res: Response) => {
  console.log('[Google Auth] Starting login flow...');
  try {
    const { idToken, credential } = req.body;
    const tokenToVerify = idToken || credential;
    if (!tokenToVerify) {
      console.warn('[Backend Google Auth] Verification failed: idToken / credential is missing.');
      return res.status(400).json({ error: 'Google login failed. Token is missing.' });
    }

    console.log('[Google Auth] Verifying ID token with Google API...');
    let payload;
    try {
      payload = await verifyGoogleToken(tokenToVerify);
    } catch (err: any) {
      console.error('[Backend Google Auth] Google verification FAILED:', err.message || err);
      return res.status(401).json({ error: `Google verification failed: ${err.message || 'Invalid token'}` });
    }

    if (!payload.email_verified) {
      console.warn('[Backend Google Auth] Verification failed: Email not verified by Google:', payload.email);
      return res.status(400).json({ error: 'This Google email is not verified.' });
    }

    const googleEmail = (payload.email || '').trim().toLowerCase();
    console.log('[Google Auth] Token verified successfully. Email:', googleEmail);
    console.log('[Google Auth] Querying database for user...');

    // Find user by Google ID or by verified Email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: payload.sub },
          { email: googleEmail }
        ]
      }
    });
    console.log('[Google Auth] Database query finished. User found:', !!user);

    let isNewUser = false;

    if (!user) {
      // Register new user automatically
      user = await prisma.user.create({
        data: {
          email: googleEmail,
          googleId: payload.sub,
          name: payload.name,
          avatar: payload.picture || null,
          streak: 0,
          lastActiveAt: new Date(0),
        }
      });
      isNewUser = true;

      // Seed initial challenges (non-blocking)
      try {
        const activeChallenges = await prisma.challenge.findMany({
          where: { expiresAt: { gt: new Date() } }
        });
        if (activeChallenges.length > 0) {
          await prisma.userChallengeProgress.createMany({
            data: activeChallenges.map((ch: Challenge) => ({
              userId: user!.id,
              challengeId: ch.id,
              currentValue: 0,
              isCompleted: false
            })),
            skipDuplicates: true
          });
        }
      } catch (chErr) {
        console.warn('[Google Auth] Failed to seed challenges for new user:', chErr);
      }
    } else {
      // Link Google ID if user exists but logged in via Google for first time
      const updates: any = {};
      if (!user.googleId) {
        updates.googleId = payload.sub;
      }
      if (!user.avatar && payload.picture) {
        updates.avatar = payload.picture;
      }
      
      const newStreak = resolveStreakTransition(user.lastActiveAt || new Date(0), user.streak || 0, 'login');
      const newLongestStreak = Math.max(user.longestStreak || 0, newStreak);
      updates.streak = newStreak;
      updates.longestStreak = newLongestStreak;

      try {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates
        });
      } catch (updateErr) {
        console.warn('[Google Auth] User update warning (e.g. googleId conflict):', updateErr);
        delete updates.googleId;
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates
        });
      }

      // Seed missing challenges (non-blocking)
      try {
        const activeChallenges = await prisma.challenge.findMany({
          where: { expiresAt: { gt: new Date() } }
        });
        for (const ch of activeChallenges) {
          await prisma.userChallengeProgress.upsert({
            where: {
              userId_challengeId: {
                userId: user.id,
                challengeId: ch.id
              }
            },
            update: {},
            create: {
              userId: user.id,
              challengeId: ch.id,
              currentValue: 0,
              isCompleted: false
            }
          });
        }
      } catch (chErr) {
        console.warn('[Google Auth] Failed to seed challenges for existing user:', chErr);
      }
    }

    console.log('[Google Auth] Generating JWT token and returning response...');
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(isNewUser ? 201 : 200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        level: user.level,
        xp: user.xp,
        streak: user.streak,
        longestStreak: user.longestStreak,
        lastActiveAt: user.lastActiveAt,
        totalCharacters: user.totalCharacters,
        lifetimeWpm: user.lifetimeWpm,
        lifetimeAccuracy: user.lifetimeAccuracy,
        practiceHours: user.practiceHours,
        academyProgress: user.academyProgress
      }
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('[Backend Google Auth] CRITICAL UNHANDLED ERROR:', errMessage, error);
    return res.status(500).json({ error: 'Google authentication failed. Please try again or sign in with your email.' });
  }
};

export const updateLastActivity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token.' });
    }

    const { activity } = req.body;
    if (!activity) {
      return res.status(400).json({ error: 'Activity data is required.' });
    }

    const lastActivityString = typeof activity === 'object' ? JSON.stringify(activity) : activity;

    // Only persist resume metadata; do not update lastActiveAt (reserved for qualifying practice sessions)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        lastActivity: lastActivityString
      }
    });

    invalidateUserCaches(userId);

    return res.status(200).json({
      success: true,
      lastActivity: updatedUser.lastActivity
    });
  } catch (error: unknown) {
    console.error('Update last activity error:', error);
    return res.status(500).json({ error: 'An error occurred updating user activity.' });
  }
};

export const updateAcademyProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token.' });
    }

    const { progress } = req.body;
    if (!progress) {
      return res.status(400).json({ error: 'Progress data is required.' });
    }

    const progressString = typeof progress === 'object' ? JSON.stringify(progress) : progress;

    // Only persist academy progress state; do not update lastActiveAt (reserved for qualifying practice sessions)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        academyProgress: progressString
      }
    });

    invalidateUserCaches(userId);

    return res.status(200).json({
      success: true,
      academyProgress: updatedUser.academyProgress
    });
  } catch (error: unknown) {
    console.error('Update academy progress error:', error);
    return res.status(500).json({ error: 'An error occurred updating academy progress.' });
  }
};

export const spendXp = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token.' });
    }

    const { amount } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const currentXp = user.xp || 0;
    if (currentXp < amount) {
      return res.status(400).json({ error: 'Insufficient XP.' });
    }

    const newXp = Math.max(0, currentXp - amount);

    // Deduct XP without resetting lastActiveAt or streak
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
      }
    });

    invalidateUserCaches(userId);

    return res.status(200).json({
      success: true,
      xp: updatedUser.xp,
    });
  } catch (error: unknown) {
    console.error('Spend XP error:', error);
    return res.status(500).json({ error: 'An error occurred spending XP.' });
  }
};

/**
 * Initiates password reset by sending a 6-digit confirmation OTP to the registered email.
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // If user does not exist, return generic success to prevent user enumeration
    if (!user) {
      return res.status(200).json({
        status: 'OTP_SENT',
        message: 'If an account exists with this email, a 6-digit verification code has been dispatched.',
        resendCooldownSeconds: 60,
      });
    }

    const { code, resendCooldownSeconds } = emailOtpService.createPasswordResetRequest(
      normalizedEmail,
      user.name || 'Typist'
    );

    const emailResult = await emailService.sendPasswordResetEmail(normalizedEmail, code, user.name || 'Typist');
    if (!emailResult.delivered) {
      emailOtpService.clearPasswordReset(normalizedEmail);
      return res.status(503).json({
        error: emailResult.error
          ? `Failed to deliver password reset email: ${emailResult.error}`
          : 'Failed to deliver password reset email. Please try again shortly.',
      });
    }

    return res.status(200).json({
      status: 'OTP_SENT',
      message: 'A 6-digit password reset code has been sent to your email address.',
      email: normalizedEmail,
      resendCooldownSeconds,
    });
  } catch (error: unknown) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Failed to process password reset request. Please try again shortly.' });
  }
};

/**
 * Verifies the 6-digit OTP code for a password reset request and issues a 15-minute reset token.
 */
export const verifyResetOtp = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    const result = emailOtpService.verifyPasswordResetOtp(normalizedEmail, String(code));

    if (!result.success || !result.resetToken) {
      return res.status(400).json({ error: result.error || 'Invalid or expired verification code.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code confirmed. You may now set your new password.',
      resetToken: result.resetToken,
    });
  } catch (error: unknown) {
    console.error('Verify reset OTP error:', error);
    return res.status(500).json({ error: 'Failed to verify confirmation code. Please try again.' });
  }
};

/**
 * Resends a fresh 6-digit OTP code for an active password reset request.
 */
export const resendResetOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    const result = emailOtpService.resendPasswordResetOtp(normalizedEmail);

    if (!result.success || !result.code) {
      return res.status(400).json({
        error: result.error || 'Failed to resend password reset code.',
        resendCooldownSeconds: result.resendCooldownSeconds,
      });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const emailResult = await emailService.sendPasswordResetEmail(
      normalizedEmail,
      result.code,
      user?.name || 'Typist'
    );

    if (!emailResult.delivered) {
      return res.status(503).json({
        error: emailResult.error
          ? `Failed to deliver verification email: ${emailResult.error}`
          : 'Failed to deliver verification email. Please try again shortly.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'A new 6-digit verification code has been dispatched to your email.',
      resendCooldownSeconds: result.resendCooldownSeconds || 60,
    });
  } catch (error: unknown) {
    console.error('Resend reset OTP error:', error);
    return res.status(500).json({ error: 'Failed to resend confirmation code. Please try again.' });
  }
};

/**
 * Sets a new password for the user, verifying the cryptographically signed resetToken.
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Email, reset token, and new password are required.' });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const isValidToken = emailOtpService.verifyResetToken(normalizedEmail, resetToken);
    if (!isValidToken) {
      return res.status(401).json({
        error: 'Invalid or expired password reset session. Please request a new verification code.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        passwordHash: passwordHash,
      },
    });

    invalidateUserCaches(user.id);
    emailOtpService.clearPasswordReset(normalizedEmail);

    return res.status(200).json({
      success: true,
      message: 'Your password has been successfully updated. You may now sign in.',
    });
  } catch (error: unknown) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Failed to update password. Please try again shortly.' });
  }
};



