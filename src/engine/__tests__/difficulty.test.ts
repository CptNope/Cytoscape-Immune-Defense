import { describe, it, expect } from 'vitest';
import { playerPower, threatFor, threatLabel, HEALTH_POWER_EXPONENT, type PowerInputs } from '../difficulty';
import { entityCaps, LoadGovernor, roomUnder, HIGH_CAPS, LOW_CAPS } from '../budget';
import { computeModifiers } from '../progression';
import { mutationEffects } from '../mutations';
import type { PlayerProfile } from '../types';

const fresh: PowerInputs = {
  bulletDamage: 1, shotDelay: 200, memoryAvg: 1, damageMult: 1, fireDelayMult: 1,
  sideShotStacks: 0, extraPierce: 0, drones: 0, complement: false, opsonization: false,
  chainReaction: false, autoTarget: false,
};

describe('player power', () => {
  it('is 1 for a fresh Killer T-cell', () => {
    expect(playerPower(fresh)).toBeCloseTo(1, 5);
  });

  it('never drops below 1', () => {
    expect(playerPower({ ...fresh, bulletDamage: 0.5, shotDelay: 400 })).toBe(1);
  });

  it('grows with damage and fire rate', () => {
    expect(playerPower({ ...fresh, bulletDamage: 2 })).toBeCloseTo(2, 5);
    expect(playerPower({ ...fresh, shotDelay: 100 })).toBeCloseTo(2, 5);
    expect(playerPower({ ...fresh, fireDelayMult: 0.5 })).toBeCloseTo(2, 5);
  });

  it('counts mutations, memory and cytokines', () => {
    const p = (over: Partial<PowerInputs>) => playerPower({ ...fresh, ...over });
    expect(p({ sideShotStacks: 2 })).toBeGreaterThan(p({ sideShotStacks: 1 }));
    expect(p({ extraPierce: 1 })).toBeGreaterThan(1);
    expect(p({ drones: 2 })).toBeGreaterThan(p({ drones: 1 }));
    expect(p({ complement: true })).toBeGreaterThan(1);
    expect(p({ memoryAvg: 1.3 })).toBeCloseTo(1.3, 5);
    expect(p({ chainReaction: true, autoTarget: true })).toBeGreaterThan(1.2);
  });

  it('rates a fully upgraded profile well above a fresh one', () => {
    const maxed = computeModifiers({
      xp: 0, lifetimeXp: 0, playerLevel: 20,
      upgrades: { hull_integrity: 10, thruster_power: 10, antibody_potency: 10, rapid_response: 10, membrane_shield: 10 },
      cytokines: { auto_target: false, regeneration: false, chain_reaction: false, interferon: false, fever: false },
      equippedCytokines: [], cellType: 'killer_t', cosmetics: { owned: ['default'], equipped: 'default' },
      stats: { totalKills: 0, killsByType: {}, totalScore: 0, totalRuns: 0, totalTimePlayed: 0, highestLevel: 0, bossKills: {} },
    } as PlayerProfile);
    const fx = mutationEffects({});
    const power = playerPower({ ...fresh, bulletDamage: maxed.bulletDamage, shotDelay: maxed.shotDelay, damageMult: fx.damageMult, fireDelayMult: fx.fireDelayMult });
    expect(power).toBeGreaterThan(5);
    expect(power).toBeLessThan(8);
  });
});

describe('threat', () => {
  it('leaves a fresh player on wave 1 unchanged', () => {
    const t = threatFor(1, 1, 'endless', 100);
    expect(t.health).toBe(1);
    expect(t.speed).toBe(1);
    expect(t.damage).toBe(1);
  });

  it('scales health with a fraction of the player power, so upgrades still help', () => {
    const t = threatFor(16, 1, 'endless', 100);
    expect(t.health).toBeCloseTo(Math.pow(16, HEALTH_POWER_EXPONENT), 5);
    // The player still kills faster than at base
    expect(16 / t.health).toBeGreaterThan(2);
  });

  it('ramps gently with the wave and caps the ramp', () => {
    expect(threatFor(1, 11, 'endless', 100).health).toBeCloseTo(1.3, 5);
    expect(threatFor(1, 500, 'endless', 100).health).toBeCloseTo(2.2, 5);
  });

  it('skips the wave ramp in the campaign (levels are hand-designed)', () => {
    expect(threatFor(1, 25, 'campaign', 100).health).toBe(1);
    expect(threatFor(4, 25, 'campaign', 100).health).toBeGreaterThan(2);
  });

  it('never scales zen mode', () => {
    const t = threatFor(50, 40, 'zen', 300);
    expect(t.health).toBe(1);
    expect(t.speed).toBe(1);
    expect(t.damage).toBe(1);
  });

  it('caps speed and damage', () => {
    const t = threatFor(10000, 100, 'endless', 10000);
    expect(t.speed).toBeLessThanOrEqual(1.3);
    expect(t.damage).toBeLessThanOrEqual(2);
  });

  it('hits tougher hosts harder', () => {
    expect(threatFor(1, 1, 'endless', 200).damage).toBeGreaterThan(1.4);
    expect(threatFor(1, 1, 'endless', 80).damage).toBe(1);
  });

  it('formats a short label', () => {
    expect(threatLabel(threatFor(4, 1, 'endless', 100))).toMatch(/^×\d+\.\d$/);
    expect(threatLabel({ power: 1, health: 31.4, speed: 1, damage: 1 })).toBe('×31');
  });
});

describe('entity budget', () => {
  it('gives weaker devices lower limits', () => {
    const high = entityCaps('high'), low = entityCaps('low');
    for (const k of Object.keys(high) as (keyof typeof high)[]) expect(low[k]).toBeLessThan(high[k]);
    expect(high).toEqual(HIGH_CAPS);
    expect(low).toEqual(LOW_CAPS);
  });

  it('shrinks with load but never below the floor', () => {
    const half = entityCaps('high', 0.5);
    expect(half.pathogens).toBe(35);
    const floor = entityCaps('low', 0.1);
    expect(floor.pathogens).toBeGreaterThanOrEqual(24);
    expect(floor.antibodies).toBeGreaterThanOrEqual(60);
  });

  it('reports room under a cap', () => {
    expect(roomUnder(10, 70)).toBe(60);
    expect(roomUnder(80, 70)).toBe(0);
  });
});

describe('load governor', () => {
  it('tightens limits when frames are slow and relaxes when they recover', () => {
    const g = new LoadGovernor(24, 18, 10);
    for (let i = 0; i < 30; i++) g.sample(50);
    expect(g.scale).toBeLessThan(1);
    const low = g.scale;
    for (let i = 0; i < 400; i++) g.sample(16.7);
    expect(g.scale).toBeGreaterThan(low);
    expect(g.scale).toBeLessThanOrEqual(1);
  });

  it('never goes below half', () => {
    const g = new LoadGovernor(24, 18, 5);
    for (let i = 0; i < 1000; i++) g.sample(200);
    expect(g.scale).toBe(0.5);
  });

  it('stays at full limits on a smooth device', () => {
    const g = new LoadGovernor();
    for (let i = 0; i < 500; i++) g.sample(16.7);
    expect(g.scale).toBe(1);
  });

  it('resets', () => {
    const g = new LoadGovernor(24, 18, 5);
    for (let i = 0; i < 50; i++) g.sample(100);
    g.reset();
    expect(g.scale).toBe(1);
  });
});
