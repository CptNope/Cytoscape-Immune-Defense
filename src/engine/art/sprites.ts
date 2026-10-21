/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ORGANISMS, svgDocument, type ArtColors, type ArtId, type AnimCtx } from './organisms';
import { CanvasPainter, SvgPainter } from './painter';

/**
 * SVG art → cached bitmaps.
 *
 * Each organism's static SVG is rasterised once per (art, variant, colours,
 * size bucket) into an offscreen canvas. Drawing it is then a single
 * `drawImage`, which is far cheaper on mobile GPUs than stroking dozens of
 * paths with `shadowBlur` every frame. Loading is asynchronous; until a
 * sprite is ready `drawArt` returns false and the caller draws a placeholder.
 */

/** A rasterised sprite and the half-size of its art box, in art units. */
interface Sprite { cv: HTMLCanvasElement; e: number; full: boolean }
const ready = new Map<string, Sprite>();
/** Last ready sprite per art + variant (any colour): stand-in while a recoloured one loads. */
const anyColour = new Map<string, Sprite>();
/** Bumped by clearArtCache so loads started before a clear are ignored. */
let generation = 0;
const pending = new Set<string>();
const failed = new Set<string>();

/** Bitmap sizes in device pixels. Art is drawn with the smallest that's big enough. */
const BUCKETS = [48, 96, 192, 384, 512];

const canRasterise = (): boolean => typeof Image !== 'undefined' && typeof document !== 'undefined';

function bucketFor(px: number): number {
  for (const b of BUCKETS) if (b >= px * 0.9) return b;
  return BUCKETS[BUCKETS.length - 1];
}

/**
 * In low quality the animated parts are frozen into the sprite ("full"), so
 * each organism costs a single drawImage. Stateful parts stay live.
 */
const freezes = (id: ArtId, low: boolean): boolean => low && !ORGANISMS[id].stateful;

/** Art box (in hit radii) of the static or the frozen-with-animation art. */
const boxOf = (id: ArtId, full: boolean): number =>
  full ? Math.max(ORGANISMS[id].extent, ORGANISMS[id].reach ?? 0) : ORGANISMS[id].extent;

function spriteKey(id: ArtId, v: number, c: ArtColors, size: number, full: boolean): string {
  return `${id}|${v}|${c.main}|${c.alt}|${size}${full ? '|full' : ''}`;
}

/** Body art, plus the animated parts frozen at a fixed moment when `full`. */
function artMarkup(id: ArtId, c: ArtColors, v: number, full: boolean, t = 0.35): string {
  const org = ORGANISMS[id];
  if (!full) return org.body(c, v);
  const P = new SvgPainter();
  const a: AnimCtx = { t, seed: 0, speed: 0, low: false, level: 0 };
  org.back?.(P, c, a, v);
  const back = P.out;
  P.out = '';
  org.front?.(P, c, a, v);
  return back + org.body(c, v) + P.out;
}

function load(key: string, id: ArtId, v: number, c: ArtColors, size: number, full: boolean): void {
  if (pending.has(key) || failed.has(key) || !canRasterise()) return;
  pending.add(key);
  const gen = generation;
  const org = ORGANISMS[id];
  const box = boxOf(id, full);
  const svg = svgDocument(artMarkup(id, c, v, full), size, box, !!org.glow);
  const img = new Image();
  img.onload = () => {
    if (gen !== generation) return;
    pending.delete(key);
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    if (!g) { failed.add(key); return; }
    g.drawImage(img, 0, 0, size, size);
    const sprite = { cv, e: Math.round(100 * box), full };
    ready.set(key, sprite);
    anyColour.set(`${id}|${v}`, sprite);
  };
  img.onerror = () => { if (gen === generation) { pending.delete(key); failed.add(key); } };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** Starts rasterising a sprite ahead of time (e.g. while the menu is up). */
export function preloadArt(id: ArtId, c: ArtColors, radius: number, pixelScale: number, v = 0, low = false): void {
  const org = ORGANISMS[id];
  const variant = org.variants ? v % org.variants : 0;
  const full = freezes(id, low);
  const size = bucketFor(2 * boxOf(id, full) * radius * pixelScale);
  const key = spriteKey(id, variant, c, size, full);
  if (!ready.has(key)) load(key, id, variant, c, size, full);
}

const painter = new CanvasPainter();
/** Shared animation context object; the renderer fills it before each draw. */
export const anim: AnimCtx = { t: 0, seed: 0, speed: 0, low: false, level: 0 };

export interface DrawArtOptions {
  /** Draw only the static body (no animated parts). */
  bodyOnly?: boolean;
}

/**
 * Draws an organism centred on the current origin, in the current
 * orientation, scaled so its hit radius equals `radius` world units.
 * Returns false if its sprite isn't ready yet.
 */
export function drawArt(
  ctx: CanvasRenderingContext2D, id: ArtId, v: number, c: ArtColors,
  radius: number, pixelScale: number, opts?: DrawArtOptions,
): boolean {
  const org = ORGANISMS[id];
  const variant = org.variants ? v % org.variants : 0;
  const full = freezes(id, anim.low);
  const size = bucketFor(2 * boxOf(id, full) * radius * pixelScale);
  const key = spriteKey(id, variant, c, size, full);
  let sprite = ready.get(key);
  if (!sprite) {
    load(key, id, variant, c, size, full);
    // A different-size copy is a fine stand-in while the right one loads
    for (const b of BUCKETS) {
      const alt = ready.get(spriteKey(id, variant, c, b, full)) ?? ready.get(spriteKey(id, variant, c, b, !full));
      if (alt) { sprite = alt; break; }
    }
    // Recoloured (colourblind mode, cosmetics, influenza strain shift): keep showing the old colours
    sprite ??= anyColour.get(`${id}|${variant}`);
    if (!sprite) return false;
  }
  // A stand-in may be the other kind: only add live parts to a static body
  const live = !opts?.bodyOnly && !sprite.full;
  const k = radius / 100;
  const e = sprite.e;
  const img = sprite.cv;
  ctx.save();
  ctx.scale(k, k);
  ctx.shadowBlur = 0;
  painter.ctx = ctx;
  if (live && org.back) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    org.back(painter, c, anim, variant);
  }
  ctx.drawImage(img, -e, -e, 2 * e, 2 * e);
  if (live && org.front) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    org.front(painter, c, anim, variant);
  }
  painter.ctx = null;
  ctx.restore();
  return true;
}

/** Whether an organism faces its direction of travel. */
export const isOriented = (id: ArtId): boolean => !!ORGANISMS[id].oriented;

/**
 * Complete standalone SVG (body plus animated parts frozen at time `t`) as a
 * data URL, for menus and the codex.
 */
export function artDataUrl(id: ArtId, c: ArtColors, v = 0, size = 128, t = 0.35): string {
  const inner = artMarkup(id, c, v, true, t);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgDocument(inner, size, boxOf(id, true), !!ORGANISMS[id].glow));
}

/** For tests: forget every cached sprite. */
export function clearArtCache(): void {
  ready.clear();
  anyColour.clear();
  pending.clear();
  failed.clear();
  generation++;
}
