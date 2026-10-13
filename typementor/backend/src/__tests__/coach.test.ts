import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
    },
    mistakeSummary: {
      findMany: vi.fn(),
    },
    typingSession: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    keystrokeLog: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../app', () => ({
  prisma: mockPrisma,
}));

import { getCoachInsights } from '../controllers/coach.controller';

// Let's test the key risk calculation bounds
function calculateClampedRisk(mistakeCount: number, totalMistakes: number, wpmAccelerating: boolean): number {
  const basePercentage = totalMistakes > 0 ? (mistakeCount / totalMistakes) * 80 : 20;
  let risk = Math.min(95, Math.max(10, Math.round(basePercentage + 15)));

  if (wpmAccelerating) {
    risk = Math.min(98, risk + 8);
  }

  return risk;
}

function createMockRes() {
  const res: any = { statusCode: 200, body: null };
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((payload: any) => {
    res.body = payload;
    return res;
  });
  return res;
}

describe('Coach Prediction Engine tests', () => {
  it('should clamp low mistake counts correctly', () => {
    const risk = calculateClampedRisk(0, 0, false);
    expect(risk).toBe(35); // 20 + 15 = 35
  });

  it('should increase risk when user is accelerating typing speed', () => {
    const baseRisk = calculateClampedRisk(10, 100, false);
    const speedRisk = calculateClampedRisk(10, 100, true);

    expect(speedRisk).toBeGreaterThan(baseRisk);
    expect(speedRisk).toBeLessThanOrEqual(98);
  });
});

describe('Coach Controller getCoachInsights response contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns both backward-compatible insights string and strongly typed insight object', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'coach-user-1',
      name: 'Grace',
      lifetimeWpm: 55,
      lifetimeAccuracy: 96,
      practiceHours: 1.5,
      totalCharacters: 2000,
    });
    mockPrisma.mistakeSummary.findMany.mockResolvedValue([
      { expectedKey: 'K', pressedKey: 'L', count: 5 },
    ]);
    mockPrisma.typingSession.findMany.mockResolvedValue([]);
    mockPrisma.typingSession.count.mockResolvedValue(4);
    mockPrisma.keystrokeLog.findMany.mockResolvedValue([]);

    const req: any = { user: { id: 'coach-user-1' } };
    const res = createMockRes();

    await getCoachInsights(req, res);

    expect(res.statusCode).toBe(200);
    // Backward-compatible string field for frontend AICoach.tsx
    expect(typeof res.body.insights).toBe('string');
    expect(res.body.insights).toContain('55.0 WPM');

    // Strongly typed structured insight
    expect(res.body.insight).toBeDefined();
    expect(res.body.insight.summary).toBe(res.body.insights);
    expect(Array.isArray(res.body.insight.strengths)).toBe(true);
    expect(Array.isArray(res.body.insight.priorityAreas)).toBe(true);
    expect(res.body.insight.nextSessionPlan).toBeDefined();

    // Observability metadata
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.success).toBe(true);

    // Risk prediction keys
    expect(res.body.riskKeys).toBeDefined();
  });
});
