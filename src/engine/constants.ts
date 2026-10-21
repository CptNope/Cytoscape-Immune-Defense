/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { UpgradeDef, CytokineDef } from './types';

export const FPS = 60;
export const FRICTION = 0.97;
export const SHIP_THRUST = 0.10;
export const SHIP_TURN_SPEED = 0.08;
export const BULLET_SPEED = 7;
export const BULLET_LIFE = 60;
export const PATHOGEN_MIN_RADIUS = 15;
export const PATHOGEN_MAX_RADIUS = 50;
export const INITIAL_PATHOGEN_COUNT = 5;
export const MAX_PARTICLES = 200;
export const POWERUP_DURATION = 300; // 5 seconds at 60fps
export const POWERUP_DROP_RATE = 0.15;
export const POWERUP_LIFETIME = 600; // 10 seconds at 60fps

// --- Progression ---

export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    id: 'hull_integrity',
    name: 'Hull Integrity',
    description: '+10 max health per level',
    maxLevel: 10,
    costs: [100, 250, 500, 1000, 2000, 3500, 5000, 7000, 9500, 12500],
    effects: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
    icon: '🛡️',
  },
  {
    id: 'thruster_power',
    name: 'Thruster Power',
    description: '+0.02 thrust per level (+0.01 after Lv 5)',
    maxLevel: 10,
    costs: [100, 250, 500, 1000, 2000, 3500, 5000, 7000, 9500, 12500],
    effects: [0.02, 0.02, 0.02, 0.02, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01],
    icon: '🚀',
  },
  {
    id: 'antibody_potency',
    name: 'Antibody Potency',
    description: '+0.25 damage per level (+0.15 after Lv 5)',
    maxLevel: 10,
    costs: [150, 350, 700, 1400, 2800, 4500, 6500, 9000, 12000, 16000],
    effects: [0.25, 0.25, 0.25, 0.25, 0.25, 0.15, 0.15, 0.15, 0.15, 0.15],
    icon: '⚔️',
  },
  {
    id: 'rapid_response',
    name: 'Rapid Response',
    description: '-15ms shot delay per level (-6ms after Lv 5)',
    maxLevel: 10,
    costs: [150, 350, 700, 1400, 2800, 4500, 6500, 9000, 12000, 16000],
    effects: [15, 15, 15, 15, 15, 6, 6, 6, 6, 6],
    icon: '⚡',
  },
  {
    id: 'membrane_shield',
    name: 'Membrane Shield',
    description: '+50 frames shield duration per level',
    maxLevel: 10,
    costs: [200, 400, 800, 1600, 3200, 5000, 7000, 9500, 12500, 16000],
    effects: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
    icon: '🔮',
  },
];

/** Total effect of an upgrade at a given level (sum of per-level effects). */
export function upgradeTotal(def: UpgradeDef, level: number): number {
  let total = 0;
  for (let i = 0; i < Math.min(level, def.effects.length); i++) total += def.effects[i];
  return total;
}

/** Number of cytokines that can be equipped at once. */
export const CYTOKINE_SLOTS = 2;

export const CYTOKINE_DEFS: CytokineDef[] = [
  {
    id: 'interferon',
    name: 'Interferon',
    description: 'Viruses move 25% slower and enemy projectiles fly 25% slower',
    unlockPlayerLevel: 3,
    icon: '🧬',
  },
  {
    id: 'auto_target',
    name: 'Auto-Targeting',
    description: 'Antibodies gently track nearest pathogen',
    unlockPlayerLevel: 5,
    icon: '🎯',
  },
  {
    id: 'fever',
    name: 'Fever',
    description: 'Every 3s, a heat pulse damages pathogens near you',
    unlockPlayerLevel: 8,
    icon: '🌡️',
  },
  {
    id: 'regeneration',
    name: 'Regeneration',
    description: 'Slowly recover health over time',
    unlockPlayerLevel: 10,
    icon: '💚',
  },
  {
    id: 'chain_reaction',
    name: 'Chain Reaction',
    description: 'Explosions damage nearby pathogens',
    unlockPlayerLevel: 15,
    icon: '💥',
  },
];

/** Cosmetic membrane colours, bought with XP. */
export const MEMBRANE_COSMETICS: { id: string; name: string; color: string; cost: number }[] = [
  { id: 'default', name: 'Classic', color: '#ffffff', cost: 0 },
  { id: 'cyan', name: 'Cytoplasm Cyan', color: '#22d3ee', cost: 2000 },
  { id: 'lime', name: 'Chlorophyll Lime', color: '#a3e635', cost: 3000 },
  { id: 'violet', name: 'Lysosome Violet', color: '#c084fc', cost: 4000 },
  { id: 'gold', name: 'Golden Helix', color: '#fbbf24', cost: 6000 },
  { id: 'rose', name: 'Hemoglobin Rose', color: '#fb7185', cost: 8000 },
];

// XP required to reach each player level (index = level)
export const PLAYER_LEVEL_THRESHOLDS = [
  0,      // Level 0 (unused)
  0,      // Level 1 (starting)
  200,    // Level 2
  500,    // Level 3
  1000,   // Level 4
  2000,   // Level 5  → unlocks auto-target
  3500,   // Level 6
  5500,   // Level 7
  8000,   // Level 8
  11000,  // Level 9
  15000,  // Level 10 → unlocks regeneration
  20000,  // Level 11
  26000,  // Level 12
  33000,  // Level 13
  41000,  // Level 14
  50000,  // Level 15 → unlocks chain reaction
  60000,  // Level 16
  72000,  // Level 17
  86000,  // Level 18
  102000, // Level 19
  120000, // Level 20
];

export const MAX_PLAYER_LEVEL = PLAYER_LEVEL_THRESHOLDS.length - 1;

// Per-level gains for upgrade levels 1–5 (later tiers are in UPGRADE_DEFS[].effects)
export const HULL_HP_PER_LEVEL = 10;
export const THRUST_PER_LEVEL = 0.02;
export const DAMAGE_PER_LEVEL = 0.25;
export const SHOT_DELAY_REDUCTION_PER_LEVEL = 15;  // ms
export const SHIELD_FRAMES_PER_LEVEL = 50;


// --- New Enemy Tuning ---

// Prion
export const PRION_RADIUS = 8;
export const PRION_SPEED = 3.5;
export const PRION_HEALTH = 1;
export const PRION_SWARM_SIZE = 6;
export const PRION_OPACITY = 0.3;
export const PRION_POINTS = 25;
export const PRION_MIN_LEVEL = 3;

// Cancer Cell
export const CANCER_INITIAL_RADIUS = 20;
export const CANCER_MAX_RADIUS = 60;
export const CANCER_GROWTH_RATE = 0.02;     // radius per frame
export const CANCER_SPAWN_INTERVAL = 600;   // frames between spawning copies (10s)
export const CANCER_HEALTH_PER_RADIUS = 0.3;
export const CANCER_POINTS = 80;
export const CANCER_MIN_LEVEL = 5;

// Biofilm
export const BIOFILM_RADIUS = 45;
export const BIOFILM_SHIELD_HEALTH = 8;
export const BIOFILM_INNER_HEALTH = 4;
export const BIOFILM_POINTS = 120;
export const BIOFILM_MIN_LEVEL = 7;

// Boss tuning
/** Endless mode: a boss every BOSS_INTERVAL levels, cycling through BOSS_ROTATION. */
export const BOSS_INTERVAL = 5;
export const BOSS_LEVELS = [5, 10, 15, 20] as const; // campaign Act I (legacy)
/** Invulnerability after taking a hit, in steps. */
export const PLAYER_IFRAMES = 45;
/** Max damage a bomb power-up deals to a boss (fraction of its max health). */
export const BOMB_BOSS_DAMAGE_FRACTION = 0.2;

export const MEGA_VIRUS_RADIUS = 70;
export const MEGA_VIRUS_HEALTH = 40;
export const MEGA_VIRUS_POINTS = 500;
export const MEGA_VIRUS_SHIELD_PHASE_DURATION = 180;  // 3s invulnerable
export const MEGA_VIRUS_VULNERABLE_DURATION = 300;    // 5s vulnerable

export const BACTERIAL_COLONY_SEGMENTS = 6;
export const BACTERIAL_COLONY_SEGMENT_RADIUS = 25;
export const BACTERIAL_COLONY_HEALTH = 8;   // per segment
export const BACTERIAL_COLONY_POINTS = 600;

export const PARASITIC_WORM_SEGMENTS = 8;
export const PARASITIC_WORM_HEAD_RADIUS = 22;
export const PARASITIC_WORM_HEALTH = 50;
export const PARASITIC_WORM_SPEED = 2.5;
export const PARASITIC_WORM_POINTS = 800;

export const FUNGAL_BLOOM_RADIUS = 80;
export const FUNGAL_BLOOM_HEALTH = 60;
export const FUNGAL_BLOOM_POINTS = 1000;
export const FUNGAL_BLOOM_SPORE_INTERVAL = 120;  // frames between spore clouds

// Cytokine tuning
export const AUTO_TARGET_STRENGTH = 0.03;           // radians per frame turn rate
export const REGEN_INTERVAL = 300;                   // frames (5 seconds at 60fps)
export const REGEN_AMOUNT = 1;
export const CHAIN_REACTION_RADIUS = 80;
export const CHAIN_REACTION_DAMAGE = 0.5;
export const FEVER_INTERVAL = 180;
export const FEVER_RADIUS = 110;
export const FEVER_DAMAGE = 1.5;
export const INTERFERON_SLOW = 0.75;
