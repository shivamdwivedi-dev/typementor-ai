import { AIProvider, CoachInputMetrics, ProviderInsightResult } from './types';
import { buildCoachPrompt, parseAndValidateInsight } from './prompt.builder';
import { aiLogger, scrubSecrets } from './sanitizer';

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

export class OpenAIProvider implements AIProvider {
  public readonly name = 'openai';
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
    this.model = options.model || process.env.AI_MODEL || 'gpt-4o-mini';
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
    this.timeoutMs = options.timeoutMs ?? (parseInt(process.env.AI_TIMEOUT_MS || '10000', 10) || 10000);
    this.maxRetries = options.maxRetries ?? (parseInt(process.env.AI_MAX_RETRIES || '2', 10) || 2);
  }

  public async generateTypingInsight(input: CoachInputMetrics): Promise<ProviderInsightResult> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { systemPrompt, userPrompt } = buildCoachPrompt(input);
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const requestPayload = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
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
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!response.ok) {
          const status = response.status;
          let errorBody = '';
          try {
            errorBody = await response.text();
          } catch {
            // ignore
          }
          const cleanError = scrubSecrets(errorBody);

          // Fast-fail non-transient auth/client errors
          if (status === 400 || status === 401 || status === 403 || status === 404) {
            throw new Error(`OpenAI API client error (${status}): ${cleanError || 'Unauthorized or invalid request'}`);
          }

          // Transient errors (429, 500, 502, 503, 504)
          const isTransient = status === 429 || (status >= 500 && status <= 504);
          if (isTransient && attempt <= this.maxRetries) {
            aiLogger.warn(`OpenAI transient HTTP ${status}. Retrying (attempt ${attempt}/${this.maxRetries})...`);
            await this.delayBackoff(attempt);
            continue;
          }

          throw new Error(`OpenAI API error (${status}): ${cleanError}`);
        }

        const data = (await response.json()) as OpenAIChatResponse;
        if (data.error) {
          throw new Error(`OpenAI API error: ${scrubSecrets(data.error.message || 'Unknown error')}`);
        }

        const messageContent = data.choices?.[0]?.message?.content;
        if (!messageContent) {
          throw new Error('OpenAI API returned empty message content');
        }

        const insight = parseAndValidateInsight(messageContent);

        const tokensUsed = data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
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

        const isTransientNetwork = isAbort || err.name === 'FetchError' || err.code === 'ECONNRESET';
        if (isTransientNetwork && attempt <= this.maxRetries) {
          aiLogger.warn(`OpenAI network/timeout error. Retrying (attempt ${attempt}/${this.maxRetries})...`);
          await this.delayBackoff(attempt);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error('OpenAI API call failed after retries');
  }

  private async delayBackoff(attempt: number): Promise<void> {
    const delay = Math.min(2000, 150 * Math.pow(2, attempt) + Math.random() * 50);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
