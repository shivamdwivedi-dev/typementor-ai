/**
 * TypeMentor AI: Server-Side Anti-Cheat & Telemetry Verification Engine
 *
 * Independently validates client-submitted keystroke streams against
 * physiological human speed boundaries and mathematical cadence invariants.
 * Protects global leaderboards, Arena duels, and user statistics against:
 * 1. Fabricated / Tampered WPM & Accuracy client payloads
 * 2. Automated macro injectors and copy-paste bots
 * 3. Impossible physiological keystroke intervals
 */

export interface KeystrokeEntry {
  expectedKey: string;
  actualKey: string;
  reactionTime?: number;
  holdTime?: number;
  pauseDuration?: number;
  isMistake?: boolean;
  timestamp?: string | number | Date;
}

export interface TelemetryValidationInput {
  mode: string;
  duration: number;
  wpm: number;
  accuracy: number;
  keystrokes: KeystrokeEntry[];
}

export interface TelemetryValidationResult {
  isValid: boolean;
  reason?: string;
  verifiedWpm: number;
  verifiedAccuracy: number;
  flags: string[];
}

// Physiological upper bound for human touch typing (World record is ~216 WPM sustained)
const MAX_HUMAN_WPM = 280;

// Minimum realistic duration for a competitive scored test
const MIN_TEST_DURATION_SEC = 0.5;

export function validateTypingTelemetry(input: TelemetryValidationInput): TelemetryValidationResult {
  const { duration, wpm, accuracy, keystrokes } = input;
  const flags: string[] = [];

  const durationSec = Math.max(0, Number(duration) || 0);
  const claimedWpm = Math.max(0, Number(wpm) || 0);
  const claimedAcc = Math.max(0, Math.min(100, Number(accuracy) || 0));

  // 1. Physiological Upper Bound Check
  if (claimedWpm > MAX_HUMAN_WPM) {
    return {
      isValid: false,
      reason: `Claimed speed of ${claimedWpm} WPM exceeds maximum human physiological limit (${MAX_HUMAN_WPM} WPM).`,
      verifiedWpm: 0,
      verifiedAccuracy: 0,
      flags: ['EXCEEDS_MAX_HUMAN_WPM'],
    };
  }

  // 2. Aborted / Empty Tests
  if (!keystrokes || keystrokes.length === 0) {
    if (durationSec > 5 && claimedWpm > 0) {
      return {
        isValid: false,
        reason: 'Session contains zero keystroke logs but claims non-zero WPM velocity.',
        verifiedWpm: 0,
        verifiedAccuracy: 0,
        flags: ['ZERO_KEYSTROKES_POSITIVE_WPM'],
      };
    }
    return {
      isValid: true,
      verifiedWpm: 0,
      verifiedAccuracy: 100,
      flags: ['EMPTY_ABORTED_TEST'],
    };
  }

  // Calculate ground-truth metrics from raw keystrokes
  const totalKeys = keystrokes.length;
  const correctKeys = keystrokes.filter((k) => !k.isMistake).length;

  const derivedAccuracy = totalKeys > 0
    ? Math.round((correctKeys / totalKeys) * 100)
    : 100;

  const effectiveDurationSec = Math.max(MIN_TEST_DURATION_SEC, durationSec);
  const derivedNetWpm = Math.round(((correctKeys / 5) / (effectiveDurationSec / 60)) * 10) / 10;

  // 3. Cadence & Discrepancy Verification for substantive sessions (10+ keystrokes)
  if (totalKeys >= 10 && durationSec >= 2) {
    // Generous tolerance: accounts for client punctuation nuances, word boundary spacing, and timer jitter
    const tolerance = Math.max(18, derivedNetWpm * 0.35);
    const deltaWpm = Math.abs(claimedWpm - derivedNetWpm);

    if (deltaWpm > tolerance) {
      return {
        isValid: false,
        reason: `Telemetry validation failed: Claimed WPM (${claimedWpm}) deviates significantly from ground-truth keystroke velocity (${derivedNetWpm} WPM).`,
        verifiedWpm: derivedNetWpm,
        verifiedAccuracy: derivedAccuracy,
        flags: ['WPM_CADENCE_MISMATCH'],
      };
    }

    // Accuracy discrepancy check (> 25% discrepancy between keystroke error rate and claimed accuracy)
    const deltaAcc = Math.abs(claimedAcc - derivedAccuracy);
    if (deltaAcc > 25) {
      return {
        isValid: false,
        reason: `Accuracy validation failed: Claimed accuracy (${claimedAcc}%) does not match keystroke mistake ratio (${derivedAccuracy}%).`,
        verifiedWpm: derivedNetWpm,
        verifiedAccuracy: derivedAccuracy,
        flags: ['ACCURACY_MISMATCH'],
      };
    }
  }

  // 4. Macro / Bot Detection (30+ keys with unnatural identical intervals)
  if (totalKeys >= 30) {
    const reactionTimes = keystrokes
      .map((k) => Number(k.reactionTime))
      .filter((rt) => Number.isFinite(rt) && rt >= 0);

    if (reactionTimes.length >= 25) {
      const avgReaction = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
      
      // Physically impossible: average reaction time < 8ms across 25+ keys
      if (avgReaction < 8) {
        return {
          isValid: false,
          reason: 'Automated macro or script detected: keystroke intervals are below physical human latency.',
          verifiedWpm: 0,
          verifiedAccuracy: 0,
          flags: ['SUBHUMAN_REACTION_LATENCY'],
        };
      }

      // Zero-variance macro detection: every single reaction time is identical
      const allIdentical = reactionTimes.every((rt) => rt === reactionTimes[0]);
      if (allIdentical && reactionTimes[0] > 0) {
        return {
          isValid: false,
          reason: 'Synthetic cadence detected: constant invariant reaction times across consecutive keys.',
          verifiedWpm: 0,
          verifiedAccuracy: 0,
          flags: ['ZERO_VARIANCE_MACRO'],
        };
      }
    }
  }

  // Use ground-truth derived metrics for verified storage
  const verifiedWpm = totalKeys >= 5 ? derivedNetWpm : claimedWpm;
  const verifiedAccuracy = totalKeys >= 5 ? derivedAccuracy : claimedAcc;

  return {
    isValid: true,
    verifiedWpm,
    verifiedAccuracy,
    flags,
  };
}
