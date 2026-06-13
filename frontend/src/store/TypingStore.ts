import { create } from 'zustand';

export interface KeystrokeInfo {
  expectedKey: string;
  actualKey: string;
  timestamp: number;
  wordIndex: number;
  reactionTime: number; // ms since previous key
  holdTime: number; // ms key was pressed down
  pauseDuration: number; // idle time before typing this key
  isMistake: boolean;
}

export interface FinalSessionResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  focusScore: number;
  backspaceCount: number;
  correctionCount: number;
  backspaceHistory?: Array<{ timestamp: number; isAfterMistake: boolean }>;
}

interface TypingState {
  words: string;
  currentIndex: number;
  keystrokes: KeystrokeInfo[];
  backspaceCount: number;
  correctionCount: number;
  backspaceHistory: Array<{ timestamp: number; isAfterMistake: boolean }>;
  startTime: number | null;
  endTime: number | null;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  focusScore: number;
  isActive: boolean;
  isCompleted: boolean;
  mode: string;
  difficulty: number;
  riskKeys: Record<string, number>;
  predictionAccuracy: number | null;
  finalResult: FinalSessionResult | null;

  initializeSession: (text: string, mode?: string, difficulty?: number, riskKeys?: Record<string, number>) => void;
  startSession: () => void;
  recordKeystroke: (info: Omit<KeystrokeInfo, 'reactionTime' | 'pauseDuration'>) => void;
  handleBackspace: () => void;
  completeSession: () => void;
  resetSession: () => void;
}

export const useTypingStore = create<TypingState>((set, get) => {
  return {
    words: '',
    currentIndex: 0,
    keystrokes: [],
    backspaceCount: 0,
    correctionCount: 0,
    backspaceHistory: [],
    startTime: null,
    endTime: null,
    wpm: 0,
    rawWpm: 0,
    accuracy: 100,
    consistency: 100,
    focusScore: 100,
    isActive: false,
    isCompleted: false,
    mode: 'English',
    difficulty: 1,
    riskKeys: {},
    predictionAccuracy: null,
    finalResult: null,

    initializeSession: (text, mode = 'English', difficulty = 1, riskKeys = {}) => {
      set({
        words: text,
        currentIndex: 0,
        keystrokes: [],
        backspaceCount: 0,
        correctionCount: 0,
        backspaceHistory: [],
        startTime: null,
        endTime: null,
        wpm: 0,
        rawWpm: 0,
        accuracy: 100,
        consistency: 100,
        focusScore: 100,
        isActive: false,
        isCompleted: false,
        mode,
        difficulty,
        riskKeys,
        predictionAccuracy: null,
        finalResult: null,
      });
    },

    startSession: () => {
      set({
        startTime: Date.now(),
        isActive: true,
      });
    },

    recordKeystroke: (info) => {
      const { keystrokes, startTime, currentIndex, words, backspaceCount, isCompleted } = get();
      if (isCompleted) return;
      if (!startTime) return;

      const now = info.timestamp;
      const prevKeystroke = keystrokes[keystrokes.length - 1];
      const prevTime = prevKeystroke ? prevKeystroke.timestamp : startTime;
      const reactionTime = now - prevTime;
      const pauseDuration = reactionTime > 1500 ? reactionTime : 0;

      const fullKeystroke: KeystrokeInfo = {
        ...info,
        reactionTime,
        pauseDuration,
      };

      keystrokes.push(fullKeystroke);
      const newIndex = currentIndex + 1;

      // Calculate WPM and Accuracy
      const durationMin = (now - startTime) / 60000;
      const totalChars = keystrokes.length;
      const correctChars = keystrokes.filter(k => !k.isMistake).length;

      const rawWpm = durationMin > 0 ? Math.round((totalChars / 5) / durationMin) : 0;
      const wpm = durationMin > 0 ? Math.round((correctChars / 5) / durationMin) : 0;
      const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

      // Consistency
      let consistency = 100;
      if (keystrokes.length > 5) {
        const times = keystrokes.map(k => k.reactionTime);
        const mean = times.reduce((a, b) => a + b, 0) / times.length;
        const variance = times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);
        const coeffOfVariation = mean > 0 ? stdDev / mean : 0;
        consistency = Math.max(0, Math.round(100 * (1 - coeffOfVariation * 0.5)));
      }

      // Focus score
      const pauseCount = keystrokes.filter(k => k.pauseDuration > 0).length;
      const focusScore = Math.max(0, 100 - (backspaceCount * 3) - (pauseCount * 5));

      set({
        currentIndex: newIndex,
        keystrokes,
        wpm,
        rawWpm,
        accuracy,
        consistency,
        focusScore,
      });

      if (newIndex >= words.length) {
        get().completeSession();
      }
    },

    handleBackspace: () => {
      const { currentIndex, keystrokes, backspaceCount, isCompleted } = get();
      if (isCompleted) return;
      if (currentIndex === 0 || !get().startTime) return;

      const popped = keystrokes.pop();
      const isCorrection = popped ? popped.isMistake : false;

      const backspaceHistory = [...get().backspaceHistory, {
        timestamp: Date.now(),
        isAfterMistake: isCorrection
      }];

      set({
        currentIndex: currentIndex - 1,
        keystrokes,
        backspaceCount: backspaceCount + 1,
        correctionCount: get().correctionCount + (isCorrection ? 1 : 0),
        backspaceHistory,
      });
    },

    completeSession: () => {
      const { keystrokes, startTime, riskKeys } = get();
      if (get().isCompleted) return;
      const endTime = Date.now();
      const durationMin = (endTime - (startTime || endTime)) / 60000;
      
      const totalChars = keystrokes.length;
      const correctChars = keystrokes.filter(k => !k.isMistake).length;
      
      const rawWpm = durationMin > 0 ? Math.round((totalChars / 5) / durationMin) : 0;
      const wpm = durationMin > 0 ? Math.round((correctChars / 5) / durationMin) : 0;
      const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

      // Consistency
      let consistency = 100;
      if (keystrokes.length > 5) {
        const times = keystrokes.map(k => k.reactionTime);
        const mean = times.reduce((a, b) => a + b, 0) / times.length;
        const variance = times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);
        const coeffOfVariation = mean > 0 ? stdDev / mean : 0;
        consistency = Math.max(0, Math.round(100 * (1 - coeffOfVariation * 0.5)));
      }

      // Focus score
      const pauseCount = keystrokes.filter(k => k.pauseDuration > 0).length;
      const focusScore = Math.max(0, 100 - (get().backspaceCount * 3) - (pauseCount * 5));

      // Calculate AI prediction accuracy post-session
      let predictionAccuracy = null;
      const riskKeyNames = Object.keys(riskKeys);
      if (riskKeyNames.length > 0) {
        const mistakeKeys = new Set(keystrokes.filter(k => k.isMistake).map(k => k.expectedKey.toUpperCase()));
        const correctPredictions = riskKeyNames.filter(k => mistakeKeys.has(k)).length;
        const totalPredictions = riskKeyNames.length;
        predictionAccuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 100;
      }

      const finalResult: FinalSessionResult = Object.freeze({
        wpm,
        rawWpm,
        accuracy,
        consistency,
        focusScore,
        backspaceCount: get().backspaceCount,
        correctionCount: get().correctionCount,
        backspaceHistory: get().backspaceHistory,
      });

      set({
        endTime,
        isActive: false,
        isCompleted: true,
        wpm,
        rawWpm,
        accuracy,
        consistency,
        focusScore,
        predictionAccuracy,
        finalResult,
      });
    },

    resetSession: () => {
      const { words, mode, difficulty, riskKeys } = get();
      get().initializeSession(words, mode, difficulty, riskKeys);
    },
  };
});
