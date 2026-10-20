/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AntibodyClass, Pathogen } from './types';
import { getAntibodyClass } from './weapons';

/** Antibodies launched faster than this are shrugged off by (non-boss) parasites. */
export const PARASITE_RESIST_SPEED = 6.5;
export const PARASITE_RESIST_MULT = 0.4;
export const FUNGUS_RESIST_MULT = 0.5;
export const OPSONIZED_MULT = 1.3;
/** Damage taken from the antibody class a pathogen is currently resisting. */
export const CLASS_RESIST_MULT = 0.15;
/** ...or when the player only has one class unlocked (so it stays beatable). */
export const CLASS_RESIST_MULT_SINGLE = 0.6;

export interface HitInput {
  /** Damage carried by the antibody (already includes upgrades & mutations). */
  damage: number;
  cls: AntibodyClass;
  /** Launch speed of the antibody's class, ignoring ship velocity. */
  baseSpeed: number;
  /** Damage Boost power-up multiplier (1 or 2). */
  boostMult: number;
  /** Immune memory multipliers by pathogen type. */
  memory: Record<string, number>;
  /** Extra multiplier vs bosses (Antigen Presentation). */
  bossDamageMult: number;
  /** How many antibody classes the player has unlocked. */
  unlockedClassCount: number;
}

export interface HitResult {
  /** Damage applied to health. */
  damage: number;
  /** Damage applied to a biofilm shield instead of health. */
  shieldDamage: number;
  resisted: boolean;
  /** Floating text to show (e.g. "RESISTED", "SHIELDED"), if any. */
  label?: string;
}

/**
 * How much damage an antibody deals to a pathogen. Pure — no side effects —
 * so every resistance/bonus rule lives here and is unit-tested.
 */
export function computeHit(p: Pathogen, hit: HitInput): HitResult {
  if (p.invulnerable) {
    return { damage: 0, shieldDamage: 0, resisted: true, label: 'SHIELDED' };
  }

  const cls = getAntibodyClass(hit.cls);
  let dmg = hit.damage * hit.boostMult;
  let resisted = false;
  let label: string | undefined;

  // Antibody class strengths (IgE vs parasites, IgA vs viruses, ...)
  dmg *= cls.bonus[p.type] ?? 1;

  // Immune memory for this pathogen type
  dmg *= hit.memory[p.type] ?? 1;

  // Natural resistances
  if (p.type === 'fungus') {
    dmg *= FUNGUS_RESIST_MULT;
    resisted = true;
  } else if (p.type === 'parasite' && !p.isBoss && hit.baseSpeed > PARASITE_RESIST_SPEED) {
    dmg *= PARASITE_RESIST_MULT;
    resisted = true;
    label = 'RESISTED';
  }

  // Antigenic shift: resists one antibody class at a time
  if (p.resistClass && p.resistClass === hit.cls) {
    dmg *= hit.unlockedClassCount <= 1 ? CLASS_RESIST_MULT_SINGLE : CLASS_RESIST_MULT;
    resisted = true;
    label = `${hit.cls} RESISTED`;
  }

  // Boss armour (e.g. while its blood supply / tendrils are intact)
  const armor = p.boss?.data.armor;
  if (armor !== undefined && armor < 1) {
    dmg *= armor;
    resisted = true;
  }

  if (p.marked && p.marked > 0) dmg *= OPSONIZED_MULT;
  if (p.isBoss) dmg *= hit.bossDamageMult;

  // Biofilm: the shield soaks everything until it breaks
  if (p.type === 'biofilm' && (p.shieldHealth ?? 0) > 0) {
    return { damage: 0, shieldDamage: dmg, resisted: true };
  }

  return { damage: dmg, shieldDamage: 0, resisted, label };
}

/** Bomb power-up damage: kills normal pathogens, chunks bosses instead of one-shotting them. */
export function bombDamage(p: Pathogen, bossFraction: number): number {
  if (p.isBoss) return p.maxHealth * bossFraction;
  return Infinity;
}
