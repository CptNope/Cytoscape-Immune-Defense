/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CellTypeId } from './types';

export interface CellTypeDef {
  id: CellTypeId;
  name: string;
  /** Short role line shown in the loadout. */
  role: string;
  description: string;
  unlockPlayerLevel: number;
  /** Multipliers applied on top of upgrades. */
  healthMult: number;
  thrustMult: number;
  /** >1 = slower firing. */
  fireDelayMult: number;
  damageMult: number;
  radius: number;
  /** Antibodies home in on targets (0 = off). */
  homing: number;
  ability: {
    name: string;
    description: string;
    /** Cooldown in simulation steps (60/sec). */
    cooldown: number;
  };
  color: string;
}

export const CELL_TYPES: CellTypeDef[] = [
  {
    id: 'killer_t',
    name: 'Killer T-Cell',
    role: 'Balanced',
    description: 'CD8+ cytotoxic lymphocyte. Reliable all-rounder.',
    unlockPlayerLevel: 1,
    healthMult: 1,
    thrustMult: 1,
    fireDelayMult: 1,
    damageMult: 1,
    radius: 18,
    homing: 0,
    ability: {
      name: 'Perforin Burst',
      description: 'Release a ring of 16 antibodies in every direction.',
      cooldown: 8 * 60,
    },
    color: '#ffffff',
  },
  {
    id: 'macrophage',
    name: 'Macrophage',
    role: 'Tank',
    description: '"Big eater". Slow and tough — small pathogens that touch you are engulfed and heal you.',
    unlockPlayerLevel: 4,
    healthMult: 1.5,
    thrustMult: 0.75,
    fireDelayMult: 1.25,
    damageMult: 1,
    radius: 22,
    homing: 0,
    ability: {
      name: 'Phagocytosis',
      description: 'Swell up for 2s and engulf every non-boss pathogen you touch.',
      cooldown: 10 * 60,
    },
    color: '#fde68a',
  },
  {
    id: 'nk_cell',
    name: 'NK Cell',
    role: 'Speed',
    description: 'Natural killer. Fast and fragile — strikes before the threat is even identified.',
    unlockPlayerLevel: 7,
    healthMult: 0.8,
    thrustMult: 1.35,
    fireDelayMult: 0.9,
    damageMult: 1,
    radius: 16,
    homing: 0,
    ability: {
      name: 'Lytic Dash',
      description: 'Dash forward, invulnerable, damaging everything you pass through.',
      cooldown: 4 * 60,
    },
    color: '#93c5fd',
  },
  {
    id: 'plasma_b',
    name: 'Plasma B-Cell',
    role: 'Support',
    description: 'An antibody factory. Weaker shots, but every one of them seeks a target.',
    unlockPlayerLevel: 11,
    healthMult: 0.9,
    thrustMult: 1,
    fireDelayMult: 0.75,
    damageMult: 0.75,
    radius: 18,
    homing: 0.07,
    ability: {
      name: 'Antibody Storm',
      description: 'Triple fire rate for 4 seconds.',
      cooldown: 12 * 60,
    },
    color: '#86efac',
  },
];

export function getCellType(id: CellTypeId | undefined): CellTypeDef {
  return CELL_TYPES.find(c => c.id === id) ?? CELL_TYPES[0];
}

export function isCellUnlocked(id: CellTypeId, playerLevel: number): boolean {
  return getCellType(id).unlockPlayerLevel <= playerLevel;
}
