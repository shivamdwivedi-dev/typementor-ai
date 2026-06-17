import { Response } from 'express';
import { MistakeSummary } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { generateAICoachInsight } from '../services/ai.service';
import { predictMistakeRisks } from '../services/prediction.service';
import { prisma } from '../app';

// Vocabulary database mapped to difficulty tiers
const VOCAB: Record<number, string[]> = {
  1: ['the', 'to', 'in', 'it', 'is', 'be', 'as', 'at', 'so', 'we', 'he', 'by', 'on', 'or', 'an', 'my', 'up', 'me', 'go', 'no'],
  2: ['that', 'with', 'this', 'have', 'from', 'they', 'will', 'your', 'some', 'them', 'make', 'like', 'time', 'know', 'take', 'year'],
  3: ['about', 'would', 'their', 'there', 'think', 'which', 'people', 'number', 'system', 'format', 'simple', 'visual', 'coach', 'speed'],
  4: ['interface', 'biometrics', 'posture', 'telemetry', 'keystroke', 'consistency', 'accuracy', 'challenge', 'dashboard', 'precision', 'gamification'],
  5: ['algorithm#99', '[TypingDNA]', '{react-vite-db}', 'Express.JS_Server', 'WPM_Rate_100%', 'Level-5_Challenge!', 'cryptography_keys:54']
};

export const getCoachInsights = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token.' });
    }

    const insights = await generateAICoachInsight(userId);
    const riskKeys = await predictMistakeRisks(userId);

    return res.status(200).json({
      insights,
      riskKeys,
    });
  } catch (error: unknown) {
    console.error('Coach insights retrieval error:', error);
    return res.status(500).json({ error: 'An error occurred fetching coach insights.' });
  }
};

export const getCustomLesson = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token.' });
    }

    // Get active user details to find difficulty and weak keys
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        mistakes: {
          orderBy: { count: 'desc' },
          take: 3
        }
      }
    });

    const difficulty = parseInt(req.query.difficulty as string) || user?.level || 1;
    const clampDiff = Math.min(5, Math.max(1, difficulty));

    // Determine targeted weak keys
    let targetKeys = (req.query.keys as string || '')
      .split(',')
      .map(k => k.trim().toUpperCase())
      .filter(k => k.length === 1);

    if (targetKeys.length === 0 && user && user.mistakes.length > 0) {
      targetKeys = user.mistakes.map((m: MistakeSummary) => m.expectedKey);
    }

    // Fallback default target keys if user has no mistake logs yet
    if (targetKeys.length === 0) {
      targetKeys = ['T', 'R', 'Y'];
    }

    // Generate repetitive muscle memory patterns
    const drillSyllables: string[] = [];
    targetKeys.forEach(key => {
      // E.g. 'rt rt rt' or 'ty ty ty'
      const doubleSyllable = `${key.toLowerCase()}${targetKeys[0].toLowerCase()}`;
      drillSyllables.push(`${key.toLowerCase()}${key.toLowerCase()}`);
      drillSyllables.push(doubleSyllable);
    });

    // Extract vocabulary containing targeted keys
    const targetedVocab: string[] = [];
    const pool = [...VOCAB[clampDiff], ...VOCAB[Math.max(1, clampDiff - 1)]];
    
    pool.forEach(word => {
      const containsTarget = targetKeys.some(key => word.toUpperCase().includes(key));
      if (containsTarget) {
        targetedVocab.push(word);
      }
    });

    // Fallback to general vocab if no matches found
    if (targetedVocab.length < 3) {
      targetedVocab.push(...VOCAB[clampDiff]);
    }

    // Build the final lesson prompt
    // Structure: SyllableDrills + TargetedWords + Repetitions
    const lessonWords: string[] = [];
    
    // Add repetition drills first
    drillSyllables.forEach(s => {
      lessonWords.push(s, s);
    });

    // Add vocabulary words
    for (let i = 0; i < 8; i++) {
      const randomWord = targetedVocab[Math.floor(Math.random() * targetedVocab.length)];
      lessonWords.push(randomWord);
    }

    // Add final challenge repetition
    const doubleKeyDrill = targetKeys.map(k => k.toLowerCase()).join('');
    lessonWords.push(doubleKeyDrill, doubleKeyDrill);

    const lessonText = lessonWords.join(' ');

    return res.status(200).json({
      lesson: lessonText,
      difficulty: clampDiff,
      targetedKeys: targetKeys,
    });
  } catch (error: unknown) {
    console.error('Custom lesson generator error:', error);
    return res.status(500).json({ error: 'An error occurred compiling custom typing lesson.' });
  }
};

export const getRecoveryLesson = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token.' });
    }

    // Get the most mistyped key for the user
    const userMistakes = await prisma.mistakeSummary.findMany({
      where: { userId },
      orderBy: { count: 'desc' },
      take: 1
    });

    let targetKey = 'R'; // fallback default
    let confusionKey = 'T'; // fallback default
    if (userMistakes.length > 0) {
      targetKey = userMistakes[0].expectedKey;
      confusionKey = userMistakes[0].pressedKey;
    }

    const keyLower = targetKey.toLowerCase();
    const confLower = confusionKey.toLowerCase();
    
    // Build recovery components following spec:
    // Part 1: Single key repetition
    const part1 = `${keyLower} ${keyLower} ${keyLower} ${keyLower} ${keyLower}`;

    // Part 2: Digraphs
    const part2 = `${keyLower}${confLower} ${confLower}${keyLower} ${keyLower}${confLower} ${confLower}${keyLower}`;

    // Part 3: Words
    const allWords = [
      'try', 'run', 'red', 'rust', 'rate', 'track', 'rapid', 'alert', 'error', 'write',
      'learn', 'trace', 'score', 'heart', 'board', 'tiger', 'break', 'smart', 'react', 'order',
      'word', 'chart', 'start', 'power', 'great', 'profile', 'correct', 'predict', 'metrics', 'drill',
      'river', 'writer', 'trainer', 'transport', 'report'
    ];
    
    const targetWords = allWords
      .filter(w => w.includes(keyLower))
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);

    while (targetWords.length < 6) {
      targetWords.push('typing', 'coach', 'speed', 'focus');
    }
    const part3 = targetWords.join(' ');

    // Part 4: Sentences
    const sentences: Record<string, string> = {
      'R': 'The trainer reviewed the transport report carefully.',
      'T': 'The trainer reviewed the transport report carefully.',
      'O': 'Our team focused on options to optimize database workflows.',
      'I': 'Interactive visual insights identify errors instantly.',
      'M': 'Most members minimized mistakes using home row anchors.',
      'N': 'Numerous typing patterns demand constant rhythmic pacing.'
    };
    
    const part4 = sentences[targetKey.toUpperCase()] || 'Correct formatting error records clear dashboard views.';

    const recoveryText = `${part1} ${part2} ${part3} ${part4}`;

    return res.status(200).json({
      lesson: recoveryText,
      targetKey: targetKey,
      confusionKey: confusionKey,
      difficulty: 3,
    });
  } catch (error: unknown) {
    console.error('Error generating recovery lesson:', error);
    return res.status(500).json({ error: 'An error occurred compiling recovery lesson.' });
  }
};
