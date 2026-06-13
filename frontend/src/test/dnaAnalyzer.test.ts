import { describe, it, expect } from 'vitest';
import { generateTypingDna, verifyTypingDna, TypingDnaProfile } from '../utils/dnaAnalyzer';
import { KeystrokeInfo } from '../store/TypingStore';

describe('Typing DNA Biometrics Analyzer', () => {
  it('should generate a profile from keystrokes', () => {
    const mockKeystrokes: KeystrokeInfo[] = [
      { expectedKey: 't', actualKey: 't', timestamp: 1000, holdTime: 85, reactionTime: 0, pauseDuration: 0, wordIndex: 0, isMistake: false },
      { expectedKey: 'h', actualKey: 'h', timestamp: 1120, holdTime: 70, reactionTime: 120, pauseDuration: 0, wordIndex: 0, isMistake: false },
      { expectedKey: 'e', actualKey: 'e', timestamp: 1210, holdTime: 95, reactionTime: 90, pauseDuration: 0, wordIndex: 0, isMistake: false },
    ];

    const profile = generateTypingDna(mockKeystrokes);
    expect(profile.dwellTimes['T']).toBe(85);
    expect(profile.dwellTimes['H']).toBe(70);
    expect(profile.dwellTimes['E']).toBe(95);
    expect(profile.flightTimes['T_H']).toBe(120);
    expect(profile.flightTimes['H_E']).toBe(90);
    expect(profile.averageHold).toBeGreaterThan(0);
    expect(profile.averageFlight).toBeGreaterThan(0);
  });

  it('should verify typing identity by matching identical profiles with 100% similarity', () => {
    const baseline: TypingDnaProfile = {
      dwellTimes: { 'T': 80, 'H': 70 },
      flightTimes: { 'T_H': 120 },
      averageHold: 75,
      averageFlight: 120,
      timestamp: Date.now()
    };

    const similarity = verifyTypingDna(baseline, baseline);
    expect(similarity).toBe(100);
  });

  it('should decrease similarity score for different typing behaviors', () => {
    const baseline: TypingDnaProfile = {
      dwellTimes: { 'T': 80, 'H': 70 },
      flightTimes: { 'T_H': 120 },
      averageHold: 75,
      averageFlight: 120,
      timestamp: Date.now()
    };

    const slowTyping: TypingDnaProfile = {
      dwellTimes: { 'T': 120, 'H': 110 }, // slower hold times
      flightTimes: { 'T_H': 240 }, // slower transitions
      averageHold: 115,
      averageFlight: 240,
      timestamp: Date.now()
    };

    const similarity = verifyTypingDna(baseline, slowTyping);
    expect(similarity).toBeLessThan(80); // should trigger lower similarity
  });
});
