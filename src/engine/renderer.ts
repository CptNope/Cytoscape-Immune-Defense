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
  flash: number;
  gameState: 'menu' | 'playing' | 'gameover';
}

export function render(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: RenderState
): void {
  const { ship, pathogens, antibodies, particles, powerUps, floatingTexts, activePowerUps, shake, flash, gameState } = state;

  // Clear
  ctx.fillStyle = '#0a0505';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Apply Shake
  ctx.save();
  if (shake > 0) {
    ctx.translate(randomRange(-shake, shake), randomRange(-shake, shake));
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
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.rotate(p.rotation);

    let color = '#ef4444'; // bacteria
    if (p.type === 'virus') color = '#f59e0b';
    if (p.type === 'parasite') color = '#a855f7';
    if (p.type === 'fungus') color = '#10b981';
    if (p.variant === 'swift') color = '#38bdf8';
    if (p.variant === 'stalker') color = '#ec4899';

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = p.variant ? 20 : 10;
    ctx.fillStyle = `${color}1a`;
    ctx.lineWidth = p.variant === 'armored' ? 4 : 2;

    if (p.type === 'parasite') {
      drawParasite(ctx, p, color);
    } else if (p.type === 'fungus') {
      drawFungus(ctx, p);
    } else {
      drawStandardPathogen(ctx, p);
    }

    // Internal details
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 0.3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
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
