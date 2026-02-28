/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Play, ChevronUp, Lock, Sparkles } from 'lucide-react';
import type { PlayerProfile } from '../engine';
import {
  UPGRADE_DEFS,
  CYTOKINE_DEFS,
  canAffordUpgrade,
  purchaseUpgrade,
  getUpgradeCost,
  xpProgressPercent,
  xpToNextLevel,
  MAX_PLAYER_LEVEL,
} from '../engine';

interface UpgradeScreenProps {
  profile: PlayerProfile;
  onProfileChange: (p: PlayerProfile) => void;
  onPlay: () => void;
  onShowStats: () => void;
}

export default function UpgradeScreen({ profile, onProfileChange, onPlay, onShowStats }: UpgradeScreenProps) {
  const handlePurchase = (id: Parameters<typeof purchaseUpgrade>[1]) => {
    const updated = purchaseUpgrade(profile, id);
    if (updated) onProfileChange(updated);
  };

  const xpPct = xpProgressPercent(profile);
  const toNext = xpToNextLevel(profile);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-start justify-center bg-black/70 backdrop-blur-sm z-10 overflow-y-auto py-4 sm:py-8 px-1"
    >
      <div className="max-w-2xl w-full mx-2 sm:mx-4 space-y-4 sm:space-y-6">
        {/* Header: Player Level & XP */}
        <div className="text-center space-y-3">
          <motion.h1
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl sm:text-5xl font-black tracking-tighter italic uppercase"
          >
            CYTOSCAPE
          </motion.h1>
          <p className="text-emerald-400 font-mono text-sm tracking-widest uppercase">Immune Defense Protocol</p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 inline-block min-w-0 sm:min-w-[280px] w-full sm:w-auto max-w-[320px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase text-white/40 tracking-widest">Operator Level</span>
              <span className="font-mono text-xl font-bold text-emerald-400">{profile.playerLevel}</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-1">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-white/30 font-mono">
              <span>{profile.lifetimeXp.toLocaleString()} XP total</span>
              {profile.playerLevel < MAX_PLAYER_LEVEL ? (
                <span>{toNext.toLocaleString()} XP to next</span>
              ) : (
                <span>MAX LEVEL</span>
              )}
            </div>
            <div className="mt-2 text-sm font-mono">
              <span className="text-yellow-400">{profile.xp.toLocaleString()}</span>
              <span className="text-white/30"> XP available</span>
            </div>
          </div>
        </div>

        {/* Upgrade Tree */}
        <div className="space-y-2">
          <h2 className="text-xs uppercase text-white/40 tracking-widest text-center">Ship Upgrades</h2>
          <div className="grid gap-2">
            {UPGRADE_DEFS.map(def => {
              const lvl = profile.upgrades[def.id];
              const maxed = lvl >= def.maxLevel;
              const cost = getUpgradeCost(profile, def.id);
              const affordable = canAffordUpgrade(profile, def.id);

              return (
                <div
                  key={def.id}
                  className={`flex items-center gap-3 bg-white/5 border rounded-xl p-3 transition-colors ${
                    maxed ? 'border-emerald-500/20' : affordable ? 'border-yellow-500/20' : 'border-white/10'
                  }`}
                >
                  <span className="text-2xl w-10 text-center">{def.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm truncate">{def.name}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: def.maxLevel }, (_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < lvl ? 'bg-emerald-400' : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-white/40">{def.description}</p>
                  </div>
                  {maxed ? (
                    <span className="text-[10px] uppercase text-emerald-400 font-bold tracking-wider px-3">MAX</span>
                  ) : (
                    <button
                      aria-label={`Upgrade ${def.name} for ${cost} XP`}
                      onClick={() => handlePurchase(def.id)}
                      disabled={!affordable}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        affordable
                          ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 active:scale-95'
                          : 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed'
                      }`}
                    >
                      <ChevronUp className="w-3 h-3" />
                      {cost?.toLocaleString()}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cytokine Signals */}
        <div className="space-y-2">
          <h2 className="text-xs uppercase text-white/40 tracking-widest text-center">Cytokine Signals</h2>
          <div className="grid gap-2">
            {CYTOKINE_DEFS.map(def => {
              const unlocked = profile.cytokines[def.id];
              return (
                <div
                  key={def.id}
                  className={`flex items-center gap-3 bg-white/5 border rounded-xl p-3 ${
                    unlocked ? 'border-purple-500/20' : 'border-white/10 opacity-50'
                  }`}
                >
                  <span className="text-2xl w-10 text-center">{unlocked ? def.icon : '🔒'}</span>
                  <div className="flex-1">
                    <span className="font-bold text-sm">{def.name}</span>
                    <p className="text-[11px] text-white/40">{def.description}</p>
                  </div>
                  {unlocked ? (
                    <span className="flex items-center gap-1 text-[10px] uppercase text-purple-400 font-bold tracking-wider">
                      <Sparkles className="w-3 h-3" /> ACTIVE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] uppercase text-white/20 font-bold tracking-wider">
                      <Lock className="w-3 h-3" /> Lv.{def.unlockPlayerLevel}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 sm:gap-3 pb-4">
          <button
            onClick={onShowStats}
            className="flex-1 py-2.5 sm:py-3 bg-white/5 border border-white/10 text-white/60 font-bold rounded-xl sm:rounded-2xl hover:bg-white/10 transition-colors text-sm sm:text-base"
          >
            STATS
          </button>
          <button
            onClick={onPlay}
            className="group relative flex-[2] py-3 sm:py-4 bg-white text-black font-bold rounded-xl sm:rounded-2xl overflow-hidden transition-transform active:scale-95"
          >
            <div className="absolute inset-0 bg-emerald-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center justify-center gap-2">
              <Play className="w-5 h-5 fill-current" />
              INITIALIZE DEFENSE
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
