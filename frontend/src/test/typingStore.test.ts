import { describe, it, expect, beforeEach } from 'vitest';
import { useTypingStore } from '../store/TypingStore';

describe('TypingStore Telemetry Logic', () => {
  beforeEach(() => {
    useTypingStore.getState().initializeSession('the quick brown fox');
  });

  it('should initialize session metrics correctly', () => {
    const state = useTypingStore.getState();
    expect(state.words).toBe('the quick brown fox');
    expect(state.currentIndex).toBe(0);
    expect(state.wpm).toBe(0);
    expect(state.accuracy).toBe(100);
    expect(state.isCompleted).toBe(false);
  });

  it('should progress current index on correct key press', () => {
    useTypingStore.getState().startSession();
    useTypingStore.getState().recordKeystroke({
      expectedKey: 't',
      actualKey: 't',
      timestamp: Date.now(),
      wordIndex: 0,
      holdTime: 80,
      isMistake: false,
    });

    const state = useTypingStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.accuracy).toBe(100);
    expect(state.keystrokes[0].expectedKey).toBe('t');
    expect(state.keystrokes[0].isMistake).toBe(false);
  });

  it('should log accuracy decrease on mistakes', () => {
    useTypingStore.getState().startSession();
    useTypingStore.getState().recordKeystroke({
      expectedKey: 't',
      actualKey: 'r', // typed r instead of t
      timestamp: Date.now(),
      wordIndex: 0,
      holdTime: 80,
      isMistake: true,
    });

    const state = useTypingStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.accuracy).toBe(0); // 0/1 correct is 0% accuracy
    expect(state.keystrokes[0].isMistake).toBe(true);
  });

  it('should handle backspace by stepping back index', () => {
    useTypingStore.getState().startSession();
    useTypingStore.getState().recordKeystroke({
      expectedKey: 't',
      actualKey: 't',
      timestamp: Date.now(),
      wordIndex: 0,
      holdTime: 80,
      isMistake: false,
    });
    
    useTypingStore.getState().handleBackspace();

    const state = useTypingStore.getState();
    expect(state.currentIndex).toBe(0);
    expect(state.keystrokes.length).toBe(0);
    expect(state.backspaceCount).toBe(1);
  });
});
