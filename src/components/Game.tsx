/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, RefreshCw, Trophy, Pause, Repeat2, Sparkles } from 'lucide-react';
import {
  type Vector, type Pathogen, type Antibody, type Particle, type PowerUp,
  type FloatingText, type ScoreEntry, type Ship, type ActivePowerUps, type VirtualControls,
  type PlayerProfile, type GameModifiers, type PathogenType, type BossType,
  type GameMode, type CampaignLevel, type RenderQuality, type AntibodyClass,
  type EnemyProjectile, type Hazard, type LysisEffect, type PlayerStatus,
  type GameContext, type MutationId, type RunMutations, type MutationEffects,
  FRICTION, SHIP_TURN_SPEED,
  PATHOGEN_MIN_RADIUS, PATHOGEN_MAX_RADIUS, INITIAL_PATHOGEN_COUNT, MAX_PARTICLES,
  POWERUP_DROP_RATE, POWERUP_LIFETIME,
  AUTO_TARGET_STRENGTH, REGEN_INTERVAL, REGEN_AMOUNT,
  CHAIN_REACTION_RADIUS, CHAIN_REACTION_DAMAGE,
  FEVER_INTERVAL, FEVER_RADIUS, FEVER_DAMAGE, INTERFERON_SLOW,
  PLAYER_IFRAMES, BOMB_BOSS_DAMAGE_FRACTION, BOSS_INTERVAL,
  PRION_RADIUS, PRION_SPEED, PRION_HEALTH, PRION_SWARM_SIZE, PRION_OPACITY, PRION_POINTS, PRION_MIN_LEVEL,
  CANCER_INITIAL_RADIUS, CANCER_MAX_RADIUS, CANCER_GROWTH_RATE, CANCER_SPAWN_INTERVAL,
  CANCER_HEALTH_PER_RADIUS, CANCER_POINTS, CANCER_MIN_LEVEL,
  BIOFILM_RADIUS, BIOFILM_SHIELD_HEALTH, BIOFILM_INNER_HEALTH, BIOFILM_POINTS, BIOFILM_MIN_LEVEL,
  randomRange, distance, circlesCollide, wrapPosition, applyVelocity, applyFriction,
  angleToTarget, speed, clampSpeed,
  loadTopScores, saveTopScore,
  snapshotPositions, PositionInterpolator, lerpAngle, compactInPlace,
  render,
  AudioEngine, haptic, HAPTIC_DAMAGE, HAPTIC_POWERUP, HAPTIC_BOMB,
  loadProfile, awardXp, recordRunStats, computeModifiers,
  CAMPAIGN_LEVELS, TIME_ATTACK_INITIAL_SECONDS, TIME_ATTACK_KILL_BONUS_SECONDS, TIME_ATTACK_BOSS_BONUS_SECONDS,
  campaignStars, loadCampaignStars, saveCampaignStars,
  BOSS_DEFS, spawnBoss, updateBoss, updateMinion, endlessBossFor, bossHealthScale,
  computeHit, bombDamage,
  updateProjectiles, updateHazards, updateLysis,
  getCellType, getAntibodyClass, unlockedAntibodyClasses, nextAntibodyClass, buildVolley,
  memoryTable, rollDraft, applyMutation, mutationEffects, getMutation,
} from '../engine';
import AudioControls from './AudioControls';
import UpgradeScreen from './UpgradeScreen';
import StatsPanel from './StatsPanel';
import ModeSelect from './ModeSelect';
import CampaignBriefing from './CampaignBriefing';
import TouchControls from './TouchControls';
import DraftOverlay from './DraftOverlay';
import LoadoutPanel from './LoadoutPanel';
import CodexPanel from './CodexPanel';
import Tutorial from './Tutorial';

const STEP_MS = 1000 / 60;
const MAX_STEPS_PER_FRAME = 4;
const LOW_QUALITY_MAX_PARTICLES = 90;
/** Short side of the play area in world units; smaller screens zoom out to fit it. */
const WORLD_MIN_DIM = 640;
/** Never zoom out further than this (keeps entities readable on tiny phones). */
const MIN_ZOOM = 0.5;
const QUALITY_KEY = 'cyto-render-quality';
const COLORBLIND_KEY = 'cyto-colorblind';
const TUTORIAL_KEY = 'cyto-tutorial-done';

function detectInitialQuality(): RenderQuality {
  try {
    const saved = localStorage.getItem(QUALITY_KEY);
    if (saved === 'high' || saved === 'low') return saved;
  } catch {}
  if (typeof navigator === 'undefined') return 'high';
  const touch = navigator.maxTouchPoints > 0;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  return touch && (cores <= 4 || memory <= 3) ? 'low' : 'high';
}

function readFlag(key: string): boolean {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}
function writeFlag(key: string, on: boolean): void {
  try { localStorage.setItem(key, on ? '1' : '0'); } catch {}
}

const KILL_COLORS: Record<string, string> = {
  bacteria: '#ef4444', virus: '#f59e0b', parasite: '#a855f7', prion: '#94a3b8', cancer: '#f472b6',
  biofilm: '#38bdf8', fungus: '#10b981', host_rbc: '#ef4444', decoy_tcell: '#fca5a5', vessel: '#b91c1c',
};

interface BossUi {
  id: number;
  name: string;
  color: string;
  phaseLabel: string;
}

interface Banner {
  key: number;
  title: string;
  subtitle: string;
  color: string;
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [topScores, setTopScores] = useState<ScoreEntry[]>([]);
  const [lastScoreRank, setLastScoreRank] = useState<number | null>(null);
  const [level, setLevel] = useState(1);
  const [health, setHealth] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Per-frame values live in refs so the game loop never triggers React re-renders
  const shakeRef = useRef(0);
  const flashRef = useRef(0);
  const healthRef = useRef(100);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const isPausedRef = useRef(false);
  const gameStateRef = useRef<'menu' | 'playing' | 'gameover'>('menu');
  const timeAttackSecsRef = useRef(-1);

  // Game clock: advances exactly STEP_MS per simulation step
  const gameTimeRef = useRef(0);

  // Render interpolation between simulation steps (smooth on 90/120/144Hz)
  const interpolatorRef = useRef(new PositionInterpolator());
  const alphaRef = useRef(1);
  const shipPrevRotationRef = useRef(-Math.PI / 2);
  /** Boss-kill slow motion: game time runs at `scale` until `until` (real ms). */
  const timeScaleRef = useRef({ scale: 1, until: 0 });

  // Viewport → world mapping
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const worldRef = useRef({ w: 800, h: 600, zoom: 1, pixelScale: 1 });
  const [quality, setQuality] = useState<RenderQuality>(detectInitialQuality);
  const qualityRef = useRef<RenderQuality>(quality);
  const perfRef = useRef({ frames: 0, time: 0, badWindows: 0 });

  // Settings
  const [colorblind, setColorblind] = useState(() => readFlag(COLORBLIND_KEY));
  const colorblindRef = useRef(colorblind);
  const [showTutorial, setShowTutorial] = useState(false);

  // Progression
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile);
  const [menuView, setMenuView] = useState<'upgrades' | 'stats' | 'modes' | 'briefing' | 'loadout' | 'codex'>('upgrades');
  const modifiersRef = useRef<GameModifiers>(computeModifiers(loadProfile()));
  const memoryRef = useRef<Record<string, number>>({});
  const unlockedClassesRef = useRef<AntibodyClass[]>(['IgG']);

  // Run-scoped progression: clonal selection & antibody class
  const [runMutations, setRunMutations] = useState<RunMutations>({});
  const runMutationsRef = useRef<RunMutations>({});
  const mutFxRef = useRef<MutationEffects>(mutationEffects({}));
  const [draft, setDraft] = useState<MutationId[] | null>(null);
  const draftOpenRef = useRef(false);
  const [currentClass, setCurrentClass] = useState<AntibodyClass>('IgG');
  const currentClassRef = useRef<AntibodyClass>('IgG');

  // Boss UI (rarely changes; the health bar width is written straight to the DOM)
  const [bossUi, setBossUi] = useState<BossUi | null>(null);
  const bossBarFillRef = useRef<HTMLDivElement>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const abilityUiRef = useRef<HTMLElement[]>([]);

  // Game Modes
  const [gameMode, setGameMode] = useState<GameMode>('endless');
  const [campaignLevelIdx, setCampaignLevelIdx] = useState(0);
  const [campaignProgress, setCampaignProgress] = useState(() => {
    try { return parseInt(localStorage.getItem('cyto-campaign-progress') || '0', 10); } catch { return 0; }
  });
  const [stars, setStars] = useState<Record<number, number>>(loadCampaignStars);
  const [timeAttackTimer, setTimeAttackTimer] = useState(0);
  const timeAttackRef = useRef(0); // steps remaining
  const gameModeRef = useRef<GameMode>('endless');
  const campaignLevelRef = useRef<CampaignLevel | null>(null);
  const campaignIdxRef = useRef(0);
  const levelStartRef = useRef(0);
  const levelDamageRef = useRef(0);

  // Run tracking
  const runKillsRef = useRef(0);
  const runKillsByTypeRef = useRef<Record<string, number>>({});
  const runBossKillsRef = useRef<Record<string, number>>({});
  const runStartRef = useRef(0);
  const regenTimerRef = useRef(0);
  const [runSummary, setRunSummary] = useState<{ bosses: number; stars: number[] }>({ bosses: 0, stars: [] });

  // Audio engine (initialized on first user gesture)
  const audioRef = useRef(new AudioEngine());
  const shakeAngleRef = useRef(0);
  const prevThrustingRef = useRef(false);

  // Game Refs (to avoid re-renders during loop)
  const shipRef = useRef<Ship>({
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, radius: 18, rotation: -Math.PI / 2,
    thrusting: false, turning: 0, lastShot: 0,
  });
  const pathogensRef = useRef<Pathogen[]>([]);
  const antibodiesRef = useRef<Antibody[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const projectilesRef = useRef<EnemyProjectile[]>([]);
  const hazardsRef = useRef<Hazard[]>([]);
  const lysisRef = useRef<LysisEffect[]>([]);
  const statusRef = useRef<PlayerStatus>({ infected: 0, slowed: 0, slowFactor: 1, iframes: 0 });
  const dotAccRef = useRef(0);
  const abilityCdRef = useRef(0);
  const stormRef = useRef(0);
  const abilityHitIdsRef = useRef<Set<number>>(new Set());
  const feverTRef = useRef(FEVER_INTERVAL);
  const dronesRef = useRef<{ pos: Vector; fireT: number }[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const virtualControlsRef = useRef<VirtualControls>({
    joystickActive: false, joystickAngle: 0, joystickDistance: 0, fire: false,
  });
  const nextIdRef = useRef(0);

  const activePowerUpsRef = useRef<ActivePowerUps>({ rapidFire: 0, shield: 0, damageBoost: 0 });

  const maxHealth = () => modifiersRef.current.maxHealth + mutFxRef.current.bonusMaxHealth;

  // --- Score / health helpers ---

  const addScore = (n: number) => {
    scoreRef.current = Math.max(0, scoreRef.current + n);
    setScore(scoreRef.current);
  };

  const setHealthBoth = (h: number) => {
    healthRef.current = h;
    setHealth(h);
  };

  const showBanner = (title: string, subtitle: string, color: string) => {
    const key = Date.now();
    setBanner({ key, title, subtitle, color });
    window.setTimeout(() => setBanner(b => (b && b.key === key ? null : b)), 3200);
  };

  // --- Initialization ---

  const endGame = () => {
    gameStateRef.current = 'gameover';
    setGameState('gameover');
    audioRef.current.stopThrust();
    audioRef.current.stopMusic();
    prevThrustingRef.current = false;
    setBossUi(null);
  };

  const initGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    shipRef.current = {
      pos: { x: worldRef.current.w / 2, y: worldRef.current.h / 2 },
      vel: { x: 0, y: 0 },
      radius: modifiersRef.current.shipRadius,
      rotation: -Math.PI / 2,
      thrusting: false,
      turning: 0,
      lastShot: -Infinity,
    };
    shipPrevRotationRef.current = shipRef.current.rotation;
    gameTimeRef.current = 0;
    timeScaleRef.current = { scale: 1, until: 0 };

    pathogensRef.current = [];
    antibodiesRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
    floatingTextsRef.current = [];
    projectilesRef.current = [];
    hazardsRef.current = [];
    lysisRef.current = [];
    statusRef.current = { infected: 0, slowed: 0, slowFactor: 1, iframes: 0 };
    dotAccRef.current = 0;
    abilityCdRef.current = 0;
    stormRef.current = 0;
    feverTRef.current = FEVER_INTERVAL;
    dronesRef.current = [];
    activePowerUpsRef.current = { rapidFire: 0, shield: 0, damageBoost: 0 };

    runMutationsRef.current = {};
    setRunMutations({});
    mutFxRef.current = mutationEffects({});
    draftOpenRef.current = false;
    setDraft(null);

    unlockedClassesRef.current = unlockedAntibodyClasses(profile.playerLevel);
    if (!unlockedClassesRef.current.includes(currentClassRef.current)) {
      currentClassRef.current = 'IgG';
      setCurrentClass('IgG');
    }
    memoryRef.current = memoryTable(profile.stats.killsByType);

    scoreRef.current = 0;
    setScore(0);
    setHealthBoth(maxHealth());
    levelRef.current = 1;
    setLevel(1);
    shakeRef.current = 0;
    flashRef.current = 0;
    setIsPaused(false);
    setBossUi(null);
    setBanner(null);

    // Reset virtual controls so fire doesn't persist across matches
    const vc = virtualControlsRef.current;
    vc.fire = false; vc.joystickActive = false; vc.joystickDistance = 0;
    vc.abilityPressed = false; vc.swapPressed = false; vc.abilityUses = 0; vc.swapUses = 0;

    // Reset run tracking
    runKillsRef.current = 0;
    runKillsByTypeRef.current = {};
    runBossKillsRef.current = {};
    runStartRef.current = 0;
    regenTimerRef.current = 0;
    levelStartRef.current = 0;
    levelDamageRef.current = 0;
    setRunSummary({ bosses: 0, stars: [] });

    // Mode-specific initial spawning
    const mode = gameModeRef.current;
    if (mode === 'campaign' && campaignLevelRef.current) {
      spawnCampaignWave(campaignLevelRef.current);
    } else if (mode === 'time_attack') {
      timeAttackRef.current = TIME_ATTACK_INITIAL_SECONDS * 60;
      timeAttackSecsRef.current = TIME_ATTACK_INITIAL_SECONDS;
      setTimeAttackTimer(TIME_ATTACK_INITIAL_SECONDS);
      for (let i = 0; i < INITIAL_PATHOGEN_COUNT + 2; i++) spawnPathogen(true);
    } else {
      for (let i = 0; i < INITIAL_PATHOGEN_COUNT; i++) spawnPathogen(true);
    }
  };

  const randomSafePos = (minDist: number): Vector => {
    let pos: Vector;
    let tries = 0;
    do {
      pos = { x: Math.random() * worldRef.current.w, y: Math.random() * worldRef.current.h };
    } while (distance(pos, shipRef.current.pos) < minDist && ++tries < 50);
    return pos;
  };

  const spawnPathogen = (safeZone = false, parent?: Pathogen) => {
    const minDim = Math.min(worldRef.current.w, worldRef.current.h);
    const sizeScale = Math.min(1, minDim / 600);
    const rawRadius = parent ? parent.radius / 2 : randomRange(PATHOGEN_MIN_RADIUS + 10, PATHOGEN_MAX_RADIUS);
    // Check the size limit BEFORE clamping. (Clamping first meant split
    // children never got small enough to stop splitting, so waves could
    // go on forever.)
    if (parent && rawRadius < PATHOGEN_MIN_RADIUS * 0.75) return;
    const radius = Math.max(PATHOGEN_MIN_RADIUS * 0.7, rawRadius * sizeScale);

    const pos: Vector = parent ? { ...parent.pos } : safeZone ? randomSafePos(200) : randomSafePos(0);

    const sides = Math.floor(randomRange(6, 12));
    const noise = Array.from({ length: sides }, () => randomRange(0.7, 1.3));

    const roll = Math.random();
    let type: 'virus' | 'bacteria' | 'parasite' | 'fungus';
    let variant: Pathogen['variant'];
    if (radius > 40) type = 'fungus';
    else if (roll < 0.2) type = 'parasite';
    else if (radius > 30) type = 'bacteria';
    else type = 'virus';

    const variantRoll = Math.random();
    if (type === 'bacteria' && variantRoll < 0.3) variant = 'armored';
    if (type === 'virus' && variantRoll < 0.3) variant = 'swift';
    if (type === 'parasite' && variantRoll < 0.3) variant = 'stalker';

    const lvl = levelRef.current;
    const hp = (radius / 10) * (type === 'fungus' ? 2 : 1) * (variant === 'armored' ? 2.5 : variant === 'swift' ? 0.6 : 1);
    const velMult = (1 + lvl * 0.1) * (type === 'parasite' ? 1.5 : 1) * (variant === 'swift' ? 1.8 : variant === 'armored' ? 0.6 : 1);
    pathogensRef.current.push({
      id: nextIdRef.current++,
      pos,
      vel: { x: randomRange(-2, 2) * velMult, y: randomRange(-2, 2) * velMult },
      radius,
      rotation: Math.random() * Math.PI * 2,
      type,
      variant,
      health: hp,
      maxHealth: hp,
      points: Math.floor(100 / radius) * 10 * (type === 'parasite' ? 2 : 1) * (variant ? 1.5 : 1),
      sides: variant === 'swift' ? 16 : 10,
      noise,
    });
  };

  // --- Special enemy spawners ---

  const spawnPrionSwarm = () => {
    const centerX = Math.random() * worldRef.current.w;
    const centerY = Math.random() * worldRef.current.h;
    for (let i = 0; i < PRION_SWARM_SIZE; i++) {
      const angle = (Math.PI * 2 * i) / PRION_SWARM_SIZE + randomRange(-0.3, 0.3);
      const dist = randomRange(20, 50);
      pathogensRef.current.push({
        id: nextIdRef.current++,
        pos: { x: centerX + Math.cos(angle) * dist, y: centerY + Math.sin(angle) * dist },
        vel: { x: randomRange(-PRION_SPEED, PRION_SPEED), y: randomRange(-PRION_SPEED, PRION_SPEED) },
        radius: PRION_RADIUS,
        rotation: Math.random() * Math.PI * 2,
        type: 'prion',
        health: PRION_HEALTH,
        maxHealth: PRION_HEALTH,
        points: PRION_POINTS,
        sides: 5,
        noise: Array.from({ length: 5 }, () => randomRange(0.8, 1.2)),
        opacity: PRION_OPACITY,
      });
    }
  };

  const spawnCancerCell = () => {
    const hp = CANCER_INITIAL_RADIUS * CANCER_HEALTH_PER_RADIUS;
    pathogensRef.current.push({
      id: nextIdRef.current++,
      pos: randomSafePos(200),
      vel: { x: 0, y: 0 },
      radius: CANCER_INITIAL_RADIUS,
      rotation: Math.random() * Math.PI * 2,
      type: 'cancer',
      health: hp,
      maxHealth: hp,
      points: CANCER_POINTS,
      sides: 12,
      noise: Array.from({ length: 12 }, () => randomRange(0.85, 1.15)),
      growthRate: CANCER_GROWTH_RATE,
      spawnTimer: CANCER_SPAWN_INTERVAL,
    });
  };

  const spawnBiofilm = () => {
    pathogensRef.current.push({
      id: nextIdRef.current++,
      pos: randomSafePos(250),
      vel: { x: randomRange(-0.5, 0.5), y: randomRange(-0.5, 0.5) },
      radius: BIOFILM_RADIUS,
      rotation: Math.random() * Math.PI * 2,
      type: 'biofilm',
      health: BIOFILM_INNER_HEALTH,
      maxHealth: BIOFILM_INNER_HEALTH,
      points: BIOFILM_POINTS,
      sides: 16,
      noise: Array.from({ length: 16 }, () => randomRange(0.9, 1.1)),
      shieldHealth: BIOFILM_SHIELD_HEALTH,
      maxShieldHealth: BIOFILM_SHIELD_HEALTH,
    });
  };

  const spawnTypedPathogen = (type: PathogenType, variant?: Pathogen['variant']) => {
    if (type === 'prion') { spawnPrionSwarm(); return; }
    if (type === 'cancer') { spawnCancerCell(); return; }
    if (type === 'biofilm') { spawnBiofilm(); return; }

    const radius = type === 'fungus' ? randomRange(35, PATHOGEN_MAX_RADIUS) :
      type === 'parasite' ? randomRange(PATHOGEN_MIN_RADIUS + 5, 25) :
      type === 'bacteria' ? randomRange(20, 35) :
      randomRange(PATHOGEN_MIN_RADIUS + 5, 25);
    const sides = variant === 'swift' ? 16 : Math.floor(randomRange(6, 12));
    const noise = Array.from({ length: sides }, () => randomRange(0.7, 1.3));
    const hp = (radius / 10) * (type === 'fungus' ? 2 : 1) * (variant === 'armored' ? 2.5 : variant === 'swift' ? 0.6 : 1);
    const velMult = (type === 'parasite' ? 1.5 : 1) * (variant === 'swift' ? 1.8 : variant === 'armored' ? 0.6 : 1);

    pathogensRef.current.push({
      id: nextIdRef.current++,
      pos: randomSafePos(200),
      vel: { x: randomRange(-2, 2) * velMult, y: randomRange(-2, 2) * velMult },
      radius,
      rotation: Math.random() * Math.PI * 2,
      type,
      variant,
      health: hp,
      maxHealth: hp,
      points: Math.floor(100 / radius) * 10 * (type === 'parasite' ? 2 : 1) * (variant ? 1.5 : 1),
      sides,
      noise,
    });
  };

  const spawnCampaignWave = (campaignLevel: CampaignLevel) => {
    for (const entry of campaignLevel.pathogens) {
      if (entry.type === 'prion') {
        const swarms = Math.max(1, Math.floor(entry.count / PRION_SWARM_SIZE));
        for (let i = 0; i < swarms; i++) spawnPrionSwarm();
      } else {
        for (let i = 0; i < entry.count; i++) spawnTypedPathogen(entry.type, entry.variant);
      }
    }
    if (campaignLevel.boss) spawnBossOfType(campaignLevel.boss, 0);
    levelStartRef.current = gameTimeRef.current;
    levelDamageRef.current = 0;
  };

  // --- Effects ---

  const particleCap = () => (qualityRef.current === 'low' ? LOW_QUALITY_MAX_PARTICLES : MAX_PARTICLES);

  const createExplosion = (pos: Vector, color: string, count = 10) => {
    const cap = particleCap();
    if (qualityRef.current === 'low') count = Math.ceil(count * 0.5);
    const room = cap - particlesRef.current.length;
    if (room <= 0) return;
    count = Math.min(count, room);
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: nextIdRef.current++,
        pos: { ...pos },
        vel: { x: randomRange(-3, 3), y: randomRange(-3, 3) },
        radius: randomRange(1, 4),
        rotation: Math.random() * Math.PI * 2,
        life: randomRange(20, 40),
        color,
        opacity: 1,
      });
    }
  };

  const addLysis = (pos: Vector, color: string, maxRadius: number) => {
    if (lysisRef.current.length > 40) return;
    const life = Math.round(18 + maxRadius * 0.15);
    lysisRef.current.push({ pos: { ...pos }, radius: 0, maxRadius, life, maxLife: life, color });
  };

  const spawnFloatingText = (pos: Vector, text: string, color: string, size = 16) => {
    if (floatingTextsRef.current.length > 30) floatingTextsRef.current.shift();
    floatingTextsRef.current.push({
      id: nextIdRef.current++,
      pos: { ...pos },
      vel: { x: randomRange(-0.5, 0.5), y: -1 },
      text, color, life: 60, size,
    });
  };

  const spawnPowerUp = (pos: Vector) => {
    if (Math.random() > POWERUP_DROP_RATE + mutFxRef.current.powerUpBonus) return;
    const types: PowerUp['type'][] = ['rapid_fire', 'shield', 'damage_boost', 'bomb'];
    const type = types[Math.floor(Math.random() * types.length)];
    powerUpsRef.current.push({
      id: nextIdRef.current++,
      pos: { ...pos },
      vel: { x: randomRange(-1, 1), y: randomRange(-1, 1) },
      radius: 12, rotation: 0, type, life: POWERUP_LIFETIME,
    });
  };

  // --- Bosses ---

  /** GameContext adapter so the engine's boss AI can act on our refs. */
  const gameCtx: GameContext = {
    get worldW() { return worldRef.current.w; },
    get worldH() { return worldRef.current.h; },
    get ship() { return shipRef.current; },
    get pathogens() { return pathogensRef.current; },
    get unlockedClasses() { return unlockedClassesRef.current; },
    nextId: () => nextIdRef.current++,
    addPathogen: (p) => { pathogensRef.current.push(p); return p; },
    fire: (p) => { projectilesRef.current.push({ ...p, id: nextIdRef.current++, rotation: 0 }); },
    addHazard: (h) => { hazardsRef.current.push({ ...h, id: nextIdRef.current++ }); },
    text: (pos, text, color, size) => spawnFloatingText(pos, text, color, size),
    explosion: (pos, color, count) => createExplosion(pos, color, count),
    lysis: (pos, color, r) => addLysis(pos, color, r),
    shake: (n) => { shakeRef.current = Math.max(shakeRef.current, n); },
    damagePlayer: (amount, from) => { damagePlayer(amount, from, 'contact'); },
    addScore: (n) => addScore(n),
    onPhase: (boss, phase, label) => {
      if (phase > 1 && label.startsWith('Phase')) audioRef.current.playBossSpawn();
      setBossUi(ui => (ui && ui.id === boss.id ? { ...ui, phaseLabel: label } : ui));
    },
    rng: Math.random,
  };

  const spawnBossOfType = (type: BossType, cycle: number) => {
    const ship = shipRef.current;
    const cx = worldRef.current.w / 2;
    const cy = worldRef.current.h / 2;
    const a = Math.atan2(cy - ship.pos.y, cx - ship.pos.x);
    const pos = { x: cx + Math.cos(a) * 150, y: cy + Math.sin(a) * 150 };
    const scale = bossHealthScale(cycle, modifiersRef.current.bulletDamage);
    const boss = spawnBoss(gameCtx, type, pos, scale);
    const def = BOSS_DEFS[type];
    setBossUi({
      id: boss.id,
      name: def.name + (cycle > 0 ? ` +${cycle}` : ''),
      color: def.color,
      phaseLabel: type === 'influenza' ? (boss.resistClass ? `resists ${boss.resistClass}` : '') : 'Phase 1',
    });
    showBanner(`⚠ ${def.name.toUpperCase()}`, def.tagline, def.color);
    audioRef.current.playBossSpawn();
    return boss;
  };

  // --- Damage & kills ---

  type DamageSource = 'contact' | 'projectile' | 'hazard' | 'dot';

  /** Damages the player. Returns true if damage was actually applied. */
  const damagePlayer = (amount: number, from: Vector | undefined, source: DamageSource): boolean => {
    if (gameStateRef.current !== 'playing' || gameModeRef.current === 'zen') return false;
    const ship = shipRef.current;
    const status = statusRef.current;

    if (source === 'dot') {
      dotAccRef.current += amount;
      if (dotAccRef.current < 1) return false;
      amount = Math.floor(dotAccRef.current);
      dotAccRef.current -= amount;
    } else {
      if (status.iframes > 0 || (ship.dashT ?? 0) > 0) return false;
      if (activePowerUpsRef.current.shield > 0) {
        shakeRef.current = Math.max(shakeRef.current, 5);
        audioRef.current.playShieldBounce();
        return false;
      }
    }

    const mult = source === 'contact' ? mutFxRef.current.contactDamageMult : 1;
    const dmg = Math.max(1, Math.round(amount * mult));
    const next = Math.max(0, healthRef.current - dmg);
    setHealthBoth(next);
    levelDamageRef.current += dmg;

    if (source !== 'dot') {
      status.iframes = Math.round(PLAYER_IFRAMES * mutFxRef.current.iframeMult);
      flashRef.current = 5;
      shakeRef.current = Math.max(shakeRef.current, 10);
      if (from) shakeAngleRef.current = Math.atan2(ship.pos.y - from.y, ship.pos.x - from.x);
      audioRef.current.playDamage();
      haptic(HAPTIC_DAMAGE);
    }

    if (next <= 0 && gameStateRef.current === 'playing') {
      endGame();
      createExplosion(ship.pos, '#ffffff', 30);
      addLysis(ship.pos, '#ffffff', 120);
      audioRef.current.playGameOver();
    }
    return true;
  };

  /** Removes a pathogen with all the kill bookkeeping. */
  const killPathogen = (p: Pathogen, opts: { noSplit?: boolean; noReward?: boolean } = {}) => {
    if (p.dead) return;
    p.dead = true;
    const color = KILL_COLORS[p.type] ?? '#10b981';
    createExplosion(p.pos, color, p.isBoss ? 30 : 12);
    addLysis(p.pos, color, p.radius * (p.isBoss ? 3 : 1.8));

    if (p.type === 'host_rbc') return; // host cells aren't kills

    if (!opts.noReward) {
      addScore(p.points);
      spawnFloatingText(p.pos, `+${Math.round(p.points)}`, '#ffffff', p.isBoss ? 24 : 18);
    }
    audioRef.current.playExplosion(p.isBoss || p.radius > 35 ? 'large' : p.radius > 20 ? 'medium' : 'small');

    if (p.isBoss && p.bossType) {
      const def = BOSS_DEFS[p.bossType];
      def.onDeath?.(gameCtx, p);
      runBossKillsRef.current[p.bossType] = (runBossKillsRef.current[p.bossType] || 0) + 1;
      spawnFloatingText(p.pos, 'BOSS DEFEATED!', '#fbbf24', 28);
      shakeRef.current = 25;
      audioRef.current.playBossDefeat();
      projectilesRef.current.length = 0;
      hazardsRef.current = hazardsRef.current.filter(h => h.kind === 'spore_cloud');
      timeScaleRef.current = { scale: 0.3, until: performance.now() + 1100 };
      setBossUi(ui => {
        if (!ui || ui.id !== p.id) return ui;
        const other = pathogensRef.current.find(q => q.isBoss && !q.dead && q.id !== p.id);
        return other && other.bossType
          ? { id: other.id, name: BOSS_DEFS[other.bossType].name, color: BOSS_DEFS[other.bossType].color, phaseLabel: '' }
          : null;
      });
      showBanner(`${def.name.toUpperCase()} DEFEATED`, 'The host is safe — for now.', '#4ade80');
    }

    if (gameModeRef.current === 'time_attack' && !opts.noReward) {
      const bonus = p.isBoss ? TIME_ATTACK_BOSS_BONUS_SECONDS : TIME_ATTACK_KILL_BONUS_SECONDS;
      timeAttackRef.current += bonus * 60;
      spawnFloatingText(p.pos, `+${bonus}s`, '#4ade80', 12);
    }

    runKillsRef.current++;
    runKillsByTypeRef.current[p.type] = (runKillsByTypeRef.current[p.type] || 0) + 1;

    // Chain reaction cytokine
    if (modifiersRef.current.hasChainReaction) {
      for (const nearby of pathogensRef.current) {
        if (!nearby.dead && !nearby.hidden && !nearby.harmless && nearby.id !== p.id &&
            distance(p.pos, nearby.pos) < CHAIN_REACTION_RADIUS) {
          applyDamage(nearby, CHAIN_REACTION_DAMAGE);
          createExplosion(nearby.pos, '#fbbf24', 3);
        }
      }
    }

    // Complement cascade: the membrane attack complex bursts into fragments
    if (mutFxRef.current.complement && !p.isBossPart) {
      const dmg = modifiersRef.current.bulletDamage * mutFxRef.current.damageMult * 0.4;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        antibodiesRef.current.push({
          id: nextIdRef.current++, pos: { ...p.pos },
          vel: { x: Math.cos(a) * 6, y: Math.sin(a) * 6 }, radius: 3, rotation: a,
          life: 22, cls: 'IgG', damage: dmg, pierce: 0, baseSpeed: 6,
        });
      }
    }

    if (!opts.noReward) spawnPowerUp(p.pos);

    // Asteroids-style split (regular pathogens only)
    const splittable = !p.isBoss && !p.isBossPart && p.ownerId === undefined &&
      (p.type === 'virus' || p.type === 'bacteria' || p.type === 'parasite' || p.type === 'fungus');
    if (splittable && !opts.noSplit) {
      spawnPathogen(false, p);
      spawnPathogen(false, p);
    }
  };

  /** Applies damage to a pathogen's health and kills it if needed. */
  const applyDamage = (p: Pathogen, dmg: number) => {
    if (p.dead || dmg <= 0) return;
    p.health -= dmg;
    p.hitFlash = 6;
    if (p.health <= 0) killPathogen(p);
  };

  const triggerBomb = () => {
    shakeRef.current = 20;
    for (const p of pathogensRef.current) {
      if (p.dead || p.hidden || p.harmless) continue;
      const dmg = bombDamage(p, BOMB_BOSS_DAMAGE_FRACTION);
      if (dmg === Infinity) {
        killPathogen(p, { noSplit: true });
      } else {
        applyDamage(p, dmg);
        spawnFloatingText(p.pos, `-${Math.round(dmg)}`, '#ef4444', 18);
      }
    }
  };

  // --- Player actions ---

  const swapClass = () => {
    const unlocked = unlockedClassesRef.current;
    if (unlocked.length <= 1) return;
    const next = nextAntibodyClass(currentClassRef.current, unlocked);
    virtualControlsRef.current.swapUses = (virtualControlsRef.current.swapUses ?? 0) + 1;
    currentClassRef.current = next;
    setCurrentClass(next);
    spawnFloatingText({ x: shipRef.current.pos.x, y: shipRef.current.pos.y - 30 }, next, getAntibodyClass(next).color, 14);
  };

  const fireVolley = (angle: number, opts: { radial?: number } = {}) => {
    const ship = shipRef.current;
    const cls = getAntibodyClass(currentClassRef.current);
    const fx = mutFxRef.current;
    const damage = modifiersRef.current.bulletDamage * fx.damageMult;
    const origin = { x: ship.pos.x + Math.cos(angle) * ship.radius, y: ship.pos.y + Math.sin(angle) * ship.radius };
    const def = opts.radial ? { ...cls, count: opts.radial, spread: (Math.PI * 2) / opts.radial } : cls;
    const shots = buildVolley(def, opts.radial ? ship.pos : origin, angle, ship.vel, {
      damage,
      sideShotStacks: opts.radial ? 0 : fx.sideShotStacks,
      extraPierce: fx.extraPierce,
    });
    const homing = getCellType(modifiersRef.current.cellType).homing;
    for (const s of shots) {
      antibodiesRef.current.push({
        id: nextIdRef.current++, pos: s.pos, vel: s.vel, radius: 3, rotation: s.rotation,
        life: s.life, cls: cls.id, damage: s.damage, pierce: s.pierce, baseSpeed: s.baseSpeed,
        homing: homing || undefined,
      });
    }
  };

  const activateAbility = () => {
    if (abilityCdRef.current > 0 || gameStateRef.current !== 'playing') return;
    const ship = shipRef.current;
    const cell = getCellType(modifiersRef.current.cellType);
    abilityCdRef.current = Math.round(cell.ability.cooldown * mutFxRef.current.abilityCooldownMult);
    virtualControlsRef.current.abilityUses = (virtualControlsRef.current.abilityUses ?? 0) + 1;
    abilityHitIdsRef.current.clear();
    switch (cell.id) {
      case 'killer_t':
        fireVolley(ship.rotation, { radial: 16 });
        addLysis(ship.pos, '#ffffff', 60);
        break;
      case 'macrophage':
        ship.engulfT = 120;
        break;
      case 'nk_cell':
        ship.dashT = 21;
        ship.vel.x = Math.cos(ship.rotation) * 11;
        ship.vel.y = Math.sin(ship.rotation) * 11;
        break;
      case 'plasma_b':
        stormRef.current = 240;
        break;
    }
    spawnFloatingText({ x: ship.pos.x, y: ship.pos.y - 34 }, cell.ability.name.toUpperCase(), cell.color, 13);
    // A strong immune response clears the retrovirus infection
    if (statusRef.current.infected > 0) {
      statusRef.current.infected = 0;
      spawnFloatingText(ship.pos, 'INFECTION PURGED', '#4ade80', 12);
    }
    audioRef.current.playPowerUp();
  };

  // --- Waves & clonal selection ---

  const onWaveCleared = () => {
    const mode = gameModeRef.current;
    if (mode === 'zen') { advanceWave(); return; }

    if (mode === 'campaign' && campaignLevelRef.current) {
      const cl = campaignLevelRef.current;
      const secs = (gameTimeRef.current - levelStartRef.current) / 1000;
      const earned = campaignStars(cl, levelDamageRef.current, maxHealth(), secs);
      setStars(saveCampaignStars(cl.level, earned));
      setRunSummary(s => ({ ...s, stars: [...s.stars, earned] }));
      spawnFloatingText(shipRef.current.pos, '★'.repeat(earned) + '☆'.repeat(3 - earned), '#fbbf24', 26);
      if (campaignIdxRef.current + 1 >= CAMPAIGN_LEVELS.length) {
        spawnFloatingText(shipRef.current.pos, 'CAMPAIGN COMPLETE!', '#4ade80', 28);
        endGame();
        return;
      }
    }

    const offerDraft = mode !== 'time_attack' || levelRef.current % 2 === 0;
    const picks = offerDraft ? rollDraft(runMutationsRef.current) : [];
    if (picks.length === 0) { advanceWave(); return; }
    draftOpenRef.current = true;
    audioRef.current.stopThrust();
    prevThrustingRef.current = false;
    setDraft(picks);
  };

  const pickMutation = (id: MutationId) => {
    const run = applyMutation(runMutationsRef.current, id);
    runMutationsRef.current = run;
    setRunMutations(run);
    mutFxRef.current = mutationEffects(run);
    if (id === 'membrane_repair') setHealthBoth(maxHealth());
    const def = getMutation(id);
    spawnFloatingText(shipRef.current.pos, def.name.toUpperCase(), '#a78bfa', 16);
    draftOpenRef.current = false;
    setDraft(null);
    advanceWave();
  };

  const advanceWave = () => {
    const mode = gameModeRef.current;
    levelStartRef.current = gameTimeRef.current;
    levelDamageRef.current = 0;

    if (mode === 'campaign') {
      const nextIdx = campaignIdxRef.current + 1;
      audioRef.current.playLevelClear();
      campaignIdxRef.current = nextIdx;
      setCampaignLevelIdx(nextIdx);
      const newProgress = Math.max(campaignProgress, nextIdx);
      setCampaignProgress(newProgress);
      try { localStorage.setItem('cyto-campaign-progress', String(newProgress)); } catch {}
      const cl = CAMPAIGN_LEVELS[nextIdx];
      campaignLevelRef.current = cl;
      levelRef.current = cl.level;
      setLevel(cl.level);
      spawnCampaignWave(cl);
      spawnFloatingText(shipRef.current.pos, cl.title, '#60a5fa', 22);
      return;
    }

    if (mode === 'zen') {
      levelRef.current += 1;
      setLevel(levelRef.current);
      for (let i = 0; i < INITIAL_PATHOGEN_COUNT; i++) spawnPathogen(true);
      return;
    }

    // Endless & Time Attack
    const prevLevel = levelRef.current;
    const nextLevel = prevLevel + 1;
    levelRef.current = nextLevel;
    setLevel(nextLevel);
    audioRef.current.playLevelClear();

    const boss = endlessBossFor(nextLevel, BOSS_INTERVAL);
    if (boss) {
      spawnBossOfType(boss.type, boss.cycle);
      for (let i = 0; i < Math.floor(INITIAL_PATHOGEN_COUNT / 2); i++) spawnPathogen(true);
    } else {
      for (let i = 0; i < INITIAL_PATHOGEN_COUNT + prevLevel; i++) spawnPathogen(true);
      if (nextLevel >= PRION_MIN_LEVEL && Math.random() < 0.3 + nextLevel * 0.02) spawnPrionSwarm();
      if (nextLevel >= CANCER_MIN_LEVEL && Math.random() < 0.2 + nextLevel * 0.02) spawnCancerCell();
      if (nextLevel >= BIOFILM_MIN_LEVEL && Math.random() < 0.15 + nextLevel * 0.02) spawnBiofilm();
    }
  };

  // --- Game Loop ---

  /** Nearest pathogen that can be targeted (for homing, drones). */
  const nearestTarget = (from: Vector, maxDist: number): Pathogen | null => {
    let best: Pathogen | null = null;
    let bestD = maxDist * maxDist;
    for (const p of pathogensRef.current) {
      if (p.dead || p.hidden || p.harmless) continue;
      const dx = p.pos.x - from.x;
      const dy = p.pos.y - from.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  };

  const update = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = worldRef.current.w;
    const H = worldRef.current.h;
    const ship = shipRef.current;
    const status = statusRef.current;
    const mods = modifiersRef.current;
    const fx = mutFxRef.current;
    const vc = virtualControlsRef.current;

    // Remember where everything was, for render interpolation
    snapshotPositions(pathogensRef.current);
    snapshotPositions(antibodiesRef.current);
    snapshotPositions(particlesRef.current);
    snapshotPositions(powerUpsRef.current);
    snapshotPositions(floatingTextsRef.current);
    snapshotPositions(projectilesRef.current);
    snapshotPositions(hazardsRef.current);
    snapshotPositions([ship]);
    shipPrevRotationRef.current = ship.rotation;

    gameTimeRef.current += STEP_MS;
    const now = gameTimeRef.current;

    // Timers
    if (status.iframes > 0) status.iframes--;
    if (status.infected > 0) status.infected--;
    if (status.slowed > 0) status.slowed--; else status.slowFactor = 1;
    if (abilityCdRef.current > 0) abilityCdRef.current--;
    if (stormRef.current > 0) stormRef.current--;
    if (ship.dashT && ship.dashT > 0) ship.dashT--;
    if (ship.engulfT && ship.engulfT > 0) ship.engulfT--;

    // Edge-triggered actions (touch buttons / keys)
    if (vc.abilityPressed) { vc.abilityPressed = false; activateAbility(); }
    if (vc.swapPressed) { vc.swapPressed = false; swapClass(); }

    // 1. Ship movement
    let isThrusting = false;
    const slow = status.slowed > 0 ? status.slowFactor : 1;
    const thrust = mods.thrustPower * slow;
    const dashing = (ship.dashT ?? 0) > 0;

    if (!dashing && vc.joystickActive) {
      const targetAngle = vc.joystickAngle;
      let diff = targetAngle - ship.rotation;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      if (Math.abs(diff) > 0.02) ship.rotation += Math.sign(diff) * Math.min(Math.abs(diff) * 0.3, 0.22);
      const d = vc.joystickDistance;
      if (d > 0.45 && Math.abs(diff) < Math.PI / 2) {
        const t = Math.min(1, (d - 0.45) / 0.45);
        const power = thrust * (0.5 + 0.5 * t);
        ship.vel.x += Math.cos(ship.rotation) * power;
        ship.vel.y += Math.sin(ship.rotation) * power;
        isThrusting = true;
      }
    } else if (!dashing) {
      const k = keysRef.current;
      if (k['ArrowLeft'] || k['a']) ship.rotation -= SHIP_TURN_SPEED;
      if (k['ArrowRight'] || k['d']) ship.rotation += SHIP_TURN_SPEED;
      if (k['ArrowUp'] || k['w']) {
        ship.vel.x += Math.cos(ship.rotation) * thrust;
        ship.vel.y += Math.sin(ship.rotation) * thrust;
        isThrusting = true;
      }
    }
    ship.thrusting = isThrusting;

    if (isThrusting && !prevThrustingRef.current) audioRef.current.startThrust();
    if (!isThrusting && prevThrustingRef.current) audioRef.current.stopThrust();
    prevThrustingRef.current = isThrusting;

    if (isThrusting && Math.random() > 0.5 && particlesRef.current.length < particleCap()) {
      particlesRef.current.push({
        id: nextIdRef.current++,
        pos: { x: ship.pos.x - Math.cos(ship.rotation) * ship.radius, y: ship.pos.y - Math.sin(ship.rotation) * ship.radius },
        vel: { x: -Math.cos(ship.rotation) * 2 + randomRange(-0.5, 0.5), y: -Math.sin(ship.rotation) * 2 + randomRange(-0.5, 0.5) },
        radius: randomRange(1, 3), rotation: 0, life: 20, color: '#ffffff', opacity: 0.5,
      });
    }

    applyVelocity(ship);
    if (!dashing) applyFriction(ship, FRICTION);
    if (slow < 1) applyFriction(ship, 1 - (1 - slow) * 0.06);
    wrapPosition(ship.pos, W, H);

    // Power-up timers
    const ap = activePowerUpsRef.current;
    if (ap.rapidFire > 0) ap.rapidFire--;
    if (ap.shield > 0) ap.shield--;
    if (ap.damageBoost > 0) ap.damageBoost--;

    // 2. Shooting
    const cls = getAntibodyClass(currentClassRef.current);
    let shotDelay = mods.shotDelay * cls.delayMult * fx.fireDelayMult;
    if (ap.rapidFire > 0) shotDelay = Math.max(40, shotDelay * 0.4);
    if (status.infected > 0) shotDelay *= 1.6;
    if (stormRef.current > 0) shotDelay /= 3;
    const firing = keysRef.current[' '] || keysRef.current['f'] || vc.fire;
    if (firing && !dashing && now - ship.lastShot >= shotDelay) {
      fireVolley(ship.rotation);
      ship.lastShot = now;
      audioRef.current.playFire();
    }

    // NK escort drones
    const droneCount = fx.drones;
    while (dronesRef.current.length < droneCount) dronesRef.current.push({ pos: { ...ship.pos }, fireT: 30 });
    dronesRef.current.forEach((d, i) => {
      const a = now * 0.0025 + (i / Math.max(1, droneCount)) * Math.PI * 2;
      d.pos.x = ship.pos.x + Math.cos(a) * (ship.radius + 24);
      d.pos.y = ship.pos.y + Math.sin(a) * (ship.radius + 24);
      if (--d.fireT <= 0) {
        const target = nearestTarget(d.pos, 360);
        if (target) {
          const ta = angleToTarget(d.pos, target.pos);
          antibodiesRef.current.push({
            id: nextIdRef.current++, pos: { ...d.pos }, vel: { x: Math.cos(ta) * 7, y: Math.sin(ta) * 7 },
            radius: 3, rotation: ta, life: 55, cls: 'IgG',
            damage: mods.bulletDamage * fx.damageMult * 0.5, pierce: 0, baseSpeed: 7,
          });
        }
        d.fireT = 48;
      }
    });

    // Fever cytokine: periodic heat pulse
    if (mods.hasFever && --feverTRef.current <= 0) {
      feverTRef.current = FEVER_INTERVAL;
      addLysis(ship.pos, '#fb923c', FEVER_RADIUS);
      for (const p of pathogensRef.current) {
        if (p.dead || p.hidden || p.harmless) continue;
        if (distance(p.pos, ship.pos) < FEVER_RADIUS + p.radius) applyDamage(p, FEVER_DAMAGE);
      }
    }

    // 3. Pathogens
    const engulfR = (ship.engulfT ?? 0) > 0 ? ship.radius * 2.6 : 0;
    const pathogens = pathogensRef.current;
    for (let i = 0, n = pathogens.length; i < n; i++) {
      const p = pathogens[i];
      if (p.dead) continue;
      if (p.hitFlash && p.hitFlash > 0) p.hitFlash--;
      if (p.labelCd && p.labelCd > 0) p.labelCd--;
      if (p.marked && p.marked > 0) p.marked--;

      if (p.isBoss) {
        updateBoss(gameCtx, p);
      } else {
        updateMinion(gameCtx, p);
        // Parasites track the player
        if (p.type === 'parasite') {
          const angle = angleToTarget(p.pos, ship.pos);
          const accel = p.variant === 'stalker' ? 0.12 : 0.05;
          p.vel.x += Math.cos(angle) * accel;
          p.vel.y += Math.sin(angle) * accel;
          clampSpeed(p.vel, (3 + levelRef.current * 0.2) * (p.variant === 'stalker' ? 1.4 : 1));
        }
        if (p.type === 'prion') p.opacity = PRION_OPACITY + Math.sin(now * 0.01 + p.id) * 0.15;
        if (p.type === 'cancer') {
          // Travelling metastasis seeds slow down and settle
          p.vel.x *= 0.97; p.vel.y *= 0.97;
          if (p.growthRate && p.radius < CANCER_MAX_RADIUS) {
            p.radius += p.growthRate;
            p.health = Math.max(p.health, p.radius * CANCER_HEALTH_PER_RADIUS * (p.health / Math.max(0.01, p.maxHealth)));
            p.maxHealth = p.radius * CANCER_HEALTH_PER_RADIUS;
          }
          if (p.spawnTimer !== undefined && --p.spawnTimer <= 0) {
            p.spawnTimer = CANCER_SPAWN_INTERVAL;
            const cancers = pathogens.filter(q => q.type === 'cancer' && !q.dead).length;
            if (cancers < 10) {
              const a = Math.random() * Math.PI * 2;
              const d = p.radius + 20;
              const hp = CANCER_INITIAL_RADIUS * CANCER_HEALTH_PER_RADIUS * 0.5;
              pathogens.push({
                id: nextIdRef.current++,
                pos: { x: p.pos.x + Math.cos(a) * d, y: p.pos.y + Math.sin(a) * d },
                vel: { x: 0, y: 0 }, radius: CANCER_INITIAL_RADIUS * 0.6,
                rotation: Math.random() * Math.PI * 2, type: 'cancer',
                health: hp, maxHealth: hp, points: Math.floor(CANCER_POINTS * 0.3), sides: 10,
                noise: Array.from({ length: 10 }, () => randomRange(0.85, 1.15)),
                growthRate: CANCER_GROWTH_RATE * 0.5, spawnTimer: CANCER_SPAWN_INTERVAL * 2,
              });
            }
          }
        }
      }

      if (p.dead) continue;
      applyVelocity(p);
      if (mods.hasInterferon && p.type === 'virus' && !p.isBoss) {
        p.pos.x -= p.vel.x * (1 - INTERFERON_SLOW);
        p.pos.y -= p.vel.y * (1 - INTERFERON_SLOW);
      }
      p.rotation += p.type === 'fungus' ? 0.005 : p.type === 'cancer' ? 0.003 : p.type === 'biofilm' ? 0.002 : p.type === 'decoy_tcell' ? 0 : 0.01;
      // Bosses and their parts keep themselves on screen
      if (p.type !== 'cancer' && !p.isBoss && !p.isBossPart) wrapPosition(p.pos, W, H, p.radius);
      if (p.type === 'cancer' && !p.isBoss) {
        p.pos.x = Math.min(Math.max(p.pos.x, p.radius), W - p.radius);
        p.pos.y = Math.min(Math.max(p.pos.y, p.radius), H - p.radius);
      }

      // Contact with the ship
      if (p.hidden || p.harmless) continue;
      const contactR = Math.max(ship.radius, engulfR);
      const dxs = p.pos.x - ship.pos.x;
      const dys = p.pos.y - ship.pos.y;
      if (dxs * dxs + dys * dys >= (p.radius + contactR) ** 2) continue;
      const plainContact = dxs * dxs + dys * dys < (p.radius + ship.radius) ** 2;
      const canEat = !p.isBoss && p.type !== 'host_rbc';

      // Macrophage: engulf
      if (engulfR > 0 && canEat && p.radius <= 35) {
        killPathogen(p, { noSplit: true });
        setHealthBoth(Math.min(maxHealth(), healthRef.current + 2));
        continue;
      }
      if (engulfR > 0 && p.isBoss && !abilityHitIdsRef.current.has(p.id)) {
        abilityHitIdsRef.current.add(p.id);
        applyDamage(p, 6);
      }
      if (!plainContact) continue;
      if (mods.cellType === 'macrophage' && canEat && !p.isBossPart && p.radius <= 18) {
        killPathogen(p, { noSplit: true });
        setHealthBoth(Math.min(maxHealth(), healthRef.current + 2));
        continue;
      }
      // NK dash: slice through
      if (dashing) {
        if (!abilityHitIdsRef.current.has(p.id)) {
          abilityHitIdsRef.current.add(p.id);
          applyDamage(p, 4 * fx.damageMult);
          createExplosion(p.pos, '#93c5fd', 6);
        }
        continue;
      }

      const away = Math.atan2(p.pos.y - ship.pos.y, p.pos.x - ship.pos.x);
      if (gameModeRef.current === 'zen') {
        p.vel.x = Math.cos(away) * 3; p.vel.y = Math.sin(away) * 3;
        ship.vel.x -= Math.cos(away) * 2; ship.vel.y -= Math.sin(away) * 2;
        continue;
      }
      if (ap.shield > 0) {
        shakeRef.current = Math.max(shakeRef.current, 5);
        shakeAngleRef.current = away;
        audioRef.current.playShieldBounce();
        if (!p.isBoss) { p.vel.x = Math.cos(away) * 5; p.vel.y = Math.sin(away) * 5; }
      } else {
        damagePlayer(p.isBoss ? 14 : 10, p.pos, 'contact');
        ship.vel.x -= Math.cos(away) * 5;
        ship.vel.y -= Math.sin(away) * 5;
      }
      if (!p.isBoss && !p.invulnerable) applyDamage(p, 1);
    }

    // 4. Antibodies
    const armor: { x: number; y: number; r: number }[] = [];
    for (const p of pathogens) {
      if (!p.dead && p.isBoss && p.bossType) {
        const circles = BOSS_DEFS[p.bossType].armorCircles?.(p);
        if (circles) armor.push(...circles);
      }
    }
    const boostMult = ap.damageBoost > 0 ? 2 : 1;
    const unlockedCount = unlockedClassesRef.current.length;
    const autoTarget = mods.hasAutoTarget;

    compactInPlace<Antibody>(antibodiesRef.current, a => {
      // Homing: Plasma B-cell antibodies and the Auto-Targeting cytokine
      const strength = Math.max(a.homing ?? 0, autoTarget ? AUTO_TARGET_STRENGTH : 0);
      if (strength > 0) {
        const target = nearestTarget(a.pos, 300);
        if (target) {
          const want = angleToTarget(a.pos, target.pos);
          const cur = Math.atan2(a.vel.y, a.vel.x);
          let diff = want - cur;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          const turn = Math.sign(diff) * Math.min(Math.abs(diff), strength);
          const spd = speed(a.vel);
          a.vel.x = Math.cos(cur + turn) * spd;
          a.vel.y = Math.sin(cur + turn) * spd;
          a.rotation = cur + turn;
        }
      }
      applyVelocity(a);
      a.life--;
      wrapPosition(a.pos, W, H);

      // Armoured boss bodies deflect shots
      for (const c of armor) {
        const dx = a.pos.x - c.x;
        const dy = a.pos.y - c.y;
        if (dx * dx + dy * dy < c.r * c.r) {
          createExplosion(a.pos, '#e9d5ff', 2);
          return false;
        }
      }

      let consumed = false;
      for (let pi = 0, plen = pathogens.length; pi < plen && !consumed; pi++) {
        const p = pathogens[pi];
        if (p.dead || p.hidden) continue;
        if (a.hitIds && a.hitIds.includes(p.id)) continue;
        const dx = a.pos.x - p.pos.x;
        const dy = a.pos.y - p.pos.y;
        if (dx * dx + dy * dy >= p.radius * p.radius) continue;

        const result = computeHit(p, {
          damage: a.damage ?? mods.bulletDamage,
          cls: a.cls ?? 'IgG',
          baseSpeed: a.baseSpeed ?? 7,
          boostMult,
          memory: memoryRef.current,
          bossDamageMult: fx.bossDamageMult,
          unlockedClassCount: unlockedCount,
        });
        let dmg = result.damage;

        // Boss parts may react to hits (e.g. Plasmodium's host cells)
        if (p.isBossPart && p.ownerId !== undefined) {
          const owner = pathogens.find(q => q.id === p.ownerId && !q.dead);
          const def = owner?.bossType ? BOSS_DEFS[owner.bossType] : undefined;
          if (owner && def?.onPartHit) dmg = def.onPartHit(gameCtx, owner, p, dmg);
        }

        // Biofilm shield
        if (result.shieldDamage > 0 && p.shieldHealth !== undefined) {
          p.shieldHealth -= result.shieldDamage;
          createExplosion(a.pos, '#38bdf8', 4);
          if (p.shieldHealth <= 0) {
            p.shieldHealth = 0;
            spawnFloatingText(p.pos, 'SHIELD BROKEN', '#ef4444', 14);
            addLysis(p.pos, '#38bdf8', p.radius * 2);
          }
        }

        if (fx.opsonization && !p.harmless) p.marked = 180;

        // Feedback labels, throttled per target so rapid fire doesn't stack text
        if (result.label && !(p.labelCd && p.labelCd > 0)) {
          spawnFloatingText(p.pos, result.label, '#ffffff', 10);
          p.labelCd = 45;
        }
        createExplosion(a.pos, result.resisted ? '#ffffff' : getAntibodyClass(a.cls).color, result.resisted ? 3 : 5);
        applyDamage(p, dmg);
        if (dmg === 0) p.hitFlash = 3;

        if ((a.pierce ?? 0) > 0) {
          a.pierce = (a.pierce ?? 0) - 1;
          (a.hitIds ??= []).push(p.id);
        } else {
          consumed = true;
        }
      }
      return a.life > 0 && !consumed;
    });
    compactInPlace<Pathogen>(pathogensRef.current, p => !p.dead);

    // 5. Enemy projectiles & hazards
    updateProjectiles(projectilesRef.current, ship, W, H, mods.hasInterferon ? INTERFERON_SLOW : 1, proj => {
      if (gameModeRef.current === 'zen') return true;
      if ((ship.dashT ?? 0) > 0) return false;
      if (ap.shield > 0) {
        createExplosion(proj.pos, '#a855f7', 4);
        audioRef.current.playShieldBounce();
        return true;
      }
      const hurt = damagePlayer(proj.damage, proj.pos, 'projectile');
      if (hurt && proj.effect === 'infect') {
        if (status.infected === 0) spawnFloatingText(ship.pos, 'INFECTED — slower fire', '#e879f9', 12);
        status.infected = 240;
      }
      if (hurt && proj.effect === 'slow') { status.slowed = 120; status.slowFactor = 0.6; }
      createExplosion(proj.pos, proj.color, 4);
      return true;
    });
    updateHazards(hazardsRef.current, ship, W, H, {
      onDot: (amount) => { damagePlayer(amount, undefined, 'dot'); },
      onHit: (amount, h) => { damagePlayer(amount, h.pos, 'hazard'); },
      onSlow: (factor) => {
        if (gameModeRef.current === 'zen') return;
        status.slowed = Math.max(status.slowed, 2);
        status.slowFactor = Math.min(status.slowFactor === 1 ? factor : status.slowFactor, factor);
      },
    });
    updateLysis(lysisRef.current);

    // 6. Power-ups
    compactInPlace<PowerUp>(powerUpsRef.current, p => {
      applyVelocity(p);
      p.life--;
      wrapPosition(p.pos, W, H);
      if (circlesCollide(p, ship)) {
        if (p.type === 'rapid_fire') { ap.rapidFire = 300; spawnFloatingText(p.pos, 'RAPID FIRE', '#60a5fa'); }
        if (p.type === 'shield') { ap.shield = mods.shieldDuration; spawnFloatingText(p.pos, 'SHIELD ACTIVE', '#a855f7'); }
        if (p.type === 'damage_boost') { ap.damageBoost = 300; spawnFloatingText(p.pos, 'DAMAGE BOOST', '#fbbf24'); }
        if (p.type === 'bomb') {
          triggerBomb();
          spawnFloatingText(p.pos, 'SYSTEM PURGE', '#ef4444');
          audioRef.current.playBomb();
          haptic(HAPTIC_BOMB);
        }
        if (status.infected > 0) { status.infected = 0; spawnFloatingText(ship.pos, 'INFECTION PURGED', '#4ade80', 12); }
        if (p.type !== 'bomb') audioRef.current.playPowerUp();
        haptic(HAPTIC_POWERUP);
        createExplosion(p.pos, '#ffffff', 10);
        return false;
      }
      return p.life > 0;
    });
    compactInPlace<Pathogen>(pathogensRef.current, p => !p.dead); // bomb kills

    // 7. Floating texts & particles
    compactInPlace<FloatingText>(floatingTextsRef.current, t => {
      applyVelocity(t);
      t.life--;
      return t.life > 0;
    });
    compactInPlace<Particle>(particlesRef.current, p => {
      applyVelocity(p);
      p.life--;
      p.opacity = p.life / 40;
      return p.life > 0;
    });

    // 8. Wave cleared?
    if (pathogensRef.current.length === 0 && gameStateRef.current === 'playing' && !draftOpenRef.current) {
      onWaveCleared();
    }

    // 9. Time Attack countdown
    if (gameModeRef.current === 'time_attack' && gameStateRef.current === 'playing') {
      timeAttackRef.current--;
      const secs = Math.max(0, Math.ceil(timeAttackRef.current / 60));
      if (secs !== timeAttackSecsRef.current) {
        timeAttackSecsRef.current = secs;
        setTimeAttackTimer(secs);
      }
      if (timeAttackRef.current <= 0) {
        spawnFloatingText(ship.pos, 'TIME\'S UP!', '#f59e0b', 28);
        createExplosion(ship.pos, '#f59e0b', 25);
        audioRef.current.playGameOver();
        endGame();
      }
    }

    // 10. Regeneration cytokine
    if (mods.hasRegeneration && ++regenTimerRef.current >= REGEN_INTERVAL) {
      regenTimerRef.current = 0;
      const healed = Math.min(maxHealth(), healthRef.current + REGEN_AMOUNT);
      if (healed !== healthRef.current) setHealthBoth(healed);
    }

    // 11. Screen effects
    shakeRef.current = shakeRef.current > 0.1 ? shakeRef.current * 0.9 : 0;
    if (flashRef.current > 0) flashRef.current--;

    // 12. Direct DOM updates for fast-changing UI (no React renders)
    if (Math.floor(now / STEP_MS) % 4 === 0) updateDomUi();
  };

  const updateDomUi = () => {
    const boss = pathogensRef.current.find(p => p.isBoss && !p.dead);
    if (boss && bossBarFillRef.current) {
      bossBarFillRef.current.style.width = `${Math.max(0, (boss.health / boss.maxHealth) * 100)}%`;
    }
    const cell = getCellType(modifiersRef.current.cellType);
    const cd = Math.round(cell.ability.cooldown * mutFxRef.current.abilityCooldownMult);
    const pct = abilityCdRef.current > 0 ? 1 - abilityCdRef.current / cd : 1;
    for (const el of abilityUiRef.current) {
      if (!el) continue;
      el.style.setProperty('--cd', `${Math.round(pct * 360)}deg`);
      el.dataset.ready = pct >= 1 ? '1' : '0';
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!ctxRef.current) ctxRef.current = canvas.getContext('2d', { alpha: false });
    const ctx = ctxRef.current;
    if (!ctx) return;
    const world = worldRef.current;

    const interpolate = gameStateRef.current === 'playing';
    const ship = shipRef.current;
    const realRotation = ship.rotation;
    if (interpolate) {
      const alpha = isPausedRef.current || draftOpenRef.current ? 1 : alphaRef.current;
      interpolatorRef.current.apply([
        pathogensRef.current, antibodiesRef.current, particlesRef.current,
        powerUpsRef.current, floatingTextsRef.current, projectilesRef.current, hazardsRef.current, [ship],
      ], alpha);
      ship.rotation = lerpAngle(shipPrevRotationRef.current, realRotation, alpha);
    }

    try {
      render(ctx, canvas, {
        ship,
        pathogens: pathogensRef.current,
        antibodies: antibodiesRef.current,
        particles: particlesRef.current,
        powerUps: powerUpsRef.current,
        floatingTexts: floatingTextsRef.current,
        activePowerUps: activePowerUpsRef.current,
        shake: shakeRef.current,
        shakeAngle: shakeAngleRef.current,
        flash: flashRef.current,
        gameState: gameStateRef.current,
        shipHealth: healthRef.current,
        shipMaxHealth: maxHealth(),
        viewWidth: world.w,
        viewHeight: world.h,
        pixelScale: world.pixelScale,
        quality: qualityRef.current,
        projectiles: projectilesRef.current,
        hazards: hazardsRef.current,
        lysis: lysisRef.current,
        status: statusRef.current,
        cellType: modifiersRef.current.cellType,
        membraneColor: modifiersRef.current.membraneColor,
        drones: dronesRef.current.map(d => d.pos),
        colorblind: colorblindRef.current,
      });
    } finally {
      if (interpolate) {
        interpolatorRef.current.restore();
        ship.rotation = realRotation;
      }
    }
  };

  // Always call the latest update/draw closures from the rAF loop
  const frameFnsRef = useRef({ update, draw });
  frameFnsRef.current = { update, draw };

  // --- Effects ---

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { colorblindRef.current = colorblind; writeFlag(COLORBLIND_KEY, colorblind); }, [colorblind]);

  // Size the canvas: world units for gameplay, capped device pixels for sharpness
  const applyCanvasSize = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const cssW = Math.max(1, container.clientWidth);
    const cssH = Math.max(1, container.clientHeight);
    const zoom = Math.min(1, Math.max(MIN_ZOOM, Math.min(cssW, cssH) / WORLD_MIN_DIM));
    const dpr = qualityRef.current === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    worldRef.current = { w: cssW / zoom, h: cssH / zoom, zoom, pixelScale: zoom * dpr };
    ctxRef.current = null;
  };

  useEffect(() => {
    qualityRef.current = quality;
    applyCanvasSize();
  }, [quality]);

  useEffect(() => {
    const handleResize = () => {
      applyCanvasSize();
      setIsMobile(
        window.innerWidth < 768 ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia?.('(pointer: coarse)').matches
      );
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keysRef.current[key] = true;
      if (key === ' ' || key.startsWith('Arrow')) e.preventDefault();
      if (gameStateRef.current === 'playing' && !e.repeat) {
        if (key === 'Escape' && !draftOpenRef.current) setIsPaused(prev => !prev);
        if (key === 'e' || key === 'Shift') virtualControlsRef.current.abilityPressed = true;
        if (key === 'q' || key === 'Tab') {
          virtualControlsRef.current.swapPressed = true;
          if (key === 'Tab') e.preventDefault();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keysRef.current[key] = false;
    };
    const handleVisibility = () => {
      if (document.hidden && gameStateRef.current === 'playing') {
        setIsPaused(true);
        audioRef.current.stopThrust();
        prevThrustingRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('visibilitychange', handleVisibility);

    // Fixed-timestep loop: gameplay always runs at 60 updates/sec of game time.
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastIdleDraw = 0;
    const tick = (now: number) => {
      let dt = now - last;
      last = now;
      if (dt > 250) dt = STEP_MS;
      const running = gameStateRef.current === 'playing' && !isPausedRef.current && !draftOpenRef.current;
      if (running) {
        // Boss-kill slow motion
        const ts = timeScaleRef.current;
        acc += now < ts.until ? dt * ts.scale : dt;
        let steps = 0;
        while (acc >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
          frameFnsRef.current.update();
          acc -= STEP_MS;
          steps++;
          if (gameStateRef.current !== 'playing' || draftOpenRef.current) break;
        }
        if (acc > STEP_MS) acc = 0;
        alphaRef.current = acc / STEP_MS;
        if (steps > 0 || qualityRef.current === 'high') frameFnsRef.current.draw();
        monitorPerformance(dt);
      } else {
        acc = 0;
        if (now - lastIdleDraw > 33) {
          frameFnsRef.current.draw();
          lastIdleDraw = now;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      ro?.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibility);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Drop to low quality automatically if the device can't hold ~45fps
  const monitorPerformance = (dt: number) => {
    if (qualityRef.current === 'low') return;
    const perf = perfRef.current;
    perf.frames++;
    perf.time += dt;
    if (perf.time < 2000) return;
    const avg = perf.time / perf.frames;
    perf.frames = 0;
    perf.time = 0;
    perf.badWindows = avg > 22 ? perf.badWindows + 1 : 0;
    if (perf.badWindows >= 2) {
      qualityRef.current = 'low';
      setQuality('low');
      try { localStorage.setItem(QUALITY_KEY, 'low'); } catch {}
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => { audioRef.current.dispose(); };
  }, []);

  useEffect(() => {
    setTopScores(loadTopScores());
  }, []);

  useEffect(() => {
    if (gameState !== 'gameover') return;
    const finalScore = scoreRef.current;
    const bosses = Object.values(runBossKillsRef.current).reduce((a, b) => a + b, 0);
    setRunSummary(s => ({ ...s, bosses }));
    if (finalScore <= 0 && bosses === 0) return;
    const entry: ScoreEntry = { score: finalScore, level: levelRef.current, date: new Date().toLocaleDateString() };
    const updated = saveTopScore(entry);
    setTopScores(updated);
    const rank = updated.findIndex(s => s.score === finalScore && s.date === entry.date);
    setLastScoreRank(rank >= 0 ? rank : null);

    const timePlayed = Math.round((gameTimeRef.current - runStartRef.current) / 1000);
    let p = awardXp(profile, finalScore);
    p = recordRunStats(p, {
      kills: runKillsRef.current,
      killsByType: { ...runKillsByTypeRef.current },
      bossKills: { ...runBossKillsRef.current },
      score: finalScore,
      level: levelRef.current,
      timePlayed,
    });
    setProfile(p);
  }, [gameState]);

  const startGame = (mode?: GameMode) => {
    const m = mode || gameMode;
    setGameMode(m);
    gameModeRef.current = m;
    setLastScoreRank(null);
    modifiersRef.current = computeModifiers(profile);
    audioRef.current.init();

    if (m === 'campaign') {
      const cl = CAMPAIGN_LEVELS[campaignIdxRef.current];
      campaignLevelRef.current = cl;
      levelRef.current = cl.level;
    } else {
      campaignLevelRef.current = null;
    }

    initGame();

    if (m === 'campaign') {
      levelRef.current = CAMPAIGN_LEVELS[campaignIdxRef.current].level;
      setLevel(levelRef.current);
    }

    gameStateRef.current = 'playing';
    isPausedRef.current = false;
    perfRef.current = { frames: 0, time: 0, badWindows: 0 };
    setGameState('playing');
    setMenuView('upgrades');
    audioRef.current.startMusic();
    if (!readFlag(TUTORIAL_KEY)) setShowTutorial(true);
  };

  const handleModeSelect = (mode: GameMode) => {
    setGameMode(mode);
    gameModeRef.current = mode;
    if (mode === 'campaign') {
      const idx = Math.min(campaignProgress, CAMPAIGN_LEVELS.length - 1);
      campaignIdxRef.current = idx;
      setCampaignLevelIdx(idx);
      campaignLevelRef.current = CAMPAIGN_LEVELS[idx];
      setMenuView('briefing');
    } else {
      startGame(mode);
    }
  };

  const selectCampaignLevel = (idx: number) => {
    campaignIdxRef.current = idx;
    setCampaignLevelIdx(idx);
    campaignLevelRef.current = CAMPAIGN_LEVELS[idx];
  };

  const dismissTutorial = () => {
    setShowTutorial(false);
    writeFlag(TUTORIAL_KEY, true);
  };

  const cellDef = getCellType(profile.cellType);
  const unlockedClasses = unlockedAntibodyClasses(profile.playerLevel);
  const effectiveMax = modifiersRef.current.maxHealth + mutationEffects(runMutations).bonusMaxHealth;
  const campaignFinished = gameMode === 'campaign' && campaignLevelIdx >= CAMPAIGN_LEVELS.length - 1 && health > 0;

  return (
    <div ref={containerRef} className="relative w-full h-[100dvh] overflow-hidden bg-black select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full touch-none"
        id="game-canvas"
      />

      {/* Audio & settings */}
      {gameState === 'playing' && (
        <AudioControls
          audio={audioRef.current}
          colorblind={colorblind}
          onColorblindChange={setColorblind}
        />
      )}

      {/* HUD */}
      <AnimatePresence>
        {gameState === 'playing' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 px-2 pb-2 pt-14 sm:px-4 sm:pt-16 md:px-6 md:pt-16 flex justify-between items-start pointer-events-none"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 sm:gap-3 bg-black/60 border border-white/10 p-1.5 sm:p-3 rounded-lg sm:rounded-xl">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                <div className="w-20 sm:w-36 md:w-48 h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-red-500"
                    animate={{ width: `${(health / effectiveMax) * 100}%` }}
                    transition={{ type: 'spring', bounce: 0 }}
                  />
                </div>
                <span className="font-mono text-[10px] sm:text-sm">{health}/{effectiveMax}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3 bg-black/60 border border-white/10 p-1.5 sm:p-3 rounded-lg sm:rounded-xl">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                <span className="font-mono text-sm sm:text-lg font-bold">{score.toLocaleString()}</span>
              </div>
              {/* Antibody class + ability (desktop shows keys; touch has buttons) */}
              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  onClick={swapClass}
                  disabled={unlockedClasses.length <= 1}
                  aria-label={`Antibody class ${currentClass}. Switch class`}
                  className="flex items-center gap-1 bg-black/60 border rounded-lg px-2 py-1 font-mono text-xs font-bold disabled:opacity-70"
                  style={{ borderColor: `${getAntibodyClass(currentClass).color}66`, color: getAntibodyClass(currentClass).color }}
                >
                  {currentClass}
                  {unlockedClasses.length > 1 && <Repeat2 className="w-3 h-3" />}
                  {!isMobile && unlockedClasses.length > 1 && <span className="text-white/30 font-normal">Q</span>}
                </button>
                {!isMobile && (
                  <button
                    onClick={activateAbility}
                    ref={el => { if (el) abilityUiRef.current[0] = el; }}
                    className="ability-chip flex items-center gap-1 bg-black/60 border border-white/15 rounded-lg px-2 py-1 font-mono text-[11px]"
                    style={{ color: cellDef.color }}
                    title={cellDef.ability.description}
                  >
                    <Sparkles className="w-3 h-3" />
                    {cellDef.ability.name}
                    <span className="text-white/30">E</span>
                  </button>
                )}
              </div>
              {Object.keys(runMutations).length > 0 && (
                <div className="flex flex-wrap gap-1 max-w-[180px]">
                  {(Object.entries(runMutations) as [MutationId, number][]).map(([id, n]) => (
                    <span key={id} title={getMutation(id).name} className="text-xs bg-black/60 border border-purple-500/20 rounded px-1">
                      {getMutation(id).icon}{n > 1 ? <sub className="text-[8px] text-purple-300">{n}</sub> : null}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="bg-black/60 border border-white/10 px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl">
                <span className="text-[9px] sm:text-xs uppercase tracking-widest text-white/50 font-semibold">
                  {gameMode === 'campaign' ? 'Mission' : gameMode === 'zen' ? 'Wave' : 'Level'}
                </span>
                <div className="font-mono text-lg sm:text-2xl font-bold text-center">{level}</div>
              </div>

              {gameMode === 'time_attack' && (
                <div className={`bg-black/60 border px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl ${
                  timeAttackTimer <= 10 ? 'border-red-500/50 animate-pulse' : 'border-yellow-500/30'
                }`}>
                  <span className="text-[9px] sm:text-xs uppercase tracking-widest text-yellow-400/60 font-semibold">Time</span>
                  <div className={`font-mono text-lg sm:text-2xl font-bold text-center ${
                    timeAttackTimer <= 10 ? 'text-red-400' : 'text-yellow-400'
                  }`}>{timeAttackTimer}s</div>
                </div>
              )}

              {gameMode === 'campaign' && campaignLevelRef.current?.objectiveText && (
                <div className="bg-black/60 border border-blue-500/20 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl max-w-[140px] sm:max-w-[200px]">
                  <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-blue-400/60">Objective</span>
                  <div className="font-mono text-[9px] sm:text-[11px] text-blue-300">{campaignLevelRef.current.objectiveText}</div>
                </div>
              )}

              {gameMode === 'zen' && (
                <div className="bg-black/60 border border-purple-500/20 px-3 py-1.5 rounded-xl">
                  <span className="font-mono text-xs text-purple-300/60">Zen Mode</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boss health bar */}
      {gameState === 'playing' && bossUi && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(13.5rem+env(safe-area-inset-bottom))] sm:bottom-auto sm:top-4 w-[min(78vw,420px)] pointer-events-none z-10">
          <div className="flex items-baseline justify-between mb-1 px-0.5">
            <span className="font-mono text-[11px] sm:text-xs font-bold tracking-widest uppercase" style={{ color: bossUi.color }}>
              {bossUi.name}
            </span>
            <span className="font-mono text-[10px] text-white/50">{bossUi.phaseLabel}</span>
          </div>
          <div className="h-2 sm:h-2.5 bg-white/10 rounded-full overflow-hidden border border-white/10">
            <div ref={bossBarFillRef} className="h-full rounded-full" style={{ width: '100%', background: bossUi.color, transition: 'width 120ms linear' }} />
          </div>
        </div>
      )}

      {/* Banner (boss intro / defeat) */}
      <AnimatePresence>
        {banner && gameState === 'playing' && (
          <motion.div
            key={banner.key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-[28%] flex flex-col items-center pointer-events-none z-20 px-6 text-center"
          >
            <div className="font-black italic text-2xl sm:text-4xl tracking-wider" style={{ color: banner.color, textShadow: `0 0 24px ${banner.color}88` }}>
              {banner.title}
            </div>
            <div className="mt-2 font-mono text-[11px] sm:text-sm text-white/70 max-w-md">{banner.subtitle}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Touch controls */}
      <AnimatePresence>
        {gameState === 'playing' && isMobile && (
          <motion.div
            key="touch-controls"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10"
          >
            <TouchControls
              controlsRef={virtualControlsRef}
              abilityRef={el => { if (el) abilityUiRef.current[1] = el; }}
              abilityColor={cellDef.color}
              classLabel={currentClass}
              classColor={getAntibodyClass(currentClass).color}
              canSwap={unlockedClasses.length > 1}
            />
            <button
              aria-label="Pause game"
              onClick={() => setIsPaused(true)}
              className="absolute z-20 top-2 right-20 sm:top-6 sm:right-24 p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl active:bg-white/30"
            >
              <Pause className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* First-run tutorial */}
      {gameState === 'playing' && showTutorial && !draft && (
        <Tutorial
          touch={isMobile}
          controlsRef={virtualControlsRef}
          keysRef={keysRef}
          canSwap={unlockedClasses.length > 1}
          abilityName={cellDef.ability.name}
          onDone={dismissTutorial}
        />
      )}

      {/* Clonal selection */}
      <AnimatePresence>
        {draft && gameState === 'playing' && (
          <DraftOverlay options={draft} owned={runMutations} onPick={pickMutation} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPaused && gameState === 'playing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-30"
          >
            <div className="text-center space-y-4 sm:space-y-6 px-4">
              <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-widest">Protocol Paused</h2>
              <div className="flex flex-col gap-2 items-center">
                <button
                  onClick={() => setIsPaused(false)}
                  className="px-6 sm:px-8 py-2.5 sm:py-3 bg-white text-black font-bold rounded-xl hover:bg-emerald-400 transition-colors"
                >
                  RESUME
                </button>
                <button
                  onClick={() => { setIsPaused(false); endGame(); }}
                  className="px-5 py-2 text-sm bg-white/5 border border-white/15 text-white/60 font-bold rounded-xl hover:bg-white/10"
                >
                  END RUN
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'menu' && menuView === 'upgrades' && (
          <UpgradeScreen
            profile={profile}
            onProfileChange={setProfile}
            onPlay={() => setMenuView('modes')}
            onShowStats={() => setMenuView('stats')}
            onShowLoadout={() => setMenuView('loadout')}
            onShowCodex={() => setMenuView('codex')}
            colorblind={colorblind}
            onColorblindChange={setColorblind}
            onReplayTutorial={() => writeFlag(TUTORIAL_KEY, false)}
          />
        )}

        {gameState === 'menu' && menuView === 'stats' && (
          <StatsPanel profile={profile} onBack={() => setMenuView('upgrades')} />
        )}

        {gameState === 'menu' && menuView === 'loadout' && (
          <LoadoutPanel profile={profile} onProfileChange={setProfile} onBack={() => setMenuView('upgrades')} />
        )}

        {gameState === 'menu' && menuView === 'codex' && (
          <CodexPanel profile={profile} onBack={() => setMenuView('upgrades')} />
        )}

        {gameState === 'menu' && menuView === 'modes' && (
          <ModeSelect
            onSelect={handleModeSelect}
            onBack={() => setMenuView('upgrades')}
            campaignProgress={campaignProgress}
            campaignTotal={CAMPAIGN_LEVELS.length}
          />
        )}

        {gameState === 'menu' && menuView === 'briefing' && campaignLevelRef.current && (
          <CampaignBriefing
            level={CAMPAIGN_LEVELS[campaignLevelIdx]}
            levels={CAMPAIGN_LEVELS}
            selectedIdx={campaignLevelIdx}
            unlockedIdx={Math.min(campaignProgress, CAMPAIGN_LEVELS.length - 1)}
            stars={stars}
            onSelect={selectCampaignLevel}
            onStart={() => startGame('campaign')}
            onBack={() => setMenuView('modes')}
          />
        )}

        {gameState === 'gameover' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 flex items-center justify-center backdrop-blur-md z-20 ${
              campaignFinished ? 'bg-emerald-950/40'
                : gameMode === 'zen' ? 'bg-purple-950/40'
                : gameMode === 'time_attack' ? 'bg-yellow-950/40'
                : 'bg-red-950/40'
            }`}
          >
            <div className={`max-w-md w-full mx-3 p-5 sm:p-8 md:p-12 text-center space-y-4 sm:space-y-6 md:space-y-8 bg-black/80 rounded-2xl sm:rounded-[40px] shadow-2xl max-h-[95vh] overflow-y-auto ${
              campaignFinished ? 'border border-emerald-500/30 shadow-emerald-500/20'
                : gameMode === 'zen' ? 'border border-purple-500/30 shadow-purple-500/20'
                : gameMode === 'time_attack' ? 'border border-yellow-500/30 shadow-yellow-500/20'
                : 'border border-red-500/30 shadow-red-500/20'
            }`}>
              <div className="space-y-2">
                {campaignFinished ? (
                  <>
                    <h2 className="text-2xl sm:text-4xl font-black text-emerald-400 italic uppercase">Host Saved!</h2>
                    <p className="text-white/60 font-mono text-sm">All {CAMPAIGN_LEVELS.length} missions complete. Self-tolerance restored.</p>
                  </>
                ) : gameMode === 'time_attack' ? (
                  <>
                    <h2 className="text-3xl sm:text-5xl font-black text-yellow-400 italic uppercase">Time&apos;s Up!</h2>
                    <p className="text-white/60 font-mono text-sm">The clock has run out.</p>
                  </>
                ) : gameMode === 'zen' ? (
                  <>
                    <h2 className="text-2xl sm:text-4xl font-black text-purple-400 italic uppercase">Session Complete</h2>
                    <p className="text-white/60 font-mono text-sm">A peaceful patrol through the bloodstream.</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl sm:text-5xl font-black text-red-500 italic uppercase">System Failure</h2>
                    <p className="text-white/60 font-mono text-sm">The pathogens have overwhelmed the host.</p>
                  </>
                )}
              </div>

              <div className="py-6 border-y border-white/10 space-y-4">
                <div>
                  <div className="text-xs uppercase text-white/40 mb-2 tracking-widest">Final Score</div>
                  <div className="text-3xl sm:text-5xl md:text-6xl font-mono font-bold">{score.toLocaleString()}</div>
                  {lastScoreRank !== null && lastScoreRank < 3 && (
                    <div className="text-emerald-400 font-mono text-sm mt-1">
                      {lastScoreRank === 0 ? 'NEW #1 RECORD!' : `#${lastScoreRank + 1} ALL TIME`}
                    </div>
                  )}
                </div>

                {gameMode !== 'zen' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                    <div className="text-[10px] uppercase text-yellow-400/60 tracking-widest">XP Earned</div>
                    <div className="font-mono text-xl sm:text-2xl font-bold text-yellow-400">+{score.toLocaleString()}</div>
                    <div className="text-[10px] text-white/30 mt-1">
                      Kills: {runKillsRef.current} · Level reached: {level}
                      {runSummary.bosses > 0 && ` · Bosses: ${runSummary.bosses}`}
                    </div>
                    {runSummary.stars.length > 0 && (
                      <div className="text-[11px] text-yellow-300 mt-1">Stars earned: {runSummary.stars.map(n => '★'.repeat(n)).join(' · ')}</div>
                    )}
                    {Object.keys(runMutations).length > 0 && (
                      <div className="text-sm mt-1">{(Object.keys(runMutations) as MutationId[]).map(id => getMutation(id).icon).join(' ')}</div>
                    )}
                  </div>
                )}

                {topScores.length > 1 && gameMode !== 'zen' && (
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
                  onClick={() => { gameStateRef.current = 'menu'; setGameState('menu'); setMenuView('upgrades'); }}
                  className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 font-bold rounded-2xl hover:bg-white/10 transition-colors"
                >
                  MENU
                </button>
                <button
                  onClick={() => startGame(gameMode)}
                  className={`group relative flex-[2] py-4 text-white font-bold rounded-2xl overflow-hidden transition-transform active:scale-95 ${
                    gameMode === 'time_attack' ? 'bg-yellow-500' : gameMode === 'zen' ? 'bg-purple-500' : 'bg-red-500'
                  }`}
                >
                  <div className={`absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ${
                    gameMode === 'time_attack' ? 'bg-yellow-600' : gameMode === 'zen' ? 'bg-purple-600' : 'bg-red-600'
                  }`} />
                  <span className="relative flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    {gameMode === 'campaign' ? 'REPLAY' : 'RETRY'}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

      {/* Scanlines Effect (skipped on low quality — a full-screen blended layer) */}
      {quality === 'high' && <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />}
    </div>
  );
}
