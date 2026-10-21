import { describe, it, expect } from 'vitest';
import { createAttract, stepAttract, resizeAttract, attractTarget } from '../attract';

/** Deterministic RNG so the scene is reproducible. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const finite = (n: number) => Number.isFinite(n);

describe('attract-mode scene', () => {
  it('starts populated and scales the crowd with screen area', () => {
    const s = createAttract(1280, 800, seeded(1));
    expect(s.pathogens.length).toBe(attractTarget(1280, 800));
    expect(attractTarget(390, 844)).toBeLessThan(attractTarget(1920, 1080));
    expect(attractTarget(200, 200)).toBeGreaterThanOrEqual(6);
    expect(attractTarget(5000, 5000)).toBeLessThanOrEqual(14);
  });

  it('runs for minutes without errors, NaNs or unbounded growth', () => {
    const s = createAttract(1280, 800, seeded(7));
    let kills = 0;
    let last = s.pathogens.map(p => p.id);
    for (let i = 0; i < 60 * 180; i++) {
      stepAttract(s);
      if (i % 600 === 0) {
        const ids = s.pathogens.map(p => p.id);
        kills += last.filter(id => !ids.includes(id)).length;
        last = ids;
      }
      expect(s.pathogens.length).toBeLessThanOrEqual(attractTarget(1280, 800) + 8);
      expect(s.antibodies.length).toBeLessThan(120);
      expect(s.particles.length).toBeLessThanOrEqual(80);
      expect(s.powerUps.length).toBeLessThanOrEqual(2);
    }
    for (const p of s.pathogens) {
      expect(finite(p.pos.x) && finite(p.pos.y) && finite(p.vel.x) && finite(p.vel.y)).toBe(true);
    }
    expect(finite(s.ship.pos.x) && finite(s.ship.pos.y) && finite(s.ship.rotation)).toBe(true);
    // The T-cell actually hunts: pathogens get destroyed and replaced
    expect(kills).toBeGreaterThan(10);
    expect(s.pathogens.length).toBeGreaterThan(0);
  });

  it('keeps everything on screen after a resize', () => {
    const s = createAttract(1280, 800, seeded(3));
    resizeAttract(s, 400, 700);
    for (let i = 0; i < 600; i++) stepAttract(s);
    const m = 80;
    expect(s.ship.pos.x).toBeGreaterThanOrEqual(-m);
    expect(s.ship.pos.x).toBeLessThanOrEqual(400 + m);
    expect(s.ship.pos.y).toBeGreaterThanOrEqual(-m);
    expect(s.ship.pos.y).toBeLessThanOrEqual(700 + m);
  });

  it('fires every antibody class over time', () => {
    const s = createAttract(1280, 800, seeded(11));
    const seen = new Set<string>();
    for (let i = 0; i < 60 * 120; i++) {
      stepAttract(s);
      for (const a of s.antibodies) seen.add(a.cls ?? 'IgG');
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
});
