/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Vector, Entity } from './types';

export const randomRange = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

export const distance = (v1: Vector, v2: Vector): number =>
  Math.sqrt((v2.x - v1.x) ** 2 + (v2.y - v1.y) ** 2);

export const circlesCollide = (
  a: { pos: Vector; radius: number },
  b: { pos: Vector; radius: number }
): boolean => distance(a.pos, b.pos) < a.radius + b.radius;

export const wrapPosition = (
  pos: Vector,
  width: number,
  height: number,
  margin = 0
): void => {
  if (pos.x < -margin) pos.x = width + margin;
  if (pos.x > width + margin) pos.x = -margin;
  if (pos.y < -margin) pos.y = height + margin;
  if (pos.y > height + margin) pos.y = -margin;
};

export const applyVelocity = (entity: Entity): void => {
  entity.pos.x += entity.vel.x;
  entity.pos.y += entity.vel.y;
};

export const applyFriction = (entity: Entity, friction: number): void => {
  entity.vel.x *= friction;
  entity.vel.y *= friction;
};

export const angleToTarget = (from: Vector, to: Vector): number =>
  Math.atan2(to.y - from.y, to.x - from.x);

export const speed = (vel: Vector): number =>
  Math.sqrt(vel.x ** 2 + vel.y ** 2);

export const clampSpeed = (vel: Vector, maxSpeed: number): void => {
  const s = speed(vel);
  if (s > maxSpeed) {
    vel.x = (vel.x / s) * maxSpeed;
    vel.y = (vel.y / s) * maxSpeed;
  }
};
