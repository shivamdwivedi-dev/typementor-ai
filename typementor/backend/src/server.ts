import app, { prisma } from './app';
import { ArenaPointsService } from './services/arena/arena-points.service';
import { ArenaMatchService } from './services/arena/arena-match.service';
import { ArenaSocketService } from './services/arena/arena-socket.service';

const PORT = process.env.PORT || 5000;

// Temporary diagnostic check: verifies repository deploy hook & sync on Render
const DEPLOY_CHECK_ID = 'render-test-deploy-sync';

const server = app.listen(PORT, () => {
  console.log(`TypeMentor AI Server [${DEPLOY_CHECK_ID}] running on port ${PORT}`);

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET is weak or missing. Set a strong 64-char secret in .env before deploying to production.');
  }
});

// Initialize Real-time Arena WebSocket service
const arenaPointsService = new ArenaPointsService(prisma);
const arenaMatchService = new ArenaMatchService(prisma, arenaPointsService);
export const arenaSocketService = new ArenaSocketService(prisma, arenaPointsService, arenaMatchService);
arenaSocketService.init(server);

// Graceful shutdown handling
const shutdown = async () => {
  console.log('Shutdown signal received. Closing HTTP server and database connection...');
  try {
    arenaSocketService.shutdown();
  } catch (err) {
    console.warn('Error during Arena WebSocket shutdown:', err);
  }
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('Database connection closed.');
    } catch (err) {
      console.error('Error during database disconnection:', err);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
