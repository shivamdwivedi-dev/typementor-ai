import { prisma } from '../app';
import { MistakeSummary } from '@prisma/client';

export interface KeyRiskPrediction {
  key: string;
  riskPercentage: number;
}

export async function predictMistakeRisks(userId: string): Promise<Record<string, number>> {
  try {
    // Fetch user key confusion/mistake history
    const mistakes = await prisma.mistakeSummary.findMany({
      where: { userId },
      orderBy: { count: 'desc' },
      take: 10
    });

    if (mistakes.length === 0) {
      // Default predictions if user has no mistake logs yet
      return {
        'T': 30,
        'R': 25,
        'O': 20
      };
    }

    const totalMistakesCount = mistakes.reduce((sum: number, m: MistakeSummary) => sum + m.count, 0);
    const risks: Record<string, number> = {};

    // Calculate base risk from historical error densities
    mistakes.forEach((m: MistakeSummary) => {
      const key = m.expectedKey.toUpperCase();
      const basePercentage = totalMistakesCount > 0 ? (m.count / totalMistakesCount) * 80 : 20;
      
      // Ensure it maps between 10% and 95%
      risks[key] = Math.min(95, Math.max(10, Math.round(basePercentage + 15)));
    });

    // Apply speed modifiers
    const recentSessions = await prisma.typingSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { wpm: true }
    });

    if (recentSessions.length > 1) {
      const wpm1 = recentSessions[0].wpm;
      const wpm2 = recentSessions[1].wpm;
      
      if (wpm1 > wpm2) {
        // User is speeding up, increase mistake risk on historical weak keys by 5-10%
        Object.keys(risks).forEach(key => {
          risks[key] = Math.min(98, risks[key] + 8);
        });
      }
    }

    // Apply late night modifiers (errors increase when tired)
    const currentHour = new Date().getHours();
    if (currentHour >= 22 || currentHour <= 5) {
      Object.keys(risks).forEach(key => {
        risks[key] = Math.min(98, risks[key] + 10);
      });
    }

    return risks;
  } catch (error: unknown) {
    console.error('Prediction service failure:', error);
    return { 'T': 50, 'R': 40 };
  }
}
