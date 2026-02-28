/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  PlayerProfile,
  PlayerStats,
  GameModifiers,
  UpgradeId,
  CytokineId,
} from './types';

import {
  UPGRADE_DEFS,
  CYTOKINE_DEFS,
  PLAYER_LEVEL_THRESHOLDS,
  MAX_PLAYER_LEVEL,
  SHIP_THRUST,
  POWERUP_DURATION,
  HULL_HP_PER_LEVEL,
  THRUST_PER_LEVEL,
  DAMAGE_PER_LEVEL,
  SHOT_DELAY_REDUCTION_PER_LEVEL,
  SHIELD_FRAMES_PER_LEVEL,
} from './constants';

const PROFILE_KEY = 'cytoscape-player-profile';

// --- Default Profile ---

function defaultStats(): PlayerStats {
  return {
    totalKills: 0,
    killsByType: {},
    totalScore: 0,
    totalRuns: 0,
    totalTimePlayed: 0,
    highestLevel: 0,
  };
}

function defaultProfile(): PlayerProfile {
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
    stats: defaultStats(),
  };
}

// --- Persistence ---

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    // Merge with defaults to handle missing fields from older saves
    const def = defaultProfile();
    return {
      ...def,
      ...parsed,
      upgrades: { ...def.upgrades, ...parsed.upgrades },
      cytokines: { ...def.cytokines, ...parsed.cytokines },
      stats: { ...def.stats, ...parsed.stats },
    };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // silently fail
  }
}

// --- Player Level ---

export function calcPlayerLevel(lifetimeXp: number): number {
  for (let i = MAX_PLAYER_LEVEL; i >= 1; i--) {
    if (lifetimeXp >= PLAYER_LEVEL_THRESHOLDS[i]) return i;
  }
  return 1;
}

export function xpToNextLevel(profile: PlayerProfile): number {
  if (profile.playerLevel >= MAX_PLAYER_LEVEL) return 0;
  return PLAYER_LEVEL_THRESHOLDS[profile.playerLevel + 1] - profile.lifetimeXp;
}

export function xpProgressPercent(profile: PlayerProfile): number {
  if (profile.playerLevel >= MAX_PLAYER_LEVEL) return 100;
  const currentThreshold = PLAYER_LEVEL_THRESHOLDS[profile.playerLevel];
  const nextThreshold = PLAYER_LEVEL_THRESHOLDS[profile.playerLevel + 1];
  const range = nextThreshold - currentThreshold;
  if (range <= 0) return 100;
  return Math.min(100, ((profile.lifetimeXp - currentThreshold) / range) * 100);
}

// --- XP & Run End ---

export function awardXp(profile: PlayerProfile, runScore: number): PlayerProfile {
  const updated = { ...profile };
  updated.xp += runScore;
  updated.lifetimeXp += runScore;
  updated.playerLevel = calcPlayerLevel(updated.lifetimeXp);

  // Auto-unlock cytokines when player level thresholds are met
  CYTOKINE_DEFS.forEach(def => {
    if (updated.playerLevel >= def.unlockPlayerLevel && !updated.cytokines[def.id]) {
      updated.cytokines[def.id] = true;
    }
  });

  saveProfile(updated);
  return updated;
}

export function recordRunStats(
  profile: PlayerProfile,
  runStats: { kills: number; killsByType: Record<string, number>; score: number; level: number; timePlayed: number }
): PlayerProfile {
  const updated = { ...profile, stats: { ...profile.stats } };
  updated.stats.totalKills += runStats.kills;
  updated.stats.totalScore += runStats.score;
  updated.stats.totalRuns += 1;
  updated.stats.totalTimePlayed += runStats.timePlayed;
  if (runStats.level > updated.stats.highestLevel) {
    updated.stats.highestLevel = runStats.level;
  }

  // Merge kills by type
  const kbt = { ...updated.stats.killsByType };
  for (const [type, count] of Object.entries(runStats.killsByType)) {
    kbt[type] = (kbt[type] || 0) + count;
  }
  updated.stats.killsByType = kbt;

  saveProfile(updated);
  return updated;
}

// --- Upgrades ---

export function canAffordUpgrade(profile: PlayerProfile, upgradeId: UpgradeId): boolean {
  const def = UPGRADE_DEFS.find(u => u.id === upgradeId);
  if (!def) return false;
  const currentLevel = profile.upgrades[upgradeId];
  if (currentLevel >= def.maxLevel) return false;
  return profile.xp >= def.costs[currentLevel];
}

export function purchaseUpgrade(profile: PlayerProfile, upgradeId: UpgradeId): PlayerProfile | null {
  const def = UPGRADE_DEFS.find(u => u.id === upgradeId);
  if (!def) return null;
  const currentLevel = profile.upgrades[upgradeId];
  if (currentLevel >= def.maxLevel) return null;
  const cost = def.costs[currentLevel];
  if (profile.xp < cost) return null;

  const updated = {
    ...profile,
    xp: profile.xp - cost,
    upgrades: { ...profile.upgrades, [upgradeId]: currentLevel + 1 },
  };
  saveProfile(updated);
  return updated;
}

export function getUpgradeCost(profile: PlayerProfile, upgradeId: UpgradeId): number | null {
  const def = UPGRADE_DEFS.find(u => u.id === upgradeId);
  if (!def) return null;
  const currentLevel = profile.upgrades[upgradeId];
  if (currentLevel >= def.maxLevel) return null;
  return def.costs[currentLevel];
}

// --- Game Modifiers (computed from profile) ---

export function computeModifiers(profile: PlayerProfile): GameModifiers {
  return {
    maxHealth: 100 + profile.upgrades.hull_integrity * HULL_HP_PER_LEVEL,
    thrustPower: SHIP_THRUST + profile.upgrades.thruster_power * THRUST_PER_LEVEL,
    bulletDamage: 1 + profile.upgrades.antibody_potency * DAMAGE_PER_LEVEL,
    shotDelay: 200 - profile.upgrades.rapid_response * SHOT_DELAY_REDUCTION_PER_LEVEL,
    shieldDuration: POWERUP_DURATION + profile.upgrades.membrane_shield * SHIELD_FRAMES_PER_LEVEL,
    hasAutoTarget: profile.cytokines.auto_target,
    hasRegeneration: profile.cytokines.regeneration,
    hasChainReaction: profile.cytokines.chain_reaction,
  };
}

// --- Reset (for debug / testing) ---

export function resetProfile(): PlayerProfile {
  const fresh = defaultProfile();
  saveProfile(fresh);
  return fresh;
}
