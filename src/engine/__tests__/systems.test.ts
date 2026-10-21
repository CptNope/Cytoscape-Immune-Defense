import { describe, it, expect } from 'vitest';
import { computeHit, bombDamage, PARASITE_RESIST_MULT, type HitInput } from '../combat';
import { memoryLevel, memoryMultiplier, memoryProgress, memoryTable, MEMORY_THRESHOLDS } from '../memory';
import { rollDraft, applyMutation, mutationEffects, MUTATION_DEFS } from '../mutations';
import { buildVolley, getAntibodyClass, nextAntibodyClass, unlockedAntibodyClasses } from '../weapons';
import { getCellType, isCellUnlocked } from '../cells';
import { CAMPAIGN_LEVELS, campaignStars, parTime } from '../campaign';
import { CODEX } from '../codex';
import { BOSS_DEFS } from '../bosses';
import type { Pathogen } from '../types';

const pathogen = (over: Partial<Pathogen> = {}): Pathogen => ({
  id: 1, pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, radius: 20, rotation: 0,
  type: 'virus', health: 10, maxHealth: 10, points: 10, sides: 8, noise: [], ...over,
});

const hit = (over: Partial<HitInput> = {}): HitInput => ({
  damage: 1, cls: 'IgG', baseSpeed: 7, boostMult: 1, memory: {}, bossDamageMult: 1,
  unlockedClassCount: 4, ...over,
});

describe('computeHit', () => {
  it('deals plain damage to an ordinary virus', () => {
    expect(computeHit(pathogen(), hit()).damage).toBe(1);
  });

  it('parasites resist fast antibodies but not slow ones (bug fix: used to resist everything)', () => {
    const p = pathogen({ type: 'parasite' });
    expect(computeHit(p, hit({ baseSpeed: 7 })).damage).toBeCloseTo(PARASITE_RESIST_MULT);
    expect(computeHit(p, hit({ cls: 'IgM', baseSpeed: 5.5 })).damage).toBeCloseTo(1);
  });

  it('IgE shreds parasites', () => {
    const p = pathogen({ type: 'parasite' });
    expect(computeHit(p, hit({ cls: 'IgE', baseSpeed: 5, damage: 1 })).damage).toBeCloseTo(2.5);
  });

  it('fungus resistance is a multiplier, so upgrades still matter (bug fix: was a flat 0.5)', () => {
    const p = pathogen({ type: 'fungus' });
    expect(computeHit(p, hit({ damage: 1 })).damage).toBeCloseTo(0.5);
    expect(computeHit(p, hit({ damage: 3 })).damage).toBeCloseTo(1.5);
    expect(computeHit(p, hit({ damage: 1, boostMult: 2 })).damage).toBeCloseTo(1);
  });

  it('boss parasites ignore the speed resistance', () => {
    const p = pathogen({ type: 'parasite', isBoss: true });
    expect(computeHit(p, hit()).damage).toBe(1);
  });

  it('applies memory, opsonization and boss bonuses', () => {
    expect(computeHit(pathogen(), hit({ memory: { virus: 1.3 } })).damage).toBeCloseTo(1.3);
    expect(computeHit(pathogen({ marked: 10 }), hit()).damage).toBeCloseTo(1.3);
    expect(computeHit(pathogen({ isBoss: true }), hit({ bossDamageMult: 1.25 })).damage).toBeCloseTo(1.25);
  });

  it('shielded targets take nothing', () => {
    const r = computeHit(pathogen({ invulnerable: true }), hit());
    expect(r.damage).toBe(0);
    expect(r.label).toBe('SHIELDED');
  });

  it('biofilm shield soaks damage', () => {
    const r = computeHit(pathogen({ type: 'biofilm', shieldHealth: 5 }), hit({ damage: 2 }));
    expect(r.damage).toBe(0);
    expect(r.shieldDamage).toBe(2);
  });

  it('class resistance is strong, but softer when only one class is unlocked', () => {
    const p = pathogen({ resistClass: 'IgG' });
    expect(computeHit(p, hit()).damage).toBeCloseTo(0.15);
    expect(computeHit(p, hit({ unlockedClassCount: 1 })).damage).toBeCloseTo(0.6);
    expect(computeHit(p, hit({ cls: 'IgA', baseSpeed: 9 })).damage).toBeCloseTo(1.3); // not resisted; IgA bonus vs virus
  });

  it('boss armour reduces damage', () => {
    const p = pathogen({ isBoss: true, boss: { t: 0, mode: '', modeT: 0, attackT: 0, phase: 1, data: { armor: 0.5 }, parts: [] } });
    expect(computeHit(p, hit()).damage).toBeCloseTo(0.5);
  });

  it('bombs chunk bosses instead of one-shotting them (bug fix)', () => {
    expect(bombDamage(pathogen({ isBoss: true, maxHealth: 100 }), 0.2)).toBe(20);
    expect(bombDamage(pathogen(), 0.2)).toBe(Infinity);
  });
});

describe('immune memory', () => {
  it('levels up at thresholds', () => {
    expect(memoryLevel(0)).toBe(0);
    expect(memoryLevel(MEMORY_THRESHOLDS[0])).toBe(1);
    expect(memoryLevel(100000)).toBe(MEMORY_THRESHOLDS.length);
    expect(memoryMultiplier(100000)).toBeCloseTo(1.3);
  });

  it('reports progress to the next level', () => {
    const p = memoryProgress(10);
    expect(p.level).toBe(0);
    expect(p.next).toBe(MEMORY_THRESHOLDS[0]);
    expect(p.pct).toBeCloseTo(0.5);
    expect(memoryProgress(100000).next).toBeNull();
  });

  it('builds a table for every memory type', () => {
    const t = memoryTable({ virus: 60 });
    expect(t.virus).toBeCloseTo(1.12);
    expect(t.bacteria).toBe(1);
  });
});

describe('clonal selection', () => {
  it('offers 3 distinct mutations', () => {
    const picks = rollDraft({});
    expect(picks).toHaveLength(3);
    expect(new Set(picks).size).toBe(3);
  });

  it('never offers maxed mutations', () => {
    const run = Object.fromEntries(MUTATION_DEFS.map(m => [m.id, m.maxStacks]));
    expect(rollDraft(run)).toHaveLength(0);
    const almost = { ...run, affinity_maturation: 0 };
    expect(rollDraft(almost)).toEqual(['affinity_maturation']);
  });

  it('stacks up to the max and derives effects', () => {
    let run = {};
    for (let i = 0; i < 5; i++) run = applyMutation(run, 'affinity_maturation');
    expect(run).toEqual({ affinity_maturation: 3 });
    const fx = mutationEffects(run);
    expect(fx.damageMult).toBeCloseTo(1.45);
    expect(mutationEffects({}).fireDelayMult).toBe(1);
  });

  it('is deterministic with an injected rng', () => {
    const rng = () => 0;
    expect(rollDraft({}, 2, rng)).toEqual([MUTATION_DEFS[0].id, MUTATION_DEFS[1].id]);
  });
});

describe('antibody classes', () => {
  it('unlocks classes by level', () => {
    expect(unlockedAntibodyClasses(1)).toEqual(['IgG']);
    expect(unlockedAntibodyClasses(20)).toEqual(['IgG', 'IgM', 'IgA', 'IgE']);
  });

  it('cycles through unlocked classes', () => {
    expect(nextAntibodyClass('IgG', ['IgG', 'IgM'])).toBe('IgM');
    expect(nextAntibodyClass('IgM', ['IgG', 'IgM'])).toBe('IgG');
    expect(nextAntibodyClass('IgE', ['IgG'])).toBe('IgG');
  });

  it('builds spread volleys and side shots', () => {
    const igm = getAntibodyClass('IgM');
    const volley = buildVolley(igm, { x: 0, y: 0 }, 0, { x: 0, y: 0 }, { damage: 2 });
    expect(volley).toHaveLength(5);
    expect(volley[0].damage).toBeCloseTo(2 * igm.damageMult);
    const withSides = buildVolley(getAntibodyClass('IgG'), { x: 0, y: 0 }, 0, { x: 1, y: 0 }, { damage: 1, sideShotStacks: 1, extraPierce: 1 });
    expect(withSides).toHaveLength(3);
    expect(withSides[1].damage).toBeCloseTo(0.6);
    expect(withSides[0].pierce).toBe(1);
    expect(withSides[0].vel.x).toBeCloseTo(8); // includes ship velocity
    expect(withSides[0].baseSpeed).toBe(7);
  });
});

describe('cell types', () => {
  it('locks cells by level and falls back to the Killer T-cell', () => {
    expect(isCellUnlocked('killer_t', 1)).toBe(true);
    expect(isCellUnlocked('plasma_b', 5)).toBe(false);
    expect(getCellType(undefined).id).toBe('killer_t');
  });
});

describe('campaign', () => {
  it('has 30 numbered levels with the new bosses in Act II', () => {
    expect(CAMPAIGN_LEVELS).toHaveLength(30);
    CAMPAIGN_LEVELS.forEach((l, i) => expect(l.level).toBe(i + 1));
    const act2Bosses = CAMPAIGN_LEVELS.slice(20).map(l => l.boss).filter(Boolean);
    expect(act2Bosses).toEqual(['plasmodium', 'influenza', 'retrovirus', 'metastatic_tumor', 'autoimmune']);
  });

  it('awards stars for clearing, low damage and par time', () => {
    const lvl = CAMPAIGN_LEVELS[0];
    expect(campaignStars(lvl, 90, 100, 999)).toBe(1);
    expect(campaignStars(lvl, 10, 100, 999)).toBe(2);
    expect(campaignStars(lvl, 10, 100, parTime(lvl))).toBe(3);
  });
});

describe('codex', () => {
  it('has an entry for every boss', () => {
    for (const type of Object.keys(BOSS_DEFS)) {
      expect(CODEX.find(e => e.kind === 'boss' && e.key === type)).toBeDefined();
    }
  });
});
