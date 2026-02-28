/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Volume2, VolumeX, Music, Zap } from 'lucide-react';
import type { AudioEngine } from '../engine';

interface AudioControlsProps {
  audio: AudioEngine;
}

export default function AudioControls({ audio }: AudioControlsProps) {
  const [settings, setSettings] = useState(audio.getSettings());
  const [expanded, setExpanded] = useState(false);

  const handleMute = () => {
    const muted = audio.toggleMute();
    setSettings({ ...settings, muted });
  };

  const handleSfxVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    audio.setSfxVolume(v);
    setSettings({ ...settings, sfxVolume: v });
  };

  const handleMusicVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    audio.setMusicVolume(v);
    setSettings({ ...settings, musicVolume: v });
  };

  return (
    <div className="absolute top-4 left-4 z-30 flex items-start gap-2">
      <button
        aria-label={settings.muted ? 'Unmute audio' : 'Mute audio'}
        onClick={handleMute}
        className="p-2.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-white/20 transition-all"
      >
        {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      <button
        aria-label="Audio settings"
        onClick={() => setExpanded(!expanded)}
        className={`p-2.5 bg-black/50 backdrop-blur-md border rounded-xl transition-all ${
          expanded ? 'border-emerald-500/30 text-emerald-400' : 'border-white/10 text-white/60 hover:text-white hover:border-white/20'
        }`}
      >
        <Music className="w-4 h-4" />
      </button>

      {expanded && (
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-3 space-y-3 min-w-[160px]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] uppercase text-white/40 tracking-wider">
              <Zap className="w-3 h-3" /> SFX
            </div>
            <input
              aria-label="Sound effects volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              onChange={handleSfxVolume}
              className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] uppercase text-white/40 tracking-wider">
              <Music className="w-3 h-3" /> Music
            </div>
            <input
              aria-label="Music volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.musicVolume}
              onChange={handleMusicVolume}
              className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
