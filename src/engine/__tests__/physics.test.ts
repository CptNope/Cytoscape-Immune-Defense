import { describe, it, expect } from 'vitest';
import {
  randomRange,
  distance,
  circlesCollide,
  wrapPosition,
  applyVelocity,
  applyFriction,
  angleToTarget,
  speed,
  clampSpeed,
} from '../physics';
import type { Vector, Entity } from '../types';

describe('randomRange', () => {
  it('returns a value within the given range', () => {
    for (let i = 0; i < 100; i++) {
      const val = randomRange(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThan(10);
    }
  });

  it('handles negative ranges', () => {
    for (let i = 0; i < 50; i++) {
      const val = randomRange(-10, -5);
      expect(val).toBeGreaterThanOrEqual(-10);
      expect(val).toBeLessThan(-5);
    }
  });

  it('returns min when min equals max', () => {
    expect(randomRange(7, 7)).toBe(7);
  });
});

describe('distance', () => {
  it('returns 0 for identical points', () => {
    expect(distance({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(0);
  });

  it('calculates distance correctly for a 3-4-5 triangle', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('is symmetric', () => {
    const a: Vector = { x: 1, y: 2 };
    const b: Vector = { x: 5, y: 8 };
    expect(distance(a, b)).toBeCloseTo(distance(b, a));
  });

  it('handles negative coordinates', () => {
    expect(distance({ x: -3, y: -4 }, { x: 0, y: 0 })).toBe(5);
  });
});

describe('circlesCollide', () => {
  it('detects overlapping circles', () => {
    const a = { pos: { x: 0, y: 0 }, radius: 10 };
    const b = { pos: { x: 15, y: 0 }, radius: 10 };
    expect(circlesCollide(a, b)).toBe(true);
  });

  it('detects non-overlapping circles', () => {
    const a = { pos: { x: 0, y: 0 }, radius: 5 };
    const b = { pos: { x: 20, y: 0 }, radius: 5 };
    expect(circlesCollide(a, b)).toBe(false);
  });

  it('detects circles that are exactly touching (edge case)', () => {
    const a = { pos: { x: 0, y: 0 }, radius: 5 };
    const b = { pos: { x: 10, y: 0 }, radius: 5 };
    // distance === sum of radii => not strictly less than, so false
    expect(circlesCollide(a, b)).toBe(false);
  });

  it('detects concentric circles', () => {
    const a = { pos: { x: 5, y: 5 }, radius: 10 };
    const b = { pos: { x: 5, y: 5 }, radius: 3 };
    expect(circlesCollide(a, b)).toBe(true);
  });
});

describe('wrapPosition', () => {
  it('wraps position past the right edge', () => {
    const pos: Vector = { x: 810, y: 300 };
    wrapPosition(pos, 800, 600);
    expect(pos.x).toBeCloseTo(0);
  });

  it('wraps position past the left edge', () => {
    const pos: Vector = { x: -1, y: 300 };
    wrapPosition(pos, 800, 600);
    expect(pos.x).toBe(800);
  });

  it('wraps position past the bottom edge', () => {
    const pos: Vector = { x: 400, y: 610 };
    wrapPosition(pos, 800, 600);
    expect(pos.y).toBeCloseTo(0);
  });

  it('wraps position past the top edge', () => {
    const pos: Vector = { x: 400, y: -1 };
    wrapPosition(pos, 800, 600);
    expect(pos.y).toBe(600);
  });

  it('does not modify position within bounds', () => {
    const pos: Vector = { x: 400, y: 300 };
    wrapPosition(pos, 800, 600);
    expect(pos.x).toBe(400);
    expect(pos.y).toBe(300);
  });

  it('uses margin for wrapping', () => {
    const pos: Vector = { x: -25, y: 300 };
    wrapPosition(pos, 800, 600, 20);
    // x = -25 < -20 (margin), so wraps to 800 + 20 = 820
    expect(pos.x).toBe(820);
  });
});

describe('applyVelocity', () => {
  it('updates position by velocity', () => {
    const entity: Entity = {
      pos: { x: 10, y: 20 },
      vel: { x: 3, y: -5 },
      radius: 5,
      rotation: 0,
    };
    applyVelocity(entity);
    expect(entity.pos.x).toBe(13);
    expect(entity.pos.y).toBe(15);
  });

  it('handles zero velocity', () => {
    const entity: Entity = {
      pos: { x: 10, y: 20 },
      vel: { x: 0, y: 0 },
      radius: 5,
      rotation: 0,
    };
    applyVelocity(entity);
    expect(entity.pos.x).toBe(10);
    expect(entity.pos.y).toBe(20);
  });
});

describe('applyFriction', () => {
  it('reduces velocity by friction factor', () => {
    const entity: Entity = {
      pos: { x: 0, y: 0 },
      vel: { x: 10, y: 10 },
      radius: 5,
      rotation: 0,
    };
    applyFriction(entity, 0.5);
    expect(entity.vel.x).toBe(5);
    expect(entity.vel.y).toBe(5);
  });

  it('friction of 1 leaves velocity unchanged', () => {
    const entity: Entity = {
      pos: { x: 0, y: 0 },
      vel: { x: 7, y: -3 },
      radius: 5,
      rotation: 0,
    };
    applyFriction(entity, 1);
    expect(entity.vel.x).toBe(7);
    expect(entity.vel.y).toBe(-3);
  });

  it('friction of 0 stops the entity', () => {
    const entity: Entity = {
      pos: { x: 0, y: 0 },
      vel: { x: 100, y: -50 },
      radius: 5,
      rotation: 0,
    };
    applyFriction(entity, 0);
    expect(entity.vel.x).toBeCloseTo(0);
    expect(entity.vel.y).toBeCloseTo(0);
  });
});

describe('angleToTarget', () => {
  it('returns 0 for a target directly to the right', () => {
    expect(angleToTarget({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(0);
  });

  it('returns PI/2 for a target directly below', () => {
    expect(angleToTarget({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(Math.PI / 2);
  });

  it('returns -PI/2 for a target directly above', () => {
    expect(angleToTarget({ x: 0, y: 0 }, { x: 0, y: -10 })).toBeCloseTo(-Math.PI / 2);
  });

  it('returns PI for a target directly to the left', () => {
    expect(Math.abs(angleToTarget({ x: 0, y: 0 }, { x: -10, y: 0 }))).toBeCloseTo(Math.PI);
  });
});

describe('speed', () => {
  it('calculates speed from velocity components', () => {
    expect(speed({ x: 3, y: 4 })).toBe(5);
  });

  it('returns 0 for zero velocity', () => {
    expect(speed({ x: 0, y: 0 })).toBe(0);
  });

  it('handles negative components', () => {
    expect(speed({ x: -3, y: -4 })).toBe(5);
  });
});

describe('clampSpeed', () => {
  it('does not modify velocity below max speed', () => {
    const vel: Vector = { x: 2, y: 1 };
    clampSpeed(vel, 10);
    expect(vel.x).toBe(2);
    expect(vel.y).toBe(1);
  });

  it('clamps velocity exceeding max speed', () => {
    const vel: Vector = { x: 30, y: 40 };
    clampSpeed(vel, 5);
    expect(speed(vel)).toBeCloseTo(5);
    // Direction should be preserved
    expect(vel.x / vel.y).toBeCloseTo(30 / 40);
  });

  it('handles velocity exactly at max speed', () => {
    const vel: Vector = { x: 3, y: 4 };
    clampSpeed(vel, 5);
    expect(vel.x).toBeCloseTo(3);
    expect(vel.y).toBeCloseTo(4);
  });
});
