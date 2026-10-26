import {
  ChallengeTerritoryType,
  ChallengeDifficultyRule,
  DifficultyTier,
  ConquestPassage,
  ChallengeGenerationParams,
  ConquestChallenge,
  TerritoryCell,
  PlayerSlot,
} from './conquest.types';
import {
  CONQUEST_PASSAGES,
  EMERGENCY_FALLBACK_PASSAGE,
} from './conquest-passages';

/**
 * Configurable Game Rules for Word Conquest typing challenges.
 * Difficulty is grounded in measurable criteria: word length, vocabulary
 * complexity, punctuation density, defense modifier, and target accuracy.
 */
export const CHALLENGE_DIFFICULTY_RULES: Record<
  ChallengeTerritoryType,
  ChallengeDifficultyRule
> = {
  NEUTRAL: {
    territoryType: 'NEUTRAL',
    tier: 'EASY',
    defenseModifier: 0,
    minAccuracy: 90,
    targetWordCountRange: [25, 35],
    description:
      'Unclaimed territory skirmish: short, straightforward passage with basic vocabulary.',
  },
  FORTRESS: {
    territoryType: 'FORTRESS',
    tier: 'MEDIUM',
    defenseModifier: 2,
    minAccuracy: 93,
    targetWordCountRange: [45, 55],
    description:
      'Defended fortress siege: moderate-length passage with defensive vocabulary.',
  },
  ENEMY_TERRITORY: {
    territoryType: 'ENEMY_TERRITORY',
    tier: 'HARD',
    defenseModifier: 3,
    minAccuracy: 95,
    targetWordCountRange: [60, 75],
    description:
      'Hostile territory invasion: longer, competitive passage with technical vocabulary.',
  },
  ENEMY_CAPITAL: {
    territoryType: 'ENEMY_CAPITAL',
    tier: 'EXPERT',
    defenseModifier: 5,
    minAccuracy: 96,
    targetWordCountRange: [80, 105],
    description:
      'Citadel capital assault: longest, high-lexical-density passage with complex punctuation.',
  },
};

/**
 * 32-bit FNV-1a string hashing for deterministic, reproducible challenge generation.
 */
export function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Resolves the contextual challenge territory type based on cell properties
 * and the attacking player's seat.
 */
export function resolveTerritoryChallengeType(
  cell: TerritoryCell,
  attackingPlayerSlot: PlayerSlot
): ChallengeTerritoryType {
  // 1. Enemy Capital
  if (cell.type === 'CAPITAL' && cell.owner !== null && cell.owner !== attackingPlayerSlot) {
    return 'ENEMY_CAPITAL';
  }

  // 2. Enemy-controlled normal territory or captured fortress
  if (cell.owner !== null && cell.owner !== attackingPlayerSlot) {
    return 'ENEMY_TERRITORY';
  }

  // 3. Unclaimed Fortress
  if (cell.type === 'FORTRESS') {
    return 'FORTRESS';
  }

  // 4. Unclaimed Neutral land
  return 'NEUTRAL';
}

/**
 * Deterministically selects a passage for a given tier and seed string.
 * Resilient against empty or invalid passage pools via fallback.
 */
export function selectPassageForTier(
  tier: DifficultyTier,
  seed: string,
  pool: readonly ConquestPassage[] = CONQUEST_PASSAGES
): ConquestPassage {
  const validPool = Array.isArray(pool) ? pool : [];
  const candidates = validPool.filter((p) => p && p.tier === tier);

  if (candidates.length === 0) {
    // Graceful fallback: clone emergency fallback to avoid runtime crashes
    return {
      ...EMERGENCY_FALLBACK_PASSAGE,
      tier, // Match requested tier in metadata
    };
  }

  const cleanSeed = (seed && String(seed).trim().length > 0)
    ? String(seed).trim()
    : 'default_challenge_seed';

  const hash = hashString(cleanSeed);
  const selectedIndex = hash % candidates.length;
  const selected = candidates[selectedIndex];

  // Return a cloned copy to prevent external mutation of frozen pool objects
  return { ...selected };
}

/**
 * Generates an authoritative typing challenge for a target territory.
 * Deterministic: Both players with the same challenge parameters receive
 * identical passage text and metadata.
 */
export function generateConquestChallenge(
  params: ChallengeGenerationParams,
  customPool: readonly ConquestPassage[] = CONQUEST_PASSAGES
): ConquestChallenge {
  // 1. Validate territory type against configured game rules
  const rule = CHALLENGE_DIFFICULTY_RULES[params.territoryType];
  if (!rule) {
    throw new Error(
      `Unsupported or unknown territory type: "${params.territoryType}". Valid types are: ${Object.keys(
        CHALLENGE_DIFFICULTY_RULES
      ).join(', ')}.`
    );
  }

  // 2. Derive composite deterministic seed
  const cellKey = params.targetCellKey || 'r0_c0';
  const turn = Number.isInteger(params.turn) && (params.turn as number) > 0 ? params.turn : 1;
  const attempt =
    Number.isInteger(params.attemptIndex) && (params.attemptIndex as number) >= 0
      ? params.attemptIndex
      : 0;

  const rawSeed = (params.challengeSeed && String(params.challengeSeed).trim().length > 0)
    ? String(params.challengeSeed).trim()
    : 'default_conquest_seed';

  const compositeSeed = `${rawSeed}_${cellKey}_turn${turn}_att${attempt}`;

  // 3. Select deterministic passage
  const passage = selectPassageForTier(rule.tier, compositeSeed, customPool);

  // 4. Compute unique, stable challenge identifier
  const challengeHash = hashString(compositeSeed).toString(36);
  const challengeId = `cq_ch_${challengeHash}_${cellKey}`;

  // 5. Construct and return typed challenge metadata
  return {
    challengeId,
    territoryType: params.territoryType,
    targetCellKey: cellKey,
    difficultyTier: rule.tier,
    passageId: passage.id,
    passageTitle: passage.title,
    passageText: passage.text,
    wordCount: passage.wordCount,
    charCount: passage.charCount,
    averageWordLength: passage.averageWordLength,
    defenseModifier: rule.defenseModifier,
    minAccuracy: rule.minAccuracy,
    challengeSeed: compositeSeed,
  };
}
