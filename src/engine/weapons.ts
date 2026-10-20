/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AntibodyClass, PathogenType, Vector } from './types';

/**
 * Antibody classes (immunoglobulin isotypes). Each mirrors a real job:
 * - IgG: the workhorse — most common antibody in blood.
 * - IgM: a pentamer (five units) made first in a response; great at clumping bacteria.
 * - IgA: guards mucosal surfaces and neutralises viruses.
 * - IgE: the anti-parasite (and allergy) antibody.
 */
export interface AntibodyClassDef {
  id: AntibodyClass;
  name: string;
  description: string;
  unlockPlayerLevel: number;
  /** Launch speed (world units/step). Parasites resist fast antibodies. */
  speed: number;
  /** Damage per antibody, as a multiple of the player's bullet damage. */
  damageMult: number;
  /** Multiplier on shot delay. */
  delayMult: number;
  /** Antibodies per shot and the spread between them (radians). */
  count: number;
  spread: number;
  /** Extra targets each antibody passes through. */
  pierce: number;
  life: number;
  /** Damage multipliers against specific pathogen types. */
  bonus: Partial<Record<PathogenType, number>>;
  color: string;
}

export const ANTIBODY_CLASSES: AntibodyClassDef[] = [
  {
    id: 'IgG',
    name: 'IgG',
    description: 'Standard antibody. Balanced speed and damage.',
    unlockPlayerLevel: 1,
    speed: 7,
    damageMult: 1,
    delayMult: 1,
    count: 1,
    spread: 0,
    pierce: 0,
    life: 60,
    bonus: {},
    color: '#4ade80',
  },
  {
    id: 'IgM',
    name: 'IgM',
    description: 'Pentamer spread shot. Slow — parasites can\'t dodge it. +25% vs bacteria.',
    unlockPlayerLevel: 3,
    speed: 5.5,
    damageMult: 0.45,
    delayMult: 1.6,
    count: 5,
    spread: 0.16,
    pierce: 0,
    life: 48,
    bonus: { bacteria: 1.25, biofilm: 1.25 },
    color: '#38bdf8',
  },
  {
    id: 'IgA',
    name: 'IgA',
    description: 'Fast, piercing shot that passes through 2 targets. +30% vs viruses.',
    unlockPlayerLevel: 6,
    speed: 9,
    damageMult: 0.8,
    delayMult: 1.15,
    count: 1,
    spread: 0,
    pierce: 2,
    life: 55,
    bonus: { virus: 1.3, prion: 1.3 },
    color: '#f472b6',
  },
  {
    id: 'IgE',
    name: 'IgE',
    description: 'Heavy, slow shot. 2.5× damage vs parasites.',
    unlockPlayerLevel: 9,
    speed: 5,
    damageMult: 1.6,
    delayMult: 1.8,
    count: 1,
    spread: 0,
    pierce: 0,
    life: 70,
    bonus: { parasite: 2.5 },
    color: '#fb923c',
  },
];

export function getAntibodyClass(id: AntibodyClass | undefined): AntibodyClassDef {
  return ANTIBODY_CLASSES.find(c => c.id === id) ?? ANTIBODY_CLASSES[0];
}

export function unlockedAntibodyClasses(playerLevel: number): AntibodyClass[] {
  return ANTIBODY_CLASSES.filter(c => c.unlockPlayerLevel <= playerLevel).map(c => c.id);
}

/** Next unlocked class after `current`, wrapping around. */
export function nextAntibodyClass(current: AntibodyClass, unlocked: AntibodyClass[]): AntibodyClass {
  if (unlocked.length === 0) return 'IgG';
  const i = unlocked.indexOf(current);
  return unlocked[(i + 1) % unlocked.length];
}

export interface VolleyShot {
  pos: Vector;
  vel: Vector;
  rotation: number;
  damage: number;
  pierce: number;
  life: number;
  baseSpeed: number;
}

export interface VolleyOptions {
  /** Player's bullet damage (after upgrades, cell type, mutations). */
  damage: number;
  /** Extra side shots from the Multi-Epitope mutation (adds 2 per stack). */
  sideShotStacks?: number;
  extraPierce?: number;
}

/**
 * Antibodies for one trigger pull of `cls`, fired from `origin` along `angle`.
 * Ship velocity is added so shots don't lag behind a moving cell.
 */
export function buildVolley(
  cls: AntibodyClassDef,
  origin: Vector,
  angle: number,
  shipVel: Vector,
  opts: VolleyOptions,
): VolleyShot[] {
  const shots: VolleyShot[] = [];
  const angles: number[] = [];
  const mid = (cls.count - 1) / 2;
  for (let i = 0; i < cls.count; i++) angles.push(angle + (i - mid) * cls.spread);

  const sideDamage: number[] = angles.map(() => 1);
  const stacks = opts.sideShotStacks ?? 0;
  for (let s = 1; s <= stacks; s++) {
    const off = 0.22 * s + (cls.count - 1) * cls.spread * 0.5;
    angles.push(angle - off, angle + off);
    sideDamage.push(0.6, 0.6);
  }

  for (let i = 0; i < angles.length; i++) {
    const a = angles[i];
    const c = Math.cos(a);
    const s = Math.sin(a);
    shots.push({
      pos: { x: origin.x + c * 4, y: origin.y + s * 4 },
      vel: { x: c * cls.speed + shipVel.x, y: s * cls.speed + shipVel.y },
      rotation: a,
      damage: opts.damage * cls.damageMult * sideDamage[i],
      pierce: cls.pierce + (opts.extraPierce ?? 0),
      life: cls.life,
      baseSpeed: cls.speed,
    });
  }
  return shots;
}
