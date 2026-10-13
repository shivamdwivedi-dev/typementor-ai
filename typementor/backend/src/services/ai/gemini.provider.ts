import { AIProvider, CoachInputMetrics, ProviderInsightResult } from './types';
import { buildCoachPrompt, parseAndValidateInsight } from './prompt.builder';
import { aiLogger, scrubSecrets } from './sanitizer';

interface GeminiCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
}

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiApiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export class GeminiProvider implements AIProvider {
  public readonly name = 'gemini';
  public readonly model: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(options: {
    model?: string;
    apiKey?: string;
    timeoutMs?: number;
    maxRetries?: number;
  } = {}) {
    this.model = options.model || process.env.AI_MODEL || 'gemini-1.5-flash';
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
    this.timeoutMs = options.timeoutMs ?? (parseInt(process.env.AI_TIMEOUT_MS || '10000', 10) || 10000);
    this.maxRetries = options.maxRetries ?? (parseInt(process.env.AI_MAX_RETRIES || '2', 10) || 2);
  }

  public async generateTypingInsight(input: CoachInputMetrics): Promise<ProviderInsightResult> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const { systemPrompt, userPrompt } = buildCoachPrompt(input);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const requestPayload = {
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    };

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        });
        clearTimeout(timer);

        // Check HTTP status code
        if (!response.ok) {
          const status = response.status;
          let errorBody = '';
          try {
            errorBody = await response.text();
          } catch {
            // ignore stream read error
          }
          const cleanError = scrubSecrets(errorBody);

          // Fast-fail non-transient client/auth errors (Do NOT retry)
          if (status === 400 || status === 401 || status === 403 || status === 404) {
            throw new Error(`Gemini API client error (${status}): ${cleanError || 'Unauthorized or invalid request'}`);
          }

          // Transient errors (429, 500, 502, 503, 504) -> allow retry if attempts remain
          const isTransient = status === 429 || (status >= 500 && status <= 504);
          if (isTransient && attempt <= this.maxRetries) {
            aiLogger.warn(`Gemini transient HTTP ${status}. Retrying (attempt ${attempt}/${this.maxRetries})...`);
            await this.delayBackoff(attempt);
            continue;
          }

          throw new Error(`Gemini API error (${status}): ${cleanError}`);
        }

        const data = (await response.json()) as GeminiApiResponse;
        if (data.error) {
          throw new Error(`Gemini API returned error: ${scrubSecrets(data.error.message || 'Unknown error')}`);
        }

        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          throw new Error('Gemini API returned empty candidate content');
        }

        // Schema validation with Zod
        const insight = parseAndValidateInsight(candidateText);

        const tokensUsed = data.usageMetadata
          ? {
              promptTokens: data.usageMetadata.promptTokenCount,
              completionTokens: data.usageMetadata.candidatesTokenCount,
              totalTokens: data.usageMetadata.totalTokenCount,
            }
          : undefined;

        return {
          insight,
          tokensUsed,
        };
      } catch (err: any) {
        clearTimeout(timer);
        const isAbort = err.name === 'AbortError';
        const msg = isAbort ? `Request timed out after ${this.timeoutMs}ms` : err.message;
        lastError = new Error(scrubSecrets(msg));

        // Retry only transient network/timeout errors
        const isTransientNetwork = isAbort || err.name === 'FetchError' || err.code === 'ECONNRESET';
        if (isTransientNetwork && attempt <= this.maxRetries) {
          aiLogger.warn(`Gemini network/timeout error. Retrying (attempt ${attempt}/${this.maxRetries})...`);
          await this.delayBackoff(attempt);
          continue;
        }

        // Non-transient or retries exhausted
        throw lastError;
      }
    }

    throw lastError || new Error('Gemini API call failed after retries');
  }

  private async delayBackoff(attempt: number): Promise<void> {
    const delay = Math.min(2000, 150 * Math.pow(2, attempt) + Math.random() * 50);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
