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
  CellTypeId,
} from './types';
import { getCellType, isCellUnlocked } from './cells';

import {
  UPGRADE_DEFS,
  CYTOKINE_DEFS,
  PLAYER_LEVEL_THRESHOLDS,
  MAX_PLAYER_LEVEL,
  SHIP_THRUST,
  POWERUP_DURATION,
  CYTOKINE_SLOTS,
  MEMBRANE_COSMETICS,
  upgradeTotal,
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
    bossKills: {},
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
      interferon: false,
      fever: false,
    },
    equippedCytokines: [],
    cellType: 'killer_t',
    cosmetics: { owned: ['default'], equipped: 'default' },
    stats: defaultStats(),
  };
}

/** Cytokines that are actually active: the equipped ones that are unlocked. */
export function activeCytokines(profile: PlayerProfile): CytokineId[] {
  const unlocked = (Object.keys(profile.cytokines) as CytokineId[]).filter(id => profile.cytokines[id]);
  // Older saves (before the loadout existed) have no equipped list: use the first unlocked ones
  const equipped = profile.equippedCytokines ?? unlocked.slice(0, CYTOKINE_SLOTS);
  return equipped.filter(id => profile.cytokines[id]).slice(0, CYTOKINE_SLOTS);
}

// --- Persistence ---

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    // Merge with defaults to handle missing fields from older saves
    const def = defaultProfile();
    const merged: PlayerProfile = {
      ...def,
      ...parsed,
      upgrades: { ...def.upgrades, ...parsed.upgrades },
      cytokines: { ...def.cytokines, ...parsed.cytokines },
      cosmetics: { ...def.cosmetics, ...parsed.cosmetics },
      stats: { ...def.stats, ...parsed.stats, bossKills: { ...def.stats.bossKills, ...parsed.stats?.bossKills } },
    };
    if (!Array.isArray(parsed.equippedCytokines)) {
      // Migrate pre-loadout saves: keep the first unlocked cytokines equipped
      merged.equippedCytokines = activeCytokines({ ...merged, equippedCytokines: undefined as unknown as CytokineId[] });
    }
    if (!isCellUnlocked(merged.cellType, merged.playerLevel)) merged.cellType = 'killer_t';
    return merged;
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

  // Auto-unlock cytokines when player level thresholds are met, and equip
  // newly unlocked ones while there's a free slot
  updated.cytokines = { ...updated.cytokines };
  const equipped = [...(updated.equippedCytokines ?? activeCytokines(updated))];
  CYTOKINE_DEFS.forEach(def => {
    if (updated.playerLevel >= def.unlockPlayerLevel && !updated.cytokines[def.id]) {
      updated.cytokines[def.id] = true;
      if (equipped.length < CYTOKINE_SLOTS && !equipped.includes(def.id)) equipped.push(def.id);
    }
  });
  updated.equippedCytokines = equipped;

  saveProfile(updated);
  return updated;
}

export function recordRunStats(
  profile: PlayerProfile,
  runStats: {
    kills: number; killsByType: Record<string, number>; score: number; level: number; timePlayed: number;
    bossKills?: Record<string, number>;
  }
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

  const bk = { ...(updated.stats.bossKills ?? {}) };
  for (const [type, count] of Object.entries(runStats.bossKills ?? {})) {
    bk[type] = (bk[type] || 0) + count;
  }
  updated.stats.bossKills = bk;

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

// --- Respec ---

/** Total XP spent on an upgrade's purchased levels. */
export function upgradeSpent(profile: PlayerProfile, upgradeId: UpgradeId): number {
  const def = UPGRADE_DEFS.find(u => u.id === upgradeId);
  if (!def) return 0;
  return def.costs.slice(0, profile.upgrades[upgradeId]).reduce((a, c) => a + c, 0);
}

/** Refund every purchased upgrade level in full. */
export function respecUpgrades(profile: PlayerProfile): PlayerProfile {
  const refund = UPGRADE_DEFS.reduce((sum, d) => sum + upgradeSpent(profile, d.id), 0);
  const upgrades = { ...profile.upgrades };
  UPGRADE_DEFS.forEach(d => { upgrades[d.id] = 0; });
  const updated = { ...profile, xp: profile.xp + refund, upgrades };
  saveProfile(updated);
  return updated;
}

// --- Loadout ---

export function setCellType(profile: PlayerProfile, id: CellTypeId): PlayerProfile | null {
  if (!isCellUnlocked(id, profile.playerLevel)) return null;
  const updated = { ...profile, cellType: id };
  saveProfile(updated);
  return updated;
}

/** Equip or unequip a cytokine. Returns null if locked or no free slot. */
export function toggleCytokine(profile: PlayerProfile, id: CytokineId): PlayerProfile | null {
  if (!profile.cytokines[id]) return null;
  const current = activeCytokines(profile);
  let next: CytokineId[];
  if (current.includes(id)) next = current.filter(c => c !== id);
  else if (current.length < CYTOKINE_SLOTS) next = [...current, id];
  else return null;
  const updated = { ...profile, equippedCytokines: next };
  saveProfile(updated);
  return updated;
}

// --- Cosmetics ---

export function buyCosmetic(profile: PlayerProfile, id: string): PlayerProfile | null {
  const def = MEMBRANE_COSMETICS.find(c => c.id === id);
  if (!def || profile.cosmetics.owned.includes(id) || profile.xp < def.cost) return null;
  const updated = {
    ...profile,
    xp: profile.xp - def.cost,
    cosmetics: { owned: [...profile.cosmetics.owned, id], equipped: id },
  };
  saveProfile(updated);
  return updated;
}

export function equipCosmetic(profile: PlayerProfile, id: string): PlayerProfile | null {
  if (!profile.cosmetics.owned.includes(id)) return null;
  const updated = { ...profile, cosmetics: { ...profile.cosmetics, equipped: id } };
  saveProfile(updated);
  return updated;
}

// --- Game Modifiers (computed from profile) ---

export function computeModifiers(profile: PlayerProfile): GameModifiers {
  const def = (id: UpgradeId) => UPGRADE_DEFS.find(u => u.id === id)!;
  const lvl = (id: UpgradeId) => profile.upgrades[id] ?? 0;
  const cell = getCellType(isCellUnlocked(profile.cellType ?? 'killer_t', profile.playerLevel) ? profile.cellType : 'killer_t');
  const active = activeCytokines(profile);
  const membrane = MEMBRANE_COSMETICS.find(c => c.id === profile.cosmetics?.equipped)?.color ?? '#ffffff';
  return {
    maxHealth: Math.round((100 + upgradeTotal(def('hull_integrity'), lvl('hull_integrity'))) * cell.healthMult),
    thrustPower: (SHIP_THRUST + upgradeTotal(def('thruster_power'), lvl('thruster_power'))) * cell.thrustMult,
    bulletDamage: (1 + upgradeTotal(def('antibody_potency'), lvl('antibody_potency'))) * cell.damageMult,
    shotDelay: (200 - upgradeTotal(def('rapid_response'), lvl('rapid_response'))) * cell.fireDelayMult,
    shieldDuration: POWERUP_DURATION + upgradeTotal(def('membrane_shield'), lvl('membrane_shield')),
    hasAutoTarget: active.includes('auto_target'),
    hasRegeneration: active.includes('regeneration'),
    hasChainReaction: active.includes('chain_reaction'),
    hasInterferon: active.includes('interferon'),
    hasFever: active.includes('fever'),
    shipRadius: cell.radius,
    cellType: cell.id,
    membraneColor: membrane,
  };
}

// --- Reset (for debug / testing) ---

export function resetProfile(): PlayerProfile {
  const fresh = defaultProfile();
  saveProfile(fresh);
  return fresh;
}
