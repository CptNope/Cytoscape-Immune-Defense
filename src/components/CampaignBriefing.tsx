/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import type { CampaignLevel } from '../engine';

interface CampaignBriefingProps {
  level: CampaignLevel;
  onStart: () => void;
}

export default function CampaignBriefing({ level, onStart }: CampaignBriefingProps) {
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
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, #0a1020 0%, #0a0505 70%)',
        padding: '24px',
        zIndex: 25,
        fontFamily: "'JetBrains Mono', monospace",
        color: '#e5e5e5',
      }}
    >
      {/* Level number */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ fontSize: '12px', color: '#60a5fa', letterSpacing: '3px', marginBottom: '6px' }}
      >
        LEVEL {level.level} OF 20
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{
          fontSize: '32px',
          color: level.boss ? '#ef4444' : '#ffffff',
          marginBottom: '24px',
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
          fontSize: '13px',
          lineHeight: '1.7',
          color: '#a3a3a3',
          textAlign: 'center',
          marginBottom: '28px',
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
            fontSize: '12px',
            color: '#fbbf24',
            marginBottom: '24px',
            padding: '8px 16px',
            border: '1px solid #fbbf2440',
            borderRadius: '6px',
            background: 'rgba(251, 191, 36, 0.05)',
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
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: '28px',
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
            BOSS: {level.boss.replace(/_/g, ' ').toUpperCase()}
          </span>
        )}
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
          padding: '14px 36px',
          color: '#60a5fa',
          fontSize: '16px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontFamily: 'inherit',
          letterSpacing: '2px',
        }}
      >
        <Play size={18} /> DEPLOY
      </motion.button>
    </motion.div>
  );
}
