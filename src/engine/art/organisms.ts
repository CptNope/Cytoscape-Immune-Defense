/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Painter } from './painter';

/**
 * Biology-based artwork for every cell, microbe and boss in the game.
 *
 * Each organism has:
 * - `body`: static SVG detail (organelles, capsids, cell walls). It is drawn
 *   once into a cached bitmap, so it costs one `drawImage` per frame.
 * - `back` / `front`: parts that move every frame (flagella, undulating
 *   membranes, spike proteins, pseudopods), drawn live under / over the body.
 *
 * Coordinates are "art units": the hit radius is 100 and +x is the front of
 * organisms that swim in the direction they're heading (`oriented`).
 */

export type ArtId =
  | 'virus' | 'phage' | 'bacterium' | 'bacterium_armored' | 'trypanosome' | 'giardia'
  | 'yeast' | 'prion' | 'cancer' | 'biofilm' | 'rbc' | 'rogue_t' | 'autoimmune_t' | 'vessel'
  | 'mimivirus' | 'hiv' | 'influenza' | 'tumor' | 'aspergillus' | 'schizont' | 'scolex' | 'proglottid'
  | 'killer_t' | 'macrophage' | 'nk_cell' | 'plasma_b';

export interface ArtColors {
  /** Membrane / outline colour (the entity's palette colour). */
  main: string;
  /** Secondary colour: embedded bacteria (biofilm), spike proteins (HIV, influenza). */
  alt: string;
}

/** Per-draw animation inputs. One object is reused by the renderer. */
export interface AnimCtx {
  /** Seconds. */
  t: number;
  /** Stable per-entity number, so neighbours don't move in lockstep. */
  seed: number;
  /** World units per step. */
  speed: number;
  /** Low render quality: fewer segments, no secondary motion. */
  low: boolean;
  /** Type-specific 0..1 level (biofilm shield left, boss charge). */
  level: number;
}

export interface Organism {
  body(c: ArtColors, v: number): string;
  back?(P: Painter, c: ArtColors, a: AnimCtx, v: number): void;
  front?(P: Painter, c: ArtColors, a: AnimCtx, v: number): void;
  /** Faces its direction of travel instead of tumbling. */
  oriented?: boolean;
  /** How far the static art reaches past the hit radius (1 = exactly the radius). */
  extent: number;
  /** How far the animated parts reach (flagella), if further than `extent`. */
  reach?: number;
  /** Number of layout variants (picked per entity for variety). */
  variants?: number;
  /** Bake a soft glow into the sprite. */
  glow?: boolean;
  /**
   * Its animated parts show game state (shield left, attack charging), so
   * they stay live in low quality instead of being frozen into the sprite.
   */
  stateful?: boolean;
}

// ---------------------------------------------------------------------------
// Colour and SVG helpers
// ---------------------------------------------------------------------------

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map(ch => ch + ch).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Linear blend of two hex colours (t = 0 → a, 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const A = parseHex(a), B = parseHex(b);
  const ch = (i: number) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

const f = (n: number): string => (Math.round(n * 10) / 10).toString();
const light = (c: string, t = 0.5) => mix(c, '#ffffff', t);
const dark = (c: string, t = 0.5) => mix(c, '#000000', t);
/** Stained-nucleus purple, tinted towards the membrane colour. */
const nucleus = (c: string) => mix(c, '#8b5cf6', 0.6);

const stroke = (color: string, w: number, op = 1) =>
  `fill="none" stroke="${color}" stroke-width="${f(w)}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"`;
const fill = (color: string, op = 1) => `fill="${color}" fill-opacity="${op}"`;
const both = (fc: string, fop: number, sc: string, w: number, sop = 1) =>
  `fill="${fc}" fill-opacity="${fop}" stroke="${sc}" stroke-width="${f(w)}" stroke-opacity="${sop}" stroke-linejoin="round"`;
const circle = (x: number, y: number, r: number, attrs: string) =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" ${attrs}/>`;
const ellipse = (x: number, y: number, rx: number, ry: number, attrs: string, rot = 0) =>
  `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}"${rot ? ` transform="rotate(${f(rot)} ${f(x)} ${f(y)})"` : ''} ${attrs}/>`;
const path = (d: string, attrs: string) => `<path d="${d}" ${attrs}/>`;
const line = (x1: number, y1: number, x2: number, y2: number, attrs: string) =>
  `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" ${attrs}/>`;

/** Small deterministic PRNG so art is identical every time it's built. */
function rng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Closed polygon path through points at angle i/n, radius r(i). */
function blobPath(n: number, r: (i: number) => number, cx = 0, cy = 0): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r(i), cy + Math.sin(a) * r(i)]);
  }
  // Smooth closed curve through midpoints
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    d += i === 0 ? `M${f(mx)} ${f(my)}` : '';
    const nq = pts[(i + 2) % n];
    const nmx = (q[0] + nq[0]) / 2, nmy = (q[1] + nq[1]) / 2;
    d += `Q${f(q[0])} ${f(q[1])} ${f(nmx)} ${f(nmy)}`;
  }
  return d + 'Z';
}

function hexagon(r: number, cx = 0, cy = 0, rot = Math.PI / 6): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = rot + (i / 6) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
const poly = (pts: [number, number][]) => 'M' + pts.map(p => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';

/** Icosahedral capsid seen down a 3-fold axis: hexagon outline with facet lines. */
function capsid(r: number, c: string, w: number, fillOp: number): string {
  const h = hexagon(r);
  let s = path(poly(h), both(c, fillOp, c, w));
  const tri = [h[0], h[2], h[4]];
  s += path(poly(tri), stroke(c, w * 0.6, 0.55));
  for (let i = 1; i < 6; i += 2) s += line(0, 0, h[i][0], h[i][1], stroke(c, w * 0.5, 0.4));
  return s;
}

/** Coiled genome squiggle. */
function genome(r: number, c: string, w: number, turns = 2.2, op = 0.75): string {
  let d = '';
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = u * Math.PI * 2 * turns;
    const rr = r * (0.15 + 0.85 * u) * (1 + 0.15 * Math.sin(u * 37));
    d += (i === 0 ? 'M' : 'L') + `${f(Math.cos(a) * rr)} ${f(Math.sin(a) * rr)}`;
  }
  return path(d, stroke(c, w, op));
}

// ---------------------------------------------------------------------------
// Shared animated parts
// ---------------------------------------------------------------------------

/**
 * A beating flagellum: a travelling sine wave whose amplitude grows from the
 * base, starting at (x0, y0) and pointing along `ang`.
 */
function flagellum(
  P: Painter, x0: number, y0: number, ang: number, len: number, amp: number,
  phase: number, waves: number, segs: number,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  P.moveTo(x0, y0);
  for (let k = 1; k <= segs; k++) {
    const u = k / segs;
    const along = u * len;
    const side = amp * Math.sin(u * Math.PI * 2 * waves - phase) * Math.min(1, u * 2.5);
    P.lineTo(x0 + c * along - s * side, y0 + s * along + c * side);
  }
}

/** Ruffled leading edge (lamellipodium) of a crawling immune cell, at +x. */
function leadingEdge(P: Painter, c: ArtColors, a: AnimCtx, rx = 100, ry = 100): void {
  if (a.low) return;
  P.begin();
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const ang = -0.95 + (i / n) * 1.9;
    const bump = 5 + 4 * Math.sin(ang * 11 - a.t * 5 + a.seed) * Math.cos(ang * 1.6);
    const x = Math.cos(ang) * (rx + bump), y = Math.sin(ang) * (ry + bump);
    if (i === 0) P.moveTo(x, y); else P.lineTo(x, y);
  }
  P.stroke(c.main, 3, 0.55);
}

/** Amoeboid membrane outline: wobbling lobes plus a pseudopod reaching forward. */
function amoeboid(P: Painter, a: AnimCtx, base: number, lobes: number, reach: number): void {
  const n = a.low ? 20 : 32;
  const t = a.t;
  let fx = 0, fy = 0, px = 0, py = 0;
  P.begin();
  for (let i = 0; i <= n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const forward = Math.max(0, Math.cos(ang));
    const r = base * (1
      + lobes * Math.sin(ang * 3 + t * 1.7 + a.seed)
      + lobes * 0.55 * Math.sin(ang * 5 - t * 2.4 + a.seed * 2)
      + reach * forward * forward * forward * forward * (0.75 + 0.25 * Math.sin(t * 2.2 + a.seed)));
    const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
    if (i === 0) { P.moveTo(x, y); fx = x; fy = y; }
    else P.quadTo(px, py, (px + x) / 2, (py + y) / 2);
    px = x; py = y;
  }
  P.quadTo(px, py, fx, fy);
  P.close();
}

// ---------------------------------------------------------------------------
// Pathogens
// ---------------------------------------------------------------------------

const virus: Organism = {
  extent: 1.32,
  glow: true,
  body(c) {
    const m = c.main;
    return circle(0, 0, 86, both(m, 0.12, m, 5))
      + circle(0, 0, 78, stroke(m, 2, 0.35))
      + capsid(52, m, 3.5, 0.14)
      + genome(24, light(m, 0.55), 2.2);
  },
  front(P, c, a) {
    // Spike glycoproteins "breathing" in a wave around the envelope
    const n = 16;
    P.begin();
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const len = a.low ? 20 : 18 + 5 * Math.sin(a.t * 3.2 + i * 0.85 + a.seed);
      const cs = Math.cos(ang), sn = Math.sin(ang);
      P.moveTo(cs * 86, sn * 86);
      P.lineTo(cs * (86 + len), sn * (86 + len));
    }
    P.stroke(c.main, 4);
    P.begin();
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const len = a.low ? 20 : 18 + 5 * Math.sin(a.t * 3.2 + i * 0.85 + a.seed);
      P.circle(Math.cos(ang) * (89 + len), Math.sin(ang) * (89 + len), 6.5);
    }
    P.fill(light(c.main, 0.25));
  },
};

/** Bacteriophage (T4-like): capsid head, contractile tail and walking tail fibres. */
const phage: Organism = {
  extent: 1.45,
  glow: true,
  oriented: true,
  body(c) {
    const m = c.main;
    const head: [number, number][] = [[102, 0], [76, -38], [22, -38], [-4, 0], [22, 38], [76, 38]];
    let s = path(poly(head), both(m, 0.15, m, 5));
    s += path('M76 -38L50 0L76 38M22 -38L50 0L22 38M-4 0L50 0', stroke(m, 2.5, 0.45));
    s += genome(20, light(m, 0.55), 2, 2.2, 0.6).replace('<path', '<path transform="translate(50 0)"');
    // Collar and contractile sheath
    s += path('M-6 -16L-6 16', stroke(m, 6));
    s += `<rect x="-78" y="-11" width="70" height="22" rx="4" ${both(m, 0.2, m, 3)}/>`;
    for (let x = -70; x < -10; x += 9) s += line(x, -11, x, 11, stroke(m, 1.8, 0.55));
    // Baseplate
    s += `<rect x="-88" y="-22" width="10" height="44" rx="3" ${both(m, 0.3, m, 3.5)}/>`;
    return s;
  },
  back(P, c, a) {
    // Six jointed tail fibres stepping like legs
    P.begin();
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1;
      const k = i % 3;
      const y0 = side * (8 + k * 6);
      const step = a.low ? 0 : Math.sin(a.t * 9 + k * 2.1 + (side > 0 ? Math.PI : 0) + a.seed);
      const kneeX = -100 - k * 6 + step * 6;
      const kneeY = side * (40 + k * 10);
      const footX = -92 + k * 10 + step * 12;
      const footY = side * (64 + k * 12);
      P.moveTo(-84, y0);
      P.lineTo(kneeX, kneeY);
      P.lineTo(footX, footY);
    }
    P.stroke(c.main, 3.5, 0.9);
  },
};

function rod(m: string, x: number, y: number, len: number, wid: number, rot: number, fillOp = 0.18, w = 3): string {
  return `<rect x="${f(x - len / 2)}" y="${f(y - wid / 2)}" width="${f(len)}" height="${f(wid)}" rx="${f(wid / 2)}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})" ${both(m, fillOp, m, w)}/>`;
}

function bacteriumBody(c: ArtColors, v: number, armored: boolean): string {
  const m = c.main;
  const R = rng(11 + v);
  let s = '';
  if (armored) {
    // Polysaccharide capsule: thick slimy coat that blocks antibodies
    s += `<rect x="-120" y="-70" width="240" height="140" rx="70" ${both(m, 0.1, m, 4, 0.5)} stroke-dasharray="1 8" stroke-linecap="round"/>`;
    s += `<rect x="-110" y="-60" width="220" height="120" rx="60" ${stroke(m, 2.5, 0.6)}/>`;
    for (let i = 0; i < 46; i++) {
      const ang = R() * Math.PI * 2;
      const rr = 0.9 + R() * 0.1;
      s += circle(Math.cos(ang) * 113 * rr, Math.sin(ang) * 63 * rr, 1.6, fill(m, 0.5));
    }
  }
  // Pili: short adhesion hairs along the wall
  for (let i = 0; i < 14; i++) {
    const x = -66 + i * 10.5 + R() * 4;
    const sgn = i % 2 === 0 ? -1 : 1;
    s += line(x, sgn * 50, x + (R() - 0.5) * 6, sgn * (59 + R() * 5), stroke(m, 2, 0.6));
  }
  // Cell wall + inner membrane
  s += `<rect x="-98" y="-50" width="196" height="100" rx="50" ${both(m, 0.16, m, 6)}/>`;
  s += `<rect x="-88" y="-40" width="176" height="80" rx="40" ${stroke(m, 2, 0.4)}/>`;
  // Nucleoid: the circular chromosome, folded into loops
  let d = '';
  const loops = 7;
  for (let i = 0; i <= 56; i++) {
    const u = i / 56;
    const a = u * Math.PI * 2;
    const r = 1 + 0.55 * Math.sin(a * loops + v);
    const x = Math.cos(a) * 44 * r, y = Math.sin(a) * 15 * r;
    d += (i === 0 ? 'M' : 'L') + `${f(x)} ${f(y)}`;
  }
  s += path(d + 'Z', stroke(light(m, 0.55), 2.2, 0.75));
  // Ribosomes
  for (let i = 0; i < 30; i++) {
    const x = -76 + R() * 152, y = -30 + R() * 60;
    if (Math.abs(x) < 50 && Math.abs(y) < 20) continue;
    s += circle(x, y, 2.4, fill(light(m, 0.3), 0.65));
  }
  // Plasmid
  s += circle(56 - v * 20, -18 + v * 10, 8, stroke(light(m, 0.4), 2, 0.8));
  return s;
}

function bacteriumBack(P: Painter, c: ArtColors, a: AnimCtx, v: number): void {
  const segs = a.low ? 8 : 14;
  const ph = a.t * 14 + a.seed;
  P.begin();
  if (v === 0) {
    // Monotrichous: one long polar flagellum
    flagellum(P, -96, 0, Math.PI, 95, 13, ph, 1.6, segs);
  } else if (v === 1) {
    // Lophotrichous: a tuft at one pole
    for (let k = -1; k <= 1; k++) flagellum(P, -96, k * 12, Math.PI + k * 0.28, 80, 11, ph + k, 1.5, segs);
  } else {
    // Peritrichous: flagella all over, trailing behind
    for (const [x, y] of [[-40, -50], [40, -50], [-40, 50], [40, 50]] as const) {
      const ang = Math.PI + Math.sign(y) * 0.55;
      flagellum(P, x, y, ang, 75, 9, ph + x * 0.05, 1.4, segs);
    }
  }
  P.stroke(c.main, 3.5, 0.85);
}

const bacterium: Organism = {
  extent: 1.25,
  reach: 1.95,
  glow: true,
  oriented: true,
  variants: 3,
  body: (c, v) => bacteriumBody(c, v, false),
  back: bacteriumBack,
};

const bacteriumArmored: Organism = {
  extent: 1.3,
  reach: 1.95,
  glow: true,
  oriented: true,
  variants: 3,
  body: (c, v) => bacteriumBody(c, v, true),
  back: bacteriumBack,
};

/** Half-width of the trypanosome body at x (art units). */
const trypHalf = (x: number) => Math.max(2, 32 * (1 - ((x + 5) / 108) ** 2));

/** Trypanosoma: spindle body, flagellum running along an undulating membrane. */
const trypanosome: Organism = {
  extent: 1.55,
  glow: true,
  oriented: true,
  body(c) {
    const m = c.main;
    let top = 'M-112 0', bot = '';
    for (let x = -112; x <= 104; x += 8) top += `L${f(x)} ${f(-trypHalf(x))}`;
    for (let x = 104; x >= -112; x -= 8) bot += `L${f(x)} ${f(trypHalf(x))}`;
    let s = path(top + 'L110 0' + bot + 'Z', both(m, 0.16, m, 5));
    s += ellipse(0, 2, 19, 13, both(light(m, 0.4), 0.35, light(m, 0.4), 2.5));
    s += circle(3, 2, 4.5, fill(light(m, 0.6), 0.9));
    // Kinetoplast (mitochondrial DNA) at the base of the flagellum
    s += ellipse(-70, 0, 7, 4, fill(m, 0.95));
    s += circle(-82, -2, 3, fill(light(m, 0.5), 0.8));
    for (const [x, y] of [[-40, -8], [-30, 9], [34, -6], [50, 6], [64, -2]]) s += circle(x, y, 2.6, fill(light(m, 0.3), 0.7));
    return s;
  },
  front(P, c, a) {
    const step = a.low ? 16 : 8;
    // Undulating membrane along the top edge, from the kinetoplast forward
    P.begin();
    let first = true;
    for (let x = -70; x <= 104; x += step) {
      const w = 9 + 7 * Math.sin(x * 0.075 - a.t * 13 + a.seed);
      const y = -trypHalf(x) - w;
      if (first) { P.moveTo(x, y); first = false; } else P.lineTo(x, y);
    }
    for (let x = 104; x >= -70; x -= step) P.lineTo(x, -trypHalf(x));
    P.close();
    P.fill(light(c.main, 0.35), 0.22);
    P.begin();
    first = true;
    for (let x = -70; x <= 104; x += step) {
      const w = 9 + 7 * Math.sin(x * 0.075 - a.t * 13 + a.seed);
      const y = -trypHalf(x) - w;
      if (first) { P.moveTo(x, y); first = false; } else P.lineTo(x, y);
    }
    // Free flagellum leads the way
    const tipW = 9 + 7 * Math.sin(104 * 0.075 - a.t * 13 + a.seed);
    flagellum(P, 104, -trypHalf(104) - tipW, -0.08, 46, 9, a.t * 13 + a.seed, 1, a.low ? 5 : 9);
    P.stroke(c.main, 3.2);
  },
};

/** Giardia trophozoite: pear-shaped, two nuclei like eyes, eight flagella. */
const giardia: Organism = {
  extent: 1.55,
  reach: 1.85,
  glow: true,
  oriented: true,
  body(c) {
    const m = c.main;
    let s = path('M100 0C100 -64 22 -80 -40 -52C-80 -32 -108 -10 -118 0C-108 10 -80 32 -40 52C22 80 100 64 100 0Z', both(m, 0.15, m, 5));
    // Ventral adhesive disc
    s += circle(42, 0, 50, both(m, 0.07, m, 2.2, 0.45));
    // Axonemes running the length of the cell
    s += path('M40 -7L-112 -2M40 7L-112 2', stroke(m, 2, 0.45));
    // Two nuclei with karyosomes (the "eyes")
    for (const y of [-23, 23]) {
      s += ellipse(52, y, 15, 13, both(light(m, 0.45), 0.35, light(m, 0.45), 2.5));
      s += circle(55, y, 5, fill(dark(m, 0.35), 0.95));
    }
    // Median bodies (the "mouth")
    s += path('M14 -15Q0 0 14 15', stroke(m, 5, 0.9));
    return s;
  },
  back(P, c, a) {
    const segs = a.low ? 6 : 10;
    const ph = a.t * 12 + a.seed;
    P.begin();
    for (const sgn of [-1, 1]) {
      flagellum(P, 30, sgn * 46, Math.PI - sgn * 0.75, 58, 8, ph, 1.2, segs);           // anterior
      flagellum(P, -50, sgn * 40, Math.PI - sgn * 0.45, 56, 8, ph + 1.3, 1.2, segs);     // posterolateral
      flagellum(P, -20, sgn * 10, Math.PI - sgn * 0.12, 60, 7, ph + 2.1, 1.3, segs);     // ventral
      flagellum(P, -116, sgn * 3, Math.PI - sgn * 0.1, 62, 9, ph + 0.7, 1.3, segs);      // caudal
    }
    P.stroke(c.main, 3, 0.85);
  },
};

interface FungusGeom { hyphae: { d: string; septa: [number, number, number][]; tip: [number, number] }[]; cells: [number, number, number, number][] }
const fungusGeoms: FungusGeom[] = [];
function fungusGeom(v: number): FungusGeom {
  if (fungusGeoms[v]) return fungusGeoms[v];
  const R = rng(31 + v * 7);
  const hyphae: FungusGeom['hyphae'] = [];
  const count = 5 + v;
  for (let i = 0; i < count; i++) {
    let ang = (i / count) * Math.PI * 2 + R() * 0.5;
    let x = Math.cos(ang) * 36, y = Math.sin(ang) * 36;
    let d = `M${f(x)} ${f(y)}`;
    const septa: [number, number, number][] = [];
    const len = 78 + R() * 30;
    const steps = 4;
    for (let k = 0; k < steps; k++) {
      ang += (R() - 0.5) * 0.6;
      x += Math.cos(ang) * (len / steps);
      y += Math.sin(ang) * (len / steps);
      d += `L${f(x)} ${f(y)}`;
      if (k < steps - 1) septa.push([x, y, ang]);
    }
    hyphae.push({ d, septa, tip: [x, y] });
    if (i % 2 === 0) {
      // Side branch
      const [sx, sy, sa] = septa[1] ?? septa[0];
      const ba = sa + (R() > 0.5 ? 0.9 : -0.9);
      const bx = sx + Math.cos(ba) * 38, by = sy + Math.sin(ba) * 38;
      hyphae.push({ d: `M${f(sx)} ${f(sy)}L${f(bx)} ${f(by)}`, septa: [], tip: [bx, by] });
    }
  }
  const cells: FungusGeom['cells'] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + R() * 0.4;
    const dist = i === 0 ? 0 : 30 + R() * 10;
    cells.push([Math.cos(ang) * dist, Math.sin(ang) * dist, 20 + R() * 6, ang]);
  }
  return (fungusGeoms[v] = { hyphae, cells });
}

/** Candida-like fungus: budding yeast cells sending out septate hyphae. */
const yeast: Organism = {
  extent: 1.45,
  glow: true,
  variants: 3,
  body(c, v) {
    const m = c.main;
    const g = fungusGeom(v);
    const inner = mix(m, '#0a0505', 0.75);
    let s = '';
    for (const h of g.hyphae) {
      s += path(h.d, stroke(m, 11, 0.9));
      s += path(h.d, stroke(inner, 5.5, 1));
      for (const [x, y, a] of h.septa) {
        const px = -Math.sin(a) * 5.5, py = Math.cos(a) * 5.5;
        s += line(x - px, y - py, x + px, y + py, stroke(m, 2.2, 0.9));
      }
    }
    for (const [x, y, r, a] of g.cells) {
      s += ellipse(x, y, r, r * 0.8, both(m, 0.22, m, 4), (a * 180) / Math.PI);
      // Daughter bud
      const bx = x + Math.cos(a) * r * 1.05, by = y + Math.sin(a) * r * 1.05;
      s += circle(bx, by, r * 0.42, both(m, 0.28, m, 3));
      s += circle(x - Math.cos(a) * r * 0.25, y - Math.sin(a) * r * 0.25, r * 0.32, both(light(m, 0.4), 0.25, light(m, 0.4), 1.8, 0.7));
    }
    return s;
  },
  front(P, c, a, v) {
    // Conidia (spores) swelling at the hyphal tips
    const g = fungusGeom(v);
    P.begin();
    for (let i = 0; i < g.hyphae.length; i++) {
      const [x, y] = g.hyphae[i].tip;
      const r = a.low ? 7 : 6.5 + 2.2 * Math.sin(a.t * 2.6 + i * 1.7 + a.seed);
      P.circle(x, y, r);
    }
    P.fill(light(c.main, 0.25), 0.85);
  },
};

/**
 * Prion: misfolded protein. Drawn the way biochemists draw β-sheets — flat
 * arrows (β-strands) stacked side by side and joined by hairpin turns —
 * clumped into the amyloid aggregate that makes prions so hard to destroy.
 */
const prion: Organism = {
  extent: 1.15,
  glow: true,
  body(c) {
    const m = c.main;
    let s = '';
    const rows = [-60, -30, 0, 30, 60];
    rows.forEach((y, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      const x0 = -78 * dir, x1 = 66 * dir;
      const shift = (i % 3) * 6 - 6;
      // Strand with a gentle pleat, ending in an arrowhead
      const d = `M${f(x0 + shift)} ${f(y - 8)}L${f(x1 + shift)} ${f(y - 8)}L${f(x1 + shift)} ${f(y - 16)}`
        + `L${f(x1 + shift + 24 * dir)} ${f(y)}L${f(x1 + shift)} ${f(y + 16)}L${f(x1 + shift)} ${f(y + 8)}`
        + `L${f(x0 + shift)} ${f(y + 8)}Z`;
      s += path(d, both(m, 0.32, m, 4));
      // Hairpin turn to the next strand
      if (i < rows.length - 1) {
        const tx = (dir > 0 ? x1 + 24 : x1 - 24) + shift;
        s += path(`M${f(tx)} ${f(y + 4)}Q${f(tx + 26 * dir)} ${f(y + 15)} ${f(tx)} ${f(y + 26)}`, stroke(light(m, 0.3), 3.5, 0.7));
      }
    });
    // Hydrogen bonds between neighbouring strands
    let h = '';
    for (let k = 0; k < rows.length - 1; k++) {
      for (let x = -50; x <= 40; x += 18) h += `M${x} ${rows[k] + 10}L${x} ${rows[k + 1] - 10}`;
    }
    s += path(h, `${stroke(light(m, 0.5), 1.8, 0.5)} stroke-dasharray="2 3"`);
    return s;
  },
};

/** Cancer cell: irregular nucleus with big nucleoli; blebbing membrane is animated. */
function cancerBody(c: ArtColors, v: number, big: boolean): string {
  const m = c.main;
  const R = rng(51 + v);
  const nuc = mix(m, '#7c3aed', 0.4);
  let s = '';
  // Mitochondria
  for (let i = 0; i < (big ? 10 : 6); i++) {
    const ang = R() * Math.PI * 2, dist = 62 + R() * 18;
    const x = Math.cos(ang) * dist, y = Math.sin(ang) * dist;
    s += ellipse(x, y, 9, 4.5, both(m, 0.2, m, 1.8, 0.7), R() * 180);
  }
  const nuclei = big ? 3 : v === 2 ? 2 : 1;
  for (let k = 0; k < nuclei; k++) {
    const cx = nuclei === 1 ? -6 : (k - (nuclei - 1) / 2) * 38;
    const cy = nuclei === 1 ? 4 : (k % 2 ? 14 : -10);
    const rr = nuclei === 1 ? 46 : 30;
    const noise = Array.from({ length: 10 }, () => 0.78 + R() * 0.32);
    s += path(blobPath(10, i => rr * noise[i], cx, cy), both(nuc, 0.32, light(nuc, 0.3), 3));
    for (let i = 0; i < 16; i++) {
      const ang = R() * Math.PI * 2, dist = R() * rr * 0.75;
      s += circle(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, 1.8, fill(light(nuc, 0.5), 0.55));
    }
    // Prominent nucleoli — a hallmark of malignancy
    for (let i = 0; i < 2; i++) {
      s += circle(cx + (R() - 0.5) * rr * 0.8, cy + (R() - 0.5) * rr * 0.8, 6 + R() * 3, fill(light(m, 0.25), 0.9));
    }
  }
  return s;
}

function cancerBack(P: Painter, c: ArtColors, a: AnimCtx): void {
  const n = a.low ? 20 : 30;
  let fx = 0, fy = 0, px = 0, py = 0;
  P.begin();
  for (let i = 0; i <= n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const bleb = Math.max(0, Math.sin(ang * 7 + a.t * 0.9 + a.seed));
    const r = 100 * (1 + 0.06 * Math.sin(ang * 3 + a.t * 1.3 + a.seed)
      + 0.04 * Math.sin(ang * 5 - a.t * 1.8) + 0.09 * bleb * bleb * bleb);
    const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
    if (i === 0) { P.moveTo(x, y); fx = x; fy = y; }
    else P.quadTo(px, py, (px + x) / 2, (py + y) / 2);
    px = x; py = y;
  }
  P.quadTo(px, py, fx, fy);
  P.close();
  P.fill(c.main, 0.13);
  P.stroke(c.main, 5);
}

const cancer: Organism = {
  extent: 1.25,
  variants: 3,
  body: (c, v) => cancerBody(c, v, false),
  back: cancerBack,
};

/** Biofilm: bacteria embedded in a slimy extracellular matrix (the shield). */
const biofilm: Organism = {
  extent: 1.2,
  stateful: true,
  body(c) {
    const R = rng(77);
    let s = '';
    // Extracellular polymeric substance: tangled polysaccharide strands
    for (let i = 0; i < 9; i++) {
      const ang = R() * Math.PI * 2;
      const x0 = Math.cos(ang) * 80, y0 = Math.sin(ang) * 80;
      const x1 = -x0 * 0.6 + (R() - 0.5) * 40, y1 = -y0 * 0.6 + (R() - 0.5) * 40;
      s += path(`M${f(x0)} ${f(y0)}Q${f((R() - 0.5) * 60)} ${f((R() - 0.5) * 60)} ${f(x1)} ${f(y1)}`, stroke(c.main, 2, 0.35));
    }
    const spots: [number, number, number][] = [[0, 0, 20], [-42, -26, 70], [40, -30, -35], [-38, 34, -20], [42, 32, 55], [0, -58, 5], [2, 60, 80]];
    for (const [x, y, rot] of spots) s += rod(c.alt, x, y, 40, 19, rot, 0.25, 3);
    for (const [x, y] of spots) s += circle(x, y, 3, fill(light(c.alt, 0.4), 0.8));
    return s;
  },
  back(P, c, a) {
    const shield = a.level;
    if (shield <= 0) return; // matrix stripped away: the bacteria are exposed
    const n = a.low ? 18 : 28;
    let fx = 0, fy = 0, px = 0, py = 0;
    P.begin();
    for (let i = 0; i <= n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const r = (88 + 18 * shield) * (1 + 0.05 * Math.sin(ang * 4 + a.t * 1.1 + a.seed) + 0.03 * Math.sin(ang * 7 - a.t * 1.6));
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0) { P.moveTo(x, y); fx = x; fy = y; }
      else P.quadTo(px, py, (px + x) / 2, (py + y) / 2);
      px = x; py = y;
    }
    P.quadTo(px, py, fx, fy);
    P.close();
    P.fill(c.main, 0.06 + 0.16 * shield);
    P.stroke(c.main, 2 + 4 * shield, 0.3 + 0.55 * shield);
  },
};

// ---------------------------------------------------------------------------
// Boss-fight bystanders
// ---------------------------------------------------------------------------

/** Red blood cell: biconcave disc, pale in the middle. */
const rbc: Organism = {
  extent: 1.05,
  body(c) {
    const m = c.main;
    return `<defs><radialGradient id="rbc"><stop offset="0" stop-color="${dark(m, 0.55)}"/><stop offset="0.42" stop-color="${dark(m, 0.4)}"/><stop offset="0.72" stop-color="${m}"/><stop offset="1" stop-color="${dark(m, 0.15)}"/></radialGradient></defs>`
      + ellipse(0, 0, 100, 88, `fill="url(#rbc)" fill-opacity="0.85" stroke="${dark(m, 0.25)}" stroke-width="3"`)
      + path('M-62 -46Q-30 -78 22 -74', stroke('#ffffff', 6, 0.18));
  },
};

/** Blood vessel sprouting toward the tumour (cross-section). */
const vessel: Organism = {
  extent: 1.05,
  glow: true,
  body(c) {
    const m = c.main;
    let s = circle(0, 0, 94, stroke(m, 2, 0.5));
    s += circle(0, 0, 78, stroke(m, 26, 0.5));
    s += circle(0, 0, 64, fill(dark(m, 0.55), 0.7));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      s += ellipse(Math.cos(a) * 78, Math.sin(a) * 78, 16, 7, fill(mix(m, '#7c3aed', 0.45), 0.85), (a * 180) / Math.PI + 90);
    }
    s += ellipse(-18, -10, 22, 14, both('#dc2626', 0.6, '#7f1d1d', 2), 20);
    s += ellipse(22, 18, 18, 11, both('#dc2626', 0.5, '#7f1d1d', 2), -30);
    return s;
  },
  front(P, c, a) {
    // Pulse of blood through the lumen
    const r = 64 * (0.82 + 0.16 * Math.sin(a.t * 5 + a.seed));
    P.begin();
    P.circle(0, 0, r);
    P.stroke(light(c.main, 0.3), 2.5, 0.55);
  },
};

// ---------------------------------------------------------------------------
// Bosses
// ---------------------------------------------------------------------------

/** Mimivirus — a real giant virus: hairy fibril coat and a star-shaped "stargate". */
const mimivirus: Organism = {
  extent: 1.2,
  stateful: true,
  glow: true,
  body(c) {
    const m = c.main;
    const R = rng(91);
    let fibrils = '';
    for (let i = 0; i < 140; i++) {
      const a = (i / 140) * Math.PI * 2;
      const r1 = 72, r2 = 92 + R() * 10;
      fibrils += `M${f(Math.cos(a) * r1)} ${f(Math.sin(a) * r1)}L${f(Math.cos(a + (R() - 0.5) * 0.05) * r2)} ${f(Math.sin(a) * r2)}`;
    }
    let s = path(fibrils, stroke(m, 1.8, 0.5));
    s += capsid(76, m, 6, 0.16);
    s += path(poly(hexagon(48)), `${both(m, 0.12, m, 3, 0.6)} stroke-dasharray="6 6"`);
    s += genome(36, light(m, 0.5), 2.4, 3.5, 0.7);
    // Stargate: five-pointed star at one vertex, where the genome is released
    let star = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 === 0 ? 17 : 7;
      star += (i === 0 ? 'M' : 'L') + `${f(Math.cos(a) * r)} ${f(-56 + Math.sin(a) * r)}`;
    }
    s += path(star + 'Z', both(light(m, 0.4), 0.25, light(m, 0.4), 3));
    return s;
  },
  front(P, c, a) {
    // Stargate glints when the boss is about to fire
    if (a.level <= 0) return;
    P.begin();
    P.circle(0, -56, 10 + 10 * a.level);
    P.fill(light(c.main, 0.5), 0.35 + 0.35 * Math.sin(a.t * 18) * a.level);
  },
};

/** HIV: lipid envelope with gp120 knobs and a cone-shaped capsid holding 2 RNA strands. */
const hiv: Organism = {
  extent: 1.3,
  glow: true,
  body(c) {
    const m = c.main, l = light(m, 0.4);
    let s = circle(0, 0, 86, both(m, 0.12, m, 5));
    s += circle(0, 0, 79, stroke(m, 2, 0.35));
    s += `<circle r="70" ${stroke(m, 3, 0.4)} stroke-dasharray="3 6"/>`;
    s += `<g transform="rotate(-24)">`;
    s += path('M-48 -9L38 -32Q56 0 38 32L-48 9Q-55 0 -48 -9Z', both(l, 0.16, l, 3.5));
    s += path('M-38 -3C-20 -12 0 6 20 -8C30 -14 36 -10 40 -6', stroke(light(m, 0.6), 2.2, 0.8));
    s += path('M-38 4C-20 -4 0 14 20 2C30 -4 36 2 40 6', stroke(light(m, 0.6), 2.2, 0.8));
    s += circle(-30, 10, 3.5, fill(light(m, 0.7), 0.8)) + circle(28, -16, 3.5, fill(light(m, 0.7), 0.8));
    s += '</g>';
    return s;
  },
  front(P, c, a) {
    const n = 12;
    P.begin();
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + 0.13 + (a.low ? 0 : 0.04 * Math.sin(a.t * 2 + i));
      const cs = Math.cos(ang), sn = Math.sin(ang);
      P.moveTo(cs * 86, sn * 86);
      P.lineTo(cs * 100, sn * 100);
    }
    P.stroke(c.alt, 3.5);
    P.begin();
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + 0.13 + (a.low ? 0 : 0.04 * Math.sin(a.t * 2 + i));
      // gp120 trimer: three knobs at the tip of the gp41 stalk
      for (let k = -1; k <= 1; k++) {
        const ka = ang + k * 0.07;
        const kr = 107 + (k === 0 ? 4 : 0);
        P.circle(Math.cos(ka) * kr, Math.sin(ka) * kr, 5);
      }
    }
    P.fill(c.alt, 0.95);
  },
};

/** Influenza: envelope packed with HA (rods) and NA (boxes); 7+1 RNA segments inside. */
const influenza: Organism = {
  extent: 1.25,
  glow: true,
  body(c) {
    const m = c.main, l = light(m, 0.45);
    let s = circle(0, 0, 86, both(m, 0.12, m, 5));
    s += circle(0, 0, 79, stroke(m, 2, 0.35));
    s += `<circle r="72" ${stroke(m, 3, 0.35)} stroke-dasharray="4 5"/>`;
    // Eight RNP segments seen end-on: seven around one (as in real EM images)
    const segs: [number, number][] = [[0, 0]];
    for (let i = 0; i < 7; i++) segs.push([Math.cos(i * 0.8976) * 30, Math.sin(i * 0.8976) * 30]);
    for (const [x, y] of segs) {
      s += circle(x, y, 11, both(l, 0.22, l, 2.5));
      s += circle(x, y, 3.5, fill(l, 0.8));
    }
    return s;
  },
  front(P, c, a) {
    const n = 26;
    const sway = (i: number) => (a.low ? 0 : 0.035 * Math.sin(a.t * 2.4 + i * 0.6 + a.seed));
    // Stalks
    P.begin();
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + sway(i);
      const len = i % 3 === 2 ? 14 : 18;
      P.moveTo(Math.cos(ang) * 86, Math.sin(ang) * 86);
      P.lineTo(Math.cos(ang) * (86 + len), Math.sin(ang) * (86 + len));
    }
    P.stroke(c.alt, 3.5);
    // Heads: HA trimers (wedges) and NA tetramers (square boxes)
    P.begin();
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + sway(i);
      const cs = Math.cos(ang), sn = Math.sin(ang);
      if (i % 3 === 2) {
        const r = 104, h = 5;
        const x = cs * r, y = sn * r;
        P.moveTo(x + (-cs - sn) * h, y + (-sn + cs) * h);
        P.lineTo(x + (cs - sn) * h, y + (sn + cs) * h);
        P.lineTo(x + (cs + sn) * h, y + (sn - cs) * h);
        P.lineTo(x + (-cs + sn) * h, y + (-sn - cs) * h);
        P.close();
      } else {
        const r = 104;
        P.moveTo(cs * (r + 6), sn * (r + 6));
        P.lineTo(cs * (r - 3) - sn * 5, sn * (r - 3) + cs * 5);
        P.lineTo(cs * (r - 3) + sn * 5, sn * (r - 3) - cs * 5);
        P.close();
      }
    }
    P.fill(c.alt, 0.95);
  },
};

const tumor: Organism = {
  extent: 1.25,
  body: (c, v) => cancerBody(c, v + 5, true),
  back: cancerBack,
};

/** Aspergillus conidiophore head: vesicle, phialides and chains of spores. */
const aspergillus: Organism = {
  extent: 1.3,
  glow: true,
  body(c) {
    const m = c.main;
    let s = '';
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const cs = Math.cos(a), sn = Math.sin(a);
      s += line(cs * 44, sn * 44, cs * 60, sn * 60, stroke(m, 7, 0.9));
      for (let k = 0; k < 4; k++) {
        const r = 68 + k * 15;
        const off = (k % 2 ? 0.04 : -0.04);
        s += circle(Math.cos(a + off) * r, Math.sin(a + off) * r, 7 - k * 0.6, both(m, 0.35, m, 2.5));
      }
    }
    s += circle(0, 0, 44, both(m, 0.2, m, 5));
    s += circle(0, 0, 22, both(light(m, 0.4), 0.2, light(m, 0.4), 2));
    return s;
  },
};

/** Plasmodium schizont: a rosette of merozoites around dark malarial pigment. */
const schizont: Organism = {
  extent: 1.3,
  glow: true,
  body(c) {
    const m = c.main;
    let s = '';
    const ring = (count: number, r: number, off: number) => {
      for (let i = 0; i < count; i++) {
        const a = off + (i / count) * Math.PI * 2;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        s += ellipse(x, y, 11, 7, both(light(m, 0.35), 0.3, light(m, 0.35), 2), (a * 180) / Math.PI);
        s += circle(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.4, fill(dark(m, 0.3), 0.95));
      }
    };
    ring(10, 64, 0);
    ring(6, 36, 0.4);
    // Hemozoin: the crystal "malaria pigment" left from digesting haemoglobin
    s += path(blobPath(7, i => [15, 11, 17, 12, 16, 10, 14][i]), fill('#3b2416', 0.95));
    for (const [x, y] of [[-4, -3], [5, 2], [-2, 6]]) s += circle(x, y, 2, fill('#d4a017', 0.85));
    return s;
  },
  back(P, c, a) {
    amoeboid(P, a, 100, 0.08, 0.06);
    P.fill(c.main, 0.14);
    P.stroke(c.main, 5);
  },
};

/** Tapeworm scolex: crown of hooks on the rostellum and four suckers. */
const scolex: Organism = {
  extent: 1.2,
  glow: true,
  oriented: true,
  body(c) {
    const m = c.main, l = light(m, 0.4);
    let s = ellipse(0, 0, 100, 88, both(m, 0.16, m, 5));
    for (const [x, y] of [[18, -46], [18, 46], [-34, -40], [-34, 40]]) {
      s += circle(x, y, 21, both(m, 0.12, m, 3.5));
      s += circle(x, y, 10, both(dark(m, 0.4), 0.6, m, 2));
    }
    s += circle(74, 0, 22, both(l, 0.2, l, 3));
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const x = 74 + Math.cos(a) * 24, y = Math.sin(a) * 24;
      const tx = 74 + Math.cos(a) * 36, ty = Math.sin(a) * 36;
      s += path(`M${f(x)} ${f(y)}Q${f(tx + Math.cos(a + 1.4) * 6)} ${f(ty + Math.sin(a + 1.4) * 6)} ${f(tx)} ${f(ty)}`, stroke(l, 3));
    }
    return s;
  },
};

/** Tapeworm segment (proglottid) with branched uterus. */
const proglottid: Organism = {
  extent: 1.05,
  glow: true,
  body(c) {
    const m = c.main;
    let s = `<rect x="-90" y="-100" width="180" height="200" rx="34" ${both(m, 0.15, m, 5)}/>`;
    let ut = 'M0 -70L0 70';
    for (let y = -55; y <= 55; y += 22) ut += `M0 ${y}Q-26 ${y - 8} -46 ${y + 4}M0 ${y}Q26 ${y - 8} 46 ${y + 4}`;
    s += path(ut, stroke(light(m, 0.4), 3, 0.75));
    s += circle(-78, 0, 6, both(m, 0.5, m, 2));
    return s;
  },
};

// ---------------------------------------------------------------------------
// Immune cells (player and rogue T-cells)
// ---------------------------------------------------------------------------

function lymphocyte(c: ArtColors, granules: string, granuleCount: number, hijacked: boolean, angry: boolean): string {
  const m = c.main, nuc = nucleus(m);
  const R = rng(5);
  let s = '';
  // Uropod: the trailing tail of a crawling lymphocyte
  s += ellipse(-104, 0, 20, 24, both(m, 0.12, m, 4));
  // Microvilli
  let villi = '';
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    if (Math.abs(a - Math.PI) < 0.35) continue;
    villi += `M${f(Math.cos(a) * 98)} ${f(Math.sin(a) * 98)}L${f(Math.cos(a) * 107)} ${f(Math.sin(a) * 107)}`;
  }
  s += path(villi, stroke(m, 4, angry ? 0.9 : 0.55));
  s += circle(0, 0, 100, both(m, 0.1, m, 5));
  // Large nucleus with heterochromatin clumps
  s += circle(-12, 0, 63, both(nuc, 0.3, nuc, 3.5));
  for (let i = 0; i < 14; i++) {
    const a = R() * Math.PI * 2, d = R() * 48;
    s += ellipse(-12 + Math.cos(a) * d, Math.sin(a) * d, 6 + R() * 5, 4 + R() * 3, fill(dark(nuc, 0.25), 0.45), R() * 180);
  }
  // Microtubule-organising centre and polarised granules at the front
  s += circle(58, 0, 4, fill(light(m, 0.3), 0.9));
  for (let i = 0; i < granuleCount; i++) {
    const a = (i / granuleCount) * Math.PI * 2;
    s += circle(70 + Math.cos(a) * 11, Math.sin(a) * 15, 5.5, fill(granules, angry ? 1 : 0.85));
  }
  if (hijacked) {
    // Retrovirus particles budding off the membrane
    for (const a of [-2.2, 0.9, 2.4]) {
      const x = Math.cos(a) * 108, y = Math.sin(a) * 108;
      s += circle(x, y, 13, both(c.alt, 0.25, c.alt, 3));
      s += circle(x, y, 5, fill(c.alt, 0.9));
    }
  }
  return s;
}

const killerT: Organism = {
  extent: 1.25,
  glow: true,
  body: c => lymphocyte(c, '#f472b6', 6, false, false),
  front: (P, c, a) => leadingEdge(P, c, a),
};

const rogueT: Organism = {
  extent: 1.3,
  glow: true,
  oriented: true,
  body: c => lymphocyte(c, '#fda4af', 5, true, false),
  front: (P, c, a) => leadingEdge(P, c, a),
};

const autoimmuneT: Organism = {
  extent: 1.3,
  glow: true,
  oriented: true,
  body: c => lymphocyte(c, '#fb7185', 9, false, true),
  front(P, c, a) {
    leadingEdge(P, c, a);
    // Overactive T-cell receptors bristling all round
    P.begin();
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2 + a.t * 0.4;
      const len = 14 + (a.low ? 0 : 5 * Math.sin(a.t * 6 + i));
      P.moveTo(Math.cos(ang) * 104, Math.sin(ang) * 104);
      P.lineTo(Math.cos(ang) * (104 + len), Math.sin(ang) * (104 + len));
    }
    P.stroke(c.main, 3.5, 0.9);
  },
};

const macrophage: Organism = {
  extent: 1.4,
  glow: true,
  body(c) {
    const m = c.main, nuc = nucleus(m);
    let s = '';
    // Kidney-shaped nucleus
    s += path('M-58 -30C-40 -58 6 -54 8 -26C10 -10 -6 -4 -6 6C-6 18 10 24 6 40C0 62 -46 60 -60 32C-70 12 -70 -12 -58 -30Z', both(nuc, 0.3, nuc, 3.5));
    // Phagosomes holding digested microbes
    const debris = ['#ef4444', '#f59e0b', '#a855f7'];
    const vac: [number, number, number][] = [[42, -34, 17], [50, 26, 14], [20, 56, 11], [24, -64, 11], [70, -2, 10]];
    vac.forEach(([x, y, r], i) => {
      s += circle(x, y, r, both('#0a0505', 0.35, m, 2.5, 0.55));
      s += rod(debris[i % 3], x, y, r * 1.1, r * 0.5, i * 40, 0.4, 1.8);
    });
    // Lysosomes
    for (const [x, y] of [[0, -78], [36, 70], [-30, 76], [72, 46], [-80, 4], [84, -36], [-14, 74], [60, -60]]) {
      s += circle(x, y, 4, fill('#fbbf24', 0.75));
    }
    return s;
  },
  back(P, c, a) {
    amoeboid(P, a, 100, 0.09, 0.22);
    P.fill(c.main, 0.1);
    P.stroke(c.main, 5);
  },
  front(P, c, a) {
    if (a.low) return;
    // Membrane ruffles sampling the environment
    P.begin();
    for (let k = 0; k < 3; k++) {
      const ang = -0.6 + k * 0.6 + 0.12 * Math.sin(a.t * 3 + k);
      const r = 112 + 12 * Math.sin(a.t * 2.2 + k * 2);
      P.moveTo(Math.cos(ang - 0.12) * 100, Math.sin(ang - 0.12) * 100);
      P.quadTo(Math.cos(ang) * r, Math.sin(ang) * r, Math.cos(ang + 0.12) * 100, Math.sin(ang + 0.12) * 100);
    }
    P.stroke(c.main, 3, 0.6);
  },
};

const nkCell: Organism = {
  extent: 1.3,
  glow: true,
  body(c) {
    const m = c.main, nuc = nucleus(m);
    const R = rng(13);
    let s = ellipse(-114, 0, 16, 20, both(m, 0.12, m, 4));
    s += ellipse(0, 0, 112, 86, both(m, 0.1, m, 5));
    s += path('M-70 -20C-62 -52 -14 -56 -4 -28C2 -12 -14 -6 -14 6C-14 18 0 26 -6 40C-16 62 -64 54 -72 22C-76 6 -74 -8 -70 -20Z', both(nuc, 0.3, nuc, 3.5));
    // Many cytotoxic (perforin / granzyme) granules: "large granular lymphocyte"
    for (let i = 0; i < 18; i++) {
      const x = 4 + R() * 82, y = (R() - 0.5) * 120 * (1 - (x / 112) ** 2 * 0.6);
      s += circle(x, y, 4.2 + R() * 1.8, fill('#c084fc', 0.85));
    }
    return s;
  },
  front: (P, c, a) => leadingEdge(P, c, a, 112, 86),
};

const plasmaB: Organism = {
  extent: 1.25,
  reach: 1.5,
  glow: true,
  body(c) {
    const m = c.main, nuc = nucleus(m);
    let s = ellipse(0, 0, 108, 92, both(m, 0.1, m, 5));
    // Rough ER: stacked membranes studded with ribosomes (antibody factory)
    for (const r of [60, 72, 84]) {
      s += path(`M${f(-42 + Math.cos(-1.1) * r)} ${f(Math.sin(-1.1) * r)}A${r} ${r} 0 0 1 ${f(-42 + Math.cos(1.1) * r)} ${f(Math.sin(1.1) * r)}`, stroke(m, 2.5, 0.5));
      for (let k = 0; k <= 8; k++) {
        const a = -1.05 + k * 0.26;
        s += circle(-42 + Math.cos(a) * r, Math.sin(a) * r, 2, fill(light(m, 0.3), 0.8));
      }
    }
    // Golgi halo next to the nucleus
    s += ellipse(4, 0, 18, 28, fill('#ffffff', 0.1));
    // Eccentric nucleus with "clock-face" chromatin
    s += circle(-46, 0, 40, both(nuc, 0.3, nuc, 3.5));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      s += ellipse(-46 + Math.cos(a) * 26, Math.sin(a) * 26, 8, 5, fill(dark(nuc, 0.3), 0.55), (a * 180) / Math.PI);
    }
    s += circle(-46, 0, 7, fill(dark(nuc, 0.3), 0.55));
    return s;
  },
  front(P, c, a) {
    leadingEdge(P, c, a, 108, 92);
    if (a.low) return;
    // Freshly made antibodies drifting out of the cell
    P.begin();
    for (let k = 0; k < 3; k++) {
      const u = (a.t * 0.5 + k / 3) % 1;
      const ang = -0.9 + k * 0.9;
      const r = 100 + u * 40;
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      const cs = Math.cos(ang), sn = Math.sin(ang);
      P.moveTo(x - cs * 7, y - sn * 7);
      P.lineTo(x, y);
      P.lineTo(x + cs * 6 - sn * 5, y + sn * 6 + cs * 5);
      P.moveTo(x, y);
      P.lineTo(x + cs * 6 + sn * 5, y + sn * 6 - cs * 5);
    }
    P.stroke(c.alt, 2.5, 0.8);
  },
};

export const ORGANISMS: Record<ArtId, Organism> = {
  virus, phage, bacterium, bacterium_armored: bacteriumArmored, trypanosome, giardia, yeast, prion,
  cancer, biofilm, rbc, rogue_t: rogueT, autoimmune_t: autoimmuneT, vessel, mimivirus, hiv, influenza,
  tumor, aspergillus, schizont, scolex, proglottid,
  killer_t: killerT, macrophage, nk_cell: nkCell, plasma_b: plasmaB,
};

/** Wraps art in a standalone SVG document, optionally with a baked soft glow. */
export function svgDocument(inner: string, size: number, extent: number, glow: boolean): string {
  const e = Math.round(100 * extent);
  const halo = glow
    ? `<defs><filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter></defs><g filter="url(#glow)" opacity="0.6">${inner}</g>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-e} ${-e} ${2 * e} ${2 * e}">${halo}${inner}</svg>`;
}
