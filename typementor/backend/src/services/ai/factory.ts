import { AIProvider, AIProviderConfig, SupportedAIProvider } from './types';
import { GeminiProvider } from './gemini.provider';
import { OpenAIProvider } from './openai.provider';
import { LocalRuleProvider } from './local.provider';
import { MockAIProvider } from './mock.provider';
import { aiLogger } from './sanitizer';

/**
 * Resolves the active AI provider configuration from environment variables or overrides.
 */
export function resolveAIConfig(overrides?: Partial<AIProviderConfig>): AIProviderConfig {
  const envProvider = (process.env.AI_PROVIDER || '').trim().toLowerCase() as SupportedAIProvider;
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const openaiKey = process.env.OPENAI_API_KEY || '';

  let provider: SupportedAIProvider = overrides?.provider || envProvider;

  if (!provider) {
    if (geminiKey.length > 0) {
      provider = 'gemini';
    } else if (openaiKey.length > 0) {
      provider = 'openai';
    } else {
      provider = 'local';
    }
  }

  const model = overrides?.model || process.env.AI_MODEL || (provider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash');
  const timeoutMs = overrides?.timeoutMs ?? (parseInt(process.env.AI_TIMEOUT_MS || '10000', 10) || 10000);
  const maxRetries = overrides?.maxRetries ?? (parseInt(process.env.AI_MAX_RETRIES || '2', 10) || 2);

  return {
    provider,
    model,
    apiKey: overrides?.apiKey || (provider === 'openai' ? openaiKey : geminiKey),
    timeoutMs,
    maxRetries,
  };
}

/**
 * Factory creating the configured AIProvider instance.
 * Fails safely to LocalRuleProvider if required third-party credentials are missing.
 */
export function createAIProvider(configOverrides?: Partial<AIProviderConfig>): AIProvider {
  const config = resolveAIConfig(configOverrides);

  switch (config.provider) {
    case 'gemini': {
      if (!config.apiKey) {
        aiLogger.warn('AI_PROVIDER=gemini specified but GEMINI_API_KEY is missing. Defaulting to local rule coach.');
        return new LocalRuleProvider();
      }
      return new GeminiProvider({
        model: config.model,
        apiKey: config.apiKey,
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
      });
    }

    case 'openai': {
      if (!config.apiKey) {
        aiLogger.warn('AI_PROVIDER=openai specified but OPENAI_API_KEY is missing. Defaulting to local rule coach.');
        return new LocalRuleProvider();
      }
      return new OpenAIProvider({
        model: config.model,
        apiKey: config.apiKey,
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
      });
    }

    case 'mock':
      return new MockAIProvider({ model: config.model });

    case 'local':
    default:
      return new LocalRuleProvider();
  }
}
