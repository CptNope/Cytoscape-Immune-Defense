/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import type { VirtualControls } from '../engine';

interface Props {
  touch: boolean;
  controlsRef: React.MutableRefObject<VirtualControls>;
  keysRef: React.MutableRefObject<Record<string, boolean>>;
  canSwap: boolean;
  abilityName: string;
  onDone: () => void;
}

/**
 * First-run hints that tick themselves off as the player does each thing.
 * Polls the control refs a few times a second instead of hooking into the loop.
 */
export default function Tutorial({ touch, controlsRef, keysRef, canSwap, abilityName, onDone }: Props) {
  const [done, setDone] = useState({ move: false, fire: false, ability: false, swap: !canSwap });

  useEffect(() => {
    const id = window.setInterval(() => {
      const c = controlsRef.current;
      const k = keysRef.current;
      setDone(d => ({
        move: d.move || c.joystickActive || !!(k['w'] || k['a'] || k['d'] || k['ArrowUp'] || k['ArrowLeft'] || k['ArrowRight']),
        fire: d.fire || c.fire || !!(k[' '] || k['f']),
        ability: d.ability || (c.abilityUses ?? 0) > 0,
        swap: d.swap || (c.swapUses ?? 0) > 0,
      }));
    }, 120);
    return () => window.clearInterval(id);
  }, [controlsRef, keysRef]);

  const allDone = done.move && done.fire && done.ability && done.swap;
  useEffect(() => {
    if (!allDone) return;
    const t = window.setTimeout(onDone, 900);
    return () => window.clearTimeout(t);
  }, [allDone, onDone]);

  const steps = [
    { key: 'move', text: touch ? 'Drag anywhere on the LEFT half to steer and thrust' : 'W / ↑ to thrust, A D / ← → to turn' },
    { key: 'fire', text: touch ? 'Hold anywhere on the RIGHT half to fire antibodies' : 'Space (or F) to fire antibodies' },
    { key: 'ability', text: touch ? `Tap ✦ for your ability: ${abilityName}` : `E (or Shift) for your ability: ${abilityName}` },
    ...(canSwap ? [{ key: 'swap', text: touch ? 'Tap ⇄ to switch antibody class' : 'Q (or Tab) to switch antibody class' }] : []),
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute left-1/2 -translate-x-1/2 top-[30%] z-20 w-[min(92vw,360px)] bg-black/75 border border-emerald-500/30 rounded-2xl p-3 pointer-events-auto"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-mono">Field training</span>
        <button aria-label="Skip tutorial" onClick={onDone} className="text-white/40 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="space-y-1.5">
        {steps.map(s => {
          const ok = done[s.key as keyof typeof done];
          return (
            <li key={s.key} className={`flex items-start gap-2 text-xs ${ok ? 'text-white/35 line-through' : 'text-white/85'}`}>
              <span className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${ok ? 'border-emerald-400 bg-emerald-500/20' : 'border-white/30'}`}>
                {ok && <Check className="w-3 h-3 text-emerald-400" />}
              </span>
              {s.text}
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
