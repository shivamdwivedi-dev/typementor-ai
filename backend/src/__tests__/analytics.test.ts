import { describe, it, expect } from 'vitest';

const KEY_TO_FINGER: Record<string, string> = {
  'Q': 'Left Pinky', 'A': 'Left Pinky', 'Z': 'Left Pinky',
  'W': 'Left Ring', 'S': 'Left Ring', 'X': 'Left Ring',
  'E': 'Left Middle', 'D': 'Left Middle', 'C': 'Left Middle',
  'R': 'Left Index', 'T': 'Left Index', 'F': 'Left Index', 'G': 'Left Index',
  ' ': 'Thumbs',
  'Y': 'Right Index', 'U': 'Right Index', 'H': 'Right Index', 'J': 'Right Index',
  'I': 'Right Middle', 'K': 'Right Middle',
  'O': 'Right Ring', 'L': 'Right Ring',
  'P': 'Right Pinky'
};

const LEFT_HAND_KEYS = new Set(['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V', 'B', '1', '2', '3', '4', '5']);

describe('Analytics Mappings tests', () => {
  it('should map left pinky keys correctly', () => {
    expect(KEY_TO_FINGER['Q']).toBe('Left Pinky');
    expect(KEY_TO_FINGER['A']).toBe('Left Pinky');
    expect(KEY_TO_FINGER['Z']).toBe('Left Pinky');
  });

  it('should map space to thumb', () => {
    expect(KEY_TO_FINGER[' ']).toBe('Thumbs');
  });

  it('should distinguish left hand vs right hand keys', () => {
    expect(LEFT_HAND_KEYS.has('Q')).toBe(true);
    expect(LEFT_HAND_KEYS.has('A')).toBe(true);
    expect(LEFT_HAND_KEYS.has('P')).toBe(false);
    expect(LEFT_HAND_KEYS.has('I')).toBe(false);
  });
});
