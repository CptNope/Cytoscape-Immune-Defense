/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RenderQuality } from './renderer';

/**
 * Entity budget: hard limits on how much can be alive at once, so late waves
 * stay chaotic without freezing slower phones. Waves that would exceed the
 * pathogen limit queue the extra pathogens as reinforcements that stream in
 * as you kill — the wave keeps its full size, it just doesn't arrive at once.
 */

export interface EntityCaps {
  pathogens: number;
  antibodies: number;
  projectiles: number;
  hazards: number;
  particles: number;
}

/** Limits on high quality (capable devices). */
export const HIGH_CAPS: EntityCaps = { pathogens: 70, antibodies: 180, projectiles: 100, hazards: 32, particles: 200 };
/** Limits on low quality (weaker devices). */
export const LOW_CAPS: EntityCaps = { pathogens: 45, antibodies: 110, projectiles: 64, hazards: 20, particles: 90 };
/** Never go below these, however hard the device struggles. */
const FLOOR: EntityCaps = { pathogens: 24, antibodies: 60, projectiles: 36, hazards: 12, particles: 40 };

/** Caps for a quality level, shrunk by the load governor's scale (0.5..1). */
export function entityCaps(quality: RenderQuality, load = 1): EntityCaps {
  const base = quality === 'low' ? LOW_CAPS : HIGH_CAPS;
  const s = Math.min(1, Math.max(0.5, load));
  return {
    pathogens: Math.max(FLOOR.pathogens, Math.round(base.pathogens * s)),
    antibodies: Math.max(FLOOR.antibodies, Math.round(base.antibodies * s)),
    projectiles: Math.max(FLOOR.projectiles, Math.round(base.projectiles * s)),
    hazards: Math.max(FLOOR.hazards, Math.round(base.hazards * s)),
    particles: Math.max(FLOOR.particles, Math.round(base.particles * s)),
  };
}

/**
 * Watches frame times (simulation plus drawing) and tightens the caps when
 * the device can't hold a smooth frame rate, then slowly relaxes them again
 * when it can. Over ~24ms a frame (under ~42fps) counts as struggling.
 */
export class LoadGovernor {
  /** Multiplier for the caps, 0.5..1. */
  scale = 1;
  private ema = 0;
  private samples = 0;

  constructor(private readonly slowMs = 24, private readonly fastMs = 18, private readonly window = 45) {}

  /** Record one frame's duration (ms). Returns true when the scale changed. */
  sample(frameMs: number): boolean {
    this.ema = this.samples === 0 && this.ema === 0 ? frameMs : this.ema * 0.95 + frameMs * 0.05;
    if (++this.samples < this.window) return false;
    this.samples = 0;
    const before = this.scale;
    if (this.ema > this.slowMs) this.scale = Math.max(0.5, this.scale * 0.85);
    else if (this.ema < this.fastMs) this.scale = Math.min(1, this.scale + 0.05);
    return this.scale !== before;
  }

  /** Smoothed frame time (ms), for diagnostics. */
  get averageMs(): number { return this.ema; }

  reset(): void {
    this.scale = 1;
    this.ema = 0;
    this.samples = 0;
  }
}

/** Room left under a cap (never negative). */
export const roomUnder = (count: number, cap: number): number => Math.max(0, cap - count);
