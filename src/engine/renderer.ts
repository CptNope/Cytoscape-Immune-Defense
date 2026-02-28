/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Pathogen, Antibody, Particle, PowerUp, FloatingText, Ship, ActivePowerUps } from './types';
import { randomRange } from './physics';

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
}

export function render(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: RenderState
): void {
  const { ship, pathogens, antibodies, particles, powerUps, floatingTexts, activePowerUps, shake, shakeAngle, flash, gameState } = state;

  // Clear
  ctx.fillStyle = '#0a0505';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw Background Depth (floating RBCs)
  drawBackground(ctx, canvas);

  // Draw Particles
  drawParticles(ctx, particles);

  // Draw Power-ups
  drawPowerUps(ctx, powerUps);

  // Draw Floating Texts
  drawFloatingTexts(ctx, floatingTexts);

  // Draw Antibodies
  drawAntibodies(ctx, antibodies);

  // Draw Pathogens
  drawPathogens(ctx, pathogens);

  // Draw Ship (T-Cell)
  if (gameState === 'playing') {
    drawShip(ctx, ship, activePowerUps);
  }

  ctx.restore(); // End Shake
}

function drawBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#450a0a';
  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    const t = Date.now() * 0.0003;
    const x = ((Math.sin(t + i * 2) * 0.5 + 0.5) * canvas.width + i * 50) % canvas.width;
    const y = ((Math.cos(t * 0.5 + i) * 0.5 + 0.5) * canvas.height + i * 30) % canvas.height;
    ctx.arc(x, y, 30 + (i % 5) * 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
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
  antibodies.forEach(a => {
    ctx.save();
    ctx.translate(a.pos.x, a.pos.y);
    ctx.rotate(a.rotation);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.moveTo(0, -2);
    ctx.lineTo(0, 2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawPathogens(ctx: CanvasRenderingContext2D, pathogens: Pathogen[]): void {
  pathogens.forEach(p => {
    // Draw worm segments first (behind the head)
    if (p.isBoss && p.bossType === 'parasitic_worm' && p.segments) {
      drawWormSegments(ctx, p);
    }
    // Draw bacterial colony segments
    if (p.isBoss && p.bossType === 'bacterial_colony' && p.segments) {
      drawColonySegments(ctx, p);
    }

    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.rotate(p.rotation);

    // Apply prion opacity
    if (p.opacity !== undefined) {
      ctx.globalAlpha = p.opacity;
    }

    let color = '#ef4444'; // bacteria
    if (p.type === 'virus') color = '#f59e0b';
    if (p.type === 'parasite') color = '#a855f7';
    if (p.type === 'fungus') color = '#10b981';
    if (p.type === 'prion') color = '#94a3b8';
    if (p.type === 'cancer') color = '#f472b6';
    if (p.type === 'biofilm') color = '#38bdf8';
    if (p.variant === 'swift') color = '#38bdf8';
    if (p.variant === 'stalker') color = '#ec4899';

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = p.isBoss ? 25 : p.variant ? 20 : 10;
    ctx.fillStyle = `${color}1a`;
    ctx.lineWidth = p.isBoss ? 3 : p.variant === 'armored' ? 4 : 2;

    if (p.type === 'parasite' && !p.isBoss) {
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
    if (p.type !== 'prion') {
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Boss: Mega Virus shield glow
    if (p.isBoss && p.bossType === 'mega_virus' && p.phase === 0) {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#60a5fa';
      ctx.fill();
      ctx.globalAlpha = 1;
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

    // Boss health bar (drawn un-rotated, above the boss)
    if (p.isBoss && p.maxHealth > 0) {
      drawBossHealthBar(ctx, p);
    }
  });
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
    ctx.shadowBlur = 20;
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
  ctx.strokeStyle = '#a855f7';
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 15;
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

function drawColonySegments(ctx: CanvasRenderingContext2D, p: Pathogen): void {
  if (!p.segments) return;
  ctx.save();
  ctx.strokeStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2;

  // Draw connecting membrane
  ctx.beginPath();
  ctx.moveTo(p.segments[0].x, p.segments[0].y);
  for (let i = 1; i < p.segments.length; i++) {
    ctx.lineTo(p.segments[i].x, p.segments[i].y);
  }
  ctx.globalAlpha = 0.3;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Draw each segment as a bacterium
  p.segments.forEach((seg, i) => {
    const segRadius = p.radius * (0.8 + 0.2 * Math.sin(i));
    ctx.beginPath();
    ctx.arc(seg.x, seg.y, segRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ef444415';
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawBossHealthBar(ctx: CanvasRenderingContext2D, p: Pathogen): void {
  const barWidth = Math.max(60, p.radius * 2);
  const barHeight = 6;
  const x = p.pos.x - barWidth / 2;
  const y = p.pos.y - p.radius - 20;
  const healthPct = Math.max(0, p.health / p.maxHealth);

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

  // Health fill
  const healthColor = healthPct > 0.5 ? '#ef4444' : healthPct > 0.25 ? '#f59e0b' : '#dc2626';
  ctx.fillStyle = healthColor;
  ctx.fillRect(x, y, barWidth * healthPct, barHeight);

  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

  // Boss label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.7;
  const label = p.bossType === 'mega_virus' ? 'MEGA VIRUS' :
    p.bossType === 'bacterial_colony' ? 'BACTERIAL COLONY' :
    p.bossType === 'parasitic_worm' ? 'PARASITIC WORM' :
    p.bossType === 'fungal_bloom' ? 'FUNGAL BLOOM' : 'BOSS';
  ctx.fillText(label, p.pos.x, y - 4);
  ctx.globalAlpha = 1;
}

function drawShip(ctx: CanvasRenderingContext2D, ship: Ship, activePowerUps: ActivePowerUps): void {
  ctx.save();
  ctx.translate(ship.pos.x, ship.pos.y);
  ctx.rotate(ship.rotation);

  // Main Body
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 15;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, ship.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();

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
}
