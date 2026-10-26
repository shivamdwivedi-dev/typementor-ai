import { describe, it, expect } from 'vitest';
import {
  generateConquestChallenge,
  selectPassageForTier,
  resolveTerritoryChallengeType,
  CHALLENGE_DIFFICULTY_RULES,
  hashString,
} from '../services/conquest/conquest-challenge.service';
import {
  CONQUEST_PASSAGES,
  EMERGENCY_FALLBACK_PASSAGE,
  calculatePassageMetrics,
} from '../services/conquest/conquest-passages';
import {
  ChallengeTerritoryType,
  ConquestPassage,
  TerritoryCell,
} from '../services/conquest/conquest.types';

describe('Word Conquest — Phase 2: Word Passage & Difficulty Engine', () => {
  describe('1. Territory Difficulty Configuration & Defense Rules', () => {
    const territoryTypes: ChallengeTerritoryType[] = [
      'NEUTRAL',
      'FORTRESS',
      'ENEMY_TERRITORY',
      'ENEMY_CAPITAL',
    ];

    it('defines distinct, measurable difficulty rules for all 4 territory types', () => {
      for (const t of territoryTypes) {
        const rule = CHALLENGE_DIFFICULTY_RULES[t];
        expect(rule).toBeDefined();
        expect(rule.territoryType).toBe(t);
        expect(rule.minAccuracy).toBeGreaterThanOrEqual(90);
        expect(rule.targetWordCountRange[0]).toBeLessThan(rule.targetWordCountRange[1]);
        expect(typeof rule.defenseModifier).toBe('number');
      }
    });

    it('applies the exact configured defense modifiers and tiers', () => {
      expect(CHALLENGE_DIFFICULTY_RULES.NEUTRAL.defenseModifier).toBe(0);
      expect(CHALLENGE_DIFFICULTY_RULES.NEUTRAL.tier).toBe('EASY');

      expect(CHALLENGE_DIFFICULTY_RULES.FORTRESS.defenseModifier).toBe(2);
      expect(CHALLENGE_DIFFICULTY_RULES.FORTRESS.tier).toBe('MEDIUM');

      expect(CHALLENGE_DIFFICULTY_RULES.ENEMY_TERRITORY.defenseModifier).toBe(3);
      expect(CHALLENGE_DIFFICULTY_RULES.ENEMY_TERRITORY.tier).toBe('HARD');

      expect(CHALLENGE_DIFFICULTY_RULES.ENEMY_CAPITAL.defenseModifier).toBe(5);
      expect(CHALLENGE_DIFFICULTY_RULES.ENEMY_CAPITAL.tier).toBe('EXPERT');
    });

    it('generates challenge with matching defense modifier and accuracy threshold', () => {
      for (const t of territoryTypes) {
        const challenge = generateConquestChallenge({
          challengeSeed: 'test-seed-123',
          territoryType: t,
          targetCellKey: 'r2_c3',
        });

        const expectedRule = CHALLENGE_DIFFICULTY_RULES[t];
        expect(challenge.defenseModifier).toBe(expectedRule.defenseModifier);
        expect(challenge.minAccuracy).toBe(expectedRule.minAccuracy);
        expect(challenge.difficultyTier).toBe(expectedRule.tier);
      }
    });
  });

  describe('2. Deterministic Challenge Selection & Reproducibility', () => {
    it('produces identical challenges given identical parameters (for both players in a match)', () => {
      const params = {
        challengeSeed: 'tournament_match_4829',
        territoryType: 'FORTRESS' as const,
        targetCellKey: 'r1_c2',
        turn: 3,
        attemptIndex: 1,
      };

      const player1Challenge = generateConquestChallenge(params);
      const player2Challenge = generateConquestChallenge(params);

      expect(player1Challenge.challengeId).toBe(player2Challenge.challengeId);
      expect(player1Challenge.passageId).toBe(player2Challenge.passageId);
      expect(player1Challenge.passageText).toBe(player2Challenge.passageText);
      expect(player1Challenge.wordCount).toBe(player2Challenge.wordCount);
      expect(player1Challenge.challengeSeed).toBe(player2Challenge.challengeSeed);
    });

    it('produces diverse challenges across different turns or cells on the board', () => {
      const baseSeed = 'reproducible_match_seed';
      const cellKeys = ['r0_c1', 'r1_c2', 'r2_c3', 'r3_c4', 'r4_c5'];

      const selectedPassageIds = new Set<string>();

      for (const cellKey of cellKeys) {
        const challenge = generateConquestChallenge({
          challengeSeed: baseSeed,
          territoryType: 'NEUTRAL',
          targetCellKey: cellKey,
        });
        selectedPassageIds.add(challenge.passageId);
      }

      // With multiple passages in the pool, different cells should map to multiple distinct passages
      expect(selectedPassageIds.size).toBeGreaterThan(1);
    });

    it('generates non-empty passages with valid text and positive word count', () => {
      const challenge = generateConquestChallenge({
        challengeSeed: 'validity_check_seed',
        territoryType: 'ENEMY_TERRITORY',
      });

      expect(challenge.passageText).toBeDefined();
      expect(challenge.passageText.trim().length).toBeGreaterThan(0);
      expect(challenge.wordCount).toBeGreaterThan(0);
      expect(challenge.charCount).toBe(challenge.passageText.length);
      expect(challenge.averageWordLength).toBeGreaterThan(0);
    });
  });

  describe('3. Passage Pool Metrics & Quality Calibration', () => {
    it('contains at least 5 distinct passages in each difficulty tier', () => {
      const easy = CONQUEST_PASSAGES.filter((p) => p.tier === 'EASY');
      const med = CONQUEST_PASSAGES.filter((p) => p.tier === 'MEDIUM');
      const hard = CONQUEST_PASSAGES.filter((p) => p.tier === 'HARD');
      const expert = CONQUEST_PASSAGES.filter((p) => p.tier === 'EXPERT');

      expect(easy.length).toBeGreaterThanOrEqual(5);
      expect(med.length).toBeGreaterThanOrEqual(5);
      expect(hard.length).toBeGreaterThanOrEqual(5);
      expect(expert.length).toBeGreaterThanOrEqual(5);
    });

    it('verifies passage word counts align with the configured difficulty ranges', () => {
      for (const passage of CONQUEST_PASSAGES) {
        const words = passage.text.trim().split(/\s+/).filter(Boolean);
        expect(passage.wordCount).toBe(words.length);
        expect(passage.charCount).toBe(passage.text.length);

        if (passage.tier === 'EASY') {
          expect(passage.wordCount).toBeGreaterThanOrEqual(20);
          expect(passage.wordCount).toBeLessThanOrEqual(40);
        } else if (passage.tier === 'MEDIUM') {
          expect(passage.wordCount).toBeGreaterThanOrEqual(38);
          expect(passage.wordCount).toBeLessThanOrEqual(60);
        } else if (passage.tier === 'HARD') {
          expect(passage.wordCount).toBeGreaterThanOrEqual(50);
          expect(passage.wordCount).toBeLessThanOrEqual(80);
        } else if (passage.tier === 'EXPERT') {
          expect(passage.wordCount).toBeGreaterThanOrEqual(75);
          expect(passage.wordCount).toBeLessThanOrEqual(115);
        }
      }
    });
  });

  describe('4. Lexical Property & Metrics Calculation', () => {
    it('accurately calculates metrics for short, long, and punctuation-heavy text', () => {
      // Short text
      const shortText = 'Clean code matters.';
      const shortMetrics = calculatePassageMetrics(shortText);
      expect(shortMetrics.wordCount).toBe(3);
      expect(shortMetrics.charCount).toBe(shortText.length);
      expect(shortMetrics.punctuationCount).toBe(1);

      // Heavy punctuation
      const punctText = 'Ready? Set, go: "fast-typing" (accuracy: 99.5%)!';
      const punctMetrics = calculatePassageMetrics(punctText);
      expect(punctMetrics.wordCount).toBe(6);
      expect(punctMetrics.punctuationCount).toBeGreaterThan(5);

      // Empty text handling
      const emptyMetrics = calculatePassageMetrics('   ');
      expect(emptyMetrics.wordCount).toBe(0);
      expect(emptyMetrics.charCount).toBe(0);
      expect(emptyMetrics.averageWordLength).toBe(0);
      expect(emptyMetrics.punctuationCount).toBe(0);
    });
  });

  describe('5. Error Handling & Edge Cases', () => {
    it('safely rejects unknown or invalid territory types with descriptive error', () => {
      expect(() => {
        generateConquestChallenge({
          challengeSeed: 'error_seed',
          territoryType: 'UNKNOWN_ZONE' as any,
        });
      }).toThrow(/Unsupported or unknown territory type/);
    });

    it('gracefully handles empty custom passage pool via documented fallback', () => {
      const fallbackPassage = selectPassageForTier('EASY', 'any_seed', []);

      expect(fallbackPassage).toBeDefined();
      expect(fallbackPassage.id).toBe(EMERGENCY_FALLBACK_PASSAGE.id);
      expect(fallbackPassage.text).toBe(EMERGENCY_FALLBACK_PASSAGE.text);
      expect(fallbackPassage.wordCount).toBeGreaterThan(0);
    });

    it('handles corrupted pool inputs without crashing', () => {
      const fallbackPassage = selectPassageForTier('HARD', 'any_seed', null as any);

      expect(fallbackPassage).toBeDefined();
      expect(fallbackPassage.id).toBe(EMERGENCY_FALLBACK_PASSAGE.id);
    });

    it('ensures returned challenges and passages are immutable copies (no shared mutation)', () => {
      const challengeA = generateConquestChallenge({
        challengeSeed: 'mutation_check',
        territoryType: 'NEUTRAL',
      });

      // Attempt to mutate returned challenge
      challengeA.passageText = 'MUTATED_VALUE';
      challengeA.defenseModifier = 999;

      // Generate second challenge with same seed
      const challengeB = generateConquestChallenge({
        challengeSeed: 'mutation_check',
        territoryType: 'NEUTRAL',
      });

      expect(challengeB.passageText).not.toBe('MUTATED_VALUE');
      expect(challengeB.defenseModifier).toBe(0);
    });
  });

  describe('6. Contextual Territory Resolution (resolveTerritoryChallengeType)', () => {
    it('resolves unowned neutral cell to NEUTRAL challenge', () => {
      const neutralCell: TerritoryCell = {
        id: 'r1_c1',
        row: 1,
        col: 1,
        type: 'NEUTRAL',
        owner: null,
        name: 'Neutral Plain',
        defenseBonus: 0,
      };

      expect(resolveTerritoryChallengeType(neutralCell, 1)).toBe('NEUTRAL');
      expect(resolveTerritoryChallengeType(neutralCell, 2)).toBe('NEUTRAL');
    });

    it('resolves fortress cell to FORTRESS challenge', () => {
      const fortressCell: TerritoryCell = {
        id: 'r2_c2',
        row: 2,
        col: 2,
        type: 'FORTRESS',
        owner: null,
        name: 'Iron Bastion',
        defenseBonus: 2,
      };

      expect(resolveTerritoryChallengeType(fortressCell, 1)).toBe('FORTRESS');
      expect(resolveTerritoryChallengeType(fortressCell, 2)).toBe('FORTRESS');
    });

    it('resolves enemy-controlled cell to ENEMY_TERRITORY challenge', () => {
      const enemyCell: TerritoryCell = {
        id: 'r3_c3',
        row: 3,
        col: 3,
        type: 'NEUTRAL',
        owner: 2, // Owned by Player 2
        name: 'Contested Outpost',
        defenseBonus: 0,
      };

      // Player 1 attacks Player 2 territory
      expect(resolveTerritoryChallengeType(enemyCell, 1)).toBe('ENEMY_TERRITORY');
    });

    it('resolves enemy capital cell to ENEMY_CAPITAL challenge', () => {
      const p2Capital: TerritoryCell = {
        id: 'r5_c5',
        row: 5,
        col: 5,
        type: 'CAPITAL',
        owner: 2,
        name: 'Red Citadel',
        defenseBonus: 5,
      };

      // Player 1 attacking Player 2 Capital
      expect(resolveTerritoryChallengeType(p2Capital, 1)).toBe('ENEMY_CAPITAL');

      const p1Capital: TerritoryCell = {
        id: 'r0_c0',
        row: 0,
        col: 0,
        type: 'CAPITAL',
        owner: 1,
        name: 'Blue Citadel',
        defenseBonus: 5,
      };

      // Player 2 attacking Player 1 Capital
      expect(resolveTerritoryChallengeType(p1Capital, 2)).toBe('ENEMY_CAPITAL');
    });
  });
});
