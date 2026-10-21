/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Zap, Sparkles, Repeat2 } from 'lucide-react';
import type { VirtualControls } from '../engine';

/** Max distance (CSS px) the knob travels from the stick's centre. */
const STICK_RADIUS = 56;
/** Below this fraction of STICK_RADIUS the stick is ignored entirely. */
const DEAD_ZONE = 0.15;
/** Where the stick rests when no finger is on it (from bottom-left corner). */
const REST_OFFSET_X = 96;
const REST_OFFSET_Y = 120;

interface Props {
  controlsRef: React.MutableRefObject<VirtualControls>;
  /** Receives the ability button so the game can paint its cooldown ring. */
  abilityRef?: (el: HTMLElement | null) => void;
  abilityColor?: string;
  classLabel?: string;
  classColor?: string;
  canSwap?: boolean;
}

/**
 * Full-screen twin-zone touch controls.
 *
 * - Left half: a floating joystick that appears wherever the thumb lands and
 *   follows the thumb if it drifts past the edge, so you never "lose" it.
 * - Right half: hold anywhere to fire.
 *
 * Each zone tracks its own pointer id with pointer capture, so the two thumbs
 * can't interfere with each other (the old version listened to every pointer
 * on the window, which made the stick jump when you tapped fire). All visual
 * updates go straight to the DOM, so moving the stick costs no React renders.
 */
export default function TouchControls({ controlsRef, abilityRef, abilityColor = '#ffffff', classLabel = 'IgG', classColor = '#4ade80', canSwap = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const fireRef = useRef<HTMLDivElement>(null);

  const stickPointer = useRef<number | null>(null);
  const firePointers = useRef<Set<number>>(new Set());
  const origin = useRef({ x: 0, y: 0 });

  const restPosition = () => {
    const root = rootRef.current;
    const h = root?.clientHeight ?? window.innerHeight;
    return { x: REST_OFFSET_X, y: h - REST_OFFSET_Y };
  };

  const placeBase = (x: number, y: number, active: boolean) => {
    const base = baseRef.current;
    if (!base) return;
    base.style.transform = `translate3d(${x - STICK_RADIUS}px, ${y - STICK_RADIUS}px, 0)`;
    base.style.opacity = active ? '1' : '0.45';
  };

  const placeKnob = (dx: number, dy: number) => {
    const knob = knobRef.current;
    if (knob) knob.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  };

  const setFiring = (firing: boolean) => {
    controlsRef.current.fire = firing;
    fireRef.current?.classList.toggle('is-firing', firing);
  };

  const releaseStick = () => {
    stickPointer.current = null;
    const c = controlsRef.current;
    c.joystickActive = false;
    c.joystickDistance = 0;
    const rest = restPosition();
    origin.current = rest;
    placeBase(rest.x, rest.y, false);
    placeKnob(0, 0);
  };

  const moveStick = (x: number, y: number) => {
    let dx = x - origin.current.x;
    let dy = y - origin.current.y;
    let dist = Math.hypot(dx, dy);

    // Drag the base along when the thumb overshoots, so reversing direction
    // responds immediately instead of first having to travel back.
    if (dist > STICK_RADIUS) {
      const excess = dist - STICK_RADIUS;
      origin.current.x += (dx / dist) * excess;
      origin.current.y += (dy / dist) * excess;
      dx = x - origin.current.x;
      dy = y - origin.current.y;
      dist = STICK_RADIUS;
      placeBase(origin.current.x, origin.current.y, true);
    }

    const amount = dist / STICK_RADIUS;
    const c = controlsRef.current;
    if (amount < DEAD_ZONE) {
      c.joystickActive = false;
      c.joystickDistance = 0;
    } else {
      c.joystickActive = true;
      c.joystickAngle = Math.atan2(dy, dx);
      c.joystickDistance = Math.min(1, (amount - DEAD_ZONE) / (1 - DEAD_ZONE));
    }
    placeKnob(dx, dy);
  };

  const localPoint = (e: React.PointerEvent) => {
    const rect = rootRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const p = localPoint(e);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}

    if (p.x < p.w / 2 && stickPointer.current === null) {
      stickPointer.current = e.pointerId;
      // Keep the whole stick on screen
      const ox = Math.min(Math.max(p.x, STICK_RADIUS + 8), p.w / 2 - 8);
      const oy = Math.min(Math.max(p.y, STICK_RADIUS + 8), p.h - STICK_RADIUS - 8);
      origin.current = { x: ox, y: oy };
      placeBase(ox, oy, true);
      moveStick(p.x, p.y);
    } else {
      firePointers.current.add(e.pointerId);
      setFiring(true);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickPointer.current) return;
    const p = localPoint(e);
    moveStick(p.x, p.y);
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === stickPointer.current) releaseStick();
    if (firePointers.current.delete(e.pointerId)) {
      setFiring(firePointers.current.size > 0);
    }
  };

  // Initial placement + reset controls when unmounted (e.g. game over)
  useEffect(() => {
    releaseStick();
    const onResize = () => { if (stickPointer.current === null) releaseStick(); };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      const c = controlsRef.current;
      c.joystickActive = false;
      c.joystickDistance = 0;
      c.fire = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 touch-none select-none"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Joystick (visual only — the whole left half is the touch zone) */}
      <div
        ref={baseRef}
        className="absolute top-0 left-0 rounded-full border border-white/20 bg-white/5 pointer-events-none transition-opacity duration-150"
        style={{ width: STICK_RADIUS * 2, height: STICK_RADIUS * 2, willChange: 'transform' }}
      >
        <div
          ref={knobRef}
          className="absolute rounded-full bg-white/25 border border-white/50"
          style={{
            width: 48, height: 48,
            left: STICK_RADIUS - 24, top: STICK_RADIUS - 24,
            willChange: 'transform',
          }}
        />
      </div>

      {/* Fire indicator (visual only — the whole right half fires) */}
      <div
        ref={fireRef}
        className="fire-pad absolute pointer-events-none w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-emerald-500/40 bg-emerald-500/15 flex items-center justify-center"
        style={{
          right: 'calc(1.5rem + env(safe-area-inset-right))',
          bottom: 'calc(4.5rem + env(safe-area-inset-bottom))',
        }}
      >
        <Zap className="w-9 h-9 text-emerald-400" />
      </div>

      {/* Ability + antibody-class buttons (real buttons: they don't fire) */}
      <div
        className="absolute flex flex-col items-center gap-3"
        style={{
          right: 'calc(1.5rem + env(safe-area-inset-right))',
          bottom: 'calc(10.5rem + env(safe-area-inset-bottom))',
        }}
      >
        <button
          ref={abilityRef}
          aria-label="Use cell ability"
          className="ability-btn relative w-14 h-14 rounded-full flex items-center justify-center border border-white/20"
          style={{ color: abilityColor }}
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); controlsRef.current.abilityPressed = true; }}
        >
          <Sparkles className="w-6 h-6 relative" />
        </button>
        {canSwap && (
          <button
            aria-label={`Switch antibody class (current ${classLabel})`}
            className="w-12 h-12 rounded-full flex flex-col items-center justify-center bg-black/40 border font-mono text-[10px] font-bold leading-none"
            style={{ borderColor: `${classColor}88`, color: classColor }}
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); controlsRef.current.swapPressed = true; }}
          >
            <Repeat2 className="w-4 h-4 mb-0.5" />
            {classLabel}
          </button>
        )}
      </div>

      {/* Subtle hint dividing the two zones */}
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.03] pointer-events-none" />
    </div>
  );
}
