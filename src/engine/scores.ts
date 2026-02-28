/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ScoreEntry } from './types';

const SCORES_STORAGE_KEY = 'cytoscape-top-scores';
const MAX_TOP_SCORES = 10;

export const loadTopScores = (): ScoreEntry[] => {
  try {
    const raw = localStorage.getItem(SCORES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_TOP_SCORES);
  } catch {
    return [];
  }
};

export const saveTopScore = (entry: ScoreEntry): ScoreEntry[] => {
  const scores = loadTopScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, MAX_TOP_SCORES);
  try {
    localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(top));
  } catch {
    // localStorage full or unavailable — silently fail
  }
  return top;
};
