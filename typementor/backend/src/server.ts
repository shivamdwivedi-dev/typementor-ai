import app, { prisma } from './app';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`TypeMentor AI Server is running on port ${PORT}`);

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET is weak or missing. Set a strong 64-char secret in .env before deploying to production.');
  }
});

// Graceful shutdown handling
const shutdown = async () => {
  console.log('Shutdown signal received. Closing HTTP server and database connection...');
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
