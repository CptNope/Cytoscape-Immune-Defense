/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { getMutation, type MutationId, type RunMutations } from '../engine';

interface Props {
  options: MutationId[];
  owned: RunMutations;
  onPick: (id: MutationId) => void;
}

/** Between waves: pick 1 of 3 mutations (clonal selection). */
export default function DraftOverlay({ options, owned, onPick }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 px-3 overflow-y-auto py-6"
    >
      <div className="w-full max-w-2xl space-y-4">
        <div className="text-center space-y-1">
          <div className="text-[10px] sm:text-xs tracking-[0.3em] text-purple-300/70 uppercase font-mono">Wave cleared</div>
          <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-wide">Clonal Selection</h2>
          <p className="text-[11px] sm:text-xs text-white/50 font-mono max-w-md mx-auto">
            The cells that bound best multiply and keep mutating. Choose one adaptation for the rest of this run.
          </p>
        </div>
        <div className="grid gap-2 sm:gap-3 sm:grid-cols-3">
          {options.map((id, i) => {
            const m = getMutation(id);
            const have = owned[id] ?? 0;
            return (
              <motion.button
                key={id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.08 * i }}
                onClick={() => onPick(id)}
                className="text-left sm:text-center bg-white/[0.04] hover:bg-purple-500/10 active:scale-[0.98] border border-purple-500/25 hover:border-purple-400/60 rounded-2xl p-3 sm:p-5 flex sm:flex-col items-center gap-3 sm:gap-2 transition-colors"
              >
                <span className="text-3xl sm:text-4xl">{m.icon}</span>
                <span className="flex-1 sm:flex-none">
                  <span className="block font-bold text-sm sm:text-base">{m.name}</span>
                  <span className="block text-[11px] sm:text-xs text-white/55 mt-0.5">{m.description}</span>
                  <span className="block text-[10px] font-mono text-purple-300/60 mt-1">
                    {have > 0 ? `Stack ${have + 1}/${m.maxStacks}` : m.maxStacks > 1 ? `Stacks up to ${m.maxStacks}` : 'Unique'}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
