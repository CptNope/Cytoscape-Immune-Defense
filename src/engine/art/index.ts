/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Pathogen, CellTypeId, PathogenType, BossType } from '../types';
import { artDataUrl } from './sprites';
import type { ArtColors, ArtId } from './organisms';

export type { ArtId, ArtColors, AnimCtx, Organism } from './organisms';
export { ORGANISMS, mix } from './organisms';
export { drawArt, preloadArt, artDataUrl, isOriented, anim, clearArtCache } from './sprites';
export { CanvasPainter, SvgPainter, type Painter } from './painter';

/** Which artwork represents a pathogen or boss entity. */
export function artForPathogen(p: Pathogen): ArtId {
  switch (p.type) {
    case 'virus':
      if (p.isBoss && p.bossType === 'mega_virus') return 'mimivirus';
      if (p.isBoss && p.bossType === 'retrovirus') return 'hiv';
      if (p.isBoss && p.bossType === 'influenza') return 'influenza';
      return p.variant === 'swift' ? 'phage' : 'virus';
    case 'bacteria':
      return p.variant === 'armored' ? 'bacterium_armored' : 'bacterium';
    case 'parasite':
      if (p.isBoss && p.bossType === 'parasitic_worm') return 'scolex';
      if (p.isBoss && p.bossType === 'plasmodium') return 'schizont';
      return p.variant === 'stalker' ? 'giardia' : 'trypanosome';
    case 'fungus':
      return p.isBoss && p.bossType === 'fungal_bloom' ? 'aspergillus' : 'yeast';
    case 'prion': return 'prion';
    case 'cancer': return p.isBoss && p.bossType === 'metastatic_tumor' ? 'tumor' : 'cancer';
    case 'biofilm': return 'biofilm';
    case 'host_rbc': return 'rbc';
    case 'decoy_tcell': return p.isBoss ? 'autoimmune_t' : 'rogue_t';
    case 'vessel': return 'vessel';
  }
  return 'bacterium';
}

/** Artwork for each playable immune cell. */
export const CELL_ART: Record<CellTypeId, ArtId> = {
  killer_t: 'killer_t', macrophage: 'macrophage', nk_cell: 'nk_cell', plasma_b: 'plasma_b',
};

/** Artwork shown in the codex for each entry. */
const CODEX_ART: Record<PathogenType | BossType, ArtId> = {
  virus: 'virus', bacteria: 'bacterium', parasite: 'trypanosome', fungus: 'yeast', prion: 'prion',
  cancer: 'cancer', biofilm: 'biofilm', host_rbc: 'rbc', decoy_tcell: 'rogue_t', vessel: 'vessel',
  mega_virus: 'mimivirus', bacterial_colony: 'bacterium', parasitic_worm: 'scolex',
  fungal_bloom: 'aspergillus', plasmodium: 'schizont', retrovirus: 'hiv', influenza: 'influenza',
  metastatic_tumor: 'tumor', autoimmune: 'autoimmune_t',
};

/** Secondary colours used by the codex art (embedded bacteria, spike proteins). */
const CODEX_ALT: Partial<Record<PathogenType | BossType, string>> = {
  biofilm: '#ef4444', retrovirus: '#f0abfc', influenza: '#4ade80', decoy_tcell: '#e879f9',
};

const urlCache = new Map<string, string>();
function cached(key: string, make: () => string): string {
  let u = urlCache.get(key);
  if (!u) { u = make(); urlCache.set(key, u); }
  return u;
}

/** SVG data URL of a codex entry's organism, for menus. */
export function codexArtUrl(key: PathogenType | BossType, color: string): string {
  const colors: ArtColors = { main: color, alt: CODEX_ALT[key] ?? color };
  const v = key === 'bacterial_colony' ? 1 : 0;
  return cached(`codex|${key}|${color}`, () => artDataUrl(CODEX_ART[key], colors, v));
}

/** SVG data URL of a playable cell, for menus. */
export function cellArtUrl(cell: CellTypeId, color: string): string {
  return cached(`cell|${cell}|${color}`, () => artDataUrl(CELL_ART[cell], { main: color, alt: '#4ade80' }));
}
