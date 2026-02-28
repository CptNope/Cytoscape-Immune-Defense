import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadProfile,
  saveProfile,
  calcPlayerLevel,
  xpToNextLevel,
  xpProgressPercent,
  awardXp,
  recordRunStats,
  canAffordUpgrade,
  purchaseUpgrade,
  getUpgradeCost,
  computeModifiers,
  resetProfile,
} from '../progression';
import type { PlayerProfile } from '../types';
import {
  PLAYER_LEVEL_THRESHOLDS,
  MAX_PLAYER_LEVEL,
  SHIP_THRUST,
  POWERUP_DURATION,
  HULL_HP_PER_LEVEL,
  THRUST_PER_LEVEL,
  DAMAGE_PER_LEVEL,
  SHOT_DELAY_REDUCTION_PER_LEVEL,
  SHIELD_FRAMES_PER_LEVEL,
} from '../constants';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

function freshProfile(): PlayerProfile {
  return {
    xp: 0,
    lifetimeXp: 0,
    playerLevel: 1,
    upgrades: {
      hull_integrity: 0,
      thruster_power: 0,
      antibody_potency: 0,
      rapid_response: 0,
      membrane_shield: 0,
    },
    cytokines: {
      auto_target: false,
      regeneration: false,
      chain_reaction: false,
    },
    stats: {
      totalKills: 0,
      killsByType: {},
      totalScore: 0,
      totalRuns: 0,
      totalTimePlayed: 0,
      highestLevel: 0,
    },
  };
}

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// --- calcPlayerLevel ---

describe('calcPlayerLevel', () => {
  it('returns 1 for 0 XP', () => {
    expect(calcPlayerLevel(0)).toBe(1);
  });

  it('returns 2 at 200 XP', () => {
    expect(calcPlayerLevel(200)).toBe(2);
  });

  it('returns 5 at 2000 XP', () => {
    expect(calcPlayerLevel(2000)).toBe(5);
  });

  it('returns max level at high XP', () => {
    expect(calcPlayerLevel(999999)).toBe(MAX_PLAYER_LEVEL);
  });

  it('returns correct level just below threshold', () => {
    expect(calcPlayerLevel(199)).toBe(1);
    expect(calcPlayerLevel(499)).toBe(2);
  });
});

// --- xpToNextLevel ---

describe('xpToNextLevel', () => {
  it('returns XP needed from level 1', () => {
    const p = freshProfile();
    // Level 1 -> 2 requires 200 XP, player has 0
    expect(xpToNextLevel(p)).toBe(200);
  });

  it('returns 0 at max level', () => {
    const p = freshProfile();
    p.playerLevel = MAX_PLAYER_LEVEL;
    p.lifetimeXp = PLAYER_LEVEL_THRESHOLDS[MAX_PLAYER_LEVEL];
    expect(xpToNextLevel(p)).toBe(0);
  });

  it('accounts for partial progress', () => {
    const p = freshProfile();
    p.lifetimeXp = 100;
    p.playerLevel = 1;
    expect(xpToNextLevel(p)).toBe(100); // 200 - 100
  });
});

// --- xpProgressPercent ---

describe('xpProgressPercent', () => {
  it('returns 0 at start of level 1', () => {
    const p = freshProfile();
    expect(xpProgressPercent(p)).toBe(0);
  });

  it('returns 50 at midpoint', () => {
    const p = freshProfile();
    p.lifetimeXp = 100; // halfway to level 2 (200)
    expect(xpProgressPercent(p)).toBe(50);
  });

  it('returns 100 at max level', () => {
    const p = freshProfile();
    p.playerLevel = MAX_PLAYER_LEVEL;
    p.lifetimeXp = PLAYER_LEVEL_THRESHOLDS[MAX_PLAYER_LEVEL];
    expect(xpProgressPercent(p)).toBe(100);
  });
});

// --- loadProfile / saveProfile ---

describe('loadProfile / saveProfile', () => {
  it('returns default profile when empty', () => {
    const p = loadProfile();
    expect(p.xp).toBe(0);
    expect(p.playerLevel).toBe(1);
    expect(p.upgrades.hull_integrity).toBe(0);
    expect(p.cytokines.auto_target).toBe(false);
  });

  it('round-trips through save/load', () => {
    const p = freshProfile();
    p.xp = 500;
    p.lifetimeXp = 500;
    p.playerLevel = 3;
    p.upgrades.hull_integrity = 2;
    saveProfile(p);
    const loaded = loadProfile();
    expect(loaded.xp).toBe(500);
    expect(loaded.upgrades.hull_integrity).toBe(2);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorageMock.setItem('cytoscape-player-profile', 'not-json');
    const p = loadProfile();
    expect(p.xp).toBe(0);
  });

  it('merges missing fields from older saves', () => {
    // Simulate an old save missing the cytokines field
    const partial = { xp: 100, lifetimeXp: 100, playerLevel: 1, upgrades: {} };
    localStorageMock.setItem('cytoscape-player-profile', JSON.stringify(partial));
    const p = loadProfile();
    expect(p.xp).toBe(100);
    expect(p.cytokines.auto_target).toBe(false);
    expect(p.stats.totalKills).toBe(0);
  });
});

// --- awardXp ---

describe('awardXp', () => {
  it('adds XP to both xp and lifetimeXp', () => {
    const p = freshProfile();
    const updated = awardXp(p, 300);
    expect(updated.xp).toBe(300);
    expect(updated.lifetimeXp).toBe(300);
  });

  it('levels up when threshold is met', () => {
    const p = freshProfile();
    const updated = awardXp(p, 2000);
    expect(updated.playerLevel).toBe(5);
  });

  it('unlocks cytokines at level milestones', () => {
    const p = freshProfile();
    const updated = awardXp(p, 2000); // Level 5 -> auto_target
    expect(updated.cytokines.auto_target).toBe(true);
    expect(updated.cytokines.regeneration).toBe(false);
  });

  it('unlocks multiple cytokines with enough XP', () => {
    const p = freshProfile();
    const updated = awardXp(p, 50000); // Level 15 -> all cytokines
    expect(updated.cytokines.auto_target).toBe(true);
    expect(updated.cytokines.regeneration).toBe(true);
    expect(updated.cytokines.chain_reaction).toBe(true);
  });

  it('persists to localStorage', () => {
    const p = freshProfile();
    awardXp(p, 100);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });
});

// --- recordRunStats ---

describe('recordRunStats', () => {
  it('accumulates run stats', () => {
    const p = freshProfile();
    const updated = recordRunStats(p, {
      kills: 10,
      killsByType: { virus: 5, bacteria: 5 },
      score: 500,
      level: 3,
      timePlayed: 60,
    });
    expect(updated.stats.totalKills).toBe(10);
    expect(updated.stats.totalScore).toBe(500);
    expect(updated.stats.totalRuns).toBe(1);
    expect(updated.stats.totalTimePlayed).toBe(60);
    expect(updated.stats.highestLevel).toBe(3);
    expect(updated.stats.killsByType.virus).toBe(5);
  });

  it('merges kills by type across runs', () => {
    let p = freshProfile();
    p = recordRunStats(p, { kills: 5, killsByType: { virus: 3, bacteria: 2 }, score: 100, level: 1, timePlayed: 30 });
    p = recordRunStats(p, { kills: 3, killsByType: { virus: 1, parasite: 2 }, score: 200, level: 2, timePlayed: 45 });
    expect(p.stats.totalKills).toBe(8);
    expect(p.stats.killsByType.virus).toBe(4);
    expect(p.stats.killsByType.bacteria).toBe(2);
    expect(p.stats.killsByType.parasite).toBe(2);
  });

  it('updates highest level only if exceeded', () => {
    let p = freshProfile();
    p = recordRunStats(p, { kills: 0, killsByType: {}, score: 0, level: 5, timePlayed: 10 });
    expect(p.stats.highestLevel).toBe(5);
    p = recordRunStats(p, { kills: 0, killsByType: {}, score: 0, level: 3, timePlayed: 10 });
    expect(p.stats.highestLevel).toBe(5); // unchanged
    p = recordRunStats(p, { kills: 0, killsByType: {}, score: 0, level: 8, timePlayed: 10 });
    expect(p.stats.highestLevel).toBe(8);
  });
});

// --- canAffordUpgrade / purchaseUpgrade / getUpgradeCost ---

describe('upgrades', () => {
  it('canAffordUpgrade returns false when not enough XP', () => {
    const p = freshProfile();
    p.xp = 50; // hull_integrity costs 100
    expect(canAffordUpgrade(p, 'hull_integrity')).toBe(false);
  });

  it('canAffordUpgrade returns true when enough XP', () => {
    const p = freshProfile();
    p.xp = 100;
    expect(canAffordUpgrade(p, 'hull_integrity')).toBe(true);
  });

  it('canAffordUpgrade returns false when maxed', () => {
    const p = freshProfile();
    p.xp = 99999;
    p.upgrades.hull_integrity = 5;
    expect(canAffordUpgrade(p, 'hull_integrity')).toBe(false);
  });

  it('purchaseUpgrade deducts XP and increments level', () => {
    const p = freshProfile();
    p.xp = 500;
    const updated = purchaseUpgrade(p, 'hull_integrity');
    expect(updated).not.toBeNull();
    expect(updated!.xp).toBe(400); // 500 - 100
    expect(updated!.upgrades.hull_integrity).toBe(1);
  });

  it('purchaseUpgrade returns null when too expensive', () => {
    const p = freshProfile();
    p.xp = 50;
    expect(purchaseUpgrade(p, 'hull_integrity')).toBeNull();
  });

  it('purchaseUpgrade returns null when maxed', () => {
    const p = freshProfile();
    p.xp = 99999;
    p.upgrades.hull_integrity = 5;
    expect(purchaseUpgrade(p, 'hull_integrity')).toBeNull();
  });

  it('getUpgradeCost returns correct cost for current level', () => {
    const p = freshProfile();
    expect(getUpgradeCost(p, 'hull_integrity')).toBe(100); // level 0 -> 1
    p.upgrades.hull_integrity = 1;
    expect(getUpgradeCost(p, 'hull_integrity')).toBe(250); // level 1 -> 2
  });

  it('getUpgradeCost returns null when maxed', () => {
    const p = freshProfile();
    p.upgrades.hull_integrity = 5;
    expect(getUpgradeCost(p, 'hull_integrity')).toBeNull();
  });
});

// --- computeModifiers ---

describe('computeModifiers', () => {
  it('returns base values for fresh profile', () => {
    const p = freshProfile();
    const m = computeModifiers(p);
    expect(m.maxHealth).toBe(100);
    expect(m.thrustPower).toBe(SHIP_THRUST);
    expect(m.bulletDamage).toBe(1);
    expect(m.shotDelay).toBe(200);
    expect(m.shieldDuration).toBe(POWERUP_DURATION);
    expect(m.hasAutoTarget).toBe(false);
    expect(m.hasRegeneration).toBe(false);
    expect(m.hasChainReaction).toBe(false);
  });

  it('scales with upgrade levels', () => {
    const p = freshProfile();
    p.upgrades.hull_integrity = 3;
    p.upgrades.thruster_power = 2;
    p.upgrades.antibody_potency = 4;
    p.upgrades.rapid_response = 1;
    p.upgrades.membrane_shield = 5;
    const m = computeModifiers(p);
    expect(m.maxHealth).toBe(100 + 3 * HULL_HP_PER_LEVEL);
    expect(m.thrustPower).toBeCloseTo(SHIP_THRUST + 2 * THRUST_PER_LEVEL);
    expect(m.bulletDamage).toBeCloseTo(1 + 4 * DAMAGE_PER_LEVEL);
    expect(m.shotDelay).toBe(200 - 1 * SHOT_DELAY_REDUCTION_PER_LEVEL);
    expect(m.shieldDuration).toBe(POWERUP_DURATION + 5 * SHIELD_FRAMES_PER_LEVEL);
  });

  it('reflects cytokine state', () => {
    const p = freshProfile();
    p.cytokines.auto_target = true;
    p.cytokines.regeneration = true;
    const m = computeModifiers(p);
    expect(m.hasAutoTarget).toBe(true);
    expect(m.hasRegeneration).toBe(true);
    expect(m.hasChainReaction).toBe(false);
  });
});

// --- resetProfile ---

describe('resetProfile', () => {
  it('returns a fresh default profile', () => {
    const p = freshProfile();
    p.xp = 9999;
    p.upgrades.hull_integrity = 5;
    saveProfile(p);
    const reset = resetProfile();
    expect(reset.xp).toBe(0);
    expect(reset.upgrades.hull_integrity).toBe(0);
  });

  it('persists the reset to localStorage', () => {
    resetProfile();
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });
});
