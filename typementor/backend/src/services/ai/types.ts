import { z } from 'zod';

// ── Zod Schemas for Strict AI Response Validation ─────────────────────────────

export const PriorityAreaSchema = z.object({
  area: z.string().min(1).describe('Focus area, e.g., accuracy, speed, consistency, rhythm'),
  title: z.string().min(1).describe('Actionable title for the improvement area'),
  reason: z.string().min(1).describe('Evidence-based explanation citing user metrics'),
  exercise: z.string().min(1).describe('Specific typing exercise or drill recommendation'),
  target: z.string().min(1).describe('Measurable target milestone'),
});

export const NextSessionPlanSchema = z.object({
  durationMinutes: z.number().int().min(1).max(120).describe('Recommended practice duration in minutes'),
  targetWpm: z.number().min(5).max(300).describe('Target speed in WPM'),
  targetAccuracy: z.number().min(50).max(100).describe('Target accuracy percentage'),
});

export const TypingInsightSchema = z.object({
  summary: z.string().min(1).describe('Short evidence-based diagnostic summary'),
  strengths: z.array(z.string().min(1)).min(1).describe('Observed strengths grounded in telemetry'),
  priorityAreas: z.array(PriorityAreaSchema).min(1).describe('Ranked list of focus areas'),
  nextSessionPlan: NextSessionPlanSchema.describe('Target parameters for the upcoming session'),
});

export type PriorityArea = z.infer<typeof PriorityAreaSchema>;
export type NextSessionPlan = z.infer<typeof NextSessionPlanSchema>;
export type TypingInsight = z.infer<typeof TypingInsightSchema>;

// ── Data Preparation / Input Metrics Contract ─────────────────────────────────

export interface MistakePattern {
  expectedKey: string;
  pressedKey: string;
  count: number;
}

export type MistakeSpeedPattern = 'fast_mistakes' | 'placement_confusion' | 'balanced';
export type PerformanceTrend = 'improving' | 'plateauing' | 'declining' | 'insufficient_data';

export interface CoachInputMetrics {
  userId: string;
  displayName: string;
  lifetimeWpm: number;
  lifetimeAccuracy: number;
  practiceHours: number;
  totalSessions: number;
  topMistakes: MistakePattern[];
  totalMistakesCount: number;
  speedPattern: MistakeSpeedPattern;
  fastMistakesCount: number;
  slowMistakesCount: number;
  recentTrend: PerformanceTrend;
  recentAverageWpm: number;
  recentAverageAccuracy: number;
  recentAverageConsistency: number;
}

// ── Provider Interfaces & Configuration ───────────────────────────────────────

export type SupportedAIProvider = 'gemini' | 'openai' | 'local' | 'mock';

export interface AIProviderConfig {
  provider: SupportedAIProvider;
  model: string;
  apiKey?: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface AIExecutionMeta {
  provider: string;
  model: string;
  promptVersion: string;
  durationMs: number;
  success: boolean;
  fallbackUsed: boolean;
  retryCount: number;
  tokensUsed?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  cached?: boolean;
}

export interface ProviderInsightResult {
  insight: TypingInsight;
  tokensUsed?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generateTypingInsight(input: CoachInputMetrics): Promise<ProviderInsightResult>;
}
