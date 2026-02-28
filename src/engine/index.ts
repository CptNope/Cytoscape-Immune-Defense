/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './types';
export * from './constants';
export * from './physics';
export * from './scores';
export { render } from './renderer';
export type { RenderState } from './renderer';
export { AudioEngine, haptic, HAPTIC_DAMAGE, HAPTIC_POWERUP, HAPTIC_BOMB, HAPTIC_FIRE } from './audio';
export type { AudioSettings } from './audio';
export {
  loadProfile, saveProfile, awardXp, recordRunStats,
  canAffordUpgrade, purchaseUpgrade, getUpgradeCost,
  computeModifiers, calcPlayerLevel, xpToNextLevel, xpProgressPercent,
  resetProfile,
} from './progression';
export { CAMPAIGN_LEVELS, TIME_ATTACK_INITIAL_SECONDS, TIME_ATTACK_KILL_BONUS_SECONDS, TIME_ATTACK_BOSS_BONUS_SECONDS } from './campaign';
