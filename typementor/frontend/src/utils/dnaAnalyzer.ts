import { KeystrokeInfo } from '../store/TypingStore';

export interface TypingDnaProfile {
  dwellTimes: Record<string, number>; // average key hold times
  flightTimes: Record<string, number>; // average digraph transition times
  averageHold: number;
  averageFlight: number;
  timestamp: number;
}

// Generates a biometric Typing DNA profile from keystroke logs
export function generateTypingDna(keystrokes: KeystrokeInfo[]): TypingDnaProfile {
  const dwellTimes: Record<string, number[]> = {};
  const flightTimes: Record<string, number[]> = {};

  keystrokes.forEach((ks, index) => {
    const key = ks.expectedKey.toUpperCase();
    if (key.length !== 1) return;

    // Dwell Time (Hold Time)
    if (!dwellTimes[key]) dwellTimes[key] = [];
    dwellTimes[key].push(ks.holdTime);

    // Flight Time (Transition speed from previous key)
    if (index > 0) {
      const prevKey = keystrokes[index - 1].expectedKey.toUpperCase();
      if (prevKey.length === 1) {
        const digraph = `${prevKey}_${key}`;
        if (!flightTimes[digraph]) flightTimes[digraph] = [];
        // ReactionTime matches the time elapsed between keystrokes
        flightTimes[digraph].push(ks.reactionTime);
      }
    }
  });

  // Calculate averages
  const avgDwell: Record<string, number> = {};
  let dwellSum = 0;
  let dwellCount = 0;
  Object.keys(dwellTimes).forEach(key => {
    const arr = dwellTimes[key];
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    avgDwell[key] = Math.round(avg);
    dwellSum += avg;
    dwellCount++;
  });

  const avgFlight: Record<string, number> = {};
  let flightSum = 0;
  let flightCount = 0;
  Object.keys(flightTimes).forEach(digraph => {
    const arr = flightTimes[digraph];
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    avgFlight[digraph] = Math.round(avg);
    flightSum += avg;
    flightCount++;
  });

  return {
    dwellTimes: avgDwell,
    flightTimes: avgFlight,
    averageHold: dwellCount > 0 ? Math.round(dwellSum / dwellCount) : 80,
    averageFlight: flightCount > 0 ? Math.round(flightSum / flightCount) : 150,
    timestamp: Date.now()
  };
}

// Compare a test profile against a baseline profile
// Returns a similarity score percentage (0 - 100%)
export function verifyTypingDna(baseline: TypingDnaProfile, test: TypingDnaProfile): number {
  let score = 0;
  let matches = 0;

  // 1. Compare Dwell Times
  Object.keys(baseline.dwellTimes).forEach(key => {
    if (test.dwellTimes[key]) {
      const baseVal = baseline.dwellTimes[key];
      const testVal = test.dwellTimes[key];
      const diff = Math.abs(baseVal - testVal);
      // If difference is small, score is high
      // E.g. if diff is 0ms -> 100%, if diff >= 100ms -> 0%
      const match = Math.max(0, 100 - (diff * 1.5));
      score += match;
      matches++;
    }
  });

  // 2. Compare Flight Times (digraphs)
  Object.keys(baseline.flightTimes).forEach(digraph => {
    if (test.flightTimes[digraph]) {
      const baseVal = baseline.flightTimes[digraph];
      const testVal = test.flightTimes[digraph];
      const diff = Math.abs(baseVal - testVal);
      // E.g. if diff is 0ms -> 100%, if diff >= 200ms -> 0%
      const match = Math.max(0, 100 - (diff * 0.8));
      score += match;
      matches++;
    }
  });

  // Average hold match
  const holdDiff = Math.abs(baseline.averageHold - test.averageHold);
  score += Math.max(0, 100 - (holdDiff * 2));
  matches++;

  return matches > 0 ? Math.round(score / matches) : 100;
}
