/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Immune memory: adaptive immunity remembers pathogens it has beaten.
 * Every pathogen type you kill builds permanent memory against that type,
 * granting bonus damage (memory B and T cells respond faster and harder
 * on re-exposure — the principle behind vaccination).
 */

/** Lifetime kills needed for each memory level (index 0 = level 1). */
export const MEMORY_THRESHOLDS = [20, 60, 150, 300, 600];
/** Bonus damage per memory level. */
export const MEMORY_BONUS_PER_LEVEL = 0.06;
export const MAX_MEMORY_LEVEL = MEMORY_THRESHOLDS.length;

/** Pathogen types that build memory. */
export const MEMORY_TYPES = ['virus', 'bacteria', 'parasite', 'fungus', 'prion', 'cancer', 'biofilm'] as const;

export function memoryLevel(kills: number): number {
  let lvl = 0;
  for (const t of MEMORY_THRESHOLDS) if (kills >= t) lvl++;
  return lvl;
}

/** Damage multiplier against a type given lifetime kills of that type. */
export function memoryMultiplier(kills: number): number {
  return 1 + memoryLevel(kills) * MEMORY_BONUS_PER_LEVEL;
}

/** Progress (0–1) toward the next memory level. */
export function memoryProgress(kills: number): { level: number; next: number | null; pct: number } {
  const level = memoryLevel(kills);
  if (level >= MAX_MEMORY_LEVEL) return { level, next: null, pct: 1 };
  const prev = level === 0 ? 0 : MEMORY_THRESHOLDS[level - 1];
  const next = MEMORY_THRESHOLDS[level];
  return { level, next, pct: (kills - prev) / (next - prev) };
}

/** Precomputed multipliers for a run, keyed by pathogen type. */
export function memoryTable(killsByType: Record<string, number>): Record<string, number> {
  const table: Record<string, number> = {};
  for (const t of MEMORY_TYPES) table[t] = memoryMultiplier(killsByType[t] ?? 0);
  return table;
}
