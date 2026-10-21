/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Lock, Check } from 'lucide-react';
import {
  type PlayerProfile,
  CELL_TYPES, ANTIBODY_CLASSES, CYTOKINE_DEFS, CYTOKINE_SLOTS, MEMBRANE_COSMETICS,
  activeCytokines, setCellType, toggleCytokine, buyCosmetic, equipCosmetic,
} from '../engine';

interface Props {
  profile: PlayerProfile;
  onProfileChange: (p: PlayerProfile) => void;
  onBack: () => void;
}

const Section = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <section className="space-y-2">
    <div className="text-center">
      <h2 className="text-xs uppercase text-white/40 tracking-widest">{title}</h2>
      {hint && <p className="text-[10px] text-white/30 mt-0.5">{hint}</p>}
    </div>
    {children}
  </section>
);

export default function LoadoutPanel({ profile, onProfileChange, onBack }: Props) {
  const equipped = activeCytokines(profile);
  const apply = (p: PlayerProfile | null) => { if (p) onProfileChange(p); };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-start justify-center bg-black/80 z-10 overflow-y-auto py-4 sm:py-8 px-1"
    >
      <div className="max-w-2xl w-full mx-2 sm:mx-4 space-y-5 pb-6">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-white/60 hover:text-white px-2 py-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight">Loadout</h1>
          <span className="font-mono text-xs text-yellow-400 px-2">{profile.xp.toLocaleString()} XP</span>
        </div>

        <Section title="Cell type" hint="Each cell plays differently and has its own active ability (E / ✦).">
          <div className="grid gap-2 sm:grid-cols-2">
            {CELL_TYPES.map(cell => {
              const unlocked = profile.playerLevel >= cell.unlockPlayerLevel;
              const selected = profile.cellType === cell.id;
              return (
                <button
                  key={cell.id}
                  disabled={!unlocked}
                  onClick={() => apply(setCellType(profile, cell.id))}
                  className={`text-left rounded-xl p-3 border transition-colors ${
                    selected ? 'bg-white/10 border-emerald-400/60' : unlocked ? 'bg-white/5 border-white/10 hover:border-white/30' : 'bg-white/[0.02] border-white/5 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm" style={{ color: unlocked ? cell.color : undefined }}>{cell.name}</span>
                    {selected ? <Check className="w-4 h-4 text-emerald-400" /> : !unlocked && (
                      <span className="flex items-center gap-1 text-[10px] text-white/40"><Lock className="w-3 h-3" />Lv.{cell.unlockPlayerLevel}</span>
                    )}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">{cell.role}</div>
                  <p className="text-[11px] text-white/55 mt-1">{cell.description}</p>
                  <p className="text-[11px] mt-1"><span className="text-white/70 font-semibold">{cell.ability.name}:</span> <span className="text-white/50">{cell.ability.description}</span></p>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Antibody classes" hint="All unlocked classes are available in every run. Switch with Q / ⇄.">
          <div className="grid gap-2 sm:grid-cols-2">
            {ANTIBODY_CLASSES.map(c => {
              const unlocked = profile.playerLevel >= c.unlockPlayerLevel;
              return (
                <div key={c.id} className={`rounded-xl p-3 border bg-white/5 ${unlocked ? 'border-white/10' : 'border-white/5 opacity-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold" style={{ color: c.color }}>{c.name}</span>
                    {!unlocked && <span className="flex items-center gap-1 text-[10px] text-white/40"><Lock className="w-3 h-3" />Lv.{c.unlockPlayerLevel}</span>}
                  </div>
                  <p className="text-[11px] text-white/55 mt-1">{c.description}</p>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title={`Cytokines (${equipped.length}/${CYTOKINE_SLOTS} equipped)`} hint="Passive signals. Tap to equip or unequip.">
          <div className="grid gap-2">
            {CYTOKINE_DEFS.map(def => {
              const unlocked = profile.cytokines[def.id];
              const on = equipped.includes(def.id);
              const full = !on && equipped.length >= CYTOKINE_SLOTS;
              return (
                <button
                  key={def.id}
                  disabled={!unlocked || full}
                  onClick={() => apply(toggleCytokine(profile, def.id))}
                  className={`flex items-center gap-3 rounded-xl p-3 border text-left transition-colors ${
                    on ? 'bg-purple-500/10 border-purple-400/50' : unlocked ? 'bg-white/5 border-white/10 hover:border-white/30' : 'bg-white/[0.02] border-white/5 opacity-50'
                  } ${full && unlocked ? 'opacity-60' : ''}`}
                >
                  <span className="text-2xl w-9 text-center">{unlocked ? def.icon : '🔒'}</span>
                  <span className="flex-1">
                    <span className="block font-bold text-sm">{def.name}</span>
                    <span className="block text-[11px] text-white/45">{def.description}</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider">
                    {!unlocked ? <span className="text-white/30">Lv.{def.unlockPlayerLevel}</span>
                      : on ? <span className="text-purple-300">Equipped</span>
                      : full ? <span className="text-white/30">Slots full</span>
                      : <span className="text-white/50">Equip</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Membrane" hint="Cosmetic only.">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MEMBRANE_COSMETICS.map(c => {
              const owned = profile.cosmetics.owned.includes(c.id);
              const on = profile.cosmetics.equipped === c.id;
              const affordable = profile.xp >= c.cost;
              return (
                <button
                  key={c.id}
                  onClick={() => apply(owned ? equipCosmetic(profile, c.id) : buyCosmetic(profile, c.id))}
                  disabled={!owned && !affordable}
                  className={`flex items-center gap-2 rounded-xl p-2.5 border text-left ${
                    on ? 'border-emerald-400/60 bg-white/10' : 'border-white/10 bg-white/5'
                  } ${!owned && !affordable ? 'opacity-50' : ''}`}
                >
                  <span className="w-6 h-6 rounded-full border-2 shrink-0" style={{ borderColor: c.color, boxShadow: `0 0 8px ${c.color}66` }} />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold truncate">{c.name}</span>
                    <span className="block text-[10px] text-white/40">
                      {on ? 'Equipped' : owned ? 'Owned' : `${c.cost.toLocaleString()} XP`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      </div>
    </motion.div>
  );
}
