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
 * Watches frame times and tightens the caps when the device can't hold a
 * smooth frame rate, then slowly relaxes them again when it can. Over ~24ms a
 * frame (under ~42fps) counts as struggling.
 *
 * A device locked to 30fps (low-power mode, 30Hz screens) has ~33ms frames
 * even when idle. When no frame in a window was faster than that, the
 * governor judges by the time the game itself spent working instead.
 */
export class LoadGovernor {
  /** Multiplier for the caps, 0.5..1. */
  scale = 1;
  private ema = 0;
  private workEma = 0;
  private minFrame = Infinity;
  private samples = 0;

  constructor(
    private readonly slowMs = 24,
    private readonly fastMs = 18,
    private readonly window = 45,
    /** Work per frame that counts as struggling on a 30fps-locked device. */
    private readonly slowWorkMs = 20,
    private readonly fastWorkMs = 12,
  ) {}

  /**
   * Record one frame: its duration and the time spent simulating and drawing
   * it (ms; defaults to the frame time). Returns true when the scale changed.
   */
  sample(frameMs: number, workMs = frameMs): boolean {
    const first = this.samples === 0 && this.ema === 0;
    this.ema = first ? frameMs : this.ema * 0.95 + frameMs * 0.05;
    this.workEma = first ? workMs : this.workEma * 0.95 + workMs * 0.05;
    this.minFrame = Math.min(this.minFrame, frameMs);
    if (++this.samples < this.window) return false;
    const locked = this.minFrame > 28;
    this.samples = 0;
    this.minFrame = Infinity;
    const slow = locked ? this.workEma > this.slowWorkMs : this.ema > this.slowMs;
    const fast = locked ? this.workEma < this.fastWorkMs : this.ema < this.fastMs;
    const before = this.scale;
    if (slow) this.scale = Math.max(0.5, this.scale * 0.85);
    else if (fast) this.scale = Math.min(1, this.scale + 0.05);
    return this.scale !== before;
  }

  /** Smoothed frame time (ms), for diagnostics. */
  get averageMs(): number { return this.ema; }

  reset(): void {
    this.scale = 1;
    this.ema = 0;
    this.workEma = 0;
    this.minFrame = Infinity;
    this.samples = 0;
  }
}

/** Room left under a cap (never negative). */
export const roomUnder = (count: number, cap: number): number => Math.max(0, cap - count);
