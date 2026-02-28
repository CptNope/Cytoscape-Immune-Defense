/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Activity, RefreshCw, Trophy } from 'lucide-react';
import {
  type Vector, type Pathogen, type Antibody, type Particle, type PowerUp,
  type FloatingText, type ScoreEntry, type Ship, type ActivePowerUps, type VirtualControls,
  type PlayerProfile, type GameModifiers,
  FRICTION, SHIP_TURN_SPEED, BULLET_SPEED, BULLET_LIFE,
  PATHOGEN_MIN_RADIUS, PATHOGEN_MAX_RADIUS, INITIAL_PATHOGEN_COUNT, MAX_PARTICLES,
  POWERUP_DROP_RATE, POWERUP_LIFETIME,
  AUTO_TARGET_STRENGTH, REGEN_INTERVAL, REGEN_AMOUNT,
  CHAIN_REACTION_RADIUS, CHAIN_REACTION_DAMAGE,
  randomRange, distance, circlesCollide, wrapPosition, applyVelocity, applyFriction,
  angleToTarget, speed, clampSpeed,
  loadTopScores, saveTopScore,
  render,
  AudioEngine, haptic, HAPTIC_DAMAGE, HAPTIC_POWERUP, HAPTIC_BOMB, HAPTIC_FIRE,
  loadProfile, awardXp, recordRunStats, computeModifiers,
} from '../engine';
import AudioControls from './AudioControls';
import UpgradeScreen from './UpgradeScreen';
import StatsPanel from './StatsPanel';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [topScores, setTopScores] = useState<ScoreEntry[]>([]);
  const [lastScoreRank, setLastScoreRank] = useState<number | null>(null);
  const [level, setLevel] = useState(1);
  const [health, setHealth] = useState(100);
  const [shake, setShake] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [flash, setFlash] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Progression
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile());
  const [menuView, setMenuView] = useState<'upgrades' | 'stats'>('upgrades');
  const modifiersRef = useRef<GameModifiers>(computeModifiers(loadProfile()));

  // Run tracking
  const runKillsRef = useRef(0);
  const runKillsByTypeRef = useRef<Record<string, number>>({});
  const runStartRef = useRef(0);
  const regenTimerRef = useRef(0);

  // Audio engine (initialized on first user gesture)
  const audioRef = useRef(new AudioEngine());
  const shakeAngleRef = useRef(0);
  const prevThrustingRef = useRef(false);

  // Game Refs (to avoid re-renders during loop)
  const shipRef = useRef<Ship>({
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
  const virtualControlsRef = useRef<VirtualControls>({
    joystickActive: false,
    joystickAngle: 0,
    joystickDistance: 0,
    fire: false
  });
  const nextIdRef = useRef(0);
  const requestRef = useRef<number>(null);

  const activePowerUpsRef = useRef<ActivePowerUps>({
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
    setHealth(modifiersRef.current.maxHealth);
    setLevel(1);

    // Reset run tracking
    runKillsRef.current = 0;
    runKillsByTypeRef.current = {};
    runStartRef.current = Date.now();
    regenTimerRef.current = 0;
    
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
    if (Math.random() > POWERUP_DROP_RATE) return;

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
      life: POWERUP_LIFETIME
    });
  };

  const triggerBomb = () => {
    setShake(20);
    pathogensRef.current.forEach(p => {
      createExplosion(p.pos, p.type === 'bacteria' ? '#ef4444' : p.type === 'virus' ? '#f59e0b' : p.type === 'parasite' ? '#a855f7' : '#10b981', 15);
      setScore(s => s + p.points);
      // Track bomb kills
      runKillsRef.current++;
      runKillsByTypeRef.current[p.type] = (runKillsByTypeRef.current[p.type] || 0) + 1;
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
        ship.vel.x += Math.cos(ship.rotation) * modifiersRef.current.thrustPower;
        ship.vel.y += Math.sin(ship.rotation) * modifiersRef.current.thrustPower;
        isThrusting = true;
      }
    } else {
      // Keyboard controls
      if (keysRef.current['ArrowLeft'] || keysRef.current['a']) ship.rotation -= SHIP_TURN_SPEED;
      if (keysRef.current['ArrowRight'] || keysRef.current['d']) ship.rotation += SHIP_TURN_SPEED;
      
      if (keysRef.current['ArrowUp'] || keysRef.current['w']) {
        ship.vel.x += Math.cos(ship.rotation) * modifiersRef.current.thrustPower;
        ship.vel.y += Math.sin(ship.rotation) * modifiersRef.current.thrustPower;
        isThrusting = true;
      }
    }

    ship.thrusting = isThrusting;

    // Thrust sound start/stop
    if (isThrusting && !prevThrustingRef.current) audioRef.current.startThrust();
    if (!isThrusting && prevThrustingRef.current) audioRef.current.stopThrust();
    prevThrustingRef.current = isThrusting;

    if (isThrusting) {
      // Thrust particles (capped)
      if (Math.random() > 0.5 && particlesRef.current.length < MAX_PARTICLES) {
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

    applyVelocity(ship);
    applyFriction(ship, FRICTION);
    wrapPosition(ship.pos, canvas.width, canvas.height);

    // Update Power-up timers
    const ap = activePowerUpsRef.current;
    if (ap.rapidFire > 0) ap.rapidFire--;
    if (ap.shield > 0) ap.shield--;
    if (ap.damageBoost > 0) ap.damageBoost--;

    // Shooting
    const baseShotDelay = modifiersRef.current.shotDelay;
    const shotDelay = activePowerUpsRef.current.rapidFire > 0 ? Math.max(40, baseShotDelay * 0.4) : baseShotDelay;
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
      audioRef.current.playFire();
      haptic(HAPTIC_FIRE);
    }

    // 2. Update Pathogens
    pathogensRef.current.forEach(p => {
      // Unique Behavior: Parasites track the player
      if (p.type === 'parasite') {
        const angle = angleToTarget(p.pos, ship.pos);
        const accel = p.variant === 'stalker' ? 0.12 : 0.05;
        p.vel.x += Math.cos(angle) * accel;
        p.vel.y += Math.sin(angle) * accel;
        const maxSpeed = (3 + level * 0.2) * (p.variant === 'stalker' ? 1.4 : 1);
        clampSpeed(p.vel, maxSpeed);
      }

      applyVelocity(p);
      p.rotation += p.type === 'fungus' ? 0.005 : 0.01;
      wrapPosition(p.pos, canvas.width, canvas.height, p.radius);

      // Collision with Ship
      if (circlesCollide(p, ship)) {
        if (activePowerUpsRef.current.shield > 0) {
          setShake(5);
          shakeAngleRef.current = Math.atan2(p.pos.y - ship.pos.y, p.pos.x - ship.pos.x);
          audioRef.current.playShieldBounce();
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
              audioRef.current.playGameOver();
              audioRef.current.stopThrust();
              audioRef.current.stopMusic();
            }
            return Math.max(0, next);
          });
          setShake(10);
          setFlash(5);
          shakeAngleRef.current = Math.atan2(ship.pos.y - p.pos.y, ship.pos.x - p.pos.x);
          audioRef.current.playDamage();
          haptic(HAPTIC_DAMAGE);
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
      applyVelocity(a);
      a.life--;
      wrapPosition(a.pos, canvas.width, canvas.height);

      // Collision with Pathogens
      let hit = false;
      pathogensRef.current.forEach(p => {
        if (!hit && distance(a.pos, p.pos) < p.radius) {
          hit = true;
          
          let damage = modifiersRef.current.bulletDamage * (activePowerUpsRef.current.damageBoost > 0 ? 2 : 1);
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
            const killColor = p.type === 'bacteria' ? '#ef4444' : p.type === 'virus' ? '#f59e0b' : p.type === 'parasite' ? '#a855f7' : '#10b981';
            createExplosion(p.pos, killColor, 15);
            audioRef.current.playExplosion(p.radius > 35 ? 'large' : p.radius > 20 ? 'medium' : 'small');

            // Track kill
            runKillsRef.current++;
            runKillsByTypeRef.current[p.type] = (runKillsByTypeRef.current[p.type] || 0) + 1;

            // Chain reaction: damage nearby pathogens
            if (modifiersRef.current.hasChainReaction) {
              pathogensRef.current.forEach(nearby => {
                if (nearby.id !== p.id && distance(p.pos, nearby.pos) < CHAIN_REACTION_RADIUS) {
                  nearby.health -= CHAIN_REACTION_DAMAGE;
                  createExplosion(nearby.pos, '#fbbf24', 3);
                }
              });
            }

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
      applyVelocity(p);
      p.life--;
      wrapPosition(p.pos, canvas.width, canvas.height);

      // Collision with Ship
      if (circlesCollide(p, ship)) {
        if (p.type === 'rapid_fire') {
          activePowerUpsRef.current.rapidFire = 300;
          spawnFloatingText(p.pos, 'RAPID FIRE', '#60a5fa');
        }
        if (p.type === 'shield') {
          activePowerUpsRef.current.shield = modifiersRef.current.shieldDuration;
          spawnFloatingText(p.pos, 'SHIELD ACTIVE', '#a855f7');
        }
        if (p.type === 'damage_boost') {
          activePowerUpsRef.current.damageBoost = 300;
          spawnFloatingText(p.pos, 'DAMAGE BOOST', '#fbbf24');
        }
        if (p.type === 'bomb') {
          triggerBomb();
          spawnFloatingText(p.pos, 'SYSTEM PURGE', '#ef4444');
          audioRef.current.playBomb();
          haptic(HAPTIC_BOMB);
        }
        
        if (p.type !== 'bomb') audioRef.current.playPowerUp();
        haptic(HAPTIC_POWERUP);
        createExplosion(p.pos, '#ffffff', 10);
        return false;
      }

      return p.life > 0;
    });

    // 5. Update Floating Texts
    floatingTextsRef.current = floatingTextsRef.current.filter(t => {
      applyVelocity(t);
      t.life--;
      return t.life > 0;
    });

    // 6. Update Particles (with cap enforcement)
    particlesRef.current = particlesRef.current.filter(p => {
      applyVelocity(p);
      p.life--;
      p.opacity = p.life / 40;
      return p.life > 0;
    });
    if (particlesRef.current.length > MAX_PARTICLES) {
      particlesRef.current = particlesRef.current.slice(-MAX_PARTICLES);
    }

    // 5. Level Progression
    if (pathogensRef.current.length === 0) {
      setLevel(l => l + 1);
      audioRef.current.playLevelClear();
      for (let i = 0; i < INITIAL_PATHOGEN_COUNT + level; i++) {
        spawnPathogen(true);
      }
    }

    // 7. Cytokine: Auto-targeting antibodies
    if (modifiersRef.current.hasAutoTarget && pathogensRef.current.length > 0) {
      antibodiesRef.current.forEach(a => {
        let closest: Pathogen | null = null;
        let closestDist = Infinity;
        pathogensRef.current.forEach(p => {
          const d = distance(a.pos, p.pos);
          if (d < closestDist) { closestDist = d; closest = p; }
        });
        if (closest && closestDist < 300) {
          const target = angleToTarget(a.pos, (closest as Pathogen).pos);
          const currentAngle = Math.atan2(a.vel.y, a.vel.x);
          let diff = target - currentAngle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          const turn = Math.sign(diff) * Math.min(Math.abs(diff), AUTO_TARGET_STRENGTH);
          const spd = speed(a.vel);
          const newAngle = currentAngle + turn;
          a.vel.x = Math.cos(newAngle) * spd;
          a.vel.y = Math.sin(newAngle) * spd;
        }
      });
    }

    // 8. Cytokine: Regeneration
    if (modifiersRef.current.hasRegeneration) {
      regenTimerRef.current++;
      if (regenTimerRef.current >= REGEN_INTERVAL) {
        regenTimerRef.current = 0;
        setHealth(h => Math.min(modifiersRef.current.maxHealth, h + REGEN_AMOUNT));
      }
    }

    // 9. Update Shake
    setShake(s => Math.max(0, s * 0.9));
    setFlash(f => Math.max(0, f - 1));
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    render(ctx, canvas, {
      ship: shipRef.current,
      pathogens: pathogensRef.current,
      antibodies: antibodiesRef.current,
      particles: particlesRef.current,
      powerUps: powerUpsRef.current,
      floatingTexts: floatingTextsRef.current,
      activePowerUps: activePowerUpsRef.current,
      shake,
      shakeAngle: shakeAngleRef.current,
      flash,
      gameState,
    });
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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => { audioRef.current.dispose(); };
  }, []);

  useEffect(() => {
    setTopScores(loadTopScores());
  }, []);

  useEffect(() => {
    if (gameState === 'gameover' && score > 0) {
      const entry: ScoreEntry = {
        score,
        level,
        date: new Date().toLocaleDateString(),
      };
      const updated = saveTopScore(entry);
      setTopScores(updated);
      const rank = updated.findIndex(s => s.score === score && s.date === entry.date);
      setLastScoreRank(rank >= 0 ? rank : null);

      // Award XP & record run stats
      const timePlayed = Math.round((Date.now() - runStartRef.current) / 1000);
      let p = awardXp(profile, score);
      p = recordRunStats(p, {
        kills: runKillsRef.current,
        killsByType: { ...runKillsByTypeRef.current },
        score,
        level,
        timePlayed,
      });
      setProfile(p);
    }
  }, [gameState]);

  const startGame = () => {
    setLastScoreRank(null);
    // Recompute modifiers from latest profile
    modifiersRef.current = computeModifiers(profile);
    audioRef.current.init();
    initGame();
    setGameState('playing');
    setMenuView('upgrades');
    audioRef.current.startMusic();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block"
        id="game-canvas"
      />

      {/* Audio Controls */}
      {gameState === 'playing' && <AudioControls audio={audioRef.current} />}

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
                    animate={{ width: `${(health / modifiersRef.current.maxHealth) * 100}%` }}
                    transition={{ type: 'spring', bounce: 0 }}
                  />
                </div>
                <span className="font-mono text-sm">{health}/{modifiersRef.current.maxHealth}</span>
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
                aria-label="Fire antibodies"
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
              aria-label="Pause game"
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

        {gameState === 'menu' && menuView === 'upgrades' && (
          <UpgradeScreen
            profile={profile}
            onProfileChange={setProfile}
            onPlay={startGame}
            onShowStats={() => setMenuView('stats')}
          />
        )}

        {gameState === 'menu' && menuView === 'stats' && (
          <StatsPanel
            profile={profile}
            onBack={() => setMenuView('upgrades')}
          />
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

              <div className="py-6 border-y border-white/10 space-y-4">
                <div>
                  <div className="text-xs uppercase text-white/40 mb-2 tracking-widest">Final Score</div>
                  <div className="text-6xl font-mono font-bold">{score.toLocaleString()}</div>
                  {lastScoreRank !== null && lastScoreRank < 3 && (
                    <div className="text-emerald-400 font-mono text-sm mt-1">
                      {lastScoreRank === 0 ? 'NEW #1 RECORD!' : `#${lastScoreRank + 1} ALL TIME`}
                    </div>
                  )}
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                  <div className="text-[10px] uppercase text-yellow-400/60 tracking-widest">XP Earned</div>
                  <div className="font-mono text-2xl font-bold text-yellow-400">+{score.toLocaleString()}</div>
                  <div className="text-[10px] text-white/30 mt-1">Kills: {runKillsRef.current} · Level reached: {level}</div>
                </div>

                {topScores.length > 1 && (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase text-white/30 tracking-widest">Leaderboard</div>
                    {topScores.slice(0, 5).map((s, i) => (
                      <div key={i} className={`flex items-center justify-between font-mono text-xs px-2 py-0.5 rounded ${
                        lastScoreRank === i ? 'bg-emerald-500/10 border border-emerald-500/20' : ''
                      }`}>
                        <span className="text-white/30 w-5">{i + 1}.</span>
                        <span className="text-white font-bold flex-1 text-left pl-1">{s.score.toLocaleString()}</span>
                        <span className="text-white/30">Lv.{s.level}</span>
                        <span className="text-white/20 pl-2 text-[10px]">{s.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setGameState('menu')}
                  className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 font-bold rounded-2xl hover:bg-white/10 transition-colors"
                >
                  UPGRADES
                </button>
                <button
                  onClick={startGame}
                  className="group relative flex-[2] py-4 bg-red-500 text-white font-bold rounded-2xl overflow-hidden transition-transform active:scale-95"
                >
                  <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    RETRY
                  </span>
                </button>
              </div>
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
