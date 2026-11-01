import { describe, it, expect } from 'vitest';
import { validateTypingTelemetry } from '../services/anti-cheat.service';

describe('Server-Side Anti-Cheat & Telemetry Verification Engine', () => {
  it('accepts legitimate typing sessions within normal human variance', () => {
    // 50 keystrokes typed over 15 seconds: (50/5)/(15/60) = 40 WPM
    const keystrokes = Array.from({ length: 50 }, (_, i) => ({
      expectedKey: 'a',
      actualKey: 'a',
      reactionTime: 120 + (i % 20) * 5,
      isMistake: false,
    }));

    const result = validateTypingTelemetry({
      mode: 'timed',
      duration: 15,
      wpm: 40,
      accuracy: 100,
      keystrokes,
    });

    expect(result.isValid).toBe(true);
    expect(result.verifiedWpm).toBe(40);
    expect(result.verifiedAccuracy).toBe(100);
    expect(result.flags).toEqual([]);
  });

  it('rejects speeds exceeding the human physiological limit (>280 WPM)', () => {
    const keystrokes = Array.from({ length: 200 }, () => ({
      expectedKey: 'e',
      actualKey: 'e',
      reactionTime: 50,
      isMistake: false,
    }));

    const result = validateTypingTelemetry({
      mode: 'words',
      duration: 30,
      wpm: 295,
      accuracy: 100,
      keystrokes,
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('exceeds maximum human physiological limit');
    expect(result.flags).toContain('EXCEEDS_MAX_HUMAN_WPM');
  });

  it('rejects blatant speed fabrication (claimed 180 WPM with only 15 keys over 30s)', () => {
    // 15 keys over 30s = 6 WPM, but client claims 180 WPM
    const keystrokes = Array.from({ length: 15 }, () => ({
      expectedKey: 'x',
      actualKey: 'x',
      reactionTime: 150,
      isMistake: false,
    }));

    const result = validateTypingTelemetry({
      mode: 'timed',
      duration: 30,
      wpm: 180,
      accuracy: 98,
      keystrokes,
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('deviates significantly from ground-truth keystroke velocity');
    expect(result.flags).toContain('WPM_CADENCE_MISMATCH');
  });

  it('rejects sessions with zero keystrokes claiming positive WPM', () => {
    const result = validateTypingTelemetry({
      mode: 'timed',
      duration: 30,
      wpm: 85,
      accuracy: 95,
      keystrokes: [],
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('zero keystroke logs but claims non-zero WPM');
    expect(result.flags).toContain('ZERO_KEYSTROKES_POSITIVE_WPM');
  });

  it('detects automated subhuman macro reaction latencies (< 8ms average)', () => {
    // 35 keys with 2ms reaction time (paste script)
    const keystrokes = Array.from({ length: 35 }, () => ({
      expectedKey: 't',
      actualKey: 't',
      reactionTime: 2,
      isMistake: false,
    }));

    const result = validateTypingTelemetry({
      mode: 'timed',
      duration: 5,
      wpm: 80,
      accuracy: 100,
      keystrokes,
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Automated macro or script detected');
    expect(result.flags).toContain('SUBHUMAN_REACTION_LATENCY');
  });

  it('detects synthetic zero-variance robotic keystroke timing', () => {
    // 35 keys with exact identical 50ms interval (bot loop)
    const keystrokes = Array.from({ length: 35 }, () => ({
      expectedKey: 'o',
      actualKey: 'o',
      reactionTime: 50,
      isMistake: false,
    }));

    const result = validateTypingTelemetry({
      mode: 'timed',
      duration: 10,
      wpm: 42,
      accuracy: 100,
      keystrokes,
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Synthetic cadence detected');
    expect(result.flags).toContain('ZERO_VARIANCE_MACRO');
  });

  it('tolerates small natural timer jitter and client rounding differences', () => {
    // 52 keys over 15.2s = ~41.05 WPM. Client reports 43 WPM
    const keystrokes = Array.from({ length: 52 }, (_, i) => ({
      expectedKey: 'r',
      actualKey: 'r',
      reactionTime: 110 + (i % 7) * 12,
      isMistake: false,
    }));

    const result = validateTypingTelemetry({
      mode: 'timed',
      duration: 15.2,
      wpm: 43,
      accuracy: 100,
      keystrokes,
    });

    expect(result.isValid).toBe(true);
    expect(result.verifiedWpm).toBeCloseTo(41.1, 1);
  });
});
