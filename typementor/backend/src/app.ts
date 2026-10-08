import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as dotenv from 'dotenv';
import { sanitizeBody, blockSqlInjection } from './middleware/sanitize.middleware';

dotenv.config();

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

// ── Prisma client ─────────────────────────────────────────────────────────────
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();

// Connect the database to the server explicitly on startup
prisma.$connect()
  .then(() => {
    console.log('TypeMentor AI Database connected successfully.');
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
