import { describe, it, expect } from 'vitest';
import {
  snapshotPositions,
  PositionInterpolator,
  lerpAngle,
  compactInPlace,
  MAX_INTERP_JUMP,
  type Interpolatable,
} from '../interpolation';

const ent = (x: number, y: number): Interpolatable => ({ pos: { x, y } });

describe('snapshotPositions', () => {
  it('creates prev on first call and reuses the object afterwards', () => {
    const e = ent(1, 2);
    snapshotPositions([e]);
    const prevObj = e.prev;
    expect(prevObj).toEqual({ x: 1, y: 2 });
    e.pos.x = 5;
    snapshotPositions([e]);
    expect(e.prev).toBe(prevObj);
    expect(e.prev).toEqual({ x: 5, y: 2 });
  });
});

describe('PositionInterpolator', () => {
  it('draws entities part-way between prev and current, then restores', () => {
    const e = ent(0, 0);
    snapshotPositions([e]);
    e.pos.x = 10;
    e.pos.y = -20;
    const interp = new PositionInterpolator();
    interp.apply([[e]], 0.25);
    expect(e.pos.x).toBeCloseTo(2.5);
    expect(e.pos.y).toBeCloseTo(-5);
    interp.restore();
    expect(e.pos).toEqual({ x: 10, y: -20 });
  });

  it('leaves entities without prev where they are', () => {
    const e = ent(3, 4);
    const interp = new PositionInterpolator();
    interp.apply([[e]], 0.5);
    expect(e.pos).toEqual({ x: 3, y: 4 });
    interp.restore();
    expect(e.pos).toEqual({ x: 3, y: 4 });
  });

  it('does not interpolate across screen wraps / teleports', () => {
    const e = ent(0, 0);
    snapshotPositions([e]);
    e.pos.x = MAX_INTERP_JUMP + 50;
    const interp = new PositionInterpolator();
    interp.apply([[e]], 0.5);
    expect(e.pos.x).toBe(MAX_INTERP_JUMP + 50);
    interp.restore();
  });

  it('clamps alpha and handles many entities across multiple lists', () => {
    const a = Array.from({ length: 800 }, (_, i) => ent(i, 0));
    const b = Array.from({ length: 800 }, (_, i) => ent(0, i));
    snapshotPositions(a);
    snapshotPositions(b);
    a.forEach(e => { e.pos.x += 10; });
    b.forEach(e => { e.pos.y += 10; });
    const interp = new PositionInterpolator();
    interp.apply([a, b], 5); // clamped to 1
    expect(a[799].pos.x).toBe(809);
    expect(b[799].pos.y).toBe(809);
    interp.restore();
    expect(a[0].pos.x).toBe(10);
    expect(b[0].pos.y).toBe(10);
  });

  it('restore is a no-op without apply', () => {
    const interp = new PositionInterpolator();
    expect(() => interp.restore()).not.toThrow();
  });
});

describe('lerpAngle', () => {
  it('takes the shortest way around', () => {
    const from = Math.PI - 0.1;
    const to = -Math.PI + 0.1;
    const mid = lerpAngle(from, to, 0.5);
    expect(Math.abs(Math.cos(mid) - Math.cos(Math.PI))).toBeLessThan(1e-9);
  });

  it('returns endpoints at alpha 0 and 1', () => {
    expect(lerpAngle(0.2, 1.2, 0)).toBeCloseTo(0.2);
    expect(lerpAngle(0.2, 1.2, 1)).toBeCloseTo(1.2);
  });
});

describe('compactInPlace', () => {
  it('removes items in place and keeps order', () => {
    const arr = [1, 2, 3, 4, 5, 6];
    const same = compactInPlace(arr, n => n % 2 === 0);
    expect(same).toBe(arr);
    expect(arr).toEqual([2, 4, 6]);
  });

  it('lets keep() mutate items', () => {
    const arr = [{ life: 1 }, { life: 3 }];
    compactInPlace(arr, p => --p.life > 0);
    expect(arr).toEqual([{ life: 2 }]);
  });

  it('handles empty arrays', () => {
    expect(compactInPlace([], () => true)).toEqual([]);
  });
});
