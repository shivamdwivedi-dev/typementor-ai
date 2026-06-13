import { Response } from 'express';
import { KeystrokeLog } from '@prisma/client';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth.middleware';

// QWERTY mappings for fingers
const KEY_TO_FINGER: Record<string, string> = {
  // Left Pinky
  'Q': 'Left Pinky', 'A': 'Left Pinky', 'Z': 'Left Pinky', '1': 'Left Pinky', '`': 'Left Pinky',
  // Left Ring
  'W': 'Left Ring', 'S': 'Left Ring', 'X': 'Left Ring', '2': 'Left Ring',
  // Left Middle
  'E': 'Left Middle', 'D': 'Left Middle', 'C': 'Left Middle', '3': 'Left Middle',
  // Left Index
  'R': 'Left Index', 'T': 'Left Index', 'F': 'Left Index', 'G': 'Left Index',
  'V': 'Left Index', 'B': 'Left Index', '4': 'Left Index', '5': 'Left Index',
  // Thumbs
  ' ': 'Thumbs',
  // Right Index
  'Y': 'Right Index', 'U': 'Right Index', 'H': 'Right Index', 'J': 'Right Index',
  'N': 'Right Index', 'M': 'Right Index', '6': 'Right Index', '7': 'Right Index',
  // Right Middle
  'I': 'Right Middle', 'K': 'Right Middle', ',': 'Right Middle', '8': 'Right Middle',
  // Right Ring
  'O': 'Right Ring', 'L': 'Right Ring', '.': 'Right Ring', '9': 'Right Ring',
  // Right Pinky
  'P': 'Right Pinky', ';': 'Right Pinky', '/': 'Right Pinky', '0': 'Right Pinky',
  '-': 'Right Pinky', '=': 'Right Pinky', '[': 'Right Pinky', ']': 'Right Pinky',
  '\\': 'Right Pinky', "'": 'Right Pinky'
};

const KEY_TO_ROW: Record<string, string> = {
  '1': 'Number', '2': 'Number', '3': 'Number', '4': 'Number', '5': 'Number',
  '6': 'Number', '7': 'Number', '8': 'Number', '9': 'Number', '0': 'Number',
  '-': 'Number', '=': 'Number',
  'Q': 'Top', 'W': 'Top', 'E': 'Top', 'R': 'Top', 'T': 'Top', 'Y': 'Top',
  'U': 'Top', 'I': 'Top', 'O': 'Top', 'P': 'Top', '[': 'Top', ']': 'Top', '\\': 'Top',
  'A': 'Home', 'S': 'Home', 'D': 'Home', 'F': 'Home', 'G': 'Home', 'H': 'Home',
  'J': 'Home', 'K': 'Home', 'L': 'Home', ';': 'Home', "'": 'Home',
  'Z': 'Bottom', 'X': 'Bottom', 'C': 'Bottom', 'V': 'Bottom', 'B': 'Bottom',
  'N': 'Bottom', 'M': 'Bottom', ',': 'Bottom', '.': 'Bottom', '/': 'Bottom'
};

const LEFT_HAND_KEYS = new Set(['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V', 'B', '1', '2', '3', '4', '5']);

export const getHeatmapData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token.' });
    }

    // Get all keystroke logs for this user (limited to last 2000 keystrokes for responsiveness)
    const keystrokes = await prisma.keystrokeLog.findMany({
      where: {
        session: { userId }
      },
      orderBy: { timestamp: 'desc' },
      take: 2000
    });

    // Compute key usage maps
    const keyUsage: Record<string, number> = {};
    const keyMistakes: Record<string, number> = {};
    const weakKeys: Record<string, number> = {}; // mistake ratio

    // Initialize maps
    keystrokes.forEach((ks: KeystrokeLog) => {
      const expected = ks.expectedKey.toUpperCase();
      if (!expected) return;

      keyUsage[expected] = (keyUsage[expected] || 0) + 1;
      if (ks.isMistake) {
        keyMistakes[expected] = (keyMistakes[expected] || 0) + 1;
      }
    });

    // Calculate error rates
    Object.keys(keyUsage).forEach(key => {
      const total = keyUsage[key];
      const mistakes = keyMistakes[key] || 0;
      weakKeys[key] = total > 0 ? parseFloat((mistakes / total).toFixed(3)) : 0;
    });

    // Compute finger mistakes
    const fingerUsageCount: Record<string, number> = {};
    const fingerMistakeCount: Record<string, number> = {};

    Object.keys(keyUsage).forEach(key => {
      const finger = KEY_TO_FINGER[key] || 'Other';
      fingerUsageCount[finger] = (fingerUsageCount[finger] || 0) + keyUsage[key];
      fingerMistakeCount[finger] = (fingerMistakeCount[finger] || 0) + (keyMistakes[key] || 0);
    });

    const fingerReport = Object.keys(fingerUsageCount).map(finger => {
      const total = fingerUsageCount[finger];
      const mistakes = fingerMistakeCount[finger] || 0;
      const errorRate = total > 0 ? parseFloat((mistakes / total).toFixed(3)) : 0;
      return { finger, total, mistakes, errorRate };
    });

    // Compute row mistakes
    const rowUsageCount: Record<string, number> = {};
    const rowMistakeCount: Record<string, number> = {};

    Object.keys(keyUsage).forEach(key => {
      const row = KEY_TO_ROW[key] || 'Other';
      rowUsageCount[row] = (rowUsageCount[row] || 0) + keyUsage[key];
      rowMistakeCount[row] = (rowMistakeCount[row] || 0) + (keyMistakes[key] || 0);
    });

    const rowReport = Object.keys(rowUsageCount).map(row => {
      const total = rowUsageCount[row];
      const mistakes = rowMistakeCount[row] || 0;
      const errorRate = total > 0 ? parseFloat((mistakes / total).toFixed(3)) : 0;
      return { row, total, mistakes, errorRate };
    });

    // Hand analysis
    let leftTotal = 0;
    let leftMistakes = 0;
    let rightTotal = 0;
    let rightMistakes = 0;

    Object.keys(keyUsage).forEach(key => {
      const isLeft = LEFT_HAND_KEYS.has(key);
      const usage = keyUsage[key];
      const mistakes = keyMistakes[key] || 0;

      if (isLeft) {
        leftTotal += usage;
        leftMistakes += mistakes;
      } else if (key !== ' ') {
        rightTotal += usage;
        rightMistakes += mistakes;
      }
    });

    const handReport = {
      left: {
        total: leftTotal,
        mistakes: leftMistakes,
        errorRate: leftTotal > 0 ? parseFloat((leftMistakes / leftTotal).toFixed(3)) : 0
      },
      right: {
        total: rightTotal,
        mistakes: rightMistakes,
        errorRate: rightTotal > 0 ? parseFloat((rightMistakes / rightTotal).toFixed(3)) : 0
      }
    };

    // Top 5 Key Confusion Pairs
    const commonMistakes = await prisma.mistakeSummary.findMany({
      where: { userId },
      orderBy: { count: 'desc' },
      take: 6
    });

    // Select weakest finger
    let weakestFinger = 'None';
    let maxFingerError = -1;
    fingerReport.forEach(f => {
      if (f.finger !== 'Other' && f.finger !== 'Thumbs' && f.errorRate > maxFingerError && f.total > 10) {
        maxFingerError = f.errorRate;
        weakestFinger = f.finger;
      }
    });

    return res.status(200).json({
      keyUsage,
      keyMistakes,
      weakKeys,
      fingerReport,
      rowReport,
      handReport,
      commonMistakes,
      weakestFinger,
    });
  } catch (error: unknown) {
    console.error('Heatmap analysis error:', error);
    return res.status(500).json({ error: 'An error occurred generating keyboard analytics.' });
  }
};

export const getRecoveryReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Get mistake counts
    const mistakes = await prisma.mistakeSummary.findMany({
      where: { userId },
      orderBy: { count: 'desc' },
    });

    const history = await prisma.recoveryHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (mistakes.length === 0) {
      return res.status(200).json({
        mostMistypedKey: 'None',
        confusionKey: 'None',
        accuracyLoss: 0,
        predictedWpmGain: 0,
        weakKeyToday: 'None',
        weakKeyLastWeek: 'None',
        improvementRate: 0,
        history: [],
      });
    }

    const topMistake = mistakes[0];
    const mostMistypedKey = topMistake.expectedKey;
    const confusionKey = topMistake.pressedKey;

    // Calculate total count of this expectedKey typed
    const totalTypedForKey = await prisma.keystrokeLog.count({
      where: {
        expectedKey: mostMistypedKey,
        session: { userId }
      }
    });

    const keyMistakesCount = await prisma.keystrokeLog.count({
      where: {
        expectedKey: mostMistypedKey,
        isMistake: true,
        session: { userId }
      }
    });

    const mistakeRate = keyMistakesCount / (totalTypedForKey || 1);
    const predictedWpmGain = parseFloat(Math.min(8, mistakeRate * 20).toFixed(1));
    const accuracyLoss = parseFloat(((keyMistakesCount / (user?.totalCharacters || 1)) * 100).toFixed(1));

    // Calculate weakKeyToday & weakKeyLastWeek
    const weakKeyToday = mostMistypedKey;
    let weakKeyLastWeek = 'None';
    let improvementRate = 0;

    // If we have history, find the oldest or closest to last week
    if (history.length > 0) {
      weakKeyLastWeek = history[0].mostMistypedKey;
      // Calculate improvement in recovery scores
      const latestScore = history[history.length - 1].recoveryScore;
      const baselineScore = history[0].recoveryScore;
      improvementRate = Math.round(latestScore - baselineScore);
    }

    return res.status(200).json({
      mostMistypedKey,
      confusionKey,
      accuracyLoss,
      predictedWpmGain,
      baselineErrorRate: parseFloat((mistakeRate * 100).toFixed(1)),
      weakKeyToday,
      weakKeyLastWeek,
      improvementRate,
      history,
    });
  } catch (error: unknown) {
    console.error('Error fetching recovery report:', error);
    return res.status(500).json({ error: 'An error occurred generating weak-key recovery report.' });
  }
};

export const saveRecoveryScore = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token.' });
    }

    const {
      mostMistypedKey,
      confusionKey,
      accuracyLoss,
      predictedWpmGain,
      recoveryScore,
    } = req.body;

    if (!mostMistypedKey) {
      return res.status(400).json({ error: 'mostMistypedKey is required.' });
    }

    const entry = await prisma.recoveryHistory.create({
      data: {
        userId,
        mostMistypedKey: mostMistypedKey.toUpperCase(),
        confusionKey: confusionKey ? confusionKey.toUpperCase() : null,
        accuracyLoss: parseFloat(accuracyLoss || 0),
        predictedWpmGain: parseFloat(predictedWpmGain || 0),
        recoveryScore: parseFloat(recoveryScore || 0),
      },
    });

    return res.status(201).json(entry);
  } catch (error: unknown) {
    console.error('Error saving recovery score:', error);
    return res.status(500).json({ error: 'An error occurred saving recovery score.' });
  }
};

export const getEnduranceStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token.' });
    }

    const sessions = await prisma.typingSession.findMany({
      where: {
        userId,
        mode: { startsWith: 'Endurance:' }
      },
      select: {
        wpm: true,
        duration: true
      }
    });

    if (sessions.length === 0) {
      return res.status(200).json({
        longestSession: 0,
        bestWpm: 0,
        totalWords: 0
      });
    }

    const longestSession = Math.max(...sessions.map(s => s.duration));
    const bestWpm = Math.max(...sessions.map(s => s.wpm));
    const totalWords = sessions.reduce((sum, s) => sum + Math.round((s.duration * s.wpm) / 60), 0);

    return res.status(200).json({
      longestSession,
      bestWpm,
      totalWords
    });
  } catch (error: unknown) {
    console.error('Error fetching endurance stats:', error);
    return res.status(500).json({ error: 'An error occurred fetching endurance stats.' });
  }
};
