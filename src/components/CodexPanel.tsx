/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Lock } from 'lucide-react';
import { type PlayerProfile, CODEX, memoryProgress, MEMORY_BONUS_PER_LEVEL, MAX_MEMORY_LEVEL } from '../engine';

interface Props {
  profile: PlayerProfile;
  onBack: () => void;
}

/** Pathogen encyclopedia, unlocked by killing each enemy at least once. */
export default function CodexPanel({ profile, onBack }: Props) {
  const [tab, setTab] = useState<'pathogen' | 'boss'>('pathogen');
  const [open, setOpen] = useState<string | null>(null);
  const kills = profile.stats.killsByType ?? {};
  const bossKills = profile.stats.bossKills ?? {};
  const entries = CODEX.filter(e => e.kind === tab);
  const discovered = CODEX.filter(e => (e.kind === 'boss' ? bossKills[e.key] : kills[e.key]) > 0).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-start justify-center bg-black/80 z-10 overflow-y-auto py-4 sm:py-8 px-1"
    >
      <div className="max-w-2xl w-full mx-2 sm:mx-4 space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-white/60 hover:text-white px-2 py-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight">Codex</h1>
          <span className="font-mono text-xs text-white/40 px-2">{discovered}/{CODEX.length}</span>
        </div>

        <div className="flex gap-2 justify-center">
          {(['pathogen', 'boss'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setOpen(null); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                tab === t ? 'bg-white text-black border-white' : 'border-white/15 text-white/60'
              }`}
            >
              {t === 'pathogen' ? 'Pathogens' : 'Bosses'}
            </button>
          ))}
        </div>

        {tab === 'pathogen' && (
          <p className="text-[11px] text-white/40 text-center max-w-md mx-auto">
            Immune memory: every kill of a type builds permanent bonus damage against it
            (+{Math.round(MEMORY_BONUS_PER_LEVEL * 100)}% per level, up to {MAX_MEMORY_LEVEL} levels).
          </p>
        )}

        <div className="grid gap-2">
          {entries.map(e => {
            const count = e.kind === 'boss' ? bossKills[e.key] ?? 0 : kills[e.key] ?? 0;
            const unlocked = count > 0;
            const mem = e.kind === 'pathogen' ? memoryProgress(count) : null;
            const expanded = open === e.id && unlocked;
            return (
              <button
                key={e.id}
                disabled={!unlocked}
                onClick={() => setOpen(expanded ? null : e.id)}
                className={`text-left rounded-xl border p-3 transition-colors ${unlocked ? 'bg-white/5 border-white/10 hover:border-white/25' : 'bg-white/[0.02] border-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: unlocked ? e.color : '#333', boxShadow: unlocked ? `0 0 10px ${e.color}` : undefined }} />
                  <span className="flex-1 font-bold text-sm" style={{ color: unlocked ? e.color : '#555' }}>
                    {unlocked ? e.name : '???'}
                  </span>
                  {unlocked ? (
                    <span className="font-mono text-[10px] text-white/40">
                      {e.kind === 'boss' ? `defeated ×${count}` : `${count} kills`}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-white/30"><Lock className="w-3 h-3" />{e.kind === 'boss' ? 'Defeat to unlock' : 'Kill one to unlock'}</span>
                  )}
                </div>
                {mem && unlocked && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-300/80 w-24 shrink-0">Memory Lv.{mem.level} (+{Math.round(mem.level * MEMORY_BONUS_PER_LEVEL * 100)}%)</span>
                    <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-emerald-400/70" style={{ width: `${Math.round(mem.pct * 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-white/30 w-14 text-right">{mem.next ? `${count}/${mem.next}` : 'MAX'}</span>
                  </div>
                )}
                {expanded && (
                  <div className="mt-3 space-y-2 text-[12px] leading-relaxed">
                    <p className="text-white/80"><span className="text-white/40 uppercase text-[10px] tracking-wider block">Biology</span>{e.biology}</p>
                    <p className="text-white/70"><span className="text-white/40 uppercase text-[10px] tracking-wider block">In Cytoscape</span>{e.inGame}</p>
                    <p className="text-emerald-300/90"><span className="text-white/40 uppercase text-[10px] tracking-wider block">Tip</span>{e.tip}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
