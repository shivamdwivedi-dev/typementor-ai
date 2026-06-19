import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Challenge } from '@prisma/client';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth.middleware';
import { getStreakOnLogin } from '../services/gamification.service';

const JWT_SECRET = process.env.JWT_SECRET || 'typementor_secret_key_12345';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    // Validate name length
    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        streak: 0,
        lastActiveAt: new Date(0),
      }
    });

    // Create initial challenge progress entries
    const activeChallenges = await prisma.challenge.findMany({
      where: { expiresAt: { gt: new Date() } }
    });

    if (activeChallenges.length > 0) {
      await prisma.userChallengeProgress.createMany({
        data: activeChallenges.map((ch: Challenge) => ({
          userId: newUser.id,
          challengeId: ch.id,
          currentValue: 0,
          isCompleted: false
        })),
        skipDuplicates: true
      });
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
        academyProgress: newUser.academyProgress
      }
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'An error occurred during registration.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
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

    // ── Successful login: reset lockout counters ──────────────────────────────
    const newStreak = getStreakOnLogin(user.lastActiveAt, user.streak);
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
        level: updatedUser.level,
        xp: updatedUser.xp,
        streak: updatedUser.streak,
        longestStreak: updatedUser.longestStreak,
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

    // Strip passwordHash before sending
    const { passwordHash, ...profileData } = user;

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
    const { idToken } = req.body;
    if (!idToken) {
      console.warn('[Backend Google Auth] Verification failed: idToken is missing.');
      return res.status(400).json({ error: 'Google login failed. Please try again.' });
    }

    console.log('[Google Auth] Verifying ID token with Google API...');
    let payload;
    try {
      payload = await verifyGoogleToken(idToken);
    } catch (err: any) {
      console.error('[Backend Google Auth] Google verification FAILED:', err.message || err);
      return res.status(401).json({ error: 'Google login failed. Please try again.' });
    }

    if (!payload.email_verified) {
      console.warn('[Backend Google Auth] Verification failed: Email not verified by Google:', payload.email);
      return res.status(400).json({ error: 'This Google email is not verified.' });
    }

    console.log('[Google Auth] Token verified successfully. Email:', payload.email);
    console.log('[Google Auth] Querying database for user...');

    // Find user by Google ID or by verified Email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: payload.sub },
          { email: payload.email }
        ]
      }
    });
    console.log('[Google Auth] Database query finished. User found:', !!user);

    let isNewUser = false;

    if (!user) {
      // Register new user automatically
      user = await prisma.user.create({
        data: {
          email: payload.email,
          googleId: payload.sub,
          name: payload.name,
          avatar: payload.picture || null,
          streak: 0,
          lastActiveAt: new Date(0),
        }
      });
      isNewUser = true;

      // Seed initial challenges
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
    } else {
      // Link Google ID if user exists but logged in via Google for first time
      const updates: any = {};
      if (!user.googleId) {
        updates.googleId = payload.sub;
      }
      if (!user.avatar && payload.picture) {
        updates.avatar = payload.picture;
      }
      
      // Update streak (only resets to 0 if streak was missed)
      const newStreak = getStreakOnLogin(user.lastActiveAt, user.streak);
      const newLongestStreak = Math.max(user.longestStreak, newStreak);
      updates.streak = newStreak;
      updates.longestStreak = newLongestStreak;

      user = await prisma.user.update({
        where: { id: user.id },
        data: updates
      });

      // Seed any missing challenges
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
        academyProgress: user.academyProgress
      }
    });
  } catch (error: unknown) {
    console.error('[Backend Google Auth] CRITICAL UNHANDLED ERROR:', error);
    return res.status(500).json({ error: 'Google login failed. Please try again.' });
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

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        lastActivity: lastActivityString,
        lastActiveAt: new Date()
      }
    });

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

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        academyProgress: progressString,
        lastActiveAt: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      academyProgress: updatedUser.academyProgress
    });
  } catch (error: unknown) {
    console.error('Update academy progress error:', error);
    return res.status(500).json({ error: 'An error occurred updating academy progress.' });
  }
};


