import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as dotenv from 'dotenv';
import { sanitizeBody, blockSqlInjection } from './middleware/sanitize.middleware';

dotenv.config();

// Ensure Supabase PgBouncer pooler connection strings disable prepared statement caching
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('statement_cache_size=')) {
  process.env.DATABASE_URL += (process.env.DATABASE_URL.includes('?') ? '&' : '?') + 'pgbouncer=true&statement_cache_size=0';
}

const app = express();
app.set('trust proxy', 1);

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ── CORS — restrict to known origins ─────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://typementor-ai-frontend.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes("*") ||
      DEFAULT_ALLOWED_ORIGINS.includes(origin)
    ) {
      return callback(null, true);
    }

    try {
      const hostname = new URL(origin).hostname;

      const isLocalhost =
        hostname === "localhost" ||
        hostname === "127.0.0.1";

      const isNgrok =
        hostname.endsWith(".ngrok-free.app") ||
        hostname.endsWith(".ngrok.app");

      const isVercel =
        hostname.endsWith(".vercel.app");

      if (isLocalhost || isNgrok || isVercel) {
        return callback(null, true);
      }

      console.warn(`[CORS Blocked] Origin: ${origin} is not authorized`);
      return callback(null, false);
    } catch {
      console.warn(`[CORS Blocked] Origin: ${origin} failed URL parsing`);
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ── Body parser (Must come BEFORE sanitization) ──────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ── Input sanitization ────────────────────────────────────────────────────────
app.use(sanitizeBody);

// Debug log middleware - Dev only
if (!isProduction) {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[REQUEST] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'None'}`);
    next();
  });
}

// ── Global rate limiter: 200 req / 15 min per IP ─────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
});
app.use('/api/', globalLimiter);

// ── Strict auth limiter: 30 attempts / 15 min per IP ──────────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true, // Only count failed requests
});

// ── Prisma client & DDL Initialization ─────────────────────────────────────────
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient({
  datasources: process.env.DATABASE_URL ? { db: { url: process.env.DATABASE_URL } } : undefined,
});

const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCharacters" INTEGER NOT NULL DEFAULT 0,
    "lifetimeWpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lifetimeAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "practiceHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "typingDna" TEXT,
    "lastActivity" TEXT,
    "academyProgress" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "TypingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "wpm" DOUBLE PRECISION NOT NULL,
    "rawWpm" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "consistency" DOUBLE PRECISION NOT NULL,
    "focusScore" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "backspaceCount" INTEGER NOT NULL,
    "correctionCount" INTEGER NOT NULL,
    "predictionAccuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TypingSession_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "KeystrokeLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "expectedKey" TEXT NOT NULL,
    "actualKey" TEXT NOT NULL,
    "reactionTime" INTEGER NOT NULL,
    "holdTime" INTEGER NOT NULL,
    "pauseDuration" INTEGER NOT NULL,
    "wordIndex" INTEGER NOT NULL,
    "previousKey" TEXT,
    "nextKey" TEXT,
    "isMistake" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KeystrokeLog_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "MistakeSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expectedKey" TEXT NOT NULL,
    "pressedKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MistakeSummary_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "Achievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL,
    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "Challenge" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "criteriaType" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "UserChallengeProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserChallengeProgress_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "RecoveryHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mostMistypedKey" TEXT NOT NULL,
    "confusionKey" TEXT,
    "accuracyLoss" DOUBLE PRECISION NOT NULL,
    "predictedWpmGain" DOUBLE PRECISION NOT NULL,
    "recoveryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecoveryHistory_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "device" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "whatWorked" TEXT NOT NULL,
    "whatConfused" TEXT NOT NULL,
    "bugFound" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");`,
  `CREATE INDEX IF NOT EXISTS "TypingSession_userId_idx" ON "TypingSession"("userId");`,
  `CREATE INDEX IF NOT EXISTS "KeystrokeLog_sessionId_idx" ON "KeystrokeLog"("sessionId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "MistakeSummary_userId_expectedKey_pressedKey_key" ON "MistakeSummary"("userId", "expectedKey", "pressedKey");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Achievement_code_key" ON "Achievement"("code");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserChallengeProgress_userId_challengeId_key" ON "UserChallengeProgress"("userId", "challengeId");`,
  `CREATE INDEX IF NOT EXISTS "RecoveryHistory_userId_idx" ON "RecoveryHistory"("userId");`
];

// Connect the database and initialize tables idempotently
prisma.$connect()
  .then(async () => {
    console.log('TypeMentor AI Database connected successfully.');
    // Run DDL statements asynchronously to ensure tables exist in target PostgreSQL DB
    try {
      for (const stmt of DDL_STATEMENTS) {
        await prisma.$executeRawUnsafe(stmt);
      }
      console.log('TypeMentor AI Database schema tables initialized and verified.');
    } catch (schemaErr: any) {
      console.warn('Database schema DDL warning:', schemaErr.message || schemaErr);
    }
  })
  .catch((err: any) => {
    console.error('Failed to connect to the database on startup:', err.message || err);
  });

// ── Routes ────────────────────────────────────────────────────────────────────
import authRoutes from './routes/auth.routes';
import sessionRoutes from './routes/session.routes';
import analyticsRoutes from './routes/analytics.routes';
import coachRoutes from './routes/coach.routes';
import feedbackRoutes from './routes/feedback.routes';
import adminRoutes from './routes/admin.routes';

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);

// ── Health & Database Readiness check ──────────────────────────────────────────
const checkHealth = async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: 'degraded', database: 'disconnected', error: err.message });
  }
};

app.get('/health', checkHealth);
app.get('/healthz', checkHealth);
app.get('/api/health', checkHealth);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

export default app;
