/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A tiny drawing interface with two back ends:
 *
 * - {@link CanvasPainter} draws straight onto the game canvas every frame
 *   (animated parts such as flagella and membranes). One instance is reused,
 *   so drawing allocates nothing.
 * - {@link SvgPainter} records the same calls as SVG markup, so the animated
 *   parts can be frozen into the static art used by menus and the codex.
 *
 * All art is authored in "art units": the organism's hit radius is 100.
 */
export interface Painter {
  begin(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadTo(cx: number, cy: number, x: number, y: number): void;
  curveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  /** A full circle as its own sub-path. */
  circle(x: number, y: number, r: number): void;
  /** A full axis-aligned ellipse as its own sub-path. */
  ellipse(x: number, y: number, rx: number, ry: number): void;
  close(): void;
  stroke(color: string, width: number, alpha?: number): void;
  fill(color: string, alpha?: number): void;
}

const fmt = (n: number): string => (Math.round(n * 10) / 10).toString();

export class CanvasPainter implements Painter {
  ctx: CanvasRenderingContext2D | null = null;

  begin(): void { this.ctx!.beginPath(); }
  moveTo(x: number, y: number): void { this.ctx!.moveTo(x, y); }
  lineTo(x: number, y: number): void { this.ctx!.lineTo(x, y); }
  quadTo(cx: number, cy: number, x: number, y: number): void { this.ctx!.quadraticCurveTo(cx, cy, x, y); }
  curveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    this.ctx!.bezierCurveTo(c1x, c1y, c2x, c2y, x, y);
  }
  circle(x: number, y: number, r: number): void {
    const ctx = this.ctx!;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ellipse(x: number, y: number, rx: number, ry: number): void {
    const ctx = this.ctx!;
    ctx.moveTo(x + rx, y);
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  }
  close(): void { this.ctx!.closePath(); }
  stroke(color: string, width: number, alpha = 1): void {
    const ctx = this.ctx!;
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.globalAlpha = prev;
  }
  fill(color: string, alpha = 1): void {
    const ctx = this.ctx!;
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * alpha;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = prev;
  }
}

export class SvgPainter implements Painter {
  out = '';
  private d = '';

  begin(): void { this.d = ''; }
  moveTo(x: number, y: number): void { this.d += `M${fmt(x)} ${fmt(y)}`; }
  lineTo(x: number, y: number): void { this.d += `L${fmt(x)} ${fmt(y)}`; }
  quadTo(cx: number, cy: number, x: number, y: number): void {
    this.d += `Q${fmt(cx)} ${fmt(cy)} ${fmt(x)} ${fmt(y)}`;
  }
  curveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    this.d += `C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(x)} ${fmt(y)}`;
  }
  circle(x: number, y: number, r: number): void { this.ellipse(x, y, r, r); }
  ellipse(x: number, y: number, rx: number, ry: number): void {
    this.d += `M${fmt(x + rx)} ${fmt(y)}A${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(x - rx)} ${fmt(y)}A${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(x + rx)} ${fmt(y)}`;
  }
  close(): void { this.d += 'Z'; }
  stroke(color: string, width: number, alpha = 1): void {
    if (!this.d) return;
    this.out += `<path d="${this.d}" fill="none" stroke="${color}" stroke-width="${fmt(width)}" stroke-opacity="${alpha.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  fill(color: string, alpha = 1): void {
    if (!this.d) return;
    this.out += `<path d="${this.d}" fill="${color}" fill-opacity="${alpha.toFixed(2)}"/>`;
  }
}
