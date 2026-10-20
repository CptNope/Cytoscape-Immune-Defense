/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AntibodyClass, BossType, EnemyProjectile, Hazard, Pathogen, PathogenType, Ship, Vector,
} from './types';

/**
 * Everything a boss needs from the game, without depending on React.
 * Game.tsx implements this over its refs; tests implement it with plain arrays.
 */
export interface GameContext {
  readonly worldW: number;
  readonly worldH: number;
  readonly ship: Ship;
  readonly pathogens: Pathogen[];
  readonly unlockedClasses: AntibodyClass[];
  nextId(): number;
  addPathogen(p: Pathogen): Pathogen;
  fire(p: Omit<EnemyProjectile, 'id' | 'rotation'>): void;
  addHazard(h: Omit<Hazard, 'id'>): void;
  text(pos: Vector, text: string, color: string, size?: number): void;
  explosion(pos: Vector, color: string, count?: number): void;
  lysis(pos: Vector, color: string, maxRadius: number): void;
  shake(amount: number): void;
  /** Damage the player (contact with boss bodies). */
  damagePlayer(amount: number, from: Vector): void;
  /** Change the score (Plasmodium penalises shooting healthy blood cells). */
  addScore(amount: number): void;
  /** Called when a boss enters a new phase (UI + audio). */
  onPhase(boss: Pathogen, phase: number, label: string): void;
  rng(): number;
}

export interface BossDef {
  type: BossType;
  name: string;
  /** One-line real-biology hook shown in the intro banner. */
  tagline: string;
  pathogenType: PathogenType;
  color: string;
  baseHealth: number;
  radius: number;
  points: number;
  /** Health fractions at which the boss enters phase 2, 3, ... */
  phaseThresholds: number[];
  spawn(ctx: GameContext, pos: Vector, health: number): Pathogen;
  update(ctx: GameContext, boss: Pathogen): void;
  onDeath?(ctx: GameContext, boss: Pathogen): void;
  /**
   * A part of this boss was hit. Return the damage the part should take
   * (0 = ignore the hit). Defaults to the full damage.
   */
  onPartHit?(ctx: GameContext, boss: Pathogen, part: Pathogen, damage: number): number;
  /** Shots that hit these circles are deflected (armoured body). */
  armorCircles?(boss: Pathogen): { x: number; y: number; r: number }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;

const rand = (ctx: GameContext, min: number, max: number) => min + ctx.rng() * (max - min);

function noise(ctx: GameContext, n: number, lo = 0.85, hi = 1.15): number[] {
  return Array.from({ length: n }, () => rand(ctx, lo, hi));
}

export function makePathogen(ctx: GameContext, fields: Partial<Pathogen> & {
  type: PathogenType; pos: Vector; radius: number; health: number;
}): Pathogen {
  const sides = fields.sides ?? 10;
  return {
    id: ctx.nextId(),
    vel: { x: 0, y: 0 },
    rotation: ctx.rng() * TAU,
    maxHealth: fields.health,
    points: 30,
    sides,
    noise: fields.noise ?? noise(ctx, sides),
    ...fields,
    pos: { ...fields.pos },
  };
}

function newState(mode = 'idle', modeT = 0): Pathogen['boss'] {
  return { t: 0, mode, modeT, attackT: 90, phase: 1, data: {}, parts: [] };
}

function angleTo(from: Vector, to: Vector): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function dist(a: Vector, b: Vector): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function moveToward(p: Pathogen, target: Vector, accel: number, maxSpeed: number): void {
  const a = angleTo(p.pos, target);
  p.vel.x += Math.cos(a) * accel;
  p.vel.y += Math.sin(a) * accel;
  const s = Math.hypot(p.vel.x, p.vel.y);
  if (s > maxSpeed) {
    p.vel.x = (p.vel.x / s) * maxSpeed;
    p.vel.y = (p.vel.y / s) * maxSpeed;
  }
}

/** Keep a body inside the world, bouncing off the edges. */
export function bounceInBounds(ctx: GameContext, p: Pathogen, margin = p.radius): void {
  const next = { x: p.pos.x + p.vel.x, y: p.pos.y + p.vel.y };
  if (next.x < margin || next.x > ctx.worldW - margin) p.vel.x *= -1;
  if (next.y < margin || next.y > ctx.worldH - margin) p.vel.y *= -1;
  p.pos.x = Math.min(Math.max(p.pos.x, margin), ctx.worldW - margin);
  p.pos.y = Math.min(Math.max(p.pos.y, margin), ctx.worldH - margin);
}

function fireAimed(
  ctx: GameContext, from: Vector, speed: number, damage: number,
  kind: EnemyProjectile['kind'], color: string, offsets: number[] = [0],
  extra: Partial<EnemyProjectile> = {},
): void {
  const base = angleTo(from, ctx.ship.pos);
  for (const off of offsets) {
    const a = base + off;
    ctx.fire({
      pos: { x: from.x, y: from.y },
      vel: { x: Math.cos(a) * speed, y: Math.sin(a) * speed },
      radius: kind === 'toxin' ? 6 : 5,
      life: 420,
      damage,
      kind,
      color,
      ...extra,
    });
  }
}

function fireRing(
  ctx: GameContext, from: Vector, count: number, speed: number, damage: number,
  kind: EnemyProjectile['kind'], color: string, offset = 0, extra: Partial<EnemyProjectile> = {},
): void {
  for (let i = 0; i < count; i++) {
    const a = offset + (i / count) * TAU;
    ctx.fire({
      pos: { x: from.x + Math.cos(a) * 10, y: from.y + Math.sin(a) * 10 },
      vel: { x: Math.cos(a) * speed, y: Math.sin(a) * speed },
      radius: 5,
      life: 480,
      damage,
      kind,
      color,
      ...extra,
    });
  }
}

/** Live parts of a boss, in order, skipping ones that died. */
export function liveParts(ctx: GameContext, boss: Pathogen): Pathogen[] {
  const out: Pathogen[] = [];
  const ids = boss.boss?.parts ?? [];
  for (const id of ids) {
    const part = ctx.pathogens.find(q => q.id === id && !q.dead);
    if (part) out.push(part);
  }
  return out;
}

function spawnMinion(
  ctx: GameContext, type: PathogenType, pos: Vector,
  opts: Partial<Pathogen> = {},
): Pathogen {
  const radius = opts.radius ?? 16;
  const health = opts.health ?? radius / 10;
  const a = ctx.rng() * TAU;
  return ctx.addPathogen(makePathogen(ctx, {
    type, pos, radius, health,
    vel: { x: Math.cos(a) * 1.8, y: Math.sin(a) * 1.8 },
    points: 30,
    ...opts,
  }));
}

/** Free a part from its boss so it behaves like a normal pathogen. */
function detach(ctx: GameContext, part: Pathogen): void {
  part.ownerId = undefined;
  part.isBossPart = false;
  part.invulnerable = false;
  const a = ctx.rng() * TAU;
  part.vel = { x: Math.cos(a) * 2, y: Math.sin(a) * 2 };
}

function removeParts(ctx: GameContext, boss: Pathogen, explode: boolean): void {
  for (const part of liveParts(ctx, boss)) {
    part.dead = true;
    if (explode) ctx.lysis(part.pos, '#ffffff', part.radius * 2);
  }
}

const SPORE: Partial<EnemyProjectile> = { effect: 'slow' };

// ---------------------------------------------------------------------------
// Boss definitions
// ---------------------------------------------------------------------------

const megaVirus: BossDef = {
  type: 'mega_virus',
  name: 'Mega Virus',
  tagline: 'Its protein capsid shields the genome — strike when it opens.',
  pathogenType: 'virus',
  color: '#f59e0b',
  baseHealth: 45,
  radius: 70,
  points: 500,
  phaseThresholds: [0.5],
  spawn(ctx, pos, health) {
    const a = ctx.rng() * TAU;
    return makePathogen(ctx, {
      type: 'virus', pos, radius: 70, health, points: 500, sides: 12,
      vel: { x: Math.cos(a), y: Math.sin(a) },
      isBoss: true, bossType: 'mega_virus',
      boss: newState('vulnerable', 300),
    });
  },
  update(ctx, p) {
    const b = p.boss!;
    bounceInBounds(ctx, p);
    if (--b.modeT <= 0) {
      if (b.mode === 'vulnerable') {
        b.mode = 'shielded'; b.modeT = 180; p.invulnerable = true; b.attackT = 30;
        ctx.text(p.pos, 'SHIELDED', '#60a5fa', 14);
      } else {
        b.mode = 'vulnerable'; b.modeT = 300; p.invulnerable = false; b.attackT = 60;
        ctx.text(p.pos, 'VULNERABLE', '#ef4444', 14);
      }
    }
    b.data.charging = b.mode === 'shielded' && b.attackT <= 20 ? 1 : 0;
    if (--b.attackT <= 0) {
      if (b.mode === 'shielded') {
        fireRing(ctx, p.pos, b.phase >= 2 ? 12 : 8, 2.6, 8, 'virion', '#fbbf24', b.t * 0.05);
        b.attackT = 50;
      } else if (b.phase >= 2) {
        fireAimed(ctx, p.pos, 3.5, 7, 'virion', '#fbbf24', [-0.25, 0, 0.25]);
        b.attackT = 90;
      } else {
        b.attackT = 60;
      }
    }
  },
};

const bacterialColony: BossDef = {
  type: 'bacterial_colony',
  name: 'Bacterial Colony',
  tagline: 'Bacteria pool nutrients in a shared membrane — break the chain to expose the core.',
  pathogenType: 'bacteria',
  color: '#ef4444',
  baseHealth: 30,
  radius: 28,
  points: 600,
  phaseThresholds: [0.5],
  spawn(ctx, pos, health) {
    const head = makePathogen(ctx, {
      type: 'bacteria', pos, radius: 28, health, points: 600, sides: 8,
      isBoss: true, bossType: 'bacterial_colony', boss: newState('wander'),
      invulnerable: true,
    });
    const partHp = Math.max(4, health * 0.22);
    for (let i = 0; i < 6; i++) {
      const part = ctx.addPathogen(makePathogen(ctx, {
        type: 'bacteria', pos: { x: pos.x - (i + 1) * 34, y: pos.y }, radius: 22,
        health: partHp, points: 40, sides: 8, ownerId: head.id, isBossPart: true,
      }));
      head.boss!.parts.push(part.id);
    }
    head.boss!.data.tx = pos.x;
    head.boss!.data.ty = pos.y;
    return head;
  },
  update(ctx, p) {
    const b = p.boss!;
    // Wander between random points
    if (dist(p.pos, { x: b.data.tx, y: b.data.ty }) < 40 || b.t % 300 === 0) {
      b.data.tx = rand(ctx, 80, ctx.worldW - 80);
      b.data.ty = rand(ctx, 80, ctx.worldH - 80);
    }
    moveToward(p, { x: b.data.tx, y: b.data.ty }, 0.06, b.phase >= 2 ? 2.2 : 1.6);
    bounceInBounds(ctx, p);

    // Chain: find the first missing link; everything behind it breaks off
    const ids = b.parts;
    let leader: Vector = p.pos;
    for (let i = 0; i < ids.length; i++) {
      const part = ctx.pathogens.find(q => q.id === ids[i] && !q.dead);
      if (!part) {
        const tail = ids.slice(i + 1)
          .map(id => ctx.pathogens.find(q => q.id === id && !q.dead))
          .filter((q): q is Pathogen => !!q);
        if (tail.length > 0) {
          tail.forEach(t => detach(ctx, t));
          ctx.text(p.pos, 'COLONY FRAGMENTED', '#fca5a5', 13);
        }
        b.parts = ids.slice(0, i);
        break;
      }
      const d = dist(part.pos, leader);
      const spacing = 34;
      if (d > spacing) {
        const a = angleTo(part.pos, leader);
        part.pos.x = leader.x - Math.cos(a) * spacing;
        part.pos.y = leader.y - Math.sin(a) * spacing;
      }
      part.vel.x = 0;
      part.vel.y = 0;
      leader = part.pos;
    }

    const shielded = b.parts.length >= 3;
    if (p.invulnerable && !shielded) ctx.text(p.pos, 'MEMBRANE BREACHED', '#fbbf24', 14);
    p.invulnerable = shielded;

    // Exotoxins from a random segment (or the core once exposed)
    if (--b.attackT <= 0) {
      const live = liveParts(ctx, p);
      const src = live.length > 0 ? live[Math.floor(ctx.rng() * live.length)] : p;
      fireAimed(ctx, src.pos, 3, 7, 'toxin', '#84cc16', b.phase >= 2 ? [-0.2, 0.2] : [0]);
      b.attackT = b.phase >= 2 ? 100 : 150;
    }
  },
  onDeath(ctx, p) {
    for (const part of liveParts(ctx, p)) detach(ctx, part);
  },
};

const parasiticWorm: BossDef = {
  type: 'parasitic_worm',
  name: 'Parasitic Worm',
  tagline: 'A helminth too big to engulf. Its cuticle deflects antibodies — hit the head.',
  pathogenType: 'parasite',
  color: '#a855f7',
  baseHealth: 50,
  radius: 22,
  points: 800,
  phaseThresholds: [0.4],
  spawn(ctx, pos, health) {
    const segments: Vector[] = [];
    for (let i = 0; i < 10; i++) segments.push({ x: pos.x - i * 22, y: pos.y });
    return makePathogen(ctx, {
      type: 'parasite', pos, radius: 22, health, points: 800, sides: 6,
      isBoss: true, bossType: 'parasitic_worm', segments, boss: newState('chase', 240),
    });
  },
  update(ctx, p) {
    const b = p.boss!;
    const ship = ctx.ship;
    b.modeT--;
    switch (b.mode) {
      case 'chase':
        moveToward(p, ship.pos, 0.08, b.phase >= 2 ? 3.1 : 2.5);
        if (b.modeT <= 0) {
          b.mode = 'burrow'; b.modeT = 90; p.hidden = true;
          const a = ctx.rng() * TAU;
          b.data.tx = Math.min(Math.max(ship.pos.x + Math.cos(a) * 170, 60), ctx.worldW - 60);
          b.data.ty = Math.min(Math.max(ship.pos.y + Math.sin(a) * 170, 60), ctx.worldH - 60);
          b.data.lunges = b.phase >= 2 ? 2 : 1;
        }
        break;
      case 'burrow':
        moveToward(p, { x: b.data.tx, y: b.data.ty }, 0.3, 5);
        if (b.modeT <= 0) {
          b.mode = 'aim'; b.modeT = 50; p.vel.x = 0; p.vel.y = 0;
          const a = angleTo(p.pos, ship.pos);
          b.data.la = a;
          ctx.addHazard({
            kind: 'telegraph_line', pos: { ...p.pos }, vel: { x: 0, y: 0 }, radius: 18,
            to: { x: p.pos.x + Math.cos(a) * 380, y: p.pos.y + Math.sin(a) * 380 },
            life: 50, maxLife: 50, color: '#a855f7',
          });
        }
        break;
      case 'aim':
        p.vel.x *= 0.8; p.vel.y *= 0.8;
        if (b.modeT <= 0) {
          p.hidden = false;
          b.mode = 'lunge'; b.modeT = 40;
          p.vel.x = Math.cos(b.data.la) * 9;
          p.vel.y = Math.sin(b.data.la) * 9;
          ctx.shake(6);
        }
        break;
      case 'lunge':
        if (b.modeT <= 0) {
          b.data.lunges--;
          if (b.data.lunges > 0) {
            b.mode = 'aim'; b.modeT = 35;
            const a = angleTo(p.pos, ship.pos);
            b.data.la = a;
            ctx.addHazard({
              kind: 'telegraph_line', pos: { ...p.pos }, vel: { x: 0, y: 0 }, radius: 18,
              to: { x: p.pos.x + Math.cos(a) * 380, y: p.pos.y + Math.sin(a) * 380 },
              life: 35, maxLife: 35, color: '#a855f7',
            });
          } else {
            b.mode = 'chase'; b.modeT = 240;
          }
        }
        break;
    }
    bounceInBounds(ctx, p);

    // Body follows the head
    const segs = p.segments!;
    segs[0] = { x: p.pos.x, y: p.pos.y };
    for (let i = 1; i < segs.length; i++) {
      const prev = segs[i - 1];
      const seg = segs[i];
      const d = Math.hypot(prev.x - seg.x, prev.y - seg.y);
      const spacing = p.radius * 1.4;
      if (d > spacing) {
        const ratio = spacing / d;
        seg.x = prev.x - (prev.x - seg.x) * ratio;
        seg.y = prev.y - (prev.y - seg.y) * ratio;
      }
    }

    // The body hurts too
    if (!p.hidden) {
      for (const c of wormArmor(p)) {
        if (Math.hypot(ship.pos.x - c.x, ship.pos.y - c.y) < c.r + ship.radius) {
          ctx.damagePlayer(8, c);
          break;
        }
      }
    }
  },
  armorCircles: p => wormArmor(p),
};

function wormArmor(p: Pathogen): { x: number; y: number; r: number }[] {
  if (!p.segments || p.hidden) return [];
  const out: { x: number; y: number; r: number }[] = [];
  for (let i = 1; i < p.segments.length; i++) {
    out.push({ x: p.segments[i].x, y: p.segments[i].y, r: p.radius * (0.55 + 0.45 * (1 - i / p.segments.length)) });
  }
  return out;
}

const fungalBloom: BossDef = {
  type: 'fungal_bloom',
  name: 'Fungal Bloom',
  tagline: 'Hyphae feed the core and armour it — sever them, then burn it down.',
  pathogenType: 'fungus',
  color: '#10b981',
  baseHealth: 45,
  radius: 70,
  points: 1000,
  phaseThresholds: [0.5],
  spawn(ctx, pos, health) {
    const core = makePathogen(ctx, {
      type: 'fungus', pos, radius: 70, health, points: 1000, sides: 20,
      isBoss: true, bossType: 'fungal_bloom', boss: newState('bloom'),
    });
    core.boss!.data.burstT = 300;
    core.boss!.data.regrowT = 720;
    for (let i = 0; i < 4; i++) core.boss!.parts.push(spawnTendril(ctx, core, i).id);
    return core;
  },
  update(ctx, p) {
    const b = p.boss!;
    p.vel.x = 0; p.vel.y = 0;
    const live = liveParts(ctx, p);
    // Tendrils orbit the core
    b.data.spin = (b.data.spin ?? 0) + 0.004;
    for (const part of live) {
      const slot = part.boss?.data.slot ?? 0;
      const a = b.data.spin + (slot / 4) * TAU;
      part.pos.x = p.pos.x + Math.cos(a) * 125;
      part.pos.y = p.pos.y + Math.sin(a) * 125;
      part.vel.x = 0; part.vel.y = 0;
    }
    // Armoured and regenerating while fed
    if (live.length > 0) {
      b.data.armor = 0.5;
      p.health = Math.min(p.maxHealth, p.health + p.maxHealth * 0.005 / 60);
    } else {
      b.data.armor = 1;
    }
    // Regrow missing tendrils one at a time
    if (live.length < 4 && --b.data.regrowT <= 0) {
      const used = new Set(live.map(q => q.boss?.data.slot ?? 0));
      let slot = 0;
      while (used.has(slot)) slot++;
      b.parts = [...live.map(q => q.id), spawnTendril(ctx, p, slot).id];
      b.data.regrowT = b.phase >= 2 ? 480 : 720;
      ctx.text(p.pos, 'HYPHA REGROWN', '#34d399', 12);
    }
    // Spore clouds drift toward the player
    if (--b.attackT <= 0) {
      const a = angleTo(p.pos, ctx.ship.pos);
      ctx.addHazard({
        kind: 'spore_cloud', pos: { x: p.pos.x + Math.cos(a) * 70, y: p.pos.y + Math.sin(a) * 70 },
        vel: { x: Math.cos(a) * 0.7, y: Math.sin(a) * 0.7 }, radius: 50,
        life: 420, maxLife: 420, color: '#10b981', slow: 0.55, dps: 6,
      });
      b.attackT = 150;
    }
    if (--b.data.burstT <= 0) {
      fireRing(ctx, p.pos, 10, 1.6, 6, 'spore', '#6ee7b7', ctx.rng() * TAU, SPORE);
      b.data.burstT = b.phase >= 2 ? 200 : 300;
    }
  },
  onDeath(ctx, p) {
    removeParts(ctx, p, true);
  },
};
function spawnTendril(ctx: GameContext, core: Pathogen, slot: number): Pathogen {
  const a = (slot / 4) * TAU;
  const t = ctx.addPathogen(makePathogen(ctx, {
    type: 'fungus', pos: { x: core.pos.x + Math.cos(a) * 125, y: core.pos.y + Math.sin(a) * 125 },
    radius: 16, health: Math.max(5, core.maxHealth * 0.16), points: 30, sides: 8,
    ownerId: core.id, isBossPart: true,
  }));
  // Parts reuse BossState only to remember their slot; they aren't bosses
  t.boss = newState('tendril');
  t.boss!.data.slot = slot;
  return t;
}

const plasmodium: BossDef = {
  type: 'plasmodium',
  name: 'Plasmodium',
  tagline: 'The malaria parasite hides inside red blood cells. Find the infected one — spare the rest.',
  pathogenType: 'parasite',
  color: '#c084fc',
  baseHealth: 30,
  radius: 28,
  points: 1100,
  phaseThresholds: [0.5],
  spawn(ctx, pos, health) {
    const boss = makePathogen(ctx, {
      type: 'parasite', pos, radius: 28, health, points: 1100, sides: 9,
      isBoss: true, bossType: 'plasmodium', boss: newState('hidden'), hidden: true,
    });
    for (let i = 0; i < 6; i++) boss.boss!.parts.push(spawnHost(ctx, boss).id);
    const hosts = liveParts(ctx, boss);
    boss.boss!.data.hostId = hosts[Math.floor(ctx.rng() * hosts.length)].id;
    boss.boss!.data.hits = 0;
    return boss;
  },
  update(ctx, p) {
    const b = p.boss!;
    const hosts = liveParts(ctx, p);
    // Host cells drift and bounce
    for (const h of hosts) {
      h.pos.x += h.vel.x; h.pos.y += h.vel.y;
      h.vel.x *= 0.995; h.vel.y *= 0.995;
      if (Math.hypot(h.vel.x, h.vel.y) < 0.3) {
        const a = ctx.rng() * TAU;
        h.vel.x = Math.cos(a) * 0.7; h.vel.y = Math.sin(a) * 0.7;
      }
      bounceInBounds(ctx, h);
      h.rotation += 0.004;
    }
    // Keep a supply of blood cells
    if (hosts.length < 4 && b.t % 300 === 0) b.parts.push(spawnHost(ctx, p).id);

    b.modeT--;
    switch (b.mode) {
      case 'hidden': {
        const host = hosts.find(h => h.id === b.data.hostId);
        if (!host) { rupture(ctx, p, null); break; }
        p.pos.x = host.pos.x; p.pos.y = host.pos.y;
        p.vel.x = 0; p.vel.y = 0;
        // Ring-stage tell: the infected cell pulses faintly every couple of seconds
        b.data.tell = (b.t % 130) < 45 ? 1 : 0;
        // ...and periodically sheds merozoites, which also gives it away
        if (--b.attackT <= 0) {
          fireAimed(ctx, host.pos, 1.9, 5, 'merozoite', '#e9d5ff', [-0.3, 0.3], { homing: 0.008 });
          b.attackT = b.phase >= 2 ? 180 : 240;
        }
        break;
      }
      case 'exposed':
        moveToward(p, ctx.ship.pos, 0.04, 1.3);
        bounceInBounds(ctx, p);
        if (--b.attackT <= 0) {
          fireAimed(ctx, p.pos, 2.2, 5, 'merozoite', '#e9d5ff', [-0.4, 0, 0.4], { homing: 0.015 });
          b.attackT = b.phase >= 2 ? 60 : 85;
        }
        if (b.modeT <= 0) {
          // Re-invade a fresh red blood cell
          const target = hosts.length > 0 ? hosts[Math.floor(ctx.rng() * hosts.length)] : null;
          if (target) {
            b.mode = 'reinvade'; b.modeT = 120; b.data.hostId = target.id;
            ctx.text(p.pos, 'RE-INVADING', '#c084fc', 12);
          } else {
            b.modeT = 120;
          }
        }
        break;
      case 'reinvade': {
        const host = hosts.find(h => h.id === b.data.hostId);
        if (!host) { b.mode = 'exposed'; b.modeT = 60; break; }
        moveToward(p, host.pos, 0.35, 5);
        bounceInBounds(ctx, p);
        if (dist(p.pos, host.pos) < 14 || b.modeT <= 0) {
          b.mode = 'hidden'; p.hidden = true; b.data.hits = 0;
          // Shuffle: the cells scatter so the player has to find it again
          for (const h of hosts) {
            const a = ctx.rng() * TAU;
            h.vel.x = Math.cos(a) * 2.2; h.vel.y = Math.sin(a) * 2.2;
          }
        }
        break;
      }
    }
  },
  onPartHit(ctx, p, part, damage) {
    const b = p.boss!;
    if (part.type !== 'host_rbc') return damage;
    if (b.mode === 'hidden' && part.id === b.data.hostId) {
      b.data.hits++;
      part.hitFlash = 6;
      if (b.data.hits >= 3) rupture(ctx, p, part);
      return 0;
    }
    // Shot a healthy cell: penalty, and the parasite feeds
    ctx.addScore(-50);
    ctx.text(part.pos, 'HOST CELL HIT −50', '#fca5a5', 11);
    p.health = Math.min(p.maxHealth, p.health + p.maxHealth * 0.03);
    return damage;
  },
  onDeath(ctx, p) {
    removeParts(ctx, p, false);
    ctx.text(p.pos, 'PARASITE CLEARED', '#c084fc', 16);
  },
};
function spawnHost(ctx: GameContext, boss: Pathogen): Pathogen {
  const a = ctx.rng() * TAU;
  const pos = { x: rand(ctx, 60, ctx.worldW - 60), y: rand(ctx, 60, ctx.worldH - 60) };
  if (dist(pos, ctx.ship.pos) < 150) { pos.x = ctx.worldW - pos.x; pos.y = ctx.worldH - pos.y; }
  return ctx.addPathogen(makePathogen(ctx, {
    type: 'host_rbc', pos, radius: 22, health: 4, points: 0, sides: 12,
    vel: { x: Math.cos(a) * 0.7, y: Math.sin(a) * 0.7 },
    ownerId: boss.id, isBossPart: true, harmless: true,
  }));
}

function rupture(ctx: GameContext, boss: Pathogen, host: Pathogen | null): void {
  const b = boss.boss!;
  if (host) {
    host.dead = true;
    ctx.lysis(host.pos, '#ef4444', 70);
    ctx.explosion(host.pos, '#ef4444', 14);
    boss.pos.x = host.pos.x; boss.pos.y = host.pos.y;
  }
  boss.hidden = false;
  b.mode = 'exposed';
  b.modeT = b.phase >= 2 ? 280 : 360;
  b.attackT = 40;
  ctx.text(boss.pos, 'RUPTURE!', '#c084fc', 16);
  ctx.shake(8);
  // Merozoites burst out of the cell
  fireRing(ctx, boss.pos, b.phase >= 2 ? 8 : 6, 2, 5, 'merozoite', '#e9d5ff', 0, { homing: 0.01 });
}

const retrovirus: BossDef = {
  type: 'retrovirus',
  name: 'Retrovirus',
  tagline: 'It targets T-cells — like you. Its spikes infect you and slow your fire.',
  pathogenType: 'virus',
  color: '#e879f9',
  baseHealth: 50,
  radius: 42,
  points: 1200,
  phaseThresholds: [0.5],
  spawn(ctx, pos, health) {
    const p = makePathogen(ctx, {
      type: 'virus', pos, radius: 42, health, points: 1200, sides: 14,
      isBoss: true, bossType: 'retrovirus', boss: newState('orbit'),
    });
    p.boss!.data.decoyT = 300;
    p.boss!.data.latentT = 720;
    p.boss!.data.orbit = 0;
    return p;
  },
  update(ctx, p) {
    const b = p.boss!;
    if (b.mode === 'latent') {
      p.vel.x *= 0.95; p.vel.y *= 0.95;
      p.health = Math.min(p.maxHealth, p.health + p.maxHealth * 0.0003);
      if (--b.modeT <= 0) {
        b.mode = 'orbit'; p.invulnerable = false;
        ctx.text(p.pos, 'REACTIVATED', '#e879f9', 13);
      }
      bounceInBounds(ctx, p);
      return;
    }
    b.data.orbit += 0.008;
    const target = {
      x: ctx.ship.pos.x + Math.cos(b.data.orbit) * 230,
      y: ctx.ship.pos.y + Math.sin(b.data.orbit) * 230,
    };
    moveToward(p, target, 0.08, 2.6);
    bounceInBounds(ctx, p);

    if (--b.attackT <= 0) {
      fireAimed(ctx, p.pos, 3.2, 6, 'spike', '#f0abfc', b.phase >= 2 ? [-0.25, 0, 0.25] : [0],
        { homing: 0.012, effect: 'infect' });
      b.attackT = 70;
    }
    if (--b.data.decoyT <= 0) {
      for (let i = 0; i < 2; i++) {
        spawnMinion(ctx, 'decoy_tcell', { x: p.pos.x + (i ? 30 : -30), y: p.pos.y }, {
          radius: 16, health: 3, points: 40, ownerId: p.id, spawnTimer: 90,
        });
      }
      ctx.text(p.pos, 'T-CELLS HIJACKED', '#f0abfc', 12);
      b.data.decoyT = 480;
    }
    if (--b.data.latentT <= 0) {
      b.mode = 'latent'; b.modeT = 180; p.invulnerable = true;
      ctx.text(p.pos, 'LATENT RESERVOIR', '#94a3b8', 13);
      b.data.latentT = 720;
    }
  },
  onDeath(ctx, p) {
    for (const q of ctx.pathogens) if (q.ownerId === p.id && !q.dead) { q.dead = true; ctx.lysis(q.pos, '#f0abfc', 30); }
  },
};

const STRAINS = ['H1N1', 'H3N2', 'H5N1', 'H7N9'];

const influenza: BossDef = {
  type: 'influenza',
  name: 'Influenza',
  tagline: 'Antigenic shift: it swaps surface proteins to dodge your antibodies. Switch classes!',
  pathogenType: 'virus',
  color: '#60a5fa',
  baseHealth: 55,
  radius: 52,
  points: 1300,
  phaseThresholds: [0.75, 0.5, 0.25],
  spawn(ctx, pos, health) {
    const p = makePathogen(ctx, {
      type: 'virus', pos, radius: 52, health, points: 1300, sides: 16,
      isBoss: true, bossType: 'influenza', boss: newState('drift'),
    });
    p.boss!.data.strain = 0;
    p.boss!.data.shiftT = 600;
    p.boss!.data.sneezeT = 420;
    shiftStrain(ctx, p);
    return p;
  },
  update(ctx, p) {
    const b = p.boss!;
    moveToward(p, ctx.ship.pos, 0.03, 1.4);
    bounceInBounds(ctx, p);
    if (b.data.lastPhase !== b.phase) {
      if (b.data.lastPhase !== undefined) shiftStrain(ctx, p);
      b.data.lastPhase = b.phase;
    }
    if (--b.data.shiftT <= 0) shiftStrain(ctx, p);
    if (--b.attackT <= 0) {
      fireAimed(ctx, p.pos, 3, 6, 'virion', '#93c5fd', [-0.36, -0.18, 0, 0.18, 0.36]);
      b.attackT = 110;
    }
    if (--b.data.sneezeT <= 0) {
      for (let i = 0; i < 3; i++) {
        spawnMinion(ctx, 'virus', { ...p.pos }, { radius: 15, health: 1, variant: 'swift', points: 30, sides: 16 });
      }
      ctx.text(p.pos, 'VIRAL SHEDDING', '#93c5fd', 12);
      b.data.sneezeT = 540;
    }
  },
};
function shiftStrain(ctx: GameContext, p: Pathogen): void {
  const b = p.boss!;
  const pool = ctx.unlockedClasses.length > 0 ? ctx.unlockedClasses : (['IgG'] as AntibodyClass[]);
  const options = pool.length > 1 ? pool.filter(c => c !== p.resistClass) : pool;
  p.resistClass = options[Math.floor(ctx.rng() * options.length)];
  b.data.strain = (b.data.strain + 1 + Math.floor(ctx.rng() * 3)) % STRAINS.length;
  b.data.shiftT = 600;
  ctx.text(p.pos, `${STRAINS[b.data.strain]} — RESISTS ${p.resistClass}`, '#60a5fa', 13);
  ctx.onPhase(p, b.phase, `${STRAINS[b.data.strain]} · resists ${p.resistClass}`);
}

export function strainName(p: Pathogen): string {
  return STRAINS[p.boss?.data.strain ?? 0];
}

const metastaticTumor: BossDef = {
  type: 'metastatic_tumor',
  name: 'Metastatic Tumor',
  tagline: 'It grows its own blood vessels (angiogenesis). Cut the supply, stop the spread.',
  pathogenType: 'cancer',
  color: '#f472b6',
  baseHealth: 60,
  radius: 60,
  points: 1400,
  phaseThresholds: [0.4],
  spawn(ctx, pos, health) {
    const center = { x: ctx.worldW / 2 + (pos.x - ctx.worldW / 2) * 0.3, y: ctx.worldH / 2 + (pos.y - ctx.worldH / 2) * 0.3 };
    const p = makePathogen(ctx, {
      type: 'cancer', pos: center, radius: 60, health, points: 1400, sides: 16,
      isBoss: true, bossType: 'metastatic_tumor', boss: newState('grow'),
    });
    p.boss!.data.seedT = 360;
    spawnVessels(ctx, p);
    return p;
  },
  update(ctx, p) {
    const b = p.boss!;
    p.vel.x = 0; p.vel.y = 0;
    const live = liveParts(ctx, p);
    if (live.length > 0) {
      b.data.armor = 0.5;
      p.health = Math.min(p.maxHealth, p.health + p.maxHealth * 0.004 / 60);
    } else {
      if (b.data.armor !== 1) ctx.text(p.pos, 'BLOOD SUPPLY CUT', '#fbbf24', 14);
      b.data.armor = 1;
    }
    if (b.phase >= 2 && !b.data.regrown) {
      b.data.regrown = 1;
      if (live.length < 3) {
        removeParts(ctx, p, false);
        spawnVessels(ctx, p);
        ctx.text(p.pos, 'ANGIOGENESIS', '#f472b6', 14);
      }
    }
    // Metastasis: seed a new tumour somewhere else
    if (--b.data.seedT <= 0) {
      const cancers = ctx.pathogens.filter(q => q.type === 'cancer' && !q.isBoss && !q.dead).length;
      if (cancers < 8) {
        const dest = { x: rand(ctx, 60, ctx.worldW - 60), y: rand(ctx, 60, ctx.worldH - 60) };
        const a = angleTo(p.pos, dest);
        const d = dist(p.pos, dest);
        ctx.addHazard({
          kind: 'telegraph_circle', pos: dest, vel: { x: 0, y: 0 }, radius: 26,
          life: 80, maxLife: 80, color: '#f472b6',
        });
        const speed = d / 80 / 0.97 * 0.5 + 1;
        spawnMinion(ctx, 'cancer', {
          x: p.pos.x + Math.cos(a) * (p.radius + 10), y: p.pos.y + Math.sin(a) * (p.radius + 10),
        }, {
          radius: 10, health: 2, points: 40, sides: 10,
          vel: { x: Math.cos(a) * speed, y: Math.sin(a) * speed },
          growthRate: 0.015, spawnTimer: 1200, ownerId: p.id,
        });
      }
      b.data.seedT = b.phase >= 2 ? 240 : 360;
    }
    if (--b.attackT <= 0) {
      fireRing(ctx, p.pos, 6, 1.8, 6, 'toxin', '#f9a8d4', ctx.rng() * TAU);
      b.attackT = 200;
    }
  },
  onDeath(ctx, p) {
    removeParts(ctx, p, true);
  },
};
function spawnVessels(ctx: GameContext, p: Pathogen): void {
  p.boss!.parts = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + Math.PI / 6;
    const pos = {
      x: Math.min(Math.max(p.pos.x + Math.cos(a) * 190, 40), ctx.worldW - 40),
      y: Math.min(Math.max(p.pos.y + Math.sin(a) * 190, 40), ctx.worldH - 40),
    };
    const v = ctx.addPathogen(makePathogen(ctx, {
      type: 'vessel', pos, radius: 16, health: Math.max(6, p.maxHealth * 0.17), points: 60,
      sides: 8, ownerId: p.id, isBossPart: true,
    }));
    p.boss!.parts.push(v.id);
  }
}

const autoimmune: BossDef = {
  type: 'autoimmune',
  name: 'Autoimmune T-Cell',
  tagline: 'A T-cell that lost self-tolerance and attacks the host — it fights exactly like you.',
  pathogenType: 'decoy_tcell',
  color: '#f87171',
  baseHealth: 70,
  radius: 20,
  points: 2000,
  phaseThresholds: [0.6, 0.25],
  spawn(ctx, pos, health) {
    const p = makePathogen(ctx, {
      type: 'decoy_tcell', pos, radius: 20, health, points: 2000, sides: 8,
      isBoss: true, bossType: 'autoimmune', boss: newState('mirror'),
    });
    p.boss!.data.ringT = 200;
    p.boss!.data.dashT = 240;
    return p;
  },
  update(ctx, p) {
    const b = p.boss!;
    const ship = ctx.ship;
    p.rotation = angleTo(p.pos, ship.pos);

    if (b.mode === 'dash_aim') {
      p.vel.x *= 0.85; p.vel.y *= 0.85;
      if (--b.modeT <= 0) {
        b.mode = 'dash'; b.modeT = 25;
        p.vel.x = Math.cos(b.data.da) * 10; p.vel.y = Math.sin(b.data.da) * 10;
      }
      bounceInBounds(ctx, p);
      return;
    }
    if (b.mode === 'dash') {
      if (--b.modeT <= 0) b.mode = 'mirror';
      bounceInBounds(ctx, p);
      return;
    }

    // Mirror the player across the centre of the screen
    const target = { x: ctx.worldW - ship.pos.x, y: ctx.worldH - ship.pos.y };
    if (dist(target, ship.pos) < 140) {
      const a = angleTo(ship.pos, target);
      target.x = ship.pos.x + Math.cos(a) * 140;
      target.y = ship.pos.y + Math.sin(a) * 140;
    }
    moveToward(p, target, 0.25, 4.5);
    bounceInBounds(ctx, p);

    if (--b.attackT <= 0) {
      fireAimed(ctx, p.pos, 5, 5, 'enemy_antibody', '#fca5a5');
      b.attackT = b.phase >= 2 ? 26 : 32;
    }
    if (b.phase >= 2 && --b.data.ringT <= 0) {
      ctx.addHazard({
        kind: 'inflammation_ring', pos: { ...p.pos }, vel: { x: 0, y: 0 }, radius: 20,
        life: 2000, maxLife: 2000, color: '#f87171', speed: 2.2, dps: 12,
        angle: angleTo(p.pos, ship.pos) + rand(ctx, -1.2, 1.2), gap: 0.5,
      });
      ctx.text(p.pos, 'CYTOKINE STORM', '#f87171', 12);
      b.data.ringT = 300;
    }
    if (b.phase >= 3 && --b.data.dashT <= 0) {
      const a = angleTo(p.pos, ship.pos);
      b.data.da = a;
      b.mode = 'dash_aim'; b.modeT = 45;
      ctx.addHazard({
        kind: 'telegraph_line', pos: { ...p.pos }, vel: { x: 0, y: 0 }, radius: 14,
        to: { x: p.pos.x + Math.cos(a) * 260, y: p.pos.y + Math.sin(a) * 260 },
        life: 45, maxLife: 45, color: '#f87171',
      });
      b.data.dashT = 240;
    }
  },
  onDeath(ctx, p) {
    ctx.text(p.pos, 'SELF-TOLERANCE RESTORED', '#4ade80', 18);
  },
};

export const BOSS_DEFS: Record<BossType, BossDef> = {
  mega_virus: megaVirus,
  bacterial_colony: bacterialColony,
  parasitic_worm: parasiticWorm,
  fungal_bloom: fungalBloom,
  plasmodium,
  retrovirus,
  influenza,
  metastatic_tumor: metastaticTumor,
  autoimmune,
};

/** Endless-mode order: a boss every 5 levels, then the cycle repeats harder. */
export const BOSS_ROTATION: BossType[] = [
  'mega_virus', 'bacterial_colony', 'plasmodium', 'parasitic_worm', 'influenza',
  'fungal_bloom', 'retrovirus', 'metastatic_tumor', 'autoimmune',
];

/** Which boss (if any) appears at an endless level, and how many times the cycle has looped. */
export function endlessBossFor(level: number, interval = 5): { type: BossType; cycle: number } | null {
  if (level <= 0 || level % interval !== 0) return null;
  const n = level / interval - 1;
  return { type: BOSS_ROTATION[n % BOSS_ROTATION.length], cycle: Math.floor(n / BOSS_ROTATION.length) };
}

/**
 * Boss health multiplier. Grows each endless loop and with the player's base
 * damage, so upgrades make fights faster without trivialising them.
 */
export function bossHealthScale(cycle: number, playerDamage: number): number {
  return (1 + 0.6 * cycle) * Math.pow(Math.max(1, playerDamage), 0.75);
}

export function spawnBoss(ctx: GameContext, type: BossType, pos: Vector, healthScale: number): Pathogen {
  const def = BOSS_DEFS[type];
  const boss = def.spawn(ctx, pos, def.baseHealth * healthScale);
  return ctx.addPathogen(boss);
}

/** Runs a boss's AI for one step, including phase changes. */
export function updateBoss(ctx: GameContext, p: Pathogen): void {
  if (!p.bossType || !p.boss) return;
  const def = BOSS_DEFS[p.bossType];
  const b = p.boss;
  b.t++;
  // Phase transitions at health thresholds
  const frac = p.health / p.maxHealth;
  const nextThreshold = def.phaseThresholds[b.phase - 1];
  if (nextThreshold !== undefined && frac <= nextThreshold) {
    b.phase++;
    ctx.shake(10);
    ctx.lysis(p.pos, def.color, p.radius * 2.5);
    ctx.onPhase(p, b.phase, `Phase ${b.phase}`);
    if (p.bossType === 'mega_virus' && b.phase === 2) {
      ctx.text(p.pos, 'CAPSID FRACTURE', '#fbbf24', 15);
      for (let i = 0; i < 4; i++) {
        spawnMinion(ctx, 'virus', { ...p.pos }, { radius: 16, health: 1, variant: 'swift', sides: 16 });
      }
    }
  }
  def.update(ctx, p);
}

/**
 * Per-step behaviour for boss minions and parts that aren't driven by their
 * boss directly (hijacked T-cells, travelling tumour seeds).
 */
export function updateMinion(ctx: GameContext, p: Pathogen): void {
  if (p.type === 'decoy_tcell' && !p.isBoss) {
    moveToward(p, ctx.ship.pos, 0.05, 2.2);
    p.rotation = angleTo(p.pos, ctx.ship.pos);
    if (p.spawnTimer !== undefined && --p.spawnTimer <= 0) {
      fireAimed(ctx, p.pos, 3.5, 5, 'enemy_antibody', '#fecaca');
      p.spawnTimer = 140;
    }
  }
}
