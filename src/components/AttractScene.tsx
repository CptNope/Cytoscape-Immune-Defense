/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { render, createAttract, resizeAttract, stepAttract, type AttractState } from '../engine';

const STEP_MS = 1000 / 60;
/** Short side of the scene in world units; small screens zoom out to fit it (like the game). */
const WORLD_MIN_DIM = 560;

interface Props {
  /** Pause the simulation (e.g. while the page is hidden behind the game). */
  paused?: boolean;
}

/**
 * The landing page's living background: the real game renderer drawing a
 * self-playing scene. Runs at most 60 steps/sec, pauses when the tab is
 * hidden, and shows a still frame when the system asks for reduced motion.
 */
export default function AttractScene({ paused = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Weaker devices draw at 1x and in low quality
    const touch = navigator.maxTouchPoints > 0;
    const weak = touch && (navigator.hardwareConcurrency || 4) <= 4;
    const quality = weak ? 'low' : 'high';
    let world = { w: 800, h: 600, pixelScale: 1 };
    let scene: AttractState | null = null;

    const resize = () => {
      const cssW = canvas.clientWidth || window.innerWidth;
      const cssH = canvas.clientHeight || window.innerHeight;
      const zoom = Math.max(0.55, Math.min(1, Math.min(cssW, cssH) / WORLD_MIN_DIM));
      const dpr = weak ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      world = { w: cssW / zoom, h: cssH / zoom, pixelScale: zoom * dpr };
      if (!scene) scene = createAttract(world.w, world.h);
      else resizeAttract(scene, world.w, world.h);
    };
    resize();

    const draw = () => {
      if (!scene) return;
      render(ctx, canvas, {
        ship: scene.ship,
        pathogens: scene.pathogens,
        antibodies: scene.antibodies,
        particles: scene.particles,
        powerUps: scene.powerUps,
        floatingTexts: [],
        lysis: scene.lysis,
        activePowerUps: { rapidFire: 0, shield: 0, damageBoost: 0 },
        shake: 0,
        flash: 0,
        gameState: 'playing',
        viewWidth: world.w,
        viewHeight: world.h,
        pixelScale: world.pixelScale,
        quality,
        cellType: 'killer_t',
      });
    };

    if (reduce) {
      // A still frame: let the scene settle, then draw it once. Resizing
      // clears the canvas, so every resize redraws it.
      for (let i = 0; i < 90; i++) stepAttract(scene!);
      const still = () => { resize(); draw(); };
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(still) : null;
      ro?.observe(canvas);
      window.addEventListener('resize', still);
      // Sprites rasterise asynchronously: redraw a few times as they arrive
      const timers = [0, 150, 400, 900].map(ms => window.setTimeout(draw, ms));
      return () => {
        timers.forEach(clearTimeout);
        ro?.disconnect();
        window.removeEventListener('resize', still);
      };
    }

    // Animated: the next frame redraws after any resize
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(100, now - last);
      last = now;
      if (pausedRef.current || document.hidden || !scene) return;
      acc += dt;
      let steps = 0;
      while (acc >= STEP_MS && steps < 3) {
        stepAttract(scene);
        acc -= STEP_MS;
        steps++;
      }
      if (acc > STEP_MS) acc = 0;
      if (steps > 0) draw();
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [reduce]);

  return <canvas ref={canvasRef} aria-hidden="true" className="block w-full h-full" />;
}
