import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  FINGER_DATA,
  SHIFTED_SYMBOL_TO_BASE_KEY,
  getBaseKeyForChar,
  isShiftedChar,
  getFingerForChar,
} from '../utils/fingerMapping';
import VirtualKeyboard from '../components/VirtualKeyboard';

describe('VirtualKeyboard & Shifted-Symbol Finger Mapping', () => {
  it('maps lowercase and uppercase letters to their physical base key', () => {
    expect(getBaseKeyForChar('a')).toBe('A');
    expect(getBaseKeyForChar('A')).toBe('A');
    expect(isShiftedChar('a')).toBe(false);
    expect(isShiftedChar('A')).toBe(true);

    const lowerInfo = getFingerForChar('f');
    expect(lowerInfo?.baseKey).toBe('F');
    expect(lowerInfo?.requiresShift).toBe(false);
    expect(lowerInfo?.shiftFingerId).toBeUndefined();

    const upperInfo = getFingerForChar('F');
    expect(upperInfo?.baseKey).toBe('F');
    expect(upperInfo?.requiresShift).toBe(true);
    expect(FINGER_DATA[upperInfo!.charFingerId].hand).toBe('left');
    expect(upperInfo?.shiftFingerId).toBe('right_pinky');
  });

  it('maps numbers and unshifted punctuation without Shift', () => {
    const unshiftedChars = ['1', '5', '0', '-', '=', '[', ']', '\\', ';', "'", ',', '.', '/', '`'];
    for (const ch of unshiftedChars) {
      expect(getBaseKeyForChar(ch)).toBe(ch);
      expect(isShiftedChar(ch)).toBe(false);
      const info = getFingerForChar(ch);
      expect(info).not.toBeNull();
      expect(info?.baseKey).toBe(ch);
      expect(info?.requiresShift).toBe(false);
      expect(info?.shiftFingerId).toBeUndefined();
    }
  });

  it('explicitly maps every shifted symbol to its physical base key and opposite-hand Shift', () => {
    const expectedPairs: Record<string, string> = {
      '~': '`',
      '!': '1',
      '@': '2',
      '#': '3',
      '$': '4',
      '%': '5',
      '^': '6',
      '&': '7',
      '*': '8',
      '(': '9',
      ')': '0',
      '_': '-',
      '+': '=',
      '{': '[',
      '}': ']',
      '|': '\\',
      ':': ';',
      '"': "'",
      '<': ',',
      '>': '.',
      '?': '/',
    };

    for (const [symbol, baseKey] of Object.entries(expectedPairs)) {
      expect(SHIFTED_SYMBOL_TO_BASE_KEY[symbol]).toBe(baseKey);
      expect(getBaseKeyForChar(symbol)).toBe(baseKey);
      expect(isShiftedChar(symbol)).toBe(true);

      const info = getFingerForChar(symbol);
      expect(info).not.toBeNull();
      expect(info?.baseKey).toBe(baseKey);
      expect(info?.requiresShift).toBe(true);
      const hand = FINGER_DATA[info!.charFingerId].hand;
      expect(info?.shiftFingerId).toBe(hand === 'left' ? 'right_pinky' : 'left_pinky');
    }
  });

  it('highlights only the base key (and NOT Shift) for unshifted letters, numbers, and punctuation', () => {
    const { container, rerender } = render(<VirtualKeyboard currentExpectedChar="7" />);

    // Expected char is '7'
    expect(container.querySelector('[data-key="7"]')?.getAttribute('data-active')).toBe('true');
    expect(container.querySelector('[data-key="ShiftLeft"]')?.getAttribute('data-active')).toBe('false');
    expect(container.querySelector('[data-key="ShiftRight"]')?.getAttribute('data-active')).toBe('false');

    // Expected char is ';'
    rerender(<VirtualKeyboard currentExpectedChar=";" />);
    expect(container.querySelector('[data-key=";"]')?.getAttribute('data-active')).toBe('true');
    expect(container.querySelector('[data-key="ShiftLeft"]')?.getAttribute('data-active')).toBe('false');
    expect(container.querySelector('[data-key="ShiftRight"]')?.getAttribute('data-active')).toBe('false');

    // Expected char is lowercase 'a'
    rerender(<VirtualKeyboard currentExpectedChar="a" />);
    expect(container.querySelector('[data-key="A"]')?.getAttribute('data-active')).toBe('true');
    expect(container.querySelector('[data-key="ShiftLeft"]')?.getAttribute('data-active')).toBe('false');
    expect(container.querySelector('[data-key="ShiftRight"]')?.getAttribute('data-active')).toBe('false');
  });

  it('highlights both the physical base key and opposite-hand Shift key for shifted symbols and uppercase letters', () => {
    // '!' is typed with Left Pinky on '1' + Right Shift
    const { container, rerender } = render(<VirtualKeyboard currentExpectedChar="!" />);

    expect(container.querySelector('[data-key="1"]')?.getAttribute('data-active')).toBe('true');
    expect(container.querySelector('[data-key="ShiftRight"]')?.getAttribute('data-active')).toBe('true');
    expect(container.querySelector('[data-key="ShiftLeft"]')?.getAttribute('data-active')).toBe('false');

    // '?' is typed with Right Pinky on '/' + Left Shift
    rerender(<VirtualKeyboard currentExpectedChar="?" />);

    expect(container.querySelector('[data-key="/"]')?.getAttribute('data-active')).toBe('true');
    expect(container.querySelector('[data-key="ShiftLeft"]')?.getAttribute('data-active')).toBe('true');
    expect(container.querySelector('[data-key="ShiftRight"]')?.getAttribute('data-active')).toBe('false');

    // '{' is typed with Right Pinky on '[' + Left Shift
    rerender(<VirtualKeyboard currentExpectedChar="{" />);

    expect(container.querySelector('[data-key="["]')?.getAttribute('data-active')).toBe('true');
    expect(container.querySelector('[data-key="ShiftLeft"]')?.getAttribute('data-active')).toBe('true');
    expect(container.querySelector('[data-key="ShiftRight"]')?.getAttribute('data-active')).toBe('false');

    // 'G' is typed with Left Index on 'G' + Right Shift
    rerender(<VirtualKeyboard currentExpectedChar="G" />);

    expect(container.querySelector('[data-key="G"]')?.getAttribute('data-active')).toBe('true');
    expect(container.querySelector('[data-key="ShiftRight"]')?.getAttribute('data-active')).toBe('true');
    expect(container.querySelector('[data-key="ShiftLeft"]')?.getAttribute('data-active')).toBe('false');
  });
});
