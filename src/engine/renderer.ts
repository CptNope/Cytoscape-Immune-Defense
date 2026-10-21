/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Pathogen, Antibody, Particle, PowerUp, FloatingText, Ship, ActivePowerUps,
  EnemyProjectile, Hazard, LysisEffect, PlayerStatus, CellTypeId, Vector,
} from './types';
import { getAntibodyClass } from './weapons';
import { randomRange } from './physics';

/**
 * Render quality. 'low' disables canvas shadow glows (by far the most
 * expensive operation on mobile GPUs) and thins out the animated background.
 */
export type RenderQuality = 'high' | 'low';
let glowEnabled = true;
let lowDetail = false;
/** Returns the requested shadow blur, or 0 when glow is disabled. */
const glow = (blur: number): number => (glowEnabled ? blur : 0);

/**
 * Colour palettes. The colorblind palette is based on Okabe–Ito, which stays
 * distinguishable for the common forms of colour vision deficiency.
 */
const PALETTE_DEFAULT: Record<string, string> = {
  virus: '#f59e0b', bacteria: '#ef4444', parasite: '#a855f7', fungus: '#10b981',
  prion: '#94a3b8', cancer: '#f472b6', biofilm: '#38bdf8', swift: '#38bdf8', stalker: '#ec4899',
  host_rbc: '#dc2626', decoy_tcell: '#fca5a5', vessel: '#b91c1c',
};
const PALETTE_COLORBLIND: Record<string, string> = {
  virus: '#E69F00', bacteria: '#D55E00', parasite: '#CC79A7', fungus: '#009E73',
  prion: '#BBBBBB', cancer: '#F0E442', biofilm: '#56B4E9', swift: '#0072B2', stalker: '#CC79A7',
  host_rbc: '#D55E00', decoy_tcell: '#F5F5F5', vessel: '#A0522D',
};
let palette = PALETTE_DEFAULT;

/** Readable names for labels. */
const TYPE_LABELS: Record<string, string> = {
  host_rbc: 'Red Blood Cell', decoy_tcell: 'Hijacked T-Cell', vessel: 'Blood Vessel',
};

export interface RenderState {
  ship: Ship;
  pathogens: Pathogen[];
  antibodies: Antibody[];
  particles: Particle[];
  powerUps: PowerUp[];
  floatingTexts: FloatingText[];
  activePowerUps: ActivePowerUps;
  shake: number;
  shakeAngle?: number;
  flash: number;
  gameState: 'menu' | 'playing' | 'gameover';
  shipHealth?: number;
  shipMaxHealth?: number;
  /** World (logical) width/height. Defaults to the canvas size. */
  viewWidth?: number;
  viewHeight?: number;
  /** Backing-store pixels per world unit. Defaults to 1. */
  pixelScale?: number;
  quality?: RenderQuality;
  projectiles?: EnemyProjectile[];
  hazards?: Hazard[];
  lysis?: LysisEffect[];
  status?: PlayerStatus;
  cellType?: CellTypeId;
  membraneColor?: string;
  /** NK escort drones orbiting the player. */
  drones?: Vector[];
  colorblind?: boolean;
}

interface View { width: number; height: number }

export function render(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: RenderState
): void {
  const { ship, pathogens, antibodies, particles, powerUps, floatingTexts, activePowerUps, shake, shakeAngle, flash, gameState } = state;
  const scale = state.pixelScale ?? 1;
  const view: View = {
    width: state.viewWidth ?? canvas.width / scale,
    height: state.viewHeight ?? canvas.height / scale,
  };
  glowEnabled = state.quality !== 'low';
  lowDetail = state.quality === 'low';
  palette = state.colorblind ? PALETTE_COLORBLIND : PALETTE_DEFAULT;

  // Draw everything in world units; the transform maps them to backing pixels.
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  // Clear
  ctx.fillStyle = '#0a0505';
  ctx.fillRect(0, 0, view.width, view.height);

  // Apply Shake (with directional bias)
  ctx.save();
  if (shake > 0) {
    const angle = shakeAngle ?? Math.random() * Math.PI * 2;
    const biasX = Math.cos(angle) * shake * 0.6;
    const biasY = Math.sin(angle) * shake * 0.6;
    ctx.translate(
      biasX + randomRange(-shake * 0.4, shake * 0.4),
      biasY + randomRange(-shake * 0.4, shake * 0.4)
    );
  }

  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 0, 0, ${flash * 0.1})`;
    ctx.fillRect(0, 0, view.width, view.height);
  }

  // Draw Background Depth (floating RBCs)
  drawBackground(ctx, view);

  // Ground-level hazards (spore clouds, telegraphs) go under everything
  if (state.hazards) drawHazards(ctx, state.hazards);

  // Draw Particles
  drawParticles(ctx, particles);
  if (state.lysis) drawLysis(ctx, state.lysis);

  // Draw Power-ups
  drawPowerUps(ctx, powerUps);

  // Draw Floating Texts
  drawFloatingTexts(ctx, floatingTexts);

  // Draw Antibodies
  drawAntibodies(ctx, antibodies);

  // Draw Pathogens
  drawPathogens(ctx, pathogens);

  // Enemy projectiles on top of pathogens so they're always readable
  if (state.projectiles) drawProjectiles(ctx, state.projectiles);

  // Draw Ship (T-Cell)
  if (gameState === 'playing') {
    drawShip(ctx, ship, activePowerUps, state.shipHealth, state.shipMaxHealth, state);
    if (state.drones) drawDrones(ctx, state.drones);
  }

  ctx.restore(); // End Shake
}

function drawBackground(ctx: CanvasRenderingContext2D, canvas: View): void {
  const t = Date.now() * 0.001;

  // Layer 1: Deep plasma current streaks
  ctx.save();
  ctx.globalAlpha = 0.04;
  const streaks = lowDetail ? 3 : 5;
  for (let i = 0; i < streaks; i++) {
    const yBase = (canvas.height * (i + 0.5)) / streaks;
    const waveY = Math.sin(t * 0.3 + i * 1.2) * 40;
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 60 + Math.sin(t * 0.2 + i) * 20;
    ctx.beginPath();
    ctx.moveTo(-20, yBase + waveY);
    ctx.bezierCurveTo(
      canvas.width * 0.3, yBase + waveY + Math.sin(t * 0.4 + i) * 60,
      canvas.width * 0.7, yBase + waveY - Math.sin(t * 0.35 + i) * 50,
      canvas.width + 20, yBase + waveY + Math.cos(t * 0.25 + i) * 30
    );
    ctx.stroke();
  }
  ctx.restore();

  // Layer 2: Far-depth red blood cells (small, faded)
  ctx.save();
  for (let i = 0; i < (lowDetail ? 5 : 12); i++) {
    const speed = 0.15 + (i % 3) * 0.05;
    const x = ((t * speed * 60 + i * 137) % (canvas.width + 60)) - 30;
    const y = ((Math.sin(t * 0.2 + i * 2.3) * 0.3 + 0.5) * canvas.height + i * 67) % canvas.height;
    const size = 12 + (i % 4) * 4;
    const tilt = Math.sin(t * 0.5 + i) * 0.3;
    ctx.globalAlpha = 0.06 + Math.sin(t * 0.3 + i) * 0.015;
    drawRBC(ctx, x, y, size, tilt, '#991b1b');
  }
  ctx.restore();

  // Layer 3: Mid-depth red blood cells (medium, slightly brighter)
  ctx.save();
  for (let i = 0; i < (lowDetail ? 5 : 10); i++) {
    const speed = 0.25 + (i % 3) * 0.08;
    const x = ((t * speed * 50 + i * 193 + 400) % (canvas.width + 80)) - 40;
    const y = ((Math.cos(t * 0.15 + i * 1.7) * 0.35 + 0.5) * canvas.height + i * 89) % canvas.height;
    const size = 20 + (i % 5) * 5;
    const tilt = Math.sin(t * 0.4 + i * 0.7) * 0.4;
    ctx.globalAlpha = 0.09 + Math.sin(t * 0.25 + i) * 0.02;
    drawRBC(ctx, x, y, size, tilt, '#b91c1c');
  }
  ctx.restore();

  // Layer 4: Tiny platelets drifting
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#fbbf24';
  for (let i = 0; i < (lowDetail ? 8 : 20); i++) {
    const px = ((t * 0.12 * 60 + i * 97) % canvas.width);
    const py = ((t * 0.08 * 60 + i * 113 + Math.sin(t + i) * 20) % canvas.height);
    const pr = 2 + (i % 3);
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Draw a biconcave red blood cell shape */
function drawRBC(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tilt: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(1, 0.45); // flatten for perspective

  // Outer disc
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Inner dimple (lighter center for biconcave look)
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = '#450a0a';
  ctx.globalAlpha = (ctx.globalAlpha || 0.1) * 0.5;
  ctx.fill();

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.opacity <= 0) continue;
    ctx.globalAlpha = Math.min(1, p.opacity);
    ctx.fillStyle = p.color;
    if (lowDetail) {
      // Squares are much cheaper than arcs and indistinguishable at this size
      const r = p.radius;
      ctx.fillRect(p.pos.x - r, p.pos.y - r, r * 2, r * 2);
    } else {
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawPowerUps(ctx: CanvasRenderingContext2D, powerUps: PowerUp[]): void {
  powerUps.forEach(p => {
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.rotate(Date.now() * 0.002);

    let color = '#ffffff';
    if (p.type === 'rapid_fire') color = '#60a5fa';
    if (p.type === 'shield') color = '#a855f7';
    if (p.type === 'damage_boost') color = '#fbbf24';
    if (p.type === 'bomb') color = '#ef4444';

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-8, -8, 16, 16);
    ctx.stroke();

    // Icon
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    const icon = p.type === 'rapid_fire' ? '⚡' : p.type === 'shield' ? '🛡️' : p.type === 'damage_boost' ? '🔥' : '💣';
    ctx.fillText(icon, 0, 0);

    ctx.restore();

    // Power-up label
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = color;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    const pLabel = p.type === 'rapid_fire' ? 'Rapid Fire' : p.type === 'shield' ? 'Shield' : p.type === 'damage_boost' ? 'Dmg Boost' : 'Bomb';
    ctx.fillText(pLabel, p.pos.x, p.pos.y + 16);
    ctx.restore();
  });
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]): void {
  texts.forEach(t => {
    ctx.save();
    ctx.globalAlpha = t.life / 60;
    ctx.fillStyle = t.color;
    ctx.font = `bold ${t.size}px 'JetBrains Mono'`;
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.pos.x, t.pos.y);
    ctx.restore();
  });
}

function drawAntibodies(ctx: CanvasRenderingContext2D, antibodies: Antibody[]): void {
  if (antibodies.length === 0) return;
  // Batch every antibody into a single path / single stroke call
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < antibodies.length; i++) {
    const a = antibodies[i];
    const c = Math.cos(a.rotation), s = Math.sin(a.rotation);
    const x = a.pos.x, y = a.pos.y;
    ctx.moveTo(x - 4 * c, y - 4 * s);
    ctx.lineTo(x + 4 * c, y + 4 * s);
    ctx.moveTo(x + 2 * s, y - 2 * c);
    ctx.lineTo(x - 2 * s, y + 2 * c);
  }
  ctx.stroke();
}

function drawPathogens(ctx: CanvasRenderingContext2D, pathogens: Pathogen[]): void {
  // Draw trails first (behind everything)
  pathogens.forEach(p => {
    if (!lowDetail && (p.variant === 'swift' || p.type === 'prion')) {
      const spd = Math.sqrt(p.vel.x * p.vel.x + p.vel.y * p.vel.y);
      if (spd > 0.5) {
        const trailColor = p.type === 'prion' ? '#94a3b8' : '#38bdf8';
        const trailLen = Math.min(5, Math.floor(spd));
        ctx.save();
        for (let t = 1; t <= trailLen; t++) {
          const alpha = 0.08 * (1 - t / (trailLen + 1));
          ctx.globalAlpha = alpha;
          ctx.fillStyle = trailColor;
          ctx.beginPath();
          ctx.arc(
            p.pos.x - p.vel.x * t * 2,
            p.pos.y - p.vel.y * t * 2,
            p.radius * (1 - t * 0.1),
            0, Math.PI * 2
          );
          ctx.fill();
        }
        ctx.restore();
      }
    }
  });

  // Connective tissue: colony membrane, hyphae, blood vessels (behind bodies)
  drawBossLinks(ctx, pathogens);

  pathogens.forEach(p => {
    // Draw worm segments first (behind the head)
    if (p.isBoss && p.bossType === 'parasitic_worm' && p.segments) {
      drawWormSegments(ctx, p);
    }
    if (p.hidden) return;

    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.rotate(p.rotation);

    // Apply prion opacity
    if (p.opacity !== undefined) {
      ctx.globalAlpha = p.opacity;
    }

    const color = pathogenColor(p);

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow(p.isBoss ? 25 : p.variant ? 20 : 10);
    ctx.fillStyle = `${color}1a`;
    ctx.lineWidth = p.isBoss ? 3 : p.variant === 'armored' ? 4 : 2;

    if (p.type === 'host_rbc') {
      drawHostCell(ctx, p, pathogens);
      ctx.restore();
      return;
    } else if (p.type === 'decoy_tcell') {
      drawRogueTCell(ctx, p, color);
    } else if (p.type === 'vessel') {
      drawVessel(ctx, p, color);
    } else if (p.isBoss && p.bossType === 'parasitic_worm') {
      drawWormHead(ctx, p);
    } else if (p.isBoss && p.bossType === 'plasmodium') {
      drawPlasmodium(ctx, p);
    } else if (p.isBoss && p.bossType === 'retrovirus') {
      drawSpikedVirus(ctx, p, '#f0abfc', 14);
    } else if (p.isBoss && p.bossType === 'influenza') {
      drawSpikedVirus(ctx, p, getAntibodyClass(p.resistClass).color, 18);
    } else if (p.type === 'parasite' && !p.isBoss) {
      drawParasite(ctx, p, color);
    } else if (p.type === 'fungus') {
      drawFungus(ctx, p);
    } else if (p.type === 'prion') {
      drawPrion(ctx, p);
    } else if (p.type === 'cancer') {
      drawCancer(ctx, p);
    } else if (p.type === 'biofilm') {
      drawBiofilm(ctx, p);
    } else {
      drawStandardPathogen(ctx, p);
    }

    // Internal details (skip for prion — too small)
    if (p.type !== 'prion' && p.type !== 'decoy_tcell' && p.type !== 'vessel') {
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Any shielded/invulnerable target gets a visible shield
    if (p.invulnerable) {
      const latent = p.isBoss && p.bossType === 'retrovirus';
      ctx.strokeStyle = latent ? '#94a3b8' : '#60a5fa';
      ctx.lineWidth = 3;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = glow(25);
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = latent ? 0.25 : 0.12;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Mega Virus charging its virion ring
    if (p.isBoss && p.boss?.data.charging) {
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(Date.now() * 0.03);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Armoured (fed) bosses: thick dashed outer ring
    if (p.isBoss && (p.boss?.data.armor ?? 1) < 1) {
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Opsonized: tagged for destruction
    if (p.marked && p.marked > 0) {
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.8;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Hit flash
    if (p.hitFlash && p.hitFlash > 0) {
      ctx.save();
      ctx.shadowBlur = 0;
      // Big targets flash softly so sustained fire doesn't wash them out
      ctx.globalAlpha = (p.hitFlash / 8) * (p.radius > 30 ? 0.3 : 0.75);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Boss: Fungal Bloom pulsing aura
    if (p.isBoss && p.bossType === 'fungal_bloom') {
      const pulse = Math.sin(Date.now() * 0.004) * 0.15 + 0.15;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  });

  // Type labels in one batched pass: font/alignment are set once instead of
  // once per pathogen, and the label string is built once per pathogen.
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  for (let i = 0; i < pathogens.length; i++) {
    const p = pathogens[i];
    if (p.isBoss || p.hidden) continue;
    if (p.label === undefined) {
      const typeName = TYPE_LABELS[p.type] ?? (p.type.charAt(0).toUpperCase() + p.type.slice(1));
      p.label = typeName + (p.variant ? ` (${p.variant})` : '');
    }
    ctx.fillStyle = pathogenColor(p);
    ctx.fillText(p.label, p.pos.x, p.pos.y + p.radius + 12);
  }
  ctx.restore();
}

const BOSS_COLORS: Record<string, string> = {
  plasmodium: '#c084fc', retrovirus: '#e879f9', influenza: '#60a5fa', autoimmune: '#f87171',
};

function pathogenColor(p: Pathogen): string {
  if (p.isBoss && p.bossType && BOSS_COLORS[p.bossType] && !(palette === PALETTE_COLORBLIND)) return BOSS_COLORS[p.bossType];
  if (p.variant === 'swift') return palette.swift;
  if (p.variant === 'stalker') return palette.stalker;
  return palette[p.type] ?? palette.bacteria;
}

function drawParasite(ctx: CanvasRenderingContext2D, p: Pathogen, _color: string): void {
  ctx.beginPath();
  ctx.ellipse(0, 0, p.radius, p.radius * 0.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();

  // Flagella
  const flagellaCount = p.variant === 'stalker' ? 3 : 1;
  for (let j = 0; j < flagellaCount; j++) {
    ctx.save();
    ctx.rotate((j - (flagellaCount - 1) / 2) * 0.3);
    ctx.beginPath();
    ctx.moveTo(-p.radius, 0);
    const offset = Math.sin(Date.now() * 0.01 + j) * 10;
    ctx.bezierCurveTo(-p.radius - 20, -10 + offset, -p.radius - 10, 10 + offset, -p.radius - (p.variant === 'stalker' ? 50 : 30), offset);
    ctx.stroke();
    ctx.restore();
  }
}

function drawFungus(ctx: CanvasRenderingContext2D, p: Pathogen): void {
  ctx.beginPath();
  for (let i = 0; i < p.sides; i++) {
    const angle = (i / p.sides) * Math.PI * 2;
    const r = p.radius * p.noise[i];
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    // Add "spores" or branches
    const bx = Math.cos(angle) * (r + 10);
    const by = Math.sin(angle) * (r + 10);
    ctx.moveTo(x, y);
    ctx.lineTo(bx, by);
    ctx.arc(bx, by, 2, 0, Math.PI * 2);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
}

function drawStandardPathogen(ctx: CanvasRenderingContext2D, p: Pathogen): void {
  ctx.beginPath();
  for (let i = 0; i < p.sides; i++) {
    const angle = (i / p.sides) * Math.PI * 2;
    const r = p.radius * p.noise[i];
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fill();

  if (p.variant === 'armored') {
    ctx.beginPath();
    for (let i = 0; i < p.sides; i++) {
      const angle = (i / p.sides) * Math.PI * 2;
      const r = (p.radius - 8) * p.noise[i];
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
}

function drawPrion(ctx: CanvasRenderingContext2D, p: Pathogen): void {
  // Tiny jagged shape — nearly invisible
  ctx.beginPath();
  for (let i = 0; i < p.sides; i++) {
    const angle = (i / p.sides) * Math.PI * 2;
    const r = p.radius * (p.noise[i] ?? 1);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
}

function drawCancer(ctx: CanvasRenderingContext2D, p: Pathogen): void {
  // Blobby irregular shape that looks organic/tumorous
  ctx.beginPath();
  for (let i = 0; i < p.sides; i++) {
    const angle = (i / p.sides) * Math.PI * 2;
    const wobble = Math.sin(Date.now() * 0.002 + i * 0.7) * 3;
    const r = (p.radius + wobble) * (p.noise[i] ?? 1);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = '#f472b620';
  ctx.fill();

  // Inner dividing cells (mitosis look)
  ctx.beginPath();
  ctx.arc(-p.radius * 0.2, 0, p.radius * 0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(p.radius * 0.2, 0, p.radius * 0.25, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBiofilm(ctx: CanvasRenderingContext2D, p: Pathogen): void {
  const hasShield = (p.shieldHealth ?? 0) > 0;

  // Outer shield layer
  if (hasShield) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = glow(20);
    ctx.globalAlpha = 0.4 + (p.shieldHealth! / (p.maxShieldHealth ?? 1)) * 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.restore();
  }

  // Inner bacteria cluster
  const innerColor = hasShield ? '#ef444480' : '#ef4444';
  ctx.strokeStyle = innerColor;
  ctx.fillStyle = hasShield ? '#ef444410' : '#ef444420';

  // Draw several small bacteria shapes inside
  const clusterCount = 5;
  for (let i = 0; i < clusterCount; i++) {
    const angle = (i / clusterCount) * Math.PI * 2;
    const dist = p.radius * 0.35;
    const cx = Math.cos(angle) * dist;
    const cy = Math.sin(angle) * dist;
    const r = p.radius * 0.25;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();
  }
  // Central bacteria
  ctx.beginPath();
  ctx.arc(0, 0, p.radius * 0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
}

function drawWormSegments(ctx: CanvasRenderingContext2D, p: Pathogen): void {
  if (!p.segments) return;
  ctx.save();
  if (p.hidden) {
    // Burrowed: only a disturbance in the tissue is visible
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#7e22ce';
    for (let i = 0; i < p.segments.length; i += 2) {
      ctx.beginPath();
      ctx.arc(p.segments[i].x, p.segments[i].y, p.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  ctx.strokeStyle = '#a855f7';
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = glow(15);
  ctx.lineWidth = 2;

  // Draw segments from tail to head
  for (let i = p.segments.length - 1; i >= 1; i--) {
    const seg = p.segments[i];
    const segRadius = p.radius * (0.5 + 0.5 * (1 - i / p.segments.length));
    ctx.beginPath();
    ctx.arc(seg.x, seg.y, segRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(168, 85, 247, ${0.1 + 0.05 * (p.segments.length - i)})`;
    ctx.fill();
    ctx.stroke();
  }

  // Connect segments with lines
  ctx.beginPath();
  ctx.moveTo(p.segments[0].x, p.segments[0].y);
  for (let i = 1; i < p.segments.length; i++) {
    ctx.lineTo(p.segments[i].x, p.segments[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

const CELL_LABELS: Record<string, string> = {
  killer_t: 'T-Cell', macrophage: 'Macrophage', nk_cell: 'NK Cell', plasma_b: 'B-Cell',
};

function drawShip(
  ctx: CanvasRenderingContext2D, ship: Ship, activePowerUps: ActivePowerUps,
  shipHealth: number | undefined, shipMaxHealth: number | undefined, state: RenderState,
): void {
  const healthPct = (shipHealth !== undefined && shipMaxHealth) ? shipHealth / shipMaxHealth : 1;
  const isLow = healthPct <= 0.3;
  const isCritical = healthPct <= 0.15;
  const status = state.status;
  const membrane = state.membraneColor ?? '#ffffff';
  const cell = state.cellType ?? 'killer_t';

  // Blink while invulnerable after a hit
  if (status && status.iframes > 0 && Math.floor(status.iframes / 4) % 2 === 0) return;
  // Flickering at low health
  if (isLow && Math.random() < (isCritical ? 0.3 : 0.1)) return;

  // Ability visuals
  if (ship.engulfT && ship.engulfT > 0) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(ship.pos.x, ship.pos.y, ship.radius * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  if (ship.dashT && ship.dashT > 0) {
    ctx.save();
    ctx.strokeStyle = '#93c5fd';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = ship.radius;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ship.pos.x, ship.pos.y);
    ctx.lineTo(ship.pos.x - ship.vel.x * 5, ship.pos.y - ship.vel.y * 5);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(ship.pos.x, ship.pos.y);
  ctx.rotate(ship.rotation);

  // Status effects
  if (status && status.slowed > 0) {
    ctx.strokeStyle = '#6ee7b7';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, ship.radius + 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  if (status && status.infected > 0) {
    ctx.fillStyle = '#e879f9';
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + Date.now() * 0.002;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * ship.radius * 0.6, Math.sin(a) * ship.radius * 0.6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Warning glow when low health
  if (isLow) {
    const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 0.15;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, ship.radius + 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Main Body (shape depends on the cell type)
  ctx.strokeStyle = isLow ? (isCritical ? '#ef4444' : '#fca5a5') : membrane;
  ctx.shadowColor = isLow ? '#ef4444' : membrane;
  ctx.shadowBlur = glow(15);
  ctx.fillStyle = isLow ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (cell === 'macrophage') {
    // Irregular blob with pseudopods
    const t = Date.now() * 0.003;
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = ship.radius * (1 + 0.12 * Math.sin(a * 3 + t) + 0.06 * Math.sin(a * 5 - t));
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  } else if (cell === 'nk_cell') {
    // Streamlined, slightly elongated
    ctx.ellipse(0, 0, ship.radius * 1.15, ship.radius * 0.85, 0, 0, Math.PI * 2);
  } else {
    ctx.arc(0, 0, ship.radius, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.fill();

  if (cell === 'plasma_b') {
    // Rough endoplasmic reticulum: concentric arcs (antibody factory)
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    for (let r = 0.55; r <= 0.85; r += 0.15) {
      ctx.beginPath();
      ctx.arc(0, 0, ship.radius * r, 0.4, Math.PI * 2 - 0.4);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (cell === 'nk_cell') {
    // Cytotoxic granules
    ctx.save();
    ctx.fillStyle = membrane;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 5; i++) {
      const a = i * 1.25;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * ship.radius * 0.6, Math.sin(a) * ship.radius * 0.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Crack lines when damaged (below 60% health)
  if (healthPct < 0.6) {
    ctx.save();
    ctx.strokeStyle = isLow ? '#ef4444' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    const crackCount = healthPct < 0.3 ? 5 : healthPct < 0.5 ? 3 : 1;
    for (let c = 0; c < crackCount; c++) {
      const angle = (c * 1.7 + 0.5);
      const startR = ship.radius * 0.3;
      const endR = ship.radius * (0.7 + c * 0.06);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * startR, Math.sin(angle) * startR);
      // Jagged crack
      const mid1R = startR + (endR - startR) * 0.4;
      const mid2R = startR + (endR - startR) * 0.7;
      ctx.lineTo(Math.cos(angle + 0.15) * mid1R, Math.sin(angle + 0.15) * mid1R);
      ctx.lineTo(Math.cos(angle - 0.1) * mid2R, Math.sin(angle - 0.1) * mid2R);
      ctx.lineTo(Math.cos(angle + 0.05) * endR, Math.sin(angle + 0.05) * endR);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Nucleus
  ctx.beginPath();
  ctx.arc(-2, 0, ship.radius * 0.4, 0, Math.PI * 2);
  ctx.stroke();

  // Receptors (Villi)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x1 = Math.cos(angle) * ship.radius;
    const y1 = Math.sin(angle) * ship.radius;
    const x2 = Math.cos(angle) * (ship.radius + 5);
    const y2 = Math.sin(angle) * (ship.radius + 5);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Shield effect
  if (activePowerUps.shield > 0) {
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, ship.radius + 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#a855f7';
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // Damage boost effect
  if (activePowerUps.damageBoost > 0) {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, ship.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Thrust flame
  if (ship.thrusting) {
    ctx.strokeStyle = '#60a5fa';
    ctx.beginPath();
    ctx.moveTo(-ship.radius, -5);
    ctx.lineTo(-ship.radius - 15, 0);
    ctx.lineTo(-ship.radius, 5);
    ctx.stroke();
  }

  ctx.restore();

  // "T-Cell" label below ship
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = isLow ? '#ef4444' : '#ffffff';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(CELL_LABELS[cell] ?? 'T-Cell', ship.pos.x, ship.pos.y + ship.radius + 14);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Boss-fight entities, enemy attacks and effects
// ---------------------------------------------------------------------------

/** Membranes between a boss and its parts (colony chain, hyphae, blood vessels). */
function drawBossLinks(ctx: CanvasRenderingContext2D, pathogens: Pathogen[]): void {
  let byId: Map<number, Pathogen> | null = null;
  for (let i = 0; i < pathogens.length; i++) {
    const boss = pathogens[i];
    if (!boss.isBoss || !boss.boss || boss.boss.parts.length === 0) continue;
    if (boss.bossType === 'plasmodium') continue; // host cells aren't attached
    if (!byId) {
      byId = new Map();
      for (const q of pathogens) byId.set(q.id, q);
    }
    const color = pathogenColor(boss);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35;
    if (boss.bossType === 'metastatic_tumor') {
      ctx.lineWidth = 6;
      ctx.strokeStyle = palette.vessel;
      ctx.globalAlpha = 0.5;
    } else if (boss.bossType === 'fungal_bloom') {
      ctx.lineWidth = 3;
    } else {
      ctx.lineWidth = 5;
    }
    ctx.beginPath();
    let prev = boss.pos;
    for (const id of boss.boss.parts) {
      const part = byId.get(id);
      if (!part || part.dead) {
        if (boss.bossType === 'bacterial_colony') break; // chain is broken here
        continue;
      }
      if (boss.bossType === 'bacterial_colony') {
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(part.pos.x, part.pos.y);
        prev = part.pos;
      } else {
        // Wavy hypha / vessel from the core out to the part
        const mx = (boss.pos.x + part.pos.x) / 2 + Math.sin(Date.now() * 0.002 + id) * 12;
        const my = (boss.pos.y + part.pos.y) / 2 + Math.cos(Date.now() * 0.002 + id) * 12;
        ctx.moveTo(boss.pos.x, boss.pos.y);
        ctx.quadraticCurveTo(mx, my, part.pos.x, part.pos.y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** Red blood cell; the one hiding Plasmodium shows a faint ring-stage pulse. */
function drawHostCell(ctx: CanvasRenderingContext2D, p: Pathogen, pathogens: Pathogen[]): void {
  const color = palette.host_rbc;
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.radius, p.radius * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#450a0a';
  ctx.beginPath();
  ctx.ellipse(0, 0, p.radius * 0.45, p.radius * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (p.hitFlash && p.hitFlash > 0) {
    ctx.globalAlpha = p.hitFlash / 8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, p.radius, p.radius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Is this the infected one?
  const owner = pathogens.find(q => q.id === p.ownerId);
  if (owner?.boss && owner.boss.data.hostId === p.id && owner.hidden) {
    if (owner.boss.data.tell) {
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(p.radius * 0.15, -p.radius * 0.1, p.radius * 0.3, 0.3, Math.PI * 1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.radius * 0.15 + p.radius * 0.3 * Math.cos(0.3), -p.radius * 0.1 + p.radius * 0.3 * Math.sin(0.3), 2, 0, Math.PI * 2);
      ctx.fillStyle = '#c084fc';
      ctx.fill();
    }
    // Rupture progress: cracks
    const hits = owner.boss.data.hits ?? 0;
    if (hits > 0) {
      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < hits; i++) {
        const a = i * 2.1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * p.radius * 0.4, Math.sin(a) * p.radius * 0.35);
        ctx.lineTo(Math.cos(a + 0.2) * p.radius * 0.95, Math.sin(a + 0.2) * p.radius * 0.8);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** Hijacked / autoimmune T-cell: a red-tinted copy of the player. */
function drawRogueTCell(ctx: CanvasRenderingContext2D, p: Pathogen, color: string): void {
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-2, 0, p.radius * 0.4, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * p.radius, Math.sin(a) * p.radius);
    ctx.lineTo(Math.cos(a) * (p.radius + (p.isBoss ? 8 : 5)), Math.sin(a) * (p.radius + (p.isBoss ? 8 : 5)));
    ctx.stroke();
  }
  if (p.isBoss) {
    // Angry nucleus
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.4 + 0.2 * Math.sin(Date.now() * 0.01);
    ctx.beginPath();
    ctx.arc(-2, 0, p.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawVessel(ctx: CanvasRenderingContext2D, p: Pathogen, color: string): void {
  ctx.fillStyle = `${color}55`;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Pulsing lumen
  const pulse = 0.5 + 0.2 * Math.sin(Date.now() * 0.008 + p.id);
  ctx.beginPath();
  ctx.arc(0, 0, p.radius * pulse, 0, Math.PI * 2);
  ctx.stroke();
}

/** Helminth head: rounded scolex with hooks facing the direction of travel. */
function drawWormHead(ctx: CanvasRenderingContext2D, p: Pathogen): void {
  ctx.rotate(Math.atan2(p.vel.y, p.vel.x) - p.rotation);
  ctx.beginPath();
  ctx.ellipse(0, 0, p.radius * 1.15, p.radius, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
  // Hooks
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    const a = i * 0.35;
    const x = Math.cos(a) * p.radius * 1.1;
    const y = Math.sin(a) * p.radius;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 9, y, x + 7, y + (i >= 0 ? 6 : -6));
    ctx.stroke();
  }
  // Suckers
  ctx.beginPath();
  ctx.arc(p.radius * 0.3, -p.radius * 0.4, 4, 0, Math.PI * 2);
  ctx.moveTo(p.radius * 0.3 + 4, p.radius * 0.4);
  ctx.arc(p.radius * 0.3, p.radius * 0.4, 4, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPlasmodium(ctx: CanvasRenderingContext2D, p: Pathogen): void {
  // Amoeboid trophozoite with merozoite nuclei inside
  const t = Date.now() * 0.004;
  ctx.beginPath();
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const r = p.radius * (1 + 0.15 * Math.sin(a * 4 + t));
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.fillStyle = '#e9d5ff';
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * p.radius * 0.5, Math.sin(a) * p.radius * 0.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Enveloped virus with surface spike proteins (retrovirus, influenza). */
function drawSpikedVirus(ctx: CanvasRenderingContext2D, p: Pathogen, spikeColor: string, spikes: number): void {
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = spikeColor;
  ctx.fillStyle = spikeColor;
  ctx.lineWidth = 2;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2;
    const x1 = Math.cos(a) * p.radius, y1 = Math.sin(a) * p.radius;
    const x2 = Math.cos(a) * (p.radius + 10), y2 = Math.sin(a) * (p.radius + 10);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x2, y2, i % 2 === 0 ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Genome
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 4;
    const r = p.radius * 0.45 * (i / 24);
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
}

function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: EnemyProjectile[]): void {
  if (projectiles.length === 0) return;
  ctx.save();
  ctx.shadowBlur = glow(8);
  for (let i = 0; i < projectiles.length; i++) {
    const p = projectiles[i];
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.lineWidth = 2;
    const { x, y } = p.pos;
    switch (p.kind) {
      case 'spike':
      case 'enemy_antibody': {
        const a = Math.atan2(p.vel.y, p.vel.x);
        const c = Math.cos(a), s = Math.sin(a);
        ctx.beginPath();
        if (p.kind === 'spike') {
          ctx.moveTo(x + c * 8, y + s * 8);
          ctx.lineTo(x - c * 5 + s * 4, y - s * 5 - c * 4);
          ctx.lineTo(x - c * 5 - s * 4, y - s * 5 + c * 4);
          ctx.closePath();
          ctx.fill();
        } else {
          // Y-shaped antibody pointing at you
          ctx.moveTo(x - c * 6, y - s * 6);
          ctx.lineTo(x, y);
          ctx.lineTo(x + c * 5 + s * 4, y + s * 5 - c * 4);
          ctx.moveTo(x, y);
          ctx.lineTo(x + c * 5 - s * 4, y + s * 5 + c * 4);
          ctx.stroke();
        }
        break;
      }
      case 'virion': {
        ctx.beginPath();
        ctx.arc(x, y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = p.rotation + (k / 6) * Math.PI * 2;
          ctx.moveTo(x + Math.cos(a) * p.radius, y + Math.sin(a) * p.radius);
          ctx.lineTo(x + Math.cos(a) * (p.radius + 3), y + Math.sin(a) * (p.radius + 3));
        }
        ctx.stroke();
        break;
      }
      case 'merozoite': {
        const a = Math.atan2(p.vel.y, p.vel.x);
        ctx.beginPath();
        ctx.ellipse(x, y, p.radius + 1, p.radius * 0.6, a, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      default: {
        // toxin / spore: soft blobs
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(x, y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.restore();
}

function drawHazards(ctx: CanvasRenderingContext2D, hazards: Hazard[]): void {
  for (let i = 0; i < hazards.length; i++) {
    const h = hazards[i];
    const t = 1 - h.life / h.maxLife;
    ctx.save();
    switch (h.kind) {
      case 'spore_cloud': {
        const grow = t < 0.15 ? t / 0.15 : 1;
        const fade = h.life < 60 ? h.life / 60 : 1;
        ctx.globalAlpha = 0.22 * fade;
        ctx.fillStyle = h.color;
        ctx.beginPath();
        ctx.arc(h.pos.x, h.pos.y, h.radius * grow, 0, Math.PI * 2);
        ctx.fill();
        if (!lowDetail) {
          ctx.globalAlpha = 0.35 * fade;
          for (let k = 0; k < 7; k++) {
            const a = k * 0.9 + t * 4;
            const r = h.radius * grow * (0.3 + 0.1 * k);
            ctx.beginPath();
            ctx.arc(h.pos.x + Math.cos(a) * r, h.pos.y + Math.sin(a) * r, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }
      case 'telegraph_circle': {
        ctx.strokeStyle = h.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4 + 0.4 * Math.abs(Math.sin(t * 12));
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = h.color;
        ctx.beginPath();
        ctx.arc(h.pos.x, h.pos.y, h.radius * t, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'telegraph_line': {
        if (!h.to) break;
        ctx.strokeStyle = h.color;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.12 + 0.2 * t;
        ctx.lineWidth = h.radius * 2;
        ctx.beginPath();
        ctx.moveTo(h.pos.x, h.pos.y);
        ctx.lineTo(h.to.x, h.to.y);
        ctx.stroke();
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        break;
      }
      case 'inflammation_ring': {
        const gap = h.gap ?? 0.5;
        const ang = h.angle ?? 0;
        ctx.strokeStyle = h.color;
        ctx.shadowColor = h.color;
        ctx.shadowBlur = glow(12);
        ctx.lineWidth = 6;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(h.pos.x, h.pos.y, h.radius, ang + gap, ang - gap + Math.PI * 2);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }
}

function drawLysis(ctx: CanvasRenderingContext2D, effects: LysisEffect[]): void {
  if (effects.length === 0) return;
  ctx.save();
  ctx.lineWidth = 2;
  for (let i = 0; i < effects.length; i++) {
    const e = effects[i];
    ctx.globalAlpha = (e.life / e.maxLife) * 0.8;
    ctx.strokeStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
    ctx.stroke();
    if (!lowDetail) {
      // Membrane fragments flying off
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = k * 1.047 + e.maxRadius;
        const r = e.radius * 1.15;
        ctx.moveTo(e.pos.x + Math.cos(a) * r, e.pos.y + Math.sin(a) * r);
        ctx.lineTo(e.pos.x + Math.cos(a + 0.25) * r, e.pos.y + Math.sin(a + 0.25) * r);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawDrones(ctx: CanvasRenderingContext2D, drones: Vector[]): void {
  ctx.save();
  ctx.strokeStyle = '#93c5fd';
  ctx.fillStyle = 'rgba(147, 197, 253, 0.2)';
  ctx.shadowColor = '#93c5fd';
  ctx.shadowBlur = glow(8);
  ctx.lineWidth = 1.5;
  for (const d of drones) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
