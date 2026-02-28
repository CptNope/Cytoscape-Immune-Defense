/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vector {
  x: number;
  y: number;
}

export interface Entity {
  pos: Vector;
  vel: Vector;
  radius: number;
  rotation: number;
}

export interface Pathogen extends Entity {
  id: number;
  type: 'virus' | 'bacteria' | 'parasite' | 'fungus';
  variant?: 'armored' | 'swift' | 'stalker';
  health: number;
  points: number;
  sides: number;
  noise: number[];
}

export interface Antibody extends Entity {
  id: number;
  life: number;
}

export interface Particle extends Entity {
  id: number;
  life: number;
  color: string;
  opacity: number;
}

export interface PowerUp extends Entity {
  id: number;
  type: 'rapid_fire' | 'shield' | 'damage_boost' | 'bomb';
  life: number;
}

export interface FloatingText {
  id: number;
  pos: Vector;
  vel: Vector;
  text: string;
  color: string;
  life: number;
  size: number;
}

export interface ScoreEntry {
  score: number;
  level: number;
  date: string;
}

export interface Ship extends Entity {
  thrusting: boolean;
  turning: number;
  lastShot: number;
}

export interface ActivePowerUps {
  rapidFire: number;
  shield: number;
  damageBoost: number;
}

export interface VirtualControls {
  joystickActive: boolean;
  joystickAngle: number;
  joystickDistance: number;
  fire: boolean;
}
