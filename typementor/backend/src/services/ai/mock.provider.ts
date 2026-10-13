import { AIProvider, CoachInputMetrics, ProviderInsightResult, TypingInsight } from './types';

export class MockAIProvider implements AIProvider {
  public readonly name = 'mock';
  public readonly model: string;
  private responseGenerator?: (input: CoachInputMetrics) => Promise<TypingInsight> | TypingInsight;
  private failureToThrow?: Error;

  constructor(options: {
    model?: string;
    mockInsight?: TypingInsight;
    responseGenerator?: (input: CoachInputMetrics) => Promise<TypingInsight> | TypingInsight;
    simulateError?: Error;
  } = {}) {
    this.model = options.model || 'mock-model-v1';
    if (options.simulateError) {
      this.failureToThrow = options.simulateError;
    } else if (options.mockInsight) {
      this.responseGenerator = () => options.mockInsight!;
    } else if (options.responseGenerator) {
      this.responseGenerator = options.responseGenerator;
    }
  }

  public setMockInsight(insight: TypingInsight): void {
    this.failureToThrow = undefined;
    this.responseGenerator = () => insight;
  }

  public setSimulatedError(err: Error): void {
    this.failureToThrow = err;
  }

  public async generateTypingInsight(input: CoachInputMetrics): Promise<ProviderInsightResult> {
    if (this.failureToThrow) {
      throw this.failureToThrow;
    }

    if (this.responseGenerator) {
      const insight = await this.responseGenerator(input);
      return {
        insight,
        tokensUsed: { promptTokens: 100, completionTokens: 80, totalTokens: 180 },
      };
    }

    // Default mock response
    return {
      insight: {
        summary: `Mock AI assessment for ${input.displayName}: speed is ${input.lifetimeWpm.toFixed(1)} WPM.`,
        strengths: ['Consistent home row cadence maintained.'],
        priorityAreas: [
          {
            area: 'accuracy',
            title: 'Improve accuracy',
            reason: 'Measured telemetry baseline',
            exercise: 'Standard mock drill',
            target: '95% accuracy',
          },
        ],
        nextSessionPlan: {
          durationMinutes: 10,
          targetWpm: Math.round(input.lifetimeWpm || 40),
          targetAccuracy: 95,
        },
      },
      tokensUsed: { promptTokens: 100, completionTokens: 80, totalTokens: 180 },
    };
  }
}
