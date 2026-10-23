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

/**
 * Production proxy assumption:
 * TypeMentor API runs behind a single managed reverse proxy (Render/Railway/Heroku/Nginx).
 * Default to 1 hop so Express extracts the rightmost proxy-appended IP in X-Forwarded-For
 * rather than trusting arbitrary client-supplied leftmost entries.
 * Never allow boolean `true`, which would let clients spoof X-Forwarded-For to bypass rate limits.
 */
export function resolveTrustProxyConfig(rawEnv: string | undefined = process.env.TRUST_PROXY_HOPS ?? process.env.TRUST_PROXY): number | boolean {
  if (rawEnv === undefined || rawEnv.trim() === '') {
    return 1;
  }
  const normalized = rawEnv.trim().toLowerCase();
  if (normalized === 'false' || normalized === '0') {
    return false;
  }
  if (normalized === 'true') {
    // Reject permissive boolean trust proxy; clamp to single trusted reverse proxy hop
    return 1;
  }
  const parsed = Number.parseInt(normalized, 10);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 10) {
    return parsed;
  }
  return 1;
}

/**
 * Extracts normalized client IP using Express's bounded trust-proxy evaluation (`req.ip`),
 * never trusting raw X-Forwarded-For leftmost entries or arbitrary X-Client-IP/X-Real-IP headers.
 */
export function resolveClientIp(req: Request): string {
  const rawIp = (typeof req.ip === 'string' && req.ip.trim().length > 0)
    ? req.ip.trim()
    : (req.socket?.remoteAddress || '127.0.0.1');

  const withoutMappedPrefix = rawIp.startsWith('::ffff:') ? rawIp.slice(7) : rawIp;
  return withoutMappedPrefix || '127.0.0.1';
}

app.set('trust proxy', resolveTrustProxyConfig());

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
const isTest = process.env.NODE_ENV === "test";

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
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "authorization",
    "Idempotency-Key",
    "idempotency-key",
    "X-Idempotency-Key",
    "x-idempotency-key",
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ── Body parser (Must come BEFORE sanitization) ──────────────────────────────
// Limit payload size to 2MB to prevent memory abuse at scale (was 10MB)
app.use(express.json({ limit: '2mb' }));

// ── Input sanitization ────────────────────────────────────────────────────────
app.use(sanitizeBody);

// Debug log middleware - Dev only
if (!isProduction && !isTest) {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[REQUEST] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'None'}`);
    next();
  });
}

// ── Global rate limiter: 200 req / 15 min per IP ─────────────────────────────
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveClientIp,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
});
app.use('/api', globalLimiter);

// ── Strict auth limiter: 30 attempts / 15 min per IP ──────────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveClientIp,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true, // Only count failed requests
});

// ── Prisma client & DDL Initialization ─────────────────────────────────────────
import { PrismaClient } from '@prisma/client';

/**
 * Production-tuned Prisma client for 400K-user scale.
 *
 * Connection pool sizing rationale:
 *   - Supabase free/pro connection limit is typically 60-100 connections
 *   - PgBouncer pooler allows many more, but each serverless function/instance
 *     should claim a modest share to avoid exhaustion
 *   - Default: 20 connections (adjustable via DB_POOL_SIZE env var)
 *
 * Query timeout:
 *   - Prevents long-running queries from holding connections indefinitely
 *   - Default: 10 seconds (adjustable via DB_QUERY_TIMEOUT_MS env var)
 *
 * Connection timeout:
 *   - How long to wait for a free connection from the pool before erroring
 *   - Default: 5 seconds (adjustable via DB_CONNECTION_TIMEOUT_MS env var)
 */
const DB_POOL_SIZE = Math.max(2, Math.min(50, parseInt(process.env.DB_POOL_SIZE || '20', 10) || 20));
const DB_QUERY_TIMEOUT_MS = parseInt(process.env.DB_QUERY_TIMEOUT_MS || '10000', 10) || 10000;
const DB_CONNECTION_TIMEOUT_MS = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10) || 5000;

function buildDatasourceUrl(): string | undefined {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) return undefined;
  const separator = baseUrl.includes('?') ? '&' : '?';
  const params: string[] = [];
  if (!baseUrl.includes('connection_limit=')) {
    params.push(`connection_limit=${DB_POOL_SIZE}`);
  }
  if (!baseUrl.includes('pool_timeout=')) {
    params.push(`pool_timeout=${Math.ceil(DB_CONNECTION_TIMEOUT_MS / 1000)}`);
  }
  return params.length > 0 ? `${baseUrl}${separator}${params.join('&')}` : baseUrl;
}

export const prisma = new PrismaClient({
  datasources: process.env.DATABASE_URL ? { db: { url: buildDatasourceUrl() } } : undefined,
  log: isProduction
    ? [{ level: 'error', emit: 'stdout' }]
    : [{ level: 'query', emit: 'stdout' }, { level: 'error', emit: 'stdout' }],
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
  `CREATE INDEX IF NOT EXISTS "RecoveryHistory_userId_idx" ON "RecoveryHistory"("userId");`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "arenaPoints" INTEGER NOT NULL DEFAULT 100;`,
  `CREATE TABLE IF NOT EXISTS "ArenaMatch" (
    "id" TEXT NOT NULL,
    "matchCode" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "passageId" TEXT NOT NULL,
    "passageText" TEXT NOT NULL,
    "passageTitle" TEXT NOT NULL,
    "passageWordCount" INTEGER NOT NULL,
    "stakeAmount" INTEGER NOT NULL DEFAULT 0,
    "isRanked" BOOLEAN NOT NULL DEFAULT false,
    "maxDuration" INTEGER NOT NULL DEFAULT 120,
    "countdownSeconds" INTEGER NOT NULL DEFAULT 5,
    "winnerId" TEXT,
    "isTie" BOOLEAN NOT NULL DEFAULT false,
    "settlementStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "cancellationReason" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "ArenaMatch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ArenaMatch_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS "ArenaParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seat" INTEGER NOT NULL,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "lastPingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "charsTyped" INTEGER NOT NULL DEFAULT 0,
    "wpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "completionTimeMs" INTEGER,
    "outcome" TEXT,
    "stakeLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArenaParticipant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ArenaParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ArenaParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS "ArenaPointLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArenaPointLedger_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ArenaPointLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ArenaPointLedger_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ArenaMatch_matchCode_key" ON "ArenaMatch"("matchCode");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ArenaMatch_idempotencyKey_key" ON "ArenaMatch"("idempotencyKey");`,
  `CREATE INDEX IF NOT EXISTS "ArenaMatch_status_idx" ON "ArenaMatch"("status");`,
  `CREATE INDEX IF NOT EXISTS "ArenaMatch_creatorId_idx" ON "ArenaMatch"("creatorId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ArenaParticipant_matchId_userId_key" ON "ArenaParticipant"("matchId", "userId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ArenaParticipant_matchId_seat_key" ON "ArenaParticipant"("matchId", "seat");`,
  `CREATE INDEX IF NOT EXISTS "ArenaParticipant_userId_idx" ON "ArenaParticipant"("userId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ArenaPointLedger_idempotencyKey_key" ON "ArenaPointLedger"("idempotencyKey");`,
  `CREATE INDEX IF NOT EXISTS "ArenaPointLedger_userId_idx" ON "ArenaPointLedger"("userId");`,
  `CREATE INDEX IF NOT EXISTS "ArenaPointLedger_matchId_idx" ON "ArenaPointLedger"("matchId");`,
  // Production scale indexes (Stage 1: 400K optimization)
  `CREATE INDEX IF NOT EXISTS "TypingSession_userId_createdAt_idx" ON "TypingSession"("userId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "KeystrokeLog_sessionId_isMistake_idx" ON "KeystrokeLog"("sessionId", "isMistake");`,
  `CREATE INDEX IF NOT EXISTS "User_lastActiveAt_idx" ON "User"("lastActiveAt");`
];

// Connect the database and initialize tables idempotently (skipped during automated unit/integration tests)
if (!isTest) {
  prisma.$connect()
    .then(async () => {
      console.log('TypeMentor AI Database connected successfully.');
      // Run DDL statements asynchronously with PostgreSQL advisory lock serialization (Audit B)
      try {
        let lockAcquired = false;
        try {
          await prisma.$executeRawUnsafe(`SELECT pg_advisory_lock(74294821);`);
          lockAcquired = true;
        } catch {
          // Non-PostgreSQL or pooler without advisory lock support: proceed without lock
        }

        try {
          for (const stmt of DDL_STATEMENTS) {
            await prisma.$executeRawUnsafe(stmt);
          }
          console.log('TypeMentor AI Database schema tables initialized and verified.');
        } finally {
          if (lockAcquired) {
            try {
              await prisma.$executeRawUnsafe(`SELECT pg_advisory_unlock(74294821);`);
            } catch {}
          }
        }
      } catch (schemaErr: any) {
        console.warn('Database schema DDL warning:', schemaErr.message || schemaErr);
      }
    })
    .catch((err: any) => {
      console.error('Failed to connect to the database on startup:', err.message || err);
    });
}

// ── Routes ────────────────────────────────────────────────────────────────────
import authRoutes from './routes/auth.routes';
import sessionRoutes from './routes/session.routes';
import analyticsRoutes from './routes/analytics.routes';
import coachRoutes from './routes/coach.routes';
import feedbackRoutes from './routes/feedback.routes';
import adminRoutes from './routes/admin.routes';
import arenaRoutes from './routes/arena.routes';

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/arena', arenaRoutes);

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
