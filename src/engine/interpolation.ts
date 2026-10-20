/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Vector } from './types';

/**
 * Render interpolation for a fixed-timestep simulation.
 *
 * The game simulates at a fixed 60 updates/sec. On displays that refresh
 * faster (90/120/144Hz) or with uneven frame pacing, drawing the raw
 * simulation state makes motion look steppy because several rendered frames
 * show the same positions. Instead, each entity remembers where it was at the
 * start of the latest step, and the renderer draws it part-way between that
 * and its current position according to how far we are into the next step.
 *
 * Everything here is allocation-free after warm-up, so it adds no GC pressure.
 */

export interface Interpolatable {
  pos: Vector;
  /** Position at the start of the most recent simulation step. */
  prev?: Vector;
}

/**
 * Moves larger than this (in world units) within one step are teleports —
 * screen wrapping, respawns — and are drawn at the current position instead
 * of being smeared across the screen.
 */
export const MAX_INTERP_JUMP = 100;

/** Record each entity's current position as its previous position. Call before every step. */
export function snapshotPositions(list: readonly Interpolatable[]): void {
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.prev) {
      e.prev.x = e.pos.x;
      e.prev.y = e.pos.y;
    } else {
      e.prev = { x: e.pos.x, y: e.pos.y };
    }
  }
}

/** Linear interpolation between two angles along the shortest arc. */
export function lerpAngle(from: number, to: number, alpha: number): number {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * alpha;
}

/**
 * Temporarily moves entities to their interpolated positions for drawing,
 * then puts them back. Usage:
 *
 *   interp.apply(lists, alpha); render(...); interp.restore();
 *
 * The lists must not be modified between apply() and restore().
 */
export class PositionInterpolator {
  private buf = new Float64Array(1024);
  private lists: readonly (readonly Interpolatable[])[] = [];
  private active = false;

  apply(lists: readonly (readonly Interpolatable[])[], alpha: number): void {
    let total = 0;
    for (const l of lists) total += l.length;
    if (total * 2 > this.buf.length) {
      this.buf = new Float64Array(Math.max(total * 2, this.buf.length * 2));
    }

    const a = Math.min(1, Math.max(0, alpha));
    let k = 0;
    for (const list of lists) {
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        const cx = e.pos.x;
        const cy = e.pos.y;
        this.buf[k++] = cx;
        this.buf[k++] = cy;
        const p = e.prev;
        if (!p) continue; // spawned this step: draw where it is
        const dx = cx - p.x;
        const dy = cy - p.y;
        if (dx > MAX_INTERP_JUMP || dx < -MAX_INTERP_JUMP || dy > MAX_INTERP_JUMP || dy < -MAX_INTERP_JUMP) continue;
        e.pos.x = p.x + dx * a;
        e.pos.y = p.y + dy * a;
      }
    }
    this.lists = lists;
    this.active = true;
  }

  restore(): void {
    if (!this.active) return;
    let k = 0;
    for (const list of this.lists) {
      for (let i = 0; i < list.length; i++) {
        list[i].pos.x = this.buf[k++];
        list[i].pos.y = this.buf[k++];
      }
    }
    this.lists = [];
    this.active = false;
  }
}

/**
 * Removes items that fail `keep` without allocating a new array (unlike
 * Array.prototype.filter). `keep` may mutate the item. Returns the same array.
 */
export function compactInPlace<T>(arr: T[], keep: (item: T) => boolean): T[] {
  let w = 0;
  for (let r = 0; r < arr.length; r++) {
    const item = arr[r];
    if (keep(item)) arr[w++] = item;
  }
  arr.length = w;
  return arr;
}
