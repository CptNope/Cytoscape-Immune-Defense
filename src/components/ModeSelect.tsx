/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Infinity, BookOpen, Timer, Leaf, ArrowLeft } from 'lucide-react';
import type { GameMode } from '../engine';

interface ModeSelectProps {
  onSelect: (mode: GameMode) => void;
  onBack: () => void;
  campaignProgress: number; // highest campaign level completed (0 = none)
}

const MODES: { id: GameMode; name: string; icon: ReactNode; desc: string; color: string }[] = [
  {
    id: 'endless',
    name: 'Endless Mode',
    icon: <Infinity size={28} />,
    desc: 'Classic survival. Waves get harder forever. How far can you go?',
    color: '#4ade80',
  },
  {
    id: 'campaign',
    name: 'Campaign',
    icon: <BookOpen size={28} />,
    desc: '20 story-driven levels. Follow the immune response from infection to recovery.',
    color: '#60a5fa',
  },
  {
    id: 'time_attack',
    name: 'Time Attack',
    icon: <Timer size={28} />,
    desc: '60 seconds on the clock. Every kill adds time. Score as high as you can.',
    color: '#f59e0b',
  },
  {
    id: 'zen',
    name: 'Zen Mode',
    icon: <Leaf size={28} />,
    desc: 'No damage, no score. Just float through the bloodstream and relax.',
    color: '#a78bfa',
  },
];

export default function ModeSelect({ onSelect, onBack, campaignProgress }: ModeSelectProps) {
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
        background: 'radial-gradient(ellipse at center, #1a0a0a 0%, #0a0505 70%)',
        padding: 'env(safe-area-inset-top, 12px) 12px env(safe-area-inset-bottom, 12px)',
        paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)',
        zIndex: 20,
        fontFamily: "'JetBrains Mono', monospace",
        color: '#e5e5e5',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{ flex: '0 0 auto', minHeight: '20px' }} />
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ fontSize: 'clamp(20px, 5vw, 28px)', marginBottom: '6px', color: '#ffffff', letterSpacing: '2px', textAlign: 'center' }}
      >
        SELECT MODE
      </motion.h1>

      <p style={{ fontSize: '11px', color: '#737373', marginBottom: 'clamp(12px, 3vw, 24px)' }}>
        Choose your mission, T-Cell
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
        gap: '10px',
        maxWidth: '520px',
        width: '100%',
      }}>
        {MODES.map((mode, i) => (
          <motion.button
            key={mode.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => onSelect(mode.id)}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${mode.color}40`,
              borderRadius: '12px',
              padding: 'clamp(10px, 2.5vw, 18px) clamp(10px, 2.5vw, 16px)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              transition: 'border-color 0.2s, background 0.2s',
              fontFamily: 'inherit',
              color: '#e5e5e5',
            }}
            whileHover={{
              borderColor: mode.color,
              background: `${mode.color}10`,
            }}
            whileTap={{ scale: 0.97 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: mode.color }}>{mode.icon}</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: mode.color }}>{mode.name}</span>
            </div>
            <span style={{ fontSize: '11px', color: '#a3a3a3', lineHeight: '1.4' }}>{mode.desc}</span>
            {mode.id === 'campaign' && campaignProgress > 0 && (
              <span style={{ fontSize: '10px', color: '#737373', marginTop: '2px' }}>
                Progress: {campaignProgress}/20
              </span>
            )}
          </motion.button>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onBack}
        style={{
          marginTop: 'clamp(12px, 3vw, 24px)',
          marginBottom: '12px',
          background: 'none',
          border: '1px solid #404040',
          borderRadius: '8px',
          padding: '8px 20px',
          color: '#a3a3a3',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontFamily: 'inherit',
          flexShrink: 0,
        }}
      >
        <ArrowLeft size={14} /> Back
      </motion.button>
    </motion.div>
  );
}
