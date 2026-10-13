import { AIProvider, CoachInputMetrics, ProviderInsightResult, TypingInsight } from './types';

/**
 * Intelligent deterministic local rule-based AI coach provider.
 * Serves as both an offline engine and the zero-dependency resilience fallback
 * when third-party cloud providers are down, misconfigured, or returning invalid schemas.
 */
export class LocalRuleProvider implements AIProvider {
  public readonly name = 'local';
  public readonly model = 'rule-engine-v1';

  public async generateTypingInsight(input: CoachInputMetrics): Promise<ProviderInsightResult> {
    const insight = this.createRuleInsight(input);
    return {
      insight,
    };
  }

  public createRuleInsight(metrics: CoachInputMetrics): TypingInsight {
    const {
      displayName,
      lifetimeWpm,
      lifetimeAccuracy,
      practiceHours,
      totalSessions,
      topMistakes,
      totalMistakesCount,
      speedPattern,
      recentAverageWpm,
      recentAverageAccuracy,
      recentAverageConsistency,
      recentTrend,
    } = metrics;

    // ── Case 1: Brand New User (Insufficient History) ──────────────────────────
    if (totalSessions === 0 || topMistakes.length === 0) {
      return {
        summary: `Welcome to TypeMentor, ${displayName}! Your biometric profile is initializing. Complete your first practice sessions to unlock deep digraph transition and keystroke flight analysis.`,
        strengths: [
          'Account setup and baseline telemetry tracking successfully activated.',
          'Ready to establish home-row anchor fundamentals and initial cadence.',
        ],
        priorityAreas: [
          {
            area: 'baseline',
            title: 'Establish Home Row Foundation',
            reason: 'Zero historical practice sessions recorded.',
            exercise: 'Begin with Level 1 Academy drills focusing on ASDF and JKL; keys.',
            target: 'Complete 3 guided practice sessions with accuracy above 92%.',
          },
        ],
        nextSessionPlan: {
          durationMinutes: 5,
          targetWpm: 35,
          targetAccuracy: 95,
        },
      };
    }

    // ── Case 2: Established User Metrics ───────────────────────────────────────
    const currentWpm = recentAverageWpm > 0 ? recentAverageWpm : (lifetimeWpm || 40);
    const currentAcc = recentAverageAccuracy > 0 ? recentAverageAccuracy : (lifetimeAccuracy || 90);
    const topMistake = topMistakes[0];

    const strengths: string[] = [];
    if (currentAcc >= 95) {
      strengths.push(`Exceptional accuracy of ${currentAcc.toFixed(1)}% demonstrates disciplined finger placement.`);
    } else if (currentAcc >= 90) {
      strengths.push(`Solid accuracy baseline of ${currentAcc.toFixed(1)}% across ${totalSessions} sessions.`);
    }

    if (currentWpm >= 65) {
      strengths.push(`High typing velocity maintained at an average of ${currentWpm.toFixed(1)} WPM.`);
    } else if (practiceHours > 0.5) {
      strengths.push(`Logged ${practiceHours.toFixed(2)} hours of deliberate practice with consistent cadence.`);
    } else {
      strengths.push(`Active session consistency currently averaging ${recentAverageConsistency.toFixed(0)}%.`);
    }

    if (strengths.length === 0) {
      strengths.push(`Baseline tempo established at ${currentWpm.toFixed(1)} WPM.`);
    }

    // Diagnostic summary
    let summary = `Based on your recent logs, your current average speed is ${currentWpm.toFixed(1)} WPM with ${currentAcc.toFixed(1)}% accuracy.`;
    if (topMistake) {
      summary += ` You mistyped '${topMistake.pressedKey}' instead of '${topMistake.expectedKey}' ${topMistake.count} times.`;
    }

    // Priority Areas based on measured patterns
    const priorityAreas = [];

    // Priority 1: Accuracy / Pacing
    if (currentAcc < 92) {
      priorityAreas.push({
        area: 'accuracy',
        title: 'Stabilize Finger Placement & Slow Down',
        reason: `Current accuracy is ${currentAcc.toFixed(1)}% (below recommended 92% threshold), causing high error recovery penalties.`,
        exercise: `Pace your keystrokes down by 10% to approximately ${Math.round(currentWpm * 0.9)} WPM to solidify muscle memory before accelerating.`,
        target: `Achieve 95%+ accuracy in next 3 consecutive sessions.`,
      });
    } else {
      priorityAreas.push({
        area: 'consistency',
        title: 'Maintain Rhythm & Flow',
        reason: `Your accuracy is strong at ${currentAcc.toFixed(1)}%, with a recent ${recentTrend} performance trend.`,
        exercise: `Focus on metronomic keypress intervals without hesitation between word spaces.`,
        target: `Maintain a consistency score above 85% across all 60-second timed sprints.`,
      });
    }

    // Priority 2: Weak Keys / Speed Pattern
    if (topMistake) {
      if (speedPattern === 'fast_mistakes') {
        priorityAreas.push({
          area: 'weak_keys',
          title: `Address High-Speed Confusion on '${topMistake.expectedKey}'`,
          reason: `Keystroke flight times under 120ms frequently lead to accidentally striking '${topMistake.pressedKey}' (${topMistake.count} times logged).`,
          exercise: `Practice deliberate slow digraph drills combining '${topMistake.expectedKey}' with adjacent home-row letters.`,
          target: `Reduce error count on '${topMistake.expectedKey}' by 50% in the next lesson.`,
        });
      } else {
        priorityAreas.push({
          area: 'weak_keys',
          title: `Reinforce Finger Anchor for '${topMistake.expectedKey}'`,
          reason: `Repeated hesitation and incorrect key substitution '${topMistake.pressedKey}' indicates finger placement ambiguity.`,
          exercise: `Run targeted Recovery Drills isolating the assigned finger column for '${topMistake.expectedKey}'.`,
          target: `Zero mistypes of '${topMistake.expectedKey}' on your next drill.`,
        });
      }
    }

    // Compute next session targets
    const targetWpm = currentAcc < 92
      ? Math.max(20, Math.round(currentWpm * 0.95))
      : Math.round(currentWpm * 1.05);

    const targetAccuracy = currentAcc < 92 ? 95 : Math.min(99, Math.round(currentAcc));

    return {
      summary,
      strengths,
      priorityAreas,
      nextSessionPlan: {
        durationMinutes: 10,
        targetWpm,
        targetAccuracy,
      },
    };
  }
}
