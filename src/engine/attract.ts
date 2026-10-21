/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Pathogen, Antibody, Particle, PowerUp, Ship, LysisEffect, AntibodyClass, PathogenType,
} from './types';
import { applyVelocity, wrapPosition } from './physics';
import { compactInPlace } from './interpolation';
import { updateLysis } from './hazards';

/**
 * "Attract mode": a self-playing scene for the landing page. A Killer T-cell
 * roams the bloodstream hunting pathogens with every antibody class, while
 * new microbes drift in from the edges. It reuses the game's entity shapes so
 * the real renderer can draw it, but none of the game's rules — nothing here
 * can lose, and it's cheap enough to run behind a scrolling page.
 */

export interface AttractState {
  w: number;
  h: number;
  ship: Ship;
  pathogens: Pathogen[];
  antibodies: Antibody[];
  particles: Particle[];
  powerUps: PowerUp[];
  lysis: LysisEffect[];
  /** Simulation steps so far (60/sec). */
  t: number;
  nextId: number;
  /** Where the T-cell wanders when nothing is in range. */
  wander: { x: number; y: number };
  fireT: number;
  cls: AntibodyClass;
  rng: () => number;
}

const COLORS: Record<string, string> = {
  virus: '#f59e0b', bacteria: '#ef4444', parasite: '#a855f7', fungus: '#10b981',
  prion: '#94a3b8', cancer: '#f472b6', biofilm: '#38bdf8',
};
const CLASSES: AntibodyClass[] = ['IgG', 'IgG', 'IgM', 'IgA', 'IgE'];
const MAX_PARTICLES = 80;

/** How many pathogens to keep on screen for a given area. */
export function attractTarget(w: number, h: number): number {
  return Math.max(6, Math.min(14, Math.round((w * h) / 70000)));
}

export function createAttract(w: number, h: number, rng: () => number = Math.random): AttractState {
  const s: AttractState = {
    w, h, rng,
    ship: {
      pos: { x: w * 0.5, y: h * 0.62 }, vel: { x: 0, y: 0 }, radius: 18, rotation: -Math.PI / 2,
      thrusting: false, turning: 0, lastShot: 0,
    },
    pathogens: [], antibodies: [], particles: [], powerUps: [], lysis: [],
    t: 0, nextId: 1, wander: { x: w * 0.5, y: h * 0.5 }, fireT: 30, cls: 'IgG',
  };
  // Start with a populated scene, spread across the screen
  for (let i = 0; i < attractTarget(w, h); i++) spawn(s, true);
  return s;
}

/** Keeps the scene the right size when the window changes. */
export function resizeAttract(s: AttractState, w: number, h: number): void {
  s.w = w;
  s.h = h;
  s.wander = { x: Math.min(s.wander.x, w * 0.8), y: Math.min(s.wander.y, h * 0.8) };
}

function pickType(r: number): { type: PathogenType; variant?: Pathogen['variant'] } {
  if (r < 0.26) return { type: 'virus' };
  if (r < 0.36) return { type: 'virus', variant: 'swift' };
  if (r < 0.56) return { type: 'bacteria' };
  if (r < 0.63) return { type: 'bacteria', variant: 'armored' };
  if (r < 0.75) return { type: 'parasite' };
  if (r < 0.81) return { type: 'parasite', variant: 'stalker' };
  if (r < 0.9) return { type: 'fungus' };
  if (r < 0.95) return { type: 'cancer' };
  return { type: 'biofilm' };
}

function spawn(s: AttractState, anywhere = false, parent?: Pathogen): void {
  const r = s.rng;
  const kind = parent ? { type: parent.type, variant: parent.variant } : pickType(r());
  const radius = parent ? parent.radius * 0.6
    : kind.type === 'fungus' ? 34 + r() * 12
    : kind.type === 'biofilm' ? 36
    : kind.type === 'cancer' ? 22 + r() * 10
    : kind.type === 'virus' ? 16 + r() * 12
    : 18 + r() * 14;
  let pos: { x: number; y: number };
  if (parent) pos = { ...parent.pos };
  else if (anywhere) {
    // Keep the very first pathogens off the T-cell
    let tries = 0;
    do pos = { x: r() * s.w, y: r() * s.h };
    while (Math.hypot(pos.x - s.ship.pos.x, pos.y - s.ship.pos.y) < 160 && ++tries < 20);
  } else {
    // Drift in from a random edge
    const edge = Math.floor(r() * 4);
    pos = edge === 0 ? { x: -radius, y: r() * s.h }
      : edge === 1 ? { x: s.w + radius, y: r() * s.h }
      : edge === 2 ? { x: r() * s.w, y: -radius }
      : { x: r() * s.w, y: s.h + radius };
  }
  const slow = kind.type === 'fungus' || kind.type === 'biofilm' ? 0.35 : kind.type === 'cancer' ? 0.15 : 1;
  const fast = kind.variant === 'swift' ? 1.8 : 1;
  const sp = (0.4 + r() * 0.8) * slow * fast;
  const a = r() * Math.PI * 2;
  const hp = Math.max(1, Math.round(radius / 9)) * (kind.variant === 'armored' ? 2 : 1) + (kind.type === 'biofilm' ? 3 : 0);
  s.pathogens.push({
    id: s.nextId++, type: kind.type, variant: kind.variant, pos,
    vel: { x: Math.cos(a) * sp, y: Math.sin(a) * sp },
    radius, rotation: r() * Math.PI * 2, health: hp, maxHealth: hp, points: 0, sides: 10, noise: [],
    shieldHealth: kind.type === 'biofilm' ? 4 : undefined, maxShieldHealth: kind.type === 'biofilm' ? 4 : undefined,
    adapted: true,
  });
}

function burst(s: AttractState, p: Pathogen): void {
  const color = COLORS[p.type] ?? '#ffffff';
  const life = Math.round(18 + p.radius * 0.3);
  s.lysis.push({ pos: { ...p.pos }, radius: 0, maxRadius: p.radius * 1.8, life, maxLife: life, color });
  const n = Math.min(10, MAX_PARTICLES - s.particles.length);
  for (let i = 0; i < n; i++) {
    const a = s.rng() * Math.PI * 2, v = 0.8 + s.rng() * 2.4;
    s.particles.push({
      id: s.nextId++, pos: { ...p.pos }, vel: { x: Math.cos(a) * v, y: Math.sin(a) * v },
      radius: 1 + s.rng() * 2.5, rotation: 0, life: 22 + s.rng() * 18, color, opacity: 1,
    });
  }
  if (s.rng() < 0.12 && s.powerUps.length < 2) {
    const types: PowerUp['type'][] = ['rapid_fire', 'shield', 'damage_boost', 'bomb'];
    s.powerUps.push({
      id: s.nextId++, type: types[Math.floor(s.rng() * 4)], pos: { ...p.pos },
      vel: { x: (s.rng() - 0.5) * 0.6, y: (s.rng() - 0.5) * 0.6 }, radius: 12, rotation: 0, life: 420,
    });
  }
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Advances the scene by one 60Hz step. */
export function stepAttract(s: AttractState): void {
  s.t++;
  const ship = s.ship;
  const r = s.rng;

  // Keep the bloodstream busy
  if (s.pathogens.length < attractTarget(s.w, s.h) && s.t % 45 === 0) spawn(s);

  // The T-cell picks the nearest target, or wanders
  let target: Pathogen | null = null;
  let best = 420 * 420;
  for (const p of s.pathogens) {
    const d = (p.pos.x - ship.pos.x) ** 2 + (p.pos.y - ship.pos.y) ** 2;
    if (d < best) { best = d; target = p; }
  }
  if (s.t % 240 === 0 || Math.hypot(s.wander.x - ship.pos.x, s.wander.y - ship.pos.y) < 40) {
    s.wander = { x: s.w * (0.2 + r() * 0.6), y: s.h * (0.25 + r() * 0.6) };
  }
  const aim = target ? target.pos : s.wander;
  const want = Math.atan2(aim.y - ship.pos.y, aim.x - ship.pos.x);
  const diff = wrapAngle(want - ship.rotation);
  ship.rotation = wrapAngle(ship.rotation + Math.sign(diff) * Math.min(Math.abs(diff), 0.07));
  // Approach to a comfortable range, back off when too close
  const dist = Math.sqrt(target ? best : (aim.x - ship.pos.x) ** 2 + (aim.y - ship.pos.y) ** 2);
  const thrust = target ? (dist > 190 ? 0.07 : dist < 110 ? -0.05 : 0) : 0.05;
  ship.thrusting = thrust > 0;
  ship.vel.x += Math.cos(ship.rotation) * thrust;
  ship.vel.y += Math.sin(ship.rotation) * thrust;
  ship.vel.x *= 0.96;
  ship.vel.y *= 0.96;
  applyVelocity(ship);
  wrapPosition(ship.pos, s.w, s.h);

  // Fire volleys of the current antibody class, switching now and then
  if (--s.fireT <= 0 && target && Math.abs(diff) < 0.3) {
    if (r() < 0.12) s.cls = CLASSES[Math.floor(r() * CLASSES.length)];
    const spread = s.cls === 'IgM' ? [-0.3, -0.15, 0, 0.15, 0.3] : [0];
    for (const off of spread) {
      const a = ship.rotation + off;
      s.antibodies.push({
        id: s.nextId++, pos: { x: ship.pos.x + Math.cos(a) * ship.radius, y: ship.pos.y + Math.sin(a) * ship.radius },
        vel: { x: Math.cos(a) * 7, y: Math.sin(a) * 7 }, radius: 3, rotation: a, life: 70, cls: s.cls,
      });
    }
    s.fireT = s.cls === 'IgM' ? 22 : s.cls === 'IgE' ? 20 : 11;
  }

  // Pathogens drift (parasites home in on the T-cell)
  for (const p of s.pathogens) {
    if (p.hitFlash && p.hitFlash > 0) p.hitFlash--;
    if (p.type === 'parasite') {
      const a = Math.atan2(ship.pos.y - p.pos.y, ship.pos.x - p.pos.x);
      p.vel.x += Math.cos(a) * 0.02;
      p.vel.y += Math.sin(a) * 0.02;
      const sp = Math.hypot(p.vel.x, p.vel.y);
      const max = p.variant === 'stalker' ? 2.2 : 1.5;
      if (sp > max) { p.vel.x *= max / sp; p.vel.y *= max / sp; }
    }
    applyVelocity(p);
    if (p.type !== 'cancer' && p.type !== 'biofilm' && p.type !== 'fungus') p.rotation += 0.01;
    else p.rotation += 0.003;
    wrapPosition(p.pos, s.w, s.h, p.radius);
    // Bump off the T-cell instead of hurting it
    const dx = p.pos.x - ship.pos.x, dy = p.pos.y - ship.pos.y;
    const rr = p.radius + ship.radius;
    if (dx * dx + dy * dy < rr * rr) {
      const a = Math.atan2(dy, dx);
      p.vel.x = Math.cos(a) * 2;
      p.vel.y = Math.sin(a) * 2;
    }
  }

  // Antibodies hit pathogens
  compactInPlace(s.antibodies, a => {
    applyVelocity(a);
    if (--a.life <= 0) return false;
    for (const p of s.pathogens) {
      if (p.dead) continue;
      const dx = a.pos.x - p.pos.x, dy = a.pos.y - p.pos.y;
      if (dx * dx + dy * dy > p.radius * p.radius) continue;
      p.hitFlash = 6;
      if (p.shieldHealth && p.shieldHealth > 0) p.shieldHealth--;
      else p.health--;
      if (p.health <= 0) {
        p.dead = true;
        burst(s, p);
        const splits = (p.type === 'virus' || p.type === 'bacteria' || p.type === 'parasite' || p.type === 'fungus') && p.radius > 17;
        if (splits && s.pathogens.length < attractTarget(s.w, s.h) + 6) { spawn(s, false, p); spawn(s, false, p); }
      }
      return false;
    }
    return a.pos.x > -20 && a.pos.y > -20 && a.pos.x < s.w + 20 && a.pos.y < s.h + 20;
  });
  compactInPlace(s.pathogens, p => !p.dead);

  compactInPlace(s.particles, p => {
    applyVelocity(p);
    p.vel.x *= 0.97;
    p.vel.y *= 0.97;
    p.life--;
    p.opacity = Math.min(1, p.life / 30);
    return p.life > 0;
  });
  compactInPlace(s.powerUps, p => {
    applyVelocity(p);
    wrapPosition(p.pos, s.w, s.h);
    return --p.life > 0;
  });
  updateLysis(s.lysis);
}
