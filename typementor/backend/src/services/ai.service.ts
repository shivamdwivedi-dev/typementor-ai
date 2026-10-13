import { extractCoachMetrics } from './ai/metrics.extractor';
import { createAIProvider } from './ai/factory';
import { LocalRuleProvider } from './ai/local.provider';
import { PROMPT_VERSION } from './ai/prompt.builder';
import { AIExecutionMeta, CoachInputMetrics, TypingInsight } from './ai/types';
import { aiLogger } from './ai/sanitizer';

export interface CoachInsightResponse {
  summary: string;
  insight: TypingInsight;
  meta: AIExecutionMeta;
}

interface CacheEntry {
  data: CoachInsightResponse;
  expiresAt: number;
  metricsFingerprint: string;
}

const INSIGHT_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const insightCache = new Map<string, CacheEntry>();

export function clearCoachInsightCacheForTests(): void {
  insightCache.clear();
}

function computeMetricsFingerprint(metrics: CoachInputMetrics): string {
  return `${metrics.totalSessions}:${metrics.practiceHours.toFixed(2)}:${metrics.lifetimeWpm.toFixed(1)}:${metrics.lifetimeAccuracy.toFixed(1)}:${metrics.totalMistakesCount}`;
}

/**
 * Primary structured AI Coach service.
 * - Extracts minimal, non-PII telemetry.
 * - Orchestrates cloud AI provider execution with timeout, transient retries, and Zod validation.
 * - Guarantees safe fallback to LocalRuleProvider if the cloud provider is unavailable,
 *   misconfigured, or returns invalid data.
 * - Maintains a 60-second in-memory cache for duplicate requests.
 */
export async function generateStructuredCoachInsight(
  userId: string,
  options?: { bypassCache?: boolean; forceProvider?: 'local' | 'gemini' | 'openai' | 'mock' }
): Promise<CoachInsightResponse> {
  const startTime = Date.now();

  // 1. Prepare deterministic metrics
  let metrics: CoachInputMetrics | null = null;
  try {
    metrics = await extractCoachMetrics(userId);
  } catch (err: unknown) {
    aiLogger.error('Failed to extract coach metrics from database', err);
  }

  // Fallback metrics if user does not exist in DB yet
  const safeMetrics: CoachInputMetrics = metrics || {
    userId,
    displayName: 'Typist',
    lifetimeWpm: 40,
    lifetimeAccuracy: 90,
    practiceHours: 0,
    totalSessions: 0,
    topMistakes: [],
    totalMistakesCount: 0,
    speedPattern: 'balanced',
    fastMistakesCount: 0,
    slowMistakesCount: 0,
    recentTrend: 'insufficient_data',
    recentAverageWpm: 40,
    recentAverageAccuracy: 90,
    recentAverageConsistency: 80,
  };

  // 2. Check in-memory cache
  const fingerprint = computeMetricsFingerprint(safeMetrics);
  const cacheKey = `user:${userId}`;
  const now = Date.now();

  if (!options?.bypassCache) {
    const cached = insightCache.get(cacheKey);
    if (cached && cached.expiresAt > now && cached.metricsFingerprint === fingerprint) {
      return {
        ...cached.data,
        meta: {
          ...cached.data.meta,
          cached: true,
        },
      };
    }
  }

  // 3. Resolve configured provider
  const provider = createAIProvider(
    options?.forceProvider ? { provider: options.forceProvider } : undefined
  );
  let insight: TypingInsight | null = null;
  let fallbackUsed = false;
  let tokensUsed: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined;

  try {
    const result = await provider.generateTypingInsight(safeMetrics);
    insight = result.insight;
    tokensUsed = result.tokensUsed;
  } catch (providerError: unknown) {
    aiLogger.warn(
      `AI Provider [${provider.name}] failed; engaging local rule fallback`,
      { error: providerError instanceof Error ? providerError.message : String(providerError) }
    );
    fallbackUsed = true;
  }

  // 4. Guarantee safe fallback to LocalRuleProvider if cloud provider failed
  if (!insight) {
    const localFallback = new LocalRuleProvider();
    const fallbackResult = await localFallback.generateTypingInsight(safeMetrics);
    insight = fallbackResult.insight;
  }

  const durationMs = Date.now() - startTime;

  const meta: AIExecutionMeta = {
    provider: fallbackUsed ? 'local' : provider.name,
    model: fallbackUsed ? 'rule-engine-v1' : provider.model,
    promptVersion: PROMPT_VERSION,
    durationMs,
    success: true,
    fallbackUsed,
    retryCount: 0,
    tokensUsed,
    cached: false,
  };

  const response: CoachInsightResponse = {
    summary: insight.summary,
    insight,
    meta,
  };

  // Cache successful result
  insightCache.set(cacheKey, {
    data: response,
    expiresAt: now + INSIGHT_CACHE_TTL_MS,
    metricsFingerprint: fingerprint,
  });

  return response;
}

/**
 * Backward-compatible helper returning the string summary for existing frontend/test consumers.
 */
export async function generateAICoachInsight(userId: string): Promise<string> {
  const result = await generateStructuredCoachInsight(userId);
  return result.summary;
}
