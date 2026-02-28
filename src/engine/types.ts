/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vector {
  x: number;
  y: number;
}

export interface Entity {
  pos: Vector;
  vel: Vector;
  radius: number;
  rotation: number;
}

export type PathogenType = 'virus' | 'bacteria' | 'parasite' | 'fungus' | 'prion' | 'cancer' | 'biofilm';
export type BossType = 'mega_virus' | 'bacterial_colony' | 'parasitic_worm' | 'fungal_bloom';

export interface Pathogen extends Entity {
  id: number;
  type: PathogenType;
  variant?: 'armored' | 'swift' | 'stalker';
  health: number;
  maxHealth: number;
  points: number;
  sides: number;
  noise: number[];
  // Prion: low opacity, swarm member
  opacity?: number;
  // Cancer: grows over time, spawn timer
  growthRate?: number;
  spawnTimer?: number;
  // Biofilm: shield layer that must be destroyed first
  shieldHealth?: number;
  maxShieldHealth?: number;
  // Boss fields
  isBoss?: boolean;
  bossType?: BossType;
  phase?: number;           // boss phase (for multi-phase bosses)
  phaseTimer?: number;      // frames in current phase
  segments?: Vector[];       // for parasitic worm segments
}

export interface Antibody extends Entity {
  id: number;
  life: number;
}

export interface Particle extends Entity {
  id: number;
  life: number;
  color: string;
  opacity: number;
}

export interface PowerUp extends Entity {
  id: number;
  type: 'rapid_fire' | 'shield' | 'damage_boost' | 'bomb';
  life: number;
}

export interface FloatingText {
  id: number;
  pos: Vector;
  vel: Vector;
  text: string;
  color: string;
  life: number;
  size: number;
}

export interface ScoreEntry {
  score: number;
  level: number;
  date: string;
}

export interface Ship extends Entity {
  thrusting: boolean;
  turning: number;
  lastShot: number;
}

export interface ActivePowerUps {
  rapidFire: number;
  shield: number;
  damageBoost: number;
}

export interface VirtualControls {
  joystickActive: boolean;
  joystickAngle: number;
  joystickDistance: number;
  fire: boolean;
}

// --- Progression System ---

export type UpgradeId =
  | 'hull_integrity'
  | 'thruster_power'
  | 'antibody_potency'
  | 'rapid_response'
  | 'membrane_shield';

export type CytokineId =
  | 'auto_target'
  | 'regeneration'
  | 'chain_reaction';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  maxLevel: number;
  costs: number[];          // XP cost per level
  icon: string;             // emoji
}

export interface CytokineDef {
  id: CytokineId;
  name: string;
  description: string;
  unlockPlayerLevel: number;
  icon: string;
}

export interface PlayerProfile {
  xp: number;
  lifetimeXp: number;
  playerLevel: number;
  upgrades: Record<UpgradeId, number>;       // current level for each upgrade (0 = not purchased)
  cytokines: Record<CytokineId, boolean>;    // true = unlocked & active
  stats: PlayerStats;
}

export interface PlayerStats {
  totalKills: number;
  killsByType: Record<string, number>;       // keyed by pathogen type
  totalScore: number;
  totalRuns: number;
  totalTimePlayed: number;                   // seconds
  highestLevel: number;
}

export interface GameModifiers {
  maxHealth: number;
  thrustPower: number;
  bulletDamage: number;
  shotDelay: number;          // base shot delay ms
  shieldDuration: number;     // frames
  hasAutoTarget: boolean;
  hasRegeneration: boolean;
  hasChainReaction: boolean;
}
