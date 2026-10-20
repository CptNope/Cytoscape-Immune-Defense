/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Play, ArrowLeft, Lock } from 'lucide-react';
import { type CampaignLevel, BOSS_DEFS, parTime } from '../engine';

interface CampaignBriefingProps {
  level: CampaignLevel;
  levels: CampaignLevel[];
  selectedIdx: number;
  /** Highest level index the player may start from. */
  unlockedIdx: number;
  /** Best stars per level number. */
  stars: Record<number, number>;
  onSelect: (idx: number) => void;
  onStart: () => void;
  onBack: () => void;
}

export default function CampaignBriefing({ level, levels, selectedIdx, unlockedIdx, stars, onSelect, onStart, onBack }: CampaignBriefingProps) {
  const totalStars = Object.values<number>(stars).reduce((a, b) => a + b, 0);
  // Act headings live on the first level of each act
  const actFor = (idx: number) => {
    for (let i = idx; i >= 0; i--) if (levels[i].act) return levels[i].act;
    return '';
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        background: 'radial-gradient(ellipse at center, #0a1020 0%, #0a0505 70%)',
        padding: 'env(safe-area-inset-top, 12px) 16px env(safe-area-inset-bottom, 12px)',
        paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)',
        zIndex: 25,
        fontFamily: "'JetBrains Mono', monospace",
        color: '#e5e5e5',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{ width: '100%', maxWidth: '520px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#a3a3a3', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', padding: '4px' }}
        >
          <ArrowLeft size={14} /> Modes
        </button>
        <span style={{ fontSize: '11px', color: '#fbbf24' }}>★ {totalStars}/{levels.length * 3}</span>
      </div>

      {/* Level select */}
      <div style={{ width: '100%', maxWidth: '520px', margin: '10px 0 14px' }}>
        {[0, 20].filter(start => start < levels.length).map(start => (
          <div key={start} style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '10px', color: '#737373', letterSpacing: '2px', marginBottom: '4px' }}>{actFor(start)?.toUpperCase()}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px' }}>
              {levels.slice(start, start + 20).map((l, j) => {
                const idx = start + j;
                const locked = idx > unlockedIdx;
                const sel = idx === selectedIdx;
                const st = stars[l.level] ?? 0;
                return (
                  <button
                    key={l.level}
                    disabled={locked}
                    onClick={() => onSelect(idx)}
                    aria-label={`Mission ${l.level}${locked ? ' (locked)' : `, ${st} stars`}`}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '6px',
                      border: `1px solid ${sel ? '#60a5fa' : l.boss ? '#ef444466' : '#ffffff1a'}`,
                      background: sel ? 'rgba(96,165,250,0.18)' : locked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                      color: locked ? '#404040' : l.boss ? '#fca5a5' : '#e5e5e5',
                      fontSize: '11px',
                      fontFamily: 'inherit',
                      cursor: locked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    {locked ? <Lock size={10} /> : l.level}
                    {!locked && <span style={{ fontSize: '7px', color: '#fbbf24', marginTop: '2px', letterSpacing: '-1px' }}>{'★'.repeat(st)}{'·'.repeat(3 - st)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Level number */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ fontSize: '11px', color: '#60a5fa', letterSpacing: '3px', marginBottom: '4px' }}
      >
        MISSION {level.level} OF {levels.length}
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{
          fontSize: 'clamp(22px, 5vw, 32px)',
          color: level.boss ? '#ef4444' : '#ffffff',
          marginBottom: 'clamp(12px, 3vw, 24px)',
          textAlign: 'center',
          letterSpacing: '2px',
          textShadow: level.boss ? '0 0 20px rgba(239,68,68,0.5)' : 'none',
        }}
      >
        {level.title}
      </motion.h1>

      {/* Briefing text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          maxWidth: '480px',
          width: '100%',
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          lineHeight: '1.6',
          color: '#a3a3a3',
          textAlign: 'center',
          marginBottom: 'clamp(14px, 3vw, 28px)',
        }}
      >
        {level.briefing}
      </motion.div>

      {/* Objective */}
      {level.objectiveText && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            fontSize: '11px',
            color: '#fbbf24',
            marginBottom: 'clamp(12px, 3vw, 24px)',
            padding: '6px 12px',
            border: '1px solid #fbbf2440',
            borderRadius: '6px',
            background: 'rgba(251, 191, 36, 0.05)',
            textAlign: 'center',
            maxWidth: '480px',
            width: '100%',
          }}
        >
          OBJECTIVE: {level.objectiveText}
        </motion.div>
      )}

      {/* Enemy preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: 'clamp(14px, 3vw, 28px)',
          maxWidth: '480px',
          width: '100%',
        }}
      >
        {level.pathogens.map((p, i) => {
          const typeColor: Record<string, string> = {
            virus: '#f59e0b',
            bacteria: '#ef4444',
            parasite: '#a855f7',
            fungus: '#10b981',
            prion: '#94a3b8',
            cancer: '#f472b6',
            biofilm: '#38bdf8',
          };
          return (
            <span
              key={i}
              style={{
                fontSize: '11px',
                color: typeColor[p.type] || '#737373',
                padding: '4px 10px',
                border: `1px solid ${(typeColor[p.type] || '#737373')}40`,
                borderRadius: '4px',
                background: `${typeColor[p.type] || '#737373'}10`,
              }}
            >
              {p.variant ? `${p.variant} ` : ''}{p.type} x{p.count}
            </span>
          );
        })}
        {level.boss && (
          <span
            style={{
              fontSize: '11px',
              color: '#ef4444',
              padding: '4px 10px',
              border: '1px solid #ef444460',
              borderRadius: '4px',
              background: 'rgba(239, 68, 68, 0.1)',
              fontWeight: 700,
            }}
          >
            BOSS: {BOSS_DEFS[level.boss].name.toUpperCase()}
          </span>
        )}
        <span style={{ fontSize: '10px', color: '#737373', padding: '4px 6px', width: '100%', textAlign: 'center' }}>
          ★ clear · ★ take ≤25% damage · ★ under {parTime(level)}s
        </span>
      </motion.div>

      {/* Start button */}
      <motion.button
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.7 }}
        onClick={onStart}
        whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(96, 165, 250, 0.3)' }}
        whileTap={{ scale: 0.95 }}
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
          border: '2px solid #60a5fa',
          borderRadius: '12px',
          padding: 'clamp(10px, 2.5vw, 14px) clamp(24px, 5vw, 36px)',
          color: '#60a5fa',
          fontSize: 'clamp(14px, 3vw, 16px)',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontFamily: 'inherit',
          letterSpacing: '2px',
          marginBottom: '16px',
          flexShrink: 0,
        }}
      >
        <Play size={18} /> DEPLOY
      </motion.button>
    </motion.div>
  );
}
