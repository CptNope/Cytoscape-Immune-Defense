/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EnemyProjectile, Hazard, LysisEffect, Ship } from './types';
import { compactInPlace } from './interpolation';

/** Steer `vel` toward `angle` by at most `maxTurn` radians, keeping its speed. */
function steer(vel: { x: number; y: number }, angle: number, maxTurn: number): void {
  const spd = Math.hypot(vel.x, vel.y);
  if (spd === 0) return;
  const cur = Math.atan2(vel.y, vel.x);
  let diff = angle - cur;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const next = cur + Math.max(-maxTurn, Math.min(maxTurn, diff));
  vel.x = Math.cos(next) * spd;
  vel.y = Math.sin(next) * spd;
}

/**
 * Moves enemy projectiles and resolves hits on the ship.
 * @param speedMult  e.g. 0.75 with the Interferon cytokine
 * @param onHit      called for each projectile that touches the ship; return
 *                   true to consume the projectile
 */
export function updateProjectiles(
  projectiles: EnemyProjectile[],
  ship: Ship,
  worldW: number,
  worldH: number,
  speedMult: number,
  onHit: (p: EnemyProjectile) => boolean,
): void {
  compactInPlace(projectiles, p => {
    if (p.homing) {
      steer(p.vel, Math.atan2(ship.pos.y - p.pos.y, ship.pos.x - p.pos.x), p.homing);
    }
    p.pos.x += p.vel.x * speedMult;
    p.pos.y += p.vel.y * speedMult;
    p.rotation += 0.08;
    p.life--;
    if (p.life <= 0) return false;
    const m = 40;
    if (p.pos.x < -m || p.pos.y < -m || p.pos.x > worldW + m || p.pos.y > worldH + m) return false;
    const dx = p.pos.x - ship.pos.x;
    const dy = p.pos.y - ship.pos.y;
    const r = p.radius + ship.radius;
    if (dx * dx + dy * dy < r * r) return !onHit(p);
    return true;
  });
}

export interface HazardCallbacks {
  /** Continuous damage (per step) — no invulnerability frames. */
  onDot: (amount: number, h: Hazard) => void;
  /** One-off hit (inflammation ring). */
  onHit: (amount: number, h: Hazard) => void;
  /** Ship is inside something that slows it. */
  onSlow: (factor: number) => void;
}

export function updateHazards(
  hazards: Hazard[],
  ship: Ship,
  worldW: number,
  worldH: number,
  cb: HazardCallbacks,
): void {
  const maxRing = Math.hypot(worldW, worldH);
  compactInPlace(hazards, h => {
    h.pos.x += h.vel.x;
    h.pos.y += h.vel.y;
    h.life--;
    const dx = ship.pos.x - h.pos.x;
    const dy = ship.pos.y - h.pos.y;
    const dist = Math.hypot(dx, dy);

    switch (h.kind) {
      case 'spore_cloud': {
        // Clouds swell in, then thin out
        const t = 1 - h.life / h.maxLife;
        const scale = t < 0.15 ? t / 0.15 : 1;
        if (dist < h.radius * scale + ship.radius * 0.5) {
          if (h.slow) cb.onSlow(h.slow);
          if (h.dps) cb.onDot(h.dps / 60, h);
        }
        break;
      }
      case 'inflammation_ring': {
        h.radius += h.speed ?? 2;
        if (!h.hitDone && Math.abs(dist - h.radius) < ship.radius + 4) {
          let diff = Math.atan2(dy, dx) - (h.angle ?? 0);
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          if (Math.abs(diff) > (h.gap ?? 0.5)) {
            h.hitDone = true;
            cb.onHit(h.dps ?? 12, h);
          }
        }
        if (h.radius > maxRing) return false;
        break;
      }
      default:
        break; // telegraphs are visual only
    }
    return h.life > 0;
  });
}

export function updateLysis(effects: LysisEffect[]): void {
  compactInPlace(effects, e => {
    e.life--;
    const t = 1 - e.life / e.maxLife;
    e.radius = e.maxRadius * (1 - (1 - t) * (1 - t));
    return e.life > 0;
  });
}
