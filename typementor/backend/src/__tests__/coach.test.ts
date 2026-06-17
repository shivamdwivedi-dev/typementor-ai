import { describe, it, expect } from 'vitest';

// Let's test the key risk calculation bounds
// Given historical mistakes, we want to ensure risk percentage values are clamped correctly between 10% and 98%
function calculateClampedRisk(mistakeCount: number, totalMistakes: number, wpmAccelerating: boolean): number {
  const basePercentage = totalMistakes > 0 ? (mistakeCount / totalMistakes) * 80 : 20;
  let risk = Math.min(95, Math.max(10, Math.round(basePercentage + 15)));

  if (wpmAccelerating) {
    risk = Math.min(98, risk + 8);
  }

  return risk;
}

describe('Coach Prediction Engine tests', () => {
  it('should clamp low mistake counts correctly', () => {
    const risk = calculateClampedRisk(0, 0, false);
    expect(risk).toBe(35); // 20 + 15 = 35
  });

  it('should increase risk when user is accelerating typing speed', () => {
    const baseRisk = calculateClampedRisk(10, 100, false);
    const speedRisk = calculateClampedRisk(10, 100, true);
    
    expect(speedRisk).toBeGreaterThan(baseRisk);
    expect(speedRisk).toBeLessThanOrEqual(98);
  });
});
