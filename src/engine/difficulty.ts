/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameMode } from './types';

/**
 * Adaptive difficulty: pathogens evolve resistance as the host's immune
 * system gets stronger (just like real microbes under selection pressure).
 *
 * The player's power is estimated as damage per second relative to a fresh,
 * un-upgraded Killer T-cell. Enemies then get tougher by a fraction of that
 * power — not all of it, so upgrades still feel like upgrades — plus a gentle
 * ramp with the wave number.
 */

export interface PowerInputs {
  /** Damage per antibody before class modifiers (upgrades × cell type). */
  bulletDamage: number;
  /** Milliseconds between shots (upgrades × cell type). */
  shotDelay: number;
  /** Average immune-memory damage multiplier across pathogen types. */
  memoryAvg: number;
  /** In-run clonal-selection mutation effects. */
  damageMult: number;
  fireDelayMult: number;
  sideShotStacks: number;
  extraPierce: number;
  drones: number;
  complement: boolean;
  opsonization: boolean;
  /** Equipped damage cytokines. */
  chainReaction: boolean;
  autoTarget: boolean;
}

/** Shot delay and damage of a fresh Killer T-cell. */
const BASE_SHOT_DELAY = 200;
const BASE_DAMAGE = 1;

/** Estimated damage output relative to a fresh Killer T-cell (1 = base). */
export function playerPower(i: PowerInputs): number {
  const perShot = i.bulletDamage * i.damageMult * i.memoryAvg;
  const shotsPerSec = 1000 / (i.shotDelay * i.fireDelayMult);
  // Side shots spread out, so on average about half of them connect
  const volley = 1 + 0.6 * i.sideShotStacks;
  let dps = perShot * shotsPerSec * volley * (1 + 0.2 * i.extraPierce);
  // NK escort drones: half-damage shots every 0.8s each
  dps += i.drones * (i.bulletDamage * i.damageMult * 0.5) / 0.8;
  if (i.complement) dps *= 1.15;
  if (i.opsonization) dps *= 1.1;
  if (i.chainReaction) dps *= 1.1;
  if (i.autoTarget) dps *= 1.1;
  const base = BASE_DAMAGE * (1000 / BASE_SHOT_DELAY);
  return Math.max(1, dps / base);
}

export interface Threat {
  /** The power the threat was computed for. */
  power: number;
  /** Multiplier on pathogen health. */
  health: number;
  /** Multiplier on pathogen speed. */
  speed: number;
  /** Multiplier on damage pathogens deal to the player. */
  damage: number;
}

export const NO_THREAT: Threat = { power: 1, health: 1, speed: 1, damage: 1 };

/**
 * How much of the player's power enemies match. 0.7 means a player who is
 * 4× stronger kills about 1.5× faster than at base, and a fully upgraded
 * build with a big mutation stack (~75×) about 3.6× faster: progress still
 * shows, but nothing melts instantly.
 */
export const HEALTH_POWER_EXPONENT = 0.7;

/**
 * Enemy scaling for a wave.
 * @param power   result of {@link playerPower}
 * @param level   wave / campaign level (1-based)
 * @param maxHealth  the player's max health (upgrades, cell type, mutations)
 */
export function threatFor(power: number, level: number, mode: GameMode, maxHealth: number): Threat {
  if (mode === 'zen') return { ...NO_THREAT, power };
  const p = Math.max(1, power);
  // Campaign levels are hand-designed per level, so only the power part applies there
  const wave = mode === 'campaign' ? 1 : Math.min(2.2, 1 + 0.03 * Math.max(0, level - 1));
  return {
    power: p,
    health: Math.pow(p, HEALTH_POWER_EXPONENT) * wave,
    speed: 1 + Math.min(0.3, 0.07 * Math.log2(p)),
    // Tougher hosts take proportionally harder hits, so hull upgrades help without trivialising damage
    damage: Math.min(2, Math.max(1, Math.pow(maxHealth / 100, 0.6))),
  };
}

/**
 * Boss health multiplier: the same power curve as regular pathogens, times
 * the endless-mode cycle (each lap of the boss rotation is tougher).
 */
export function bossThreatScale(cycle: number, power: number): number {
  return (1 + 0.6 * cycle) * Math.pow(Math.max(1, power), HEALTH_POWER_EXPONENT);
}

/** Rounded label for the HUD ("×2.3"). */
export function threatLabel(t: Threat): string {
  return `×${t.health < 10 ? t.health.toFixed(1) : Math.round(t.health)}`;
}
