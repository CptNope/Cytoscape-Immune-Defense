/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, Activity, RefreshCw, Play, Trophy } from 'lucide-react';

// --- Types ---

interface Vector {
  x: number;
  y: number;
}

interface Entity {
  pos: Vector;
  vel: Vector;
  radius: number;
  rotation: number;
}

interface Pathogen extends Entity {
  id: number;
  type: 'virus' | 'bacteria' | 'parasite' | 'fungus';
  variant?: 'armored' | 'swift' | 'stalker';
  health: number;
  points: number;
  sides: number;
  noise: number[];
}

interface Antibody extends Entity {
  id: number;
  life: number;
}

interface Particle extends Entity {
  id: number;
  life: number;
  color: string;
  opacity: number;
}

interface PowerUp extends Entity {
  id: number;
  type: 'rapid_fire' | 'shield' | 'damage_boost' | 'bomb';
  life: number;
}

interface FloatingText {
  id: number;
  pos: Vector;
  vel: Vector;
  text: string;
  color: string;
  life: number;
  size: number;
}

// --- Constants ---

const FPS = 60;
const FRICTION = 0.98;
const SHIP_THRUST = 0.15;
const SHIP_TURN_SPEED = 0.08;
const BULLET_SPEED = 7;
const BULLET_LIFE = 60;
const PATHOGEN_MIN_RADIUS = 15;
const PATHOGEN_MAX_RADIUS = 50;
const INITIAL_PATHOGEN_COUNT = 5;

// --- Helper Functions ---

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const distance = (v1: Vector, v2: Vector) => {
  return Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
};

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [health, setHealth] = useState(100);
  const [shake, setShake] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [flash, setFlash] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Game Refs (to avoid re-renders during loop)
  const shipRef = useRef<Entity & { thrusting: boolean; turning: number; lastShot: number }>({
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    radius: 18,
    rotation: -Math.PI / 2,
    thrusting: false,
    turning: 0,
    lastShot: 0
  });

  const pathogensRef = useRef<Pathogen[]>([]);
  const antibodiesRef = useRef<Antibody[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const virtualControlsRef = useRef({
    joystickActive: false,
    joystickAngle: 0,
    joystickDistance: 0,
    fire: false
  });
  const nextIdRef = useRef(0);
  const requestRef = useRef<number>(null);

  const activePowerUpsRef = useRef({
    rapidFire: 0,
    shield: 0,
    damageBoost: 0
  });

  // --- Initialization ---

  const initGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    shipRef.current = {
      pos: { x: canvas.width / 2, y: canvas.height / 2 },
      vel: { x: 0, y: 0 },
      radius: 18,
      rotation: -Math.PI / 2,
      thrusting: false,
      turning: 0,
      lastShot: 0
    };

    pathogensRef.current = [];
    antibodiesRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
    floatingTextsRef.current = [];
    activePowerUpsRef.current = {
      rapidFire: 0,
      shield: 0,
      damageBoost: 0
    };
    setScore(0);
    setHealth(100);
    setLevel(1);
    
    for (let i = 0; i < INITIAL_PATHOGEN_COUNT; i++) {
      spawnPathogen(true);
    }
  };

  const spawnPathogen = (safeZone = false, parent?: Pathogen) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const radius = parent ? parent.radius / 2 : randomRange(PATHOGEN_MIN_RADIUS + 10, PATHOGEN_MAX_RADIUS);
    if (radius < PATHOGEN_MIN_RADIUS) return;

    let pos: Vector;
    if (parent) {
      pos = { ...parent.pos };
    } else {
      do {
        pos = {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height
        };
      } while (safeZone && distance(pos, shipRef.current.pos) < 200);
    }

    const sides = Math.floor(randomRange(6, 12));
    const noise = Array.from({ length: sides }, () => randomRange(0.7, 1.3));

    const roll = Math.random();
    let type: 'virus' | 'bacteria' | 'parasite' | 'fungus';
    let variant: Pathogen['variant'];

    if (radius > 40) type = 'fungus';
    else if (roll < 0.2) type = 'parasite';
    else if (radius > 30) type = 'bacteria';
    else type = 'virus';

    // Assign variants
    const variantRoll = Math.random();
    if (type === 'bacteria' && variantRoll < 0.3) variant = 'armored';
    if (type === 'virus' && variantRoll < 0.3) variant = 'swift';
    if (type === 'parasite' && variantRoll < 0.3) variant = 'stalker';

    pathogensRef.current.push({
      id: nextIdRef.current++,
      pos,
      vel: {
        x: randomRange(-2, 2) * (1 + level * 0.1) * (type === 'parasite' ? 1.5 : 1) * (variant === 'swift' ? 1.8 : variant === 'armored' ? 0.6 : 1),
        y: randomRange(-2, 2) * (1 + level * 0.1) * (type === 'parasite' ? 1.5 : 1) * (variant === 'swift' ? 1.8 : variant === 'armored' ? 0.6 : 1)
      },
      radius,
      rotation: Math.random() * Math.PI * 2,
      type,
      variant,
      health: (radius / 10) * (type === 'fungus' ? 2 : 1) * (variant === 'armored' ? 2.5 : variant === 'swift' ? 0.6 : 1),
      points: Math.floor(100 / radius) * 10 * (type === 'parasite' ? 2 : 1) * (variant ? 1.5 : 1),
      sides: variant === 'swift' ? 16 : 10,
      noise
    });
  };

  const createExplosion = (pos: Vector, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: nextIdRef.current++,
        pos: { ...pos },
        vel: {
          x: randomRange(-3, 3),
          y: randomRange(-3, 3)
        },
        radius: randomRange(1, 4),
        rotation: Math.random() * Math.PI * 2,
        life: randomRange(20, 40),
        color,
        opacity: 1
      });
    }
  };

  const spawnPowerUp = (pos: Vector) => {
    if (Math.random() > 0.15) return; // 15% drop rate

    const types: PowerUp['type'][] = ['rapid_fire', 'shield', 'damage_boost', 'bomb'];
    const type = types[Math.floor(Math.random() * types.length)];

    powerUpsRef.current.push({
      id: nextIdRef.current++,
      pos: { ...pos },
      vel: {
        x: randomRange(-1, 1),
        y: randomRange(-1, 1)
      },
      radius: 12,
      rotation: 0,
      type,
      life: 600 // 10 seconds at 60fps
    });
  };

  const triggerBomb = () => {
    setShake(20);
    pathogensRef.current.forEach(p => {
      createExplosion(p.pos, p.type === 'bacteria' ? '#ef4444' : p.type === 'virus' ? '#f59e0b' : p.type === 'parasite' ? '#a855f7' : '#10b981', 15);
      setScore(s => s + p.points);
    });
    pathogensRef.current = [];
  };

  const spawnFloatingText = (pos: Vector, text: string, color: string, size = 16) => {
    floatingTextsRef.current.push({
      id: nextIdRef.current++,
      pos: { ...pos },
      vel: { x: randomRange(-0.5, 0.5), y: -1 },
      text,
      color,
      life: 60,
      size
    });
  };

  // --- Game Loop ---

  const update = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ship = shipRef.current;

    // 1. Update Ship
    let isThrusting = false;

    if (virtualControlsRef.current.joystickActive) {
      // Point-to-move joystick logic
      const targetAngle = virtualControlsRef.current.joystickAngle;
      let diff = targetAngle - ship.rotation;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      // Smoothly rotate towards joystick direction
      if (Math.abs(diff) > 0.05) {
        ship.rotation += diff * 0.15;
      }

      // Thrust if joystick is pushed far enough
      if (virtualControlsRef.current.joystickDistance > 0.4) {
        ship.vel.x += Math.cos(ship.rotation) * SHIP_THRUST;
        ship.vel.y += Math.sin(ship.rotation) * SHIP_THRUST;
        isThrusting = true;
      }
    } else {
      // Keyboard controls
      if (keysRef.current['ArrowLeft'] || keysRef.current['a']) ship.rotation -= SHIP_TURN_SPEED;
      if (keysRef.current['ArrowRight'] || keysRef.current['d']) ship.rotation += SHIP_TURN_SPEED;
      
      if (keysRef.current['ArrowUp'] || keysRef.current['w']) {
        ship.vel.x += Math.cos(ship.rotation) * SHIP_THRUST;
        ship.vel.y += Math.sin(ship.rotation) * SHIP_THRUST;
        isThrusting = true;
      }
    }

    ship.thrusting = isThrusting;

    if (isThrusting) {
      // Thrust particles
      if (Math.random() > 0.5) {
        particlesRef.current.push({
          id: nextIdRef.current++,
          pos: {
            x: ship.pos.x - Math.cos(ship.rotation) * ship.radius,
            y: ship.pos.y - Math.sin(ship.rotation) * ship.radius
          },
          vel: {
            x: -Math.cos(ship.rotation) * 2 + randomRange(-0.5, 0.5),
            y: -Math.sin(ship.rotation) * 2 + randomRange(-0.5, 0.5)
          },
          radius: randomRange(1, 3),
          rotation: 0,
          life: 20,
          color: '#ffffff',
          opacity: 0.5
        });
      }
    }

    ship.pos.x += ship.vel.x;
    ship.pos.y += ship.vel.y;
    ship.vel.x *= FRICTION;
    ship.vel.y *= FRICTION;

    // Wrap Ship
    if (ship.pos.x < 0) ship.pos.x = canvas.width;
    if (ship.pos.x > canvas.width) ship.pos.x = 0;
    if (ship.pos.y < 0) ship.pos.y = canvas.height;
    if (ship.pos.y > canvas.height) ship.pos.y = 0;

    // Update Power-up timers
    if (activePowerUpsRef.current.rapidFire > 0) activePowerUpsRef.current.rapidFire--;
    if (activePowerUpsRef.current.shield > 0) activePowerUpsRef.current.shield--;
    if (activePowerUpsRef.current.damageBoost > 0) activePowerUpsRef.current.damageBoost--;

    // Shooting
    const shotDelay = activePowerUpsRef.current.rapidFire > 0 ? 80 : 200;
    if ((keysRef.current[' '] || keysRef.current['f'] || virtualControlsRef.current.fire) && Date.now() - ship.lastShot > shotDelay) {
      antibodiesRef.current.push({
        id: nextIdRef.current++,
        pos: {
          x: ship.pos.x + Math.cos(ship.rotation) * ship.radius,
          y: ship.pos.y + Math.sin(ship.rotation) * ship.radius
        },
        vel: {
          x: Math.cos(ship.rotation) * BULLET_SPEED + ship.vel.x,
          y: Math.sin(ship.rotation) * BULLET_SPEED + ship.vel.y
        },
        radius: 3,
        rotation: ship.rotation,
        life: BULLET_LIFE
      });
      ship.lastShot = Date.now();
    }

    // 2. Update Pathogens
    pathogensRef.current.forEach(p => {
      // Unique Behavior: Parasites track the player
      if (p.type === 'parasite') {
        const angleToShip = Math.atan2(ship.pos.y - p.pos.y, ship.pos.x - p.pos.x);
        const accel = p.variant === 'stalker' ? 0.12 : 0.05;
        p.vel.x += Math.cos(angleToShip) * accel;
        p.vel.y += Math.sin(angleToShip) * accel;
        
        // Cap speed
        const speed = Math.sqrt(p.vel.x ** 2 + p.vel.y ** 2);
        const maxSpeed = (3 + level * 0.2) * (p.variant === 'stalker' ? 1.4 : 1);
        if (speed > maxSpeed) {
          p.vel.x = (p.vel.x / speed) * maxSpeed;
          p.vel.y = (p.vel.y / speed) * maxSpeed;
        }
      }

      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;
      p.rotation += p.type === 'fungus' ? 0.005 : 0.01;

      // Wrap
      if (p.pos.x < -p.radius) p.pos.x = canvas.width + p.radius;
      if (p.pos.x > canvas.width + p.radius) p.pos.x = -p.radius;
      if (p.pos.y < -p.radius) p.pos.y = canvas.height + p.radius;
      if (p.pos.y > canvas.height + p.radius) p.pos.y = -p.radius;

      // Collision with Ship
      if (distance(p.pos, ship.pos) < p.radius + ship.radius) {
        if (activePowerUpsRef.current.shield > 0) {
          setShake(5);
          // Bounce pathogen
          const angle = Math.atan2(p.pos.y - ship.pos.y, p.pos.x - ship.pos.x);
          p.vel.x = Math.cos(angle) * 5;
          p.vel.y = Math.sin(angle) * 5;
        } else {
          setHealth(prev => {
            const next = prev - 10;
            if (next <= 0) {
              setGameState('gameover');
              createExplosion(ship.pos, '#ffffff', 30);
            }
            return Math.max(0, next);
          });
          setShake(10);
          setFlash(5);
          // Push away
          const angle = Math.atan2(ship.pos.y - p.pos.y, ship.pos.x - p.pos.x);
          ship.vel.x += Math.cos(angle) * 5;
          ship.vel.y += Math.sin(angle) * 5;
        }
        
        // Damage pathogen too?
        p.health -= 1;
      }
    });

    // 3. Update Antibodies
    antibodiesRef.current = antibodiesRef.current.filter(a => {
      a.pos.x += a.vel.x;
      a.pos.y += a.vel.y;
      a.life--;

      // Wrap
      if (a.pos.x < 0) a.pos.x = canvas.width;
      if (a.pos.x > canvas.width) a.pos.x = 0;
      if (a.pos.y < 0) a.pos.y = canvas.height;
      if (a.pos.y > canvas.height) a.pos.y = 0;

      // Collision with Pathogens
      let hit = false;
      pathogensRef.current.forEach(p => {
        if (!hit && distance(a.pos, p.pos) < p.radius) {
          hit = true;
          
          let damage = activePowerUpsRef.current.damageBoost > 0 ? 2 : 1;
          let resisted = false;

          // Resistance Logic
          if (p.type === 'fungus') {
            damage = 0.5; // Damage reduction
            resisted = true;
          } else if (p.type === 'parasite') {
            const speed = Math.sqrt(a.vel.x ** 2 + a.vel.y ** 2);
            if (speed > 6) {
              damage = 0.3; // High speed resistance
              resisted = true;
            }
          }

          p.health -= damage;
          
          if (resisted) {
            // Visual feedback for resistance (smaller, different color explosion)
            createExplosion(a.pos, '#ffffff', 3);
            if (Math.random() > 0.7) spawnFloatingText(p.pos, 'RESISTED', '#ffffff', 10);
          } else {
            createExplosion(a.pos, '#4ade80', 5);
          }

          if (p.health <= 0) {
            setScore(s => s + p.points);
            spawnFloatingText(p.pos, `+${p.points}`, '#ffffff', 20);
            createExplosion(p.pos, p.type === 'bacteria' ? '#ef4444' : p.type === 'virus' ? '#f59e0b' : p.type === 'parasite' ? '#a855f7' : '#10b981', 15);
            spawnPowerUp(p.pos);
            // Split
            spawnPathogen(false, p);
            spawnPathogen(false, p);
            pathogensRef.current = pathogensRef.current.filter(path => path.id !== p.id);
          }
        }
      });

      return a.life > 0 && !hit;
    });

    // 4. Update Power-ups
    powerUpsRef.current = powerUpsRef.current.filter(p => {
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;
      p.life--;

      // Wrap
      if (p.pos.x < 0) p.pos.x = canvas.width;
      if (p.pos.x > canvas.width) p.pos.x = 0;
      if (p.pos.y < 0) p.pos.y = canvas.height;
      if (p.pos.y > canvas.height) p.pos.y = 0;

      // Collision with Ship
      if (distance(p.pos, ship.pos) < p.radius + ship.radius) {
        if (p.type === 'rapid_fire') {
          activePowerUpsRef.current.rapidFire = 300;
          spawnFloatingText(p.pos, 'RAPID FIRE', '#60a5fa');
        }
        if (p.type === 'shield') {
          activePowerUpsRef.current.shield = 300;
          spawnFloatingText(p.pos, 'SHIELD ACTIVE', '#a855f7');
        }
        if (p.type === 'damage_boost') {
          activePowerUpsRef.current.damageBoost = 300;
          spawnFloatingText(p.pos, 'DAMAGE BOOST', '#fbbf24');
        }
        if (p.type === 'bomb') {
          triggerBomb();
          spawnFloatingText(p.pos, 'SYSTEM PURGE', '#ef4444');
        }
        
        createExplosion(p.pos, '#ffffff', 10);
        return false;
      }

      return p.life > 0;
    });

    // 5. Update Floating Texts
    floatingTextsRef.current = floatingTextsRef.current.filter(t => {
      t.pos.x += t.vel.x;
      t.pos.y += t.vel.y;
      t.life--;
      return t.life > 0;
    });

    // 6. Update Particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;
      p.life--;
      p.opacity = p.life / 40;
      return p.life > 0;
    });

    // 5. Level Progression
    if (pathogensRef.current.length === 0) {
      setLevel(l => l + 1);
      for (let i = 0; i < INITIAL_PATHOGEN_COUNT + level; i++) {
        spawnPathogen(true);
      }
    }

    // 6. Update Shake
    setShake(s => Math.max(0, s * 0.9));
    setFlash(f => Math.max(0, f - 1));
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Power-ups
    powerUpsRef.current.forEach(p => {
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

    // Draw Floating Texts
    floatingTextsRef.current.forEach(t => {
      ctx.save();
      ctx.globalAlpha = t.life / 60;
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px 'JetBrains Mono'`;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.pos.x, t.pos.y);
      ctx.restore();
    });

    // Draw Antibodies
    antibodiesRef.current.forEach(a => {
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

    // Draw Pathogens
    pathogensRef.current.forEach(p => {
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      ctx.rotate(p.rotation);
      
      let color = '#ef4444'; // bacteria
      if (p.type === 'virus') color = '#f59e0b';
      if (p.type === 'parasite') color = '#a855f7'; // purple
      if (p.type === 'fungus') color = '#10b981'; // emerald

      if (p.variant === 'swift') color = '#38bdf8'; // sky blue for swift
      if (p.variant === 'stalker') color = '#ec4899'; // pink for stalker

      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = p.variant ? 20 : 10;
      ctx.fillStyle = `${color}1a`; // 10% opacity
      ctx.lineWidth = p.variant === 'armored' ? 4 : 2;
      
      if (p.type === 'parasite') {
        // Parasite: Elliptical with flagella
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
      } else if (p.type === 'fungus') {
        // Fungus: Spiky/Branching
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
      } else {
        // Standard Virus/Bacteria
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

      // Add some "internal" details
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 0.3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    });

    // Draw Ship (T-Cell)
    if (gameState === 'playing') {
      const ship = shipRef.current;
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
      if (activePowerUpsRef.current.shield > 0) {
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
      if (activePowerUpsRef.current.damageBoost > 0) {
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

    ctx.restore(); // End Shake
  };

  const loop = () => {
    if (gameState === 'playing' && !isPaused) {
      update();
    }
    draw();
    requestRef.current = requestAnimationFrame(loop);
  };

  // --- Effects ---

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const handleKeyDown = (e: KeyboardEvent) => { 
      keysRef.current[e.key] = true; 
      if (e.key === 'Escape' && gameState === 'playing') {
        setIsPaused(prev => !prev);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, level]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score]);

  const startGame = () => {
    initGame();
    setGameState('playing');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block"
        id="game-canvas"
      />

      {/* HUD */}
      <AnimatePresence>
        {gameState === 'playing' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 p-3 rounded-xl">
                <Activity className="w-5 h-5 text-red-500" />
                <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-red-500"
                    animate={{ width: `${health}%` }}
                    transition={{ type: 'spring', bounce: 0 }}
                  />
                </div>
                <span className="font-mono text-sm">{health}%</span>
              </div>
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 p-3 rounded-xl">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="font-mono text-lg font-bold">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl">
                <span className="text-xs uppercase tracking-widest text-white/50 font-semibold">Level</span>
                <div className="font-mono text-2xl font-bold text-center">{level}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu Overlays */}
      <AnimatePresence>
        {gameState === 'playing' && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-20"
          >
            {/* Virtual Joystick (Left) */}
            <div className="absolute bottom-16 left-16 w-32 h-32 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full pointer-events-auto touch-none"
              onPointerDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                const handlePointerMove = (moveEvent: PointerEvent) => {
                  const dx = moveEvent.clientX - centerX;
                  const dy = moveEvent.clientY - centerY;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  const maxDist = rect.width / 2;
                  
                  virtualControlsRef.current.joystickActive = true;
                  virtualControlsRef.current.joystickAngle = Math.atan2(dy, dx);
                  virtualControlsRef.current.joystickDistance = Math.min(dist / maxDist, 1);
                };

                const handlePointerUp = () => {
                  virtualControlsRef.current.joystickActive = false;
                  virtualControlsRef.current.joystickDistance = 0;
                  window.removeEventListener('pointermove', handlePointerMove);
                  window.removeEventListener('pointerup', handlePointerUp);
                };

                window.addEventListener('pointermove', handlePointerMove);
                window.addEventListener('pointerup', handlePointerUp);
                
                // Initial update
                handlePointerMove(e.nativeEvent);
              }}
            >
              <motion.div 
                className="absolute top-1/2 left-1/2 w-12 h-12 bg-white/20 border border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2"
                animate={{
                  x: virtualControlsRef.current.joystickActive ? Math.cos(virtualControlsRef.current.joystickAngle) * virtualControlsRef.current.joystickDistance * 40 : 0,
                  y: virtualControlsRef.current.joystickActive ? Math.sin(virtualControlsRef.current.joystickAngle) * virtualControlsRef.current.joystickDistance * 40 : 0,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
            </div>

            {/* Large Fire Button (Right) */}
            <div className="absolute bottom-16 right-16 pointer-events-auto">
              <button
                onPointerDown={() => { virtualControlsRef.current.fire = true; }}
                onPointerUp={() => { virtualControlsRef.current.fire = false; }}
                onPointerLeave={() => { virtualControlsRef.current.fire = false; }}
                className="w-24 h-24 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 rounded-full flex items-center justify-center active:bg-emerald-500/40 shadow-lg shadow-emerald-500/20 touch-none"
              >
                <Zap className="w-10 h-10 text-emerald-400" />
              </button>
            </div>

            {/* Pause Button for Mobile */}
            <button
              onClick={() => setIsPaused(true)}
              className="absolute top-6 right-24 p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl pointer-events-auto active:bg-white/30"
            >
              <Activity className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {isPaused && gameState === 'playing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-30"
          >
            <div className="text-center space-y-6">
              <h2 className="text-4xl font-black italic uppercase tracking-widest">Protocol Paused</h2>
              <button
                onClick={() => setIsPaused(false)}
                className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-emerald-400 transition-colors"
              >
                RESUME
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'menu' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10"
          >
            <div className="max-w-md w-full p-8 text-center space-y-8">
              <div className="space-y-2">
                <motion.h1 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl font-black tracking-tighter italic uppercase"
                >
                  CYTOSCAPE
                </motion.h1>
                <p className="text-emerald-400 font-mono text-sm tracking-widest uppercase">Immune Defense Protocol</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="text-[10px] uppercase text-white/40 mb-1">Movement</div>
                  <div className="text-sm font-mono">WASD / ARROWS</div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="text-[10px] uppercase text-white/40 mb-1">Fire Antibodies</div>
                  <div className="text-sm font-mono">SPACE / F</div>
                </div>
              </div>

              <button
                onClick={startGame}
                className="group relative w-full py-4 bg-white text-black font-bold rounded-2xl overflow-hidden transition-transform active:scale-95"
              >
                <div className="absolute inset-0 bg-emerald-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative flex items-center justify-center gap-2">
                  <Play className="w-5 h-5 fill-current" />
                  INITIALIZE DEFENSE
                </span>
              </button>

              {highScore > 0 && (
                <div className="text-white/40 font-mono text-sm">
                  HIGHEST BIO-SCORE: {highScore.toLocaleString()}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-red-950/40 backdrop-blur-md z-20"
          >
            <div className="max-w-md w-full p-12 text-center space-y-8 bg-black/80 border border-red-500/30 rounded-[40px] shadow-2xl shadow-red-500/20">
              <div className="space-y-2">
                <h2 className="text-5xl font-black text-red-500 italic uppercase">System Failure</h2>
                <p className="text-white/60 font-mono text-sm">The pathogens have overwhelmed the host.</p>
              </div>

              <div className="py-8 border-y border-white/10">
                <div className="text-xs uppercase text-white/40 mb-2 tracking-widest">Final Score</div>
                <div className="text-6xl font-mono font-bold">{score.toLocaleString()}</div>
              </div>

              <button
                onClick={startGame}
                className="group relative w-full py-4 bg-red-500 text-white font-bold rounded-2xl overflow-hidden transition-transform active:scale-95"
              >
                <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  RETRY PROTOCOL
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vignette & Grain Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      
      {/* Scanlines Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
    </div>
  );
}
