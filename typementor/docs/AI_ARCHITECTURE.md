# TypeMentor AI Coaching Engine — Architecture & Provider Guide

## 1. Overview & Architecture

TypeMentor AI features a production-grade, provider-agnostic AI coaching engine designed to analyze typing telemetry and deliver evidence-based diagnostic feedback and drills.

The architecture decouples business logic from external cloud LLMs:

```
┌────────────────────────────────────────────────────────┐
│                   Client (Frontend)                    │
│    Adaptive AI Coach (AICoach.tsx)                     │
└───────────────────────────┬────────────────────────────┘
                            │ GET /api/coach/insights
┌───────────────────────────▼────────────────────────────┐
│               CoachController (Express API)            │
│               extracts authenticated userId            │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    AIService Orchestrator              │
│    - In-Memory Cache (TTL 60s)                         │
│    - Observability & Timing                            │
│    - Safe Fallback Orchestration                       │
└─────────────┬───────────────────────────┬──────────────┘
              │                           │
┌─────────────▼──────────────┐ ┌──────────▼──────────────┐
│     Metrics Extractor      │ │     Provider Factory    │
│  - Queries user stats      │ │  Resolves AI_PROVIDER:  │
│  - Top 5 mistakes          │ │  - Gemini (default)     │
│  - Reaction time patterns  │ │  - OpenAI               │
│  - Performance trend       │ │  - Local Rule Engine    │
│  - Strips all PII          │ │  - Mock (tests)         │
└────────────────────────────┘ └──────────┬──────────────┘
                                          │
                         ┌────────────────▼────────────────┐
                         │      Provider Execution         │
                         │  - Timeout (AbortController)    │
                         │  - Transient Retries (429/503)  │
                         │  - Zod Schema Validation        │
                         │  - Secret Scrubber              │
                         └────────────────┬────────────────┘
                                          │ (on failure / offline)
                         ┌────────────────▼────────────────┐
                         │       LocalRuleProvider         │
                         │  Deterministic Rule Coach       │
                         │  Guaranteed Valid Schema        │
                         └─────────────────────────────────┘
```

---

## 2. Environment Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `AI_PROVIDER` | `string` | `'gemini'` (if key set), else `'local'` | Selected provider: `'gemini'`, `'openai'`, `'local'`, `'mock'`. |
| `AI_MODEL` | `string` | `'gemini-1.5-flash'` / `'gpt-4o-mini'` | Model identifier. |
| `AI_TIMEOUT_MS` | `number` | `10000` | Maximum wait duration before aborting external AI requests. |
| `AI_MAX_RETRIES` | `number` | `2` | Maximum transient retry attempts (for HTTP 429/500/502/503/504). |
| `GEMINI_API_KEY` | `string` | `""` | Google Gemini API key (backend only). |
| `OPENAI_API_KEY` | `string` | `""` | OpenAI API key (backend only). |

---

## 3. Strict Response Contract (Zod Validated)

All providers must output JSON strictly validated by `TypingInsightSchema`:

```typescript
{
  summary: string;           // 1-2 sentence evidence-based diagnostic summary
  strengths: string[];       // Observed strengths citing numbers
  priorityAreas: [           // Ranked actionable improvement areas
    {
      area: string;          // e.g. "accuracy", "speed", "weak_keys"
      title: string;         // Actionable title
      reason: string;        // Evidence citing metrics
      exercise: string;      // Specific mechanical drill
      target: string;        // Quantifiable target milestone
    }
  ];
  nextSessionPlan: {
    durationMinutes: number; // e.g. 10
    targetWpm: number;       // e.g. 45
    targetAccuracy: number;  // e.g. 96
  };
}
```

If a cloud provider returns invalid JSON or fails schema validation:
1. A sanitized warning is logged.
2. The orchestrator immediately falls back to `LocalRuleProvider`.
3. The client receives valid structured data with `meta.fallbackUsed = true`.

---

## 4. Privacy & Security Guarantees

1. **No PII Transmission:** Email addresses, password hashes, and user identifiers are stripped before metrics reach prompt builders or external APIs.
2. **No Raw Keystrokes:** Raw keystroke streams are never sent to external AI providers. Only high-level aggregates (speed pattern, error counts) are evaluated.
3. **Secret Scrubbing:** All API keys, authorization tokens, and query credentials are automatically scrubbed from logs and error traces (`scrubSecrets`).
4. **Prompt Injection Mitigation:** All user-supplied text (such as display names) is sanitized (`sanitizeUntrustedText`), stripped of control characters/delimiters, and wrapped in `<user_metadata>` tags with strict system instructions never to follow user-contained commands.
5. **No Blind Retries:** Non-transient errors (HTTP 400 Bad Request, 401/403 Invalid API Key) fail immediately without retrying, preventing credential hammer loops.

---

## 5. How to Add a New AI Provider

1. Create a new provider file in `backend/src/services/ai/<name>.provider.ts` implementing `AIProvider`:
   ```typescript
   import { AIProvider, CoachInputMetrics, ProviderInsightResult } from './types';
   import { buildCoachPrompt, parseAndValidateInsight } from './prompt.builder';

   export class CustomProvider implements AIProvider {
     public readonly name = 'custom';
     public readonly model: string;

     constructor(options: { model?: string; apiKey?: string }) {
       this.model = options.model || 'custom-v1';
     }

     public async generateTypingInsight(input: CoachInputMetrics): Promise<ProviderInsightResult> {
       const { systemPrompt, userPrompt } = buildCoachPrompt(input);
       // 1. Call custom API with timeout signal
       // 2. Parse and validate response with parseAndValidateInsight(rawText)
       // 3. Return { insight, tokensUsed }
     }
   }
   ```
2. Register the provider in `backend/src/services/ai/factory.ts` under `createAIProvider()`.
3. Add any required environment variables to `backend/.env.example` and `types.ts`.

---

## 6. How to Update the Prompt Version

1. Open `backend/src/services/ai/prompt.builder.ts`.
2. Increment `PROMPT_VERSION` (e.g. `'v1.2'`).
3. Modify `buildCoachPrompt` while maintaining the JSON schema instructions.
4. Run `npm test -- --run` to ensure all prompt building and injection sanitization tests pass.

---

## 7. Testing Instructions

All AI tests use mocked provider responses and zero external network calls:

```bash
cd backend
npm test -- --run src/__tests__/ai.test.ts
```

Tests verify:
- Provider selection via factory.
- Successful structured AI responses.
- Malformed JSON handling and Zod schema validation.
- AbortController timeout handling.
- Transient retries on HTTP 429/503.
- Fast-failure on HTTP 401/403 auth errors.
- Local rule-based coach accuracy and weakness targeting.
- Prompt injection resistance on user display names.
- Complete absence of API keys in logs and error traces.
