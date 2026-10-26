import app, { prisma } from './app';
import { ArenaPointsService } from './services/arena/arena-points.service';
import { ArenaMatchService } from './services/arena/arena-match.service';
import { ArenaSocketService } from './services/arena/arena-socket.service';
import { ConquestMatchService } from './services/conquest/conquest-match.service';
import { ConquestSocketService } from './services/conquest/conquest-socket.service';

const PORT = process.env.PORT || 5000;

// Temporary diagnostic check: verifies repository deploy hook & sync on Render
const DEPLOY_CHECK_ID = 'render-test-deploy-sync';

const server = app.listen(PORT, () => {
  console.log(`TypeMentor AI Server [${DEPLOY_CHECK_ID}] running on port ${PORT}`);

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET is weak or missing. Set a strong 64-char secret in .env before deploying to production.');
  }
});

// Configure keep-alive timeout higher than proxy timeout (60s) to prevent 502 Bad Gateway race conditions
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Initialize Real-time Arena WebSocket service
const arenaPointsService = new ArenaPointsService(prisma);
const arenaMatchService = new ArenaMatchService(prisma, arenaPointsService);
export const arenaSocketService = new ArenaSocketService(prisma, arenaPointsService, arenaMatchService);
arenaSocketService.init(server);

// Initialize Real-time Word Conquest WebSocket service
const conquestMatchService = new ConquestMatchService(prisma);
export const conquestSocketService = new ConquestSocketService(prisma, conquestMatchService);
conquestSocketService.init(server);

// Graceful shutdown handling with 10s hard timeout
let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[${signal}] Shutdown signal received. Closing server and releasing resources...`);

  // Force exit after 10 seconds if lingering connections fail to drain
  const forceExitTimeout = setTimeout(() => {
    console.error('Graceful shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000);
  if (forceExitTimeout.unref) {
    forceExitTimeout.unref();
  }

  try {
    arenaSocketService.shutdown();
  } catch (err) {
    console.warn('Error during Arena WebSocket shutdown:', err);
  }

  try {
    conquestSocketService.shutdown();
  } catch (err) {
    console.warn('Error during Conquest WebSocket shutdown:', err);
  }

  server.close(async () => {
    console.log('HTTP server closed. Disconnecting database client...');
    try {
      await prisma.$disconnect();
      console.log('Database connection closed cleanly.');
    } catch (err) {
      console.error('Error during database disconnection:', err);
    }
    clearTimeout(forceExitTimeout);
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason: any) => {
  console.error('[Unhandled Rejection]', reason?.stack || reason);
});

process.on('uncaughtException', (err: Error) => {
  console.error('[Uncaught Exception]', err.stack || err.message);
  shutdown('UNCAUGHT_EXCEPTION');
});
