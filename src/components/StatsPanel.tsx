/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import type { PlayerProfile } from '../engine';

interface StatsPanelProps {
  profile: PlayerProfile;
  onBack: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function StatsPanel({ profile, onBack }: StatsPanelProps) {
  const { stats } = profile;

  const killTypes = [
    { key: 'virus', label: 'Viruses', color: 'text-amber-400' },
    { key: 'bacteria', label: 'Bacteria', color: 'text-red-400' },
    { key: 'parasite', label: 'Parasites', color: 'text-purple-400' },
    { key: 'fungus', label: 'Fungi', color: 'text-emerald-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-start justify-center bg-black/70 backdrop-blur-sm z-10 overflow-y-auto py-4 sm:py-8"
    >
      <div className="max-w-md w-full mx-3 sm:mx-4 space-y-4 sm:space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-wider">Operator Stats</h2>
          <p className="text-white/30 font-mono text-xs">Lifetime performance data</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <StatCard label="Total Runs" value={stats.totalRuns.toLocaleString()} />
          <StatCard label="Highest Level" value={stats.highestLevel.toString()} />
          <StatCard label="Lifetime Score" value={stats.totalScore.toLocaleString()} />
          <StatCard label="Time Played" value={formatTime(stats.totalTimePlayed)} />
          <StatCard label="Total Kills" value={stats.totalKills.toLocaleString()} className="col-span-2" />
        </div>

        {/* Kills by Type */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
          <div className="text-[10px] uppercase text-white/40 tracking-widest text-center mb-3">Kills by Type</div>
          {killTypes.map(({ key, label, color }) => {
            const count = stats.killsByType[key] || 0;
            const pct = stats.totalKills > 0 ? (count / stats.totalKills) * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-20 ${color}`}>{label}</span>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      key === 'virus' ? 'bg-amber-500' :
                      key === 'bacteria' ? 'bg-red-500' :
                      key === 'parasite' ? 'bg-purple-500' : 'bg-emerald-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  />
                </div>
                <span className="text-xs font-mono text-white/40 w-12 text-right">{count.toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={onBack}
          className="w-full py-2.5 sm:py-3 mb-4 bg-white/5 border border-white/10 text-white/60 font-bold rounded-xl sm:rounded-2xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> BACK
        </button>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-xl p-3 text-center ${className}`}>
      <div className="text-[10px] uppercase text-white/40 tracking-widest">{label}</div>
      <div className="font-mono text-xl font-bold mt-0.5">{value}</div>
    </div>
  );
}
