/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const AUDIO_SETTINGS_KEY = 'cytoscape-audio-settings';

export interface AudioSettings {
  sfxVolume: number;   // 0-1
  musicVolume: number; // 0-1
  muted: boolean;
}

const DEFAULT_SETTINGS: AudioSettings = {
  sfxVolume: 0.5,
  musicVolume: 0.3,
  muted: false,
};

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persistSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // silently fail
  }
}

/**
 * Procedural audio engine using the Web Audio API.
 * All sounds are synthesized — no audio files required.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private settings: AudioSettings;
  private musicNodes: OscillatorNode[] = [];
  private musicPlaying = false;
  private thrustOsc: OscillatorNode | null = null;
  private thrustGain: GainNode | null = null;
  private thrustActive = false;

  constructor() {
    this.settings = loadSettings();
  }

  /** Must be called from a user gesture (click/tap) to unlock AudioContext */
  init(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = this.settings.muted ? 0 : 1;

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.settings.sfxVolume;
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.settings.musicVolume;
    this.musicGain.connect(this.masterGain);
  }

  private ensureCtx(): AudioContext | null {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // --- Settings ---

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  setSfxVolume(v: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this.settings.sfxVolume;
    persistSettings(this.settings);
  }

  setMusicVolume(v: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) this.musicGain.gain.value = this.settings.musicVolume;
    persistSettings(this.settings);
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx!.currentTime, 0.05);
    }
    persistSettings(this.settings);
  }

  toggleMute(): boolean {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }

  // --- SFX (procedural synthesis) ---

  /** Short laser-like antibody fire sound */
  playFire(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  /** Explosion — noise burst with pitch drop */
  playExplosion(size: 'small' | 'medium' | 'large' = 'medium'): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;

    const duration = size === 'small' ? 0.15 : size === 'large' ? 0.5 : 0.3;
    const vol = size === 'small' ? 0.1 : size === 'large' ? 0.25 : 0.15;

    // Noise via buffer
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Low-pass filter for rumble
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(size === 'large' ? 800 : 1200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + duration);
  }

  /** Power-up pickup — ascending chime */
  playPowerUp(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;

    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.06;
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  }

  /** Damage hit — harsh buzz */
  playDamage(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  }

  /** Shield bounce — metallic ping */
  playShieldBounce(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  /** Level clear — triumphant ascending arpeggio */
  playLevelClear(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;

    const notes = [392, 494, 587, 784, 988]; // G4 B4 D5 G5 B5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.1, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  /** Bomb / system purge — deep rumble + high sweep */
  playBomb(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;

    // Deep rumble
    this.playExplosion('large');

    // High sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.3);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  }

  /** Game over — descending ominous tone */
  playGameOver(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;

    const notes = [440, 370, 311, 261]; // A4 F#4 Eb4 C4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.2;
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }

  // --- Continuous thrust sound ---

  startThrust(): void {
    if (this.thrustActive) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;

    this.thrustOsc = ctx.createOscillator();
    this.thrustGain = ctx.createGain();
    this.thrustOsc.type = 'sawtooth';
    this.thrustOsc.frequency.value = 80;
    this.thrustGain.gain.value = 0;
    this.thrustGain.gain.setTargetAtTime(0.06, ctx.currentTime, 0.05);
    this.thrustOsc.connect(this.thrustGain);
    this.thrustGain.connect(this.sfxGain);
    this.thrustOsc.start();
    this.thrustActive = true;
  }

  stopThrust(): void {
    if (!this.thrustActive || !this.thrustGain || !this.ctx) return;
    this.thrustGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    const osc = this.thrustOsc;
    setTimeout(() => {
      try { osc?.stop(); } catch { /* already stopped */ }
    }, 200);
    this.thrustOsc = null;
    this.thrustGain = null;
    this.thrustActive = false;
  }

  // --- Background Music (generative ambient) ---

  startMusic(): void {
    if (this.musicPlaying) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.musicGain) return;

    this.musicPlaying = true;

    // Deep ambient drone
    const createDrone = (freq: number, detune: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      gain.gain.value = vol;
      osc.connect(gain);
      gain.connect(this.musicGain!);
      osc.start();
      this.musicNodes.push(osc);
      return osc;
    };

    // Base drone layers
    createDrone(55, 0, 0.08);     // A1
    createDrone(55, 5, 0.06);     // A1 slightly detuned for warmth
    createDrone(82.5, 0, 0.04);   // E2 (fifth)
    createDrone(110, -3, 0.03);   // A2 octave

    // Slow LFO modulation for movement
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15; // Very slow
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain);

    // Connect LFO to drone frequencies for subtle wobble
    this.musicNodes.forEach(osc => {
      lfoGain.connect(osc.frequency);
    });
    lfo.start();
    this.musicNodes.push(lfo);
  }

  stopMusic(): void {
    this.musicNodes.forEach(osc => {
      try { osc.stop(); } catch { /* already stopped */ }
    });
    this.musicNodes = [];
    this.musicPlaying = false;
  }

  /** Clean up all audio resources */
  dispose(): void {
    this.stopThrust();
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// --- Haptic Feedback ---

export function haptic(pattern: number | number[]): void {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Vibration API not available
  }
}

export const HAPTIC_DAMAGE = [50, 30, 80];
export const HAPTIC_POWERUP = [30, 20, 30];
export const HAPTIC_BOMB = [100, 50, 100, 50, 200];
export const HAPTIC_FIRE = 15;
