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
  /** Position at the start of the latest simulation step (for render interpolation). */
  prev?: Vector;
}

export type PathogenType =
  | 'virus' | 'bacteria' | 'parasite' | 'fungus' | 'prion' | 'cancer' | 'biofilm'
  // Boss-fight entities
  | 'host_rbc'      // red blood cell that Plasmodium hides in (harmless, don't shoot!)
  | 'decoy_tcell'   // Retrovirus-hijacked T-cell
  | 'vessel';       // tumor-feeding blood vessel (angiogenesis)
export type BossType =
  | 'mega_virus' | 'bacterial_colony' | 'parasitic_worm' | 'fungal_bloom'
  | 'plasmodium' | 'retrovirus' | 'influenza' | 'metastatic_tumor' | 'autoimmune';

/** Mutable per-boss AI state. Timers are in simulation steps (60/sec). */
export interface BossState {
  /** Steps since spawn. */
  t: number;
  /** Current behaviour, e.g. 'chase', 'burrow', 'lunge'. */
  mode: string;
  /** Steps remaining in the current mode. */
  modeT: number;
  /** Generic attack cooldown. */
  attackT: number;
  /** 1-based phase; increases at health thresholds. */
  phase: number;
  /** Boss-specific numbers (targets, counters, angles...). */
  data: Record<string, number>;
  /** Ids of this boss's parts, in order (segments, tendrils, vessels, host cells). */
  parts: number[];
}

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
  /** Killed this step; removed from the list at the end of the step. */
  dead?: boolean;
  /** AI state for bosses. */
  boss?: BossState;
  /** For boss parts / minions bound to a boss: the boss's id. */
  ownerId?: number;
  /** Part of a boss (segment, tendril, vessel, host cell). */
  isBossPart?: boolean;
  /** No contact damage (e.g. host red blood cells). */
  harmless?: boolean;
  /** Not drawn, can't be hit or collided with (burrowed worm, hidden parasite). */
  hidden?: boolean;
  /** Takes no damage right now (shown with a shield). */
  invulnerable?: boolean;
  /** Steps of white hit-flash remaining. */
  hitFlash?: number;
  /** Steps until another feedback label ("RESISTED") may be shown. */
  labelCd?: number;
  /** Steps of opsonization remaining (takes extra damage). */
  marked?: number;
  /** Which antibody class this pathogen currently resists (Influenza). */
  resistClass?: AntibodyClass;
  /** Cached display label, e.g. "Bacteria (armored)". */
  label?: string;
}

export type AntibodyClass = 'IgG' | 'IgM' | 'IgA' | 'IgE';

export interface Antibody extends Entity {
  id: number;
  life: number;
  /** Antibody class that fired this shot (defaults to IgG). */
  cls?: AntibodyClass;
  /** Damage before target modifiers (defaults to the player's bullet damage). */
  damage?: number;
  /** How many more targets it can pass through. */
  pierce?: number;
  /** Launch speed of the class (ignores ship velocity) — used for resistances. */
  baseSpeed?: number;
  /** Ids already hit by a piercing shot. */
  hitIds?: number[];
  /** Strong homing (Plasma B-cell). */
  homing?: number;
}

// --- Enemy attacks ---

export type ProjectileKind = 'virion' | 'toxin' | 'spore' | 'spike' | 'enemy_antibody' | 'merozoite';
export type StatusEffectKind = 'infect' | 'slow';

export interface EnemyProjectile {
  id: number;
  pos: Vector;
  vel: Vector;
  radius: number;
  rotation: number;
  life: number;
  damage: number;
  kind: ProjectileKind;
  color: string;
  /** Status effect applied to the player on hit. */
  effect?: StatusEffectKind;
  /** Turn rate (radians/step) toward the player. */
  homing?: number;
  prev?: Vector;
}

export type HazardKind = 'spore_cloud' | 'telegraph_circle' | 'telegraph_line' | 'inflammation_ring';

export interface Hazard {
  id: number;
  kind: HazardKind;
  pos: Vector;
  vel: Vector;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
  /** Damage per second while inside (spore cloud) or on contact (ring edge). */
  dps?: number;
  /** Player speed multiplier while inside (spore cloud). */
  slow?: number;
  /** telegraph_line end point; inflammation_ring gap direction. */
  to?: Vector;
  angle?: number;
  /** inflammation_ring: half-width of the safe gap (radians), expansion speed. */
  gap?: number;
  speed?: number;
  /** inflammation_ring: already hit the player. */
  hitDone?: boolean;
  prev?: Vector;
}

/** Purely visual expanding ring (cell lysis). */
export interface LysisEffect {
  pos: Vector;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface PlayerStatus {
  /** Steps of "infected" remaining (slower fire rate). */
  infected: number;
  /** Steps of slow remaining, and the speed multiplier. */
  slowed: number;
  slowFactor: number;
  /** Steps of invulnerability after taking a hit. */
  iframes: number;
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
  prev?: Vector;
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
  /** Steps remaining of an active dash / engulf (cell abilities). */
  dashT?: number;
  engulfT?: number;
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
  /** Edge-triggered requests from touch buttons; consumed by the game loop. */
  abilityPressed?: boolean;
  swapPressed?: boolean;
  /** How many times the ability / class swap was used this run (tutorial). */
  abilityUses?: number;
  swapUses?: number;
}

// --- Game Modes ---

export type GameMode = 'endless' | 'campaign' | 'time_attack' | 'zen';

export interface CampaignLevel {
  level: number;
  title: string;
  briefing: string;               // story text shown before the wave
  pathogens: { type: PathogenType; count: number; variant?: 'armored' | 'swift' | 'stalker' }[];
  boss?: BossType;                // optional boss for this level
  /** Act heading shown in the level select (e.g. "Act II — Relapse"). */
  act?: string;
  timeLimit?: number;             // optional time limit in seconds
  objectiveText?: string;         // short HUD objective line
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
  | 'chain_reaction'
  | 'interferon'
  | 'fever';

export type CellTypeId = 'killer_t' | 'macrophage' | 'nk_cell' | 'plasma_b';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  maxLevel: number;
  costs: number[];          // XP cost per level
  /** Effect gained at each level (index 0 = level 1). */
  effects: number[];
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
  cytokines: Record<CytokineId, boolean>;    // true = unlocked
  /** Cytokines active this run (max CYTOKINE_SLOTS). */
  equippedCytokines: CytokineId[];
  /** Selected playable cell. */
  cellType: CellTypeId;
  /** Cosmetic membrane colours: owned ids and the equipped one. */
  cosmetics: { owned: string[]; equipped: string };
  stats: PlayerStats;
}

export interface PlayerStats {
  totalKills: number;
  killsByType: Record<string, number>;       // keyed by pathogen type
  totalScore: number;
  totalRuns: number;
  totalTimePlayed: number;                   // seconds
  highestLevel: number;
  /** Times each boss has been defeated. */
  bossKills: Record<string, number>;
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
  hasInterferon: boolean;
  hasFever: boolean;
  /** Ship collision radius (macrophages are bigger). */
  shipRadius: number;
  cellType: CellTypeId;
  /** Membrane colour (cosmetic). */
  membraneColor: string;
}
