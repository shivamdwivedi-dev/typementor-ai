import { Request, Response } from 'express';
import { prisma } from '../app';

/**
 * Retrieves operation telemetry for the administrator dashboard.
 */
export async function getAdminStats(req: Request, res: Response) {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Daily Active Users (DAU) - users active today
    const dauCount = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: startOfToday,
        },
      },
    });

    // 2. New Registrations
    const totalUsers = await prisma.user.count();
    const newRegistrations = await prisma.user.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    // 3. Average WPM across all completed sessions
    const wpmAggregate = await prisma.typingSession.aggregate({
      _avg: {
        wpm: true,
      },
      _count: {
        id: true,
      },
    });
    const avgWpm = wpmAggregate._avg.wpm ? Math.round(wpmAggregate._avg.wpm * 10) / 10 : 0;
    const totalSessions = wpmAggregate._count.id;

    // 4. Server health & latency check
    const startPing = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startPing;

    const memoryUsage = process.memoryUsage();
    const serverHealth = {
      uptimeSeconds: Math.round(process.uptime()),
      memoryRssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      memoryHeapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      databaseStatus: 'connected',
      databasePingMs: dbLatency,
    };

    // 5. Active Sessions (recent sessions completed in the last 1 hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const activeSessionsCount = await prisma.typingSession.count({
      where: {
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    // 6. Most completed lessons & modes
    const sessionsByMode = await prisma.typingSession.groupBy({
      by: ['mode'],
      _count: {
        id: true,
      },
    });
    const popularModes = sessionsByMode.map(m => ({
      mode: m.mode,
      count: m._count.id
    })).sort((a, b) => b.count - a.count);

    // 7. Error & feedback submissions count
    const feedbackCount = await prisma.feedback.count();

    res.status(200).json({
      dau: dauCount,
      totalUsers,
      newRegistrations,
      avgWpm,
      totalSessions,
      activeSessions: activeSessionsCount,
      dbPingMs: dbLatency,
      serverHealth,
      popularModes,
      feedbackCount,
    });
  } catch (error: any) {
    console.error('[Admin Stats Error]', error);
    res.status(500).json({ error: 'Failed to retrieve administrator telemetry.' });
  }
}
