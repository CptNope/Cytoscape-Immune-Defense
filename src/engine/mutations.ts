/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Clonal selection: after each wave the player picks 1 of 3 mutations for the
 * rest of the run. In a real infection, the B and T cells whose receptors fit
 * the invader best are selected and multiply; their descendants keep mutating
 * to bind even better (affinity maturation).
 */

export type MutationId =
  | 'affinity_maturation'
  | 'clonal_expansion'
  | 'multi_epitope'
  | 'piercing_fab'
  | 'opsonization'
  | 'complement_cascade'
  | 'nk_drone'
  | 'membrane_repair'
  | 'thymic_training'
  | 'memory_recall'
  | 'interleukin_2'
  | 'antigen_presentation';

export interface MutationDef {
  id: MutationId;
  name: string;
  description: string;
  maxStacks: number;
  icon: string;
  /** Relative chance to be offered. */
  weight: number;
}

export const MUTATION_DEFS: MutationDef[] = [
  { id: 'affinity_maturation', name: 'Affinity Maturation', description: '+15% antibody damage', maxStacks: 3, icon: '🎯', weight: 10 },
  { id: 'clonal_expansion', name: 'Clonal Expansion', description: '12% faster fire rate', maxStacks: 3, icon: '🧫', weight: 10 },
  { id: 'multi_epitope', name: 'Multi-Epitope', description: 'Fire 2 extra side antibodies (60% damage)', maxStacks: 2, icon: '🔱', weight: 7 },
  { id: 'piercing_fab', name: 'Piercing Fab', description: 'Antibodies pass through 1 more target', maxStacks: 2, icon: '🗡️', weight: 7 },
  { id: 'opsonization', name: 'Opsonization', description: 'Hits tag pathogens: +30% damage taken for 3s', maxStacks: 1, icon: '🏷️', weight: 6 },
  { id: 'complement_cascade', name: 'Complement Cascade', description: 'Kills burst into 6 antibody fragments', maxStacks: 1, icon: '💫', weight: 6 },
  { id: 'nk_drone', name: 'NK Escort', description: 'An NK cell orbits you and fires at the nearest pathogen', maxStacks: 2, icon: '🛰️', weight: 5 },
  { id: 'membrane_repair', name: 'Membrane Repair', description: '+20 max health and fully heal', maxStacks: 5, icon: '❤️‍🩹', weight: 8 },
  { id: 'thymic_training', name: 'Thymic Training', description: '-30% contact damage, longer invulnerability after hits', maxStacks: 2, icon: '🎓', weight: 6 },
  { id: 'memory_recall', name: 'Memory Recall', description: '+7% power-up drop chance', maxStacks: 2, icon: '💡', weight: 5 },
  { id: 'interleukin_2', name: 'Interleukin-2', description: 'Ability cooldown 25% shorter', maxStacks: 2, icon: '⏱️', weight: 6 },
  { id: 'antigen_presentation', name: 'Antigen Presentation', description: '+25% damage vs bosses', maxStacks: 2, icon: '👑', weight: 5 },
];

export type RunMutations = Partial<Record<MutationId, number>>;

export function getMutation(id: MutationId): MutationDef {
  return MUTATION_DEFS.find(m => m.id === id)!;
}

export function stacks(run: RunMutations, id: MutationId): number {
  return run[id] ?? 0;
}

/** Derived numbers the game loop uses. */
export function mutationEffects(run: RunMutations) {
  return {
    damageMult: 1 + 0.15 * stacks(run, 'affinity_maturation'),
    fireDelayMult: Math.pow(0.88, stacks(run, 'clonal_expansion')),
    sideShotStacks: stacks(run, 'multi_epitope'),
    extraPierce: stacks(run, 'piercing_fab'),
    opsonization: stacks(run, 'opsonization') > 0,
    complement: stacks(run, 'complement_cascade') > 0,
    drones: stacks(run, 'nk_drone'),
    bonusMaxHealth: 20 * stacks(run, 'membrane_repair'),
    contactDamageMult: Math.pow(0.7, stacks(run, 'thymic_training')),
    iframeMult: 1 + 0.5 * stacks(run, 'thymic_training'),
    powerUpBonus: 0.07 * stacks(run, 'memory_recall'),
    abilityCooldownMult: Math.pow(0.75, stacks(run, 'interleukin_2')),
    bossDamageMult: 1 + 0.25 * stacks(run, 'antigen_presentation'),
  };
}

export type MutationEffects = ReturnType<typeof mutationEffects>;

/**
 * Picks up to `count` distinct mutations the player can still take, weighted.
 * `rng` returns [0, 1) — injectable for tests.
 */
export function rollDraft(run: RunMutations, count = 3, rng: () => number = Math.random): MutationId[] {
  const pool = MUTATION_DEFS.filter(m => stacks(run, m.id) < m.maxStacks);
  const picks: MutationId[] = [];
  while (picks.length < count && pool.length > 0) {
    const total = pool.reduce((sum, m) => sum + m.weight, 0);
    let roll = rng() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      roll -= pool[idx].weight;
      if (roll < 0) break;
    }
    picks.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  return picks;
}

/** Returns a new run state with `id` taken once more (respecting max stacks). */
export function applyMutation(run: RunMutations, id: MutationId): RunMutations {
  const def = getMutation(id);
  const current = stacks(run, id);
  if (current >= def.maxStacks) return run;
  return { ...run, [id]: current + 1 };
}
