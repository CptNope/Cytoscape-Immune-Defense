import { describe, it, expect } from 'vitest';
import {
  BOSS_DEFS, BOSS_ROTATION, spawnBoss, updateBoss, updateMinion, endlessBossFor,
  bossHealthScale, liveParts, type GameContext,
} from '../bosses';
import type { BossType, EnemyProjectile, Hazard, Pathogen, Ship } from '../types';

/** Deterministic PRNG so simulations are repeatable. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeWorld(seed = 1) {
  const ship: Ship = {
    pos: { x: 400, y: 300 }, vel: { x: 0, y: 0 }, radius: 18, rotation: 0,
    thrusting: false, turning: 0, lastShot: 0,
  };
  const pathogens: Pathogen[] = [];
  const projectiles: EnemyProjectile[] = [];
  const hazards: Hazard[] = [];
  let id = 1;
  let score = 0;
  let playerDamage = 0;
  const phases: number[] = [];
  const ctx: GameContext = {
    worldW: 800, worldH: 600, ship, pathogens, unlockedClasses: ['IgG', 'IgM'],
    nextId: () => id++,
    addPathogen: p => { pathogens.push(p); return p; },
    fire: p => { projectiles.push({ ...p, id: id++, rotation: 0 }); },
    addHazard: h => { hazards.push({ ...h, id: id++ }); },
    text: () => {}, explosion: () => {}, lysis: () => {}, shake: () => {},
    damagePlayer: amount => { playerDamage += amount; },
    addScore: n => { score += n; },
    onPhase: (_b, phase) => { phases.push(phase); },
    rng: mulberry32(seed),
  };
  /** One simulation step, mirroring the order Game.tsx uses. */
  const step = () => {
    for (const p of [...pathogens]) {
      if (p.dead) continue;
      if (p.isBoss) updateBoss(ctx, p); else updateMinion(ctx, p);
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;
      if (p.type === 'cancer' && !p.isBoss) { p.vel.x *= 0.97; p.vel.y *= 0.97; }
    }
    for (let i = pathogens.length - 1; i >= 0; i--) if (pathogens[i].dead) pathogens.splice(i, 1);
    // Wander the ship around so chasing bosses have something to chase
    ship.pos.x = 400 + Math.cos(ship.rotation) * 200;
    ship.pos.y = 300 + Math.sin(ship.rotation) * 150;
    ship.rotation += 0.01;
  };
  return { ctx, ship, pathogens, projectiles, hazards, step, get score() { return score; }, get playerDamage() { return playerDamage; }, phases };
}

const ALL = Object.keys(BOSS_DEFS) as BossType[];

describe('boss rotation', () => {
  it('includes every boss exactly once', () => {
    expect([...BOSS_ROTATION].sort()).toEqual([...ALL].sort());
  });

  it('places a boss every 5 levels and loops with a higher cycle', () => {
    expect(endlessBossFor(4)).toBeNull();
    expect(endlessBossFor(5)).toEqual({ type: BOSS_ROTATION[0], cycle: 0 });
    expect(endlessBossFor(45)).toEqual({ type: BOSS_ROTATION[8], cycle: 0 });
    expect(endlessBossFor(50)).toEqual({ type: BOSS_ROTATION[0], cycle: 1 });
  });

  it('scales health with loops and player damage', () => {
    expect(bossHealthScale(0, 1)).toBe(1);
    expect(bossHealthScale(1, 1)).toBeCloseTo(1.6);
    expect(bossHealthScale(0, 2)).toBeGreaterThan(1);
    expect(bossHealthScale(0, 2)).toBeLessThan(2); // upgrades still make fights faster
  });
});

describe.each(ALL)('%s', (type) => {
  it('runs 3000 steps without NaN, stays on screen and attacks', () => {
    const w = makeWorld(7);
    const boss = spawnBoss(w.ctx, type, { x: 600, y: 200 }, 1);
    expect(boss.isBoss).toBe(true);
    expect(boss.bossType).toBe(type);
    let attacked = false;
    for (let i = 0; i < 3000; i++) {
      w.step();
      if (w.projectiles.length > 0 || w.hazards.length > 0) attacked = true;
      w.projectiles.length = 0;
      w.hazards.length = 0;
      expect(Number.isFinite(boss.pos.x) && Number.isFinite(boss.pos.y)).toBe(true);
    }
    expect(attacked).toBe(true);
    expect(boss.pos.x).toBeGreaterThanOrEqual(-1);
    expect(boss.pos.x).toBeLessThanOrEqual(801);
    expect(boss.pos.y).toBeGreaterThanOrEqual(-1);
    expect(boss.pos.y).toBeLessThanOrEqual(601);
  });

  it('enters later phases as health drops', () => {
    const w = makeWorld(3);
    const boss = spawnBoss(w.ctx, type, { x: 600, y: 200 }, 1);
    const thresholds = BOSS_DEFS[type].phaseThresholds;
    boss.health = boss.maxHealth * (thresholds[thresholds.length - 1] - 0.01);
    for (let i = 0; i < thresholds.length + 2; i++) w.step();
    expect(boss.boss!.phase).toBe(thresholds.length + 1);
  });

  it('cleans up its parts on death', () => {
    const w = makeWorld(5);
    const boss = spawnBoss(w.ctx, type, { x: 600, y: 200 }, 1);
    for (let i = 0; i < 30; i++) w.step();
    BOSS_DEFS[type].onDeath?.(w.ctx, boss);
    boss.dead = true;
    w.step();
    // Nothing left bound to the dead boss as an unkillable part
    expect(w.pathogens.filter(p => p.isBossPart && p.ownerId === boss.id)).toHaveLength(0);
  });
});

describe('specific mechanics', () => {
  it('bacterial colony core is shielded until fewer than 3 segments remain', () => {
    const w = makeWorld(2);
    const boss = spawnBoss(w.ctx, 'bacterial_colony', { x: 400, y: 300 }, 1);
    w.step();
    expect(boss.invulnerable).toBe(true);
    const parts = liveParts(w.ctx, boss);
    expect(parts).toHaveLength(6);
    // Destroying the first segment detaches the whole tail
    parts[0].dead = true;
    w.step();
    expect(boss.boss!.parts).toHaveLength(0);
    expect(boss.invulnerable).toBe(false);
    expect(w.pathogens.filter(p => p.type === 'bacteria' && !p.isBoss && !p.isBossPart)).toHaveLength(5);
  });

  it('plasmodium ruptures after 3 hits on the infected cell and penalises healthy hits', () => {
    const w = makeWorld(4);
    const boss = spawnBoss(w.ctx, 'plasmodium', { x: 400, y: 300 }, 1);
    w.step();
    expect(boss.hidden).toBe(true);
    const def = BOSS_DEFS.plasmodium;
    const hosts = liveParts(w.ctx, boss);
    const infected = hosts.find(h => h.id === boss.boss!.data.hostId)!;
    const healthy = hosts.find(h => h.id !== boss.boss!.data.hostId)!;
    boss.health = boss.maxHealth * 0.6;
    expect(def.onPartHit!(w.ctx, boss, healthy, 1)).toBe(1);
    expect(w.score).toBe(-50);
    expect(boss.health).toBeGreaterThan(boss.maxHealth * 0.6);
    for (let i = 0; i < 3; i++) expect(def.onPartHit!(w.ctx, boss, infected, 1)).toBe(0);
    expect(boss.hidden).toBe(false);
    expect(boss.boss!.mode).toBe('exposed');
    expect(w.projectiles.length).toBeGreaterThan(0); // merozoites burst out
  });

  it('influenza always resists a class the player has unlocked', () => {
    const w = makeWorld(9);
    const boss = spawnBoss(w.ctx, 'influenza', { x: 400, y: 300 }, 1);
    const seen = new Set<string>();
    for (let i = 0; i < 4000; i++) {
      w.step();
      seen.add(boss.resistClass!);
    }
    for (const c of seen) expect(['IgG', 'IgM']).toContain(c);
    expect(seen.size).toBe(2);
  });

  it('fungal bloom is armoured while hyphae live and regrows them', () => {
    const w = makeWorld(6);
    const boss = spawnBoss(w.ctx, 'fungal_bloom', { x: 400, y: 300 }, 1);
    w.step();
    expect(boss.boss!.data.armor).toBe(0.5);
    liveParts(w.ctx, boss).forEach(p => { p.dead = true; });
    w.step();
    expect(boss.boss!.data.armor).toBe(1);
    for (let i = 0; i < 800; i++) w.step();
    expect(liveParts(w.ctx, boss).length).toBeGreaterThan(0);
  });

  it('worm body deflects shots only while surfaced', () => {
    const w = makeWorld(8);
    const boss = spawnBoss(w.ctx, 'parasitic_worm', { x: 400, y: 300 }, 1);
    w.step();
    expect(BOSS_DEFS.parasitic_worm.armorCircles!(boss).length).toBeGreaterThan(0);
    boss.hidden = true;
    expect(BOSS_DEFS.parasitic_worm.armorCircles!(boss)).toHaveLength(0);
  });
});
