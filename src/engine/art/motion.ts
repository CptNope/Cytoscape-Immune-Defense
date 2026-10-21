/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Vector } from '../types';

/**
 * Render-side motion for entities: a springy pop-in when they appear, smooth
 * turning towards their direction of travel, stretch with speed and a squash
 * when hit. This is purely visual and never touches the simulation.
 *
 * Springs follow the Motion.dev defaults the project's animation skill
 * recommends (stiffness ~300, damping ~20, mass 1): quick, slightly bouncy,
 * settling in about half a second.
 */

interface MotionState {
  /** Render time (seconds) when the entity was first drawn. */
  born: number;
  /** Smoothed facing angle (radians). */
  heading: number;
  /** Scale it pops in from. */
  from: number;
}

const states = new WeakMap<object, MotionState>();

const STIFFNESS = 300;
const DAMPING = 20;
const OMEGA = Math.sqrt(STIFFNESS);                   // natural frequency (mass 1)
const ZETA = DAMPING / (2 * OMEGA);                   // damping ratio ≈ 0.58: one small overshoot
const OMEGA_D = OMEGA * Math.sqrt(1 - ZETA * ZETA);

/** Damped-spring progress from 0 to 1 after `t` seconds (overshoots slightly). */
export function springProgress(t: number): number {
  if (t <= 0) return 0;
  if (t > 1.2) return 1;
  const decay = Math.exp(-ZETA * OMEGA * t);
  return 1 - decay * (Math.cos(OMEGA_D * t) + (ZETA * OMEGA / OMEGA_D) * Math.sin(OMEGA_D * t));
}

export function motionOf(o: object, now: number, initialHeading: number, from = 0.35): MotionState {
  let s = states.get(o);
  if (!s) {
    s = { born: now, heading: initialHeading, from };
    states.set(o, s);
  }
  return s;
}

/** Current pop-in scale (springs from `from` up to 1). */
export function spawnScale(s: MotionState, now: number): number {
  const p = springProgress(now - s.born);
  return s.from + (1 - s.from) * p;
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Turns the stored heading towards the velocity direction, frame-rate independently. */
export function steer(s: MotionState, vel: Vector, dt: number, rate = 7): number {
  const sp2 = vel.x * vel.x + vel.y * vel.y;
  if (sp2 > 0.0025) {
    const target = Math.atan2(vel.y, vel.x);
    const k = 1 - Math.exp(-rate * dt);
    s.heading = wrapAngle(s.heading + wrapAngle(target - s.heading) * k);
  }
  return s.heading;
}
