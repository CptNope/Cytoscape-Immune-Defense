import { describe, it, expect } from 'vitest';
import {
  ORGANISMS, SvgPainter, artForPathogen, artDataUrl, codexArtUrl, cellArtUrl, CELL_ART, mix,
  type ArtId, type AnimCtx,
} from '../art';
import { springProgress, motionOf, spawnScale, steer } from '../art/motion';
import { CODEX } from '../codex';
import { CELL_TYPES } from '../cells';
import type { Pathogen, PathogenType, BossType } from '../types';

const ids = Object.keys(ORGANISMS) as ArtId[];
const colors = { main: '#f59e0b', alt: '#4ade80' };

const pathogen = (over: Partial<Pathogen> = {}): Pathogen => ({
  id: 1, pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, radius: 20, rotation: 0,
  type: 'virus', health: 10, maxHealth: 10, points: 10, sides: 8, noise: [], ...over,
});

/** Cheap well-formedness checks on generated SVG markup. */
function checkMarkup(svg: string): void {
  expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  const opens = (tag: string) => (svg.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length;
  const closes = (tag: string) => (svg.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
  for (const tag of ['g', 'defs', 'svg', 'filter', 'radialGradient']) expect(opens(tag)).toBe(closes(tag));
}

describe('organism artwork', () => {
  it('builds valid SVG for every organism and layout variant', () => {
    for (const id of ids) {
      const org = ORGANISMS[id];
      for (let v = 0; v < (org.variants ?? 1); v++) {
        const body = org.body(colors, v);
        expect(body.length).toBeGreaterThan(50);
        checkMarkup(body);
      }
      expect(org.extent).toBeGreaterThan(1);
      expect(org.extent).toBeLessThanOrEqual(2);
    }
  });

  it('draws animated parts without NaNs at any time, in both quality modes', () => {
    for (const id of ids) {
      const org = ORGANISMS[id];
      for (const low of [false, true]) {
        for (const t of [0, 0.37, 12.5, 1000]) {
          const P = new SvgPainter();
          const a: AnimCtx = { t, seed: 3.1, speed: 2, low, level: 0.5 };
          org.back?.(P, colors, a, 0);
          org.front?.(P, colors, a, 0);
          checkMarkup(P.out);
        }
      }
    }
  });

  it('makes self-contained data URLs for menus', () => {
    for (const id of ids) {
      const url = artDataUrl(id, colors);
      expect(url.startsWith('data:image/svg+xml')).toBe(true);
      const svg = decodeURIComponent(url.split(',')[1]);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).not.toMatch(/href=|url\(http/); // no external resources
      checkMarkup(svg);
    }
  });

  it('has art for every codex entry and every playable cell', () => {
    for (const e of CODEX) expect(codexArtUrl(e.key, e.color)).toMatch(/^data:image\/svg\+xml/);
    for (const c of CELL_TYPES) {
      expect(CELL_ART[c.id]).toBeDefined();
      expect(cellArtUrl(c.id, '#ffffff')).toMatch(/^data:image\/svg\+xml/);
    }
  });

  it('caches menu art URLs', () => {
    expect(codexArtUrl('virus', '#f59e0b')).toBe(codexArtUrl('virus', '#f59e0b'));
  });
});

describe('entity → artwork mapping', () => {
  const types: PathogenType[] = ['virus', 'bacteria', 'parasite', 'fungus', 'prion', 'cancer', 'biofilm', 'host_rbc', 'decoy_tcell', 'vessel'];

  it('maps every type and variant to an existing organism', () => {
    for (const type of types) {
      for (const variant of [undefined, 'armored', 'swift', 'stalker'] as const) {
        expect(ORGANISMS[artForPathogen(pathogen({ type, variant }))]).toBeDefined();
      }
    }
  });

  it('gives bosses their own organisms', () => {
    const boss = (type: PathogenType, bossType: BossType) => artForPathogen(pathogen({ type, isBoss: true, bossType }));
    expect(boss('virus', 'mega_virus')).toBe('mimivirus');
    expect(boss('virus', 'retrovirus')).toBe('hiv');
    expect(boss('virus', 'influenza')).toBe('influenza');
    expect(boss('parasite', 'parasitic_worm')).toBe('scolex');
    expect(boss('parasite', 'plasmodium')).toBe('schizont');
    expect(boss('fungus', 'fungal_bloom')).toBe('aspergillus');
    expect(boss('cancer', 'metastatic_tumor')).toBe('tumor');
    expect(boss('decoy_tcell', 'autoimmune')).toBe('autoimmune_t');
  });

  it('distinguishes variants', () => {
    expect(artForPathogen(pathogen({ type: 'virus', variant: 'swift' }))).toBe('phage');
    expect(artForPathogen(pathogen({ type: 'bacteria', variant: 'armored' }))).toBe('bacterium_armored');
    expect(artForPathogen(pathogen({ type: 'parasite', variant: 'stalker' }))).toBe('giardia');
  });
});

describe('render motion', () => {
  it('springs from 0 to 1 with a small overshoot', () => {
    expect(springProgress(0)).toBe(0);
    expect(springProgress(2)).toBe(1);
    let max = 0;
    for (let t = 0; t < 1.2; t += 0.005) max = Math.max(max, springProgress(t));
    expect(max).toBeGreaterThan(1);
    expect(max).toBeLessThan(1.15);
    expect(Math.abs(springProgress(1.15) - 1)).toBeLessThan(0.01);
  });

  it('pops entities in from a smaller scale', () => {
    const o = {};
    const s = motionOf(o, 10, 0, 0.5);
    expect(spawnScale(s, 10)).toBeCloseTo(0.5);
    expect(spawnScale(s, 12)).toBe(1);
    expect(motionOf(o, 99, 1)).toBe(s); // state is kept per entity
  });

  it('turns towards the direction of travel, frame-rate independently', () => {
    const a = motionOf({}, 0, 0);
    const b = motionOf({}, 0, 0);
    const vel = { x: 0, y: 1 };
    steer(a, vel, 1 / 30);
    steer(b, vel, 1 / 60);
    steer(b, vel, 1 / 60);
    expect(a.heading).toBeGreaterThan(0);
    expect(a.heading).toBeCloseTo(b.heading, 5);
    for (let i = 0; i < 200; i++) steer(a, vel, 1 / 60);
    expect(a.heading).toBeCloseTo(Math.PI / 2, 3);
  });

  it('takes the short way round', () => {
    const s = motionOf({}, 0, 3.0);
    steer(s, { x: -1, y: -0.1 }, 1 / 60); // target ≈ -3.04 rad, i.e. just past π
    expect(Math.abs(s.heading)).toBeGreaterThan(3.0);
  });

  it('keeps its heading when nearly still', () => {
    const s = motionOf({}, 0, 1.2);
    steer(s, { x: 0.01, y: 0 }, 1 / 60);
    expect(s.heading).toBe(1.2);
  });
});

describe('colour mixing', () => {
  it('blends hex colours', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#fff', '#000', 0)).toBe('#ffffff');
    expect(mix('#ff0000', '#0000ff', 1)).toBe('#0000ff');
  });
});
