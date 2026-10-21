/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BossType, PathogenType } from './types';

export interface CodexEntry {
  id: string;
  name: string;
  kind: 'pathogen' | 'boss';
  /** Pathogen type whose kills unlock this entry (pathogens) or boss type (bosses). */
  key: PathogenType | BossType;
  color: string;
  /** Real biology, kept short and accurate. */
  biology: string;
  /** How it plays in Cytoscape. */
  inGame: string;
  /** What to do about it. */
  tip: string;
}

export const CODEX: CodexEntry[] = [
  {
    id: 'virus', name: 'Virus', kind: 'pathogen', key: 'virus', color: '#f59e0b',
    biology: 'Viruses are genetic material wrapped in a protein coat (capsid). They cannot reproduce on their own — they hijack a host cell\'s machinery to make copies of themselves.',
    inGame: 'Standard drifters that split when destroyed. Swift variants move almost twice as fast.',
    tip: 'IgA deals +30% to viruses. The Interferon cytokine slows them down.',
  },
  {
    id: 'bacteria', name: 'Bacteria', kind: 'pathogen', key: 'bacteria', color: '#ef4444',
    biology: 'Single-celled organisms with their own metabolism. Most are harmless or helpful, but pathogenic species can release toxins and multiply rapidly by binary fission.',
    inGame: 'Tougher than viruses. Armored variants have a double cell wall and 2.5× health.',
    tip: 'IgM\'s spread shot deals +25% to bacteria — real IgM is excellent at clumping (agglutinating) them.',
  },
  {
    id: 'parasite', name: 'Parasite', kind: 'pathogen', key: 'parasite', color: '#a855f7',
    biology: 'Parasitic protozoa and worms live at the host\'s expense. Many are large and mobile, and the immune system fights them with IgE antibodies and eosinophils.',
    inGame: 'Hunts you down. Shrugs off fast antibodies (IgG, IgA). Stalkers are faster and more aggressive.',
    tip: 'Use IgE (2.5× vs parasites) or slow IgM shots — both get past their resistance.',
  },
  {
    id: 'fungus', name: 'Fungus', kind: 'pathogen', key: 'fungus', color: '#10b981',
    biology: 'Fungi have tough cell walls made of chitin and glucans. Infections are often opportunistic, taking hold when the immune system is already busy or weakened.',
    inGame: 'Large and slow. Takes half damage from every antibody.',
    tip: 'Bring damage: Affinity Maturation and Antibody Potency upgrades help most here.',
  },
  {
    id: 'prion', name: 'Prion', kind: 'pathogen', key: 'prion', color: '#94a3b8',
    biology: 'Prions are misfolded proteins that cause normal proteins to misfold too. They contain no genetic material at all, which makes them very hard for the immune system to recognise.',
    inGame: 'Tiny, nearly invisible, and they arrive in swarms of six.',
    tip: 'IgA pierces through clustered prions. Multi-Epitope side shots help cover a swarm.',
  },
  {
    id: 'cancer', name: 'Cancer Cell', kind: 'pathogen', key: 'cancer', color: '#f472b6',
    biology: 'Cancer cells are the host\'s own cells that have escaped normal controls on growth and division. Cytotoxic T-cells and NK cells patrol for them.',
    inGame: 'Doesn\'t move, but grows over time and periodically spawns copies of itself.',
    tip: 'Kill them early — they get tougher as they grow.',
  },
  {
    id: 'biofilm', name: 'Biofilm', kind: 'pathogen', key: 'biofilm', color: '#38bdf8',
    biology: 'Biofilms are bacterial communities encased in a slimy self-made matrix. The matrix shields them from antibodies and antibiotics, which is why they cause stubborn infections.',
    inGame: 'A shield absorbs all damage until it breaks; then the colony inside is exposed.',
    tip: 'IgM deals +25% to biofilm shields.',
  },
  {
    id: 'mega_virus', name: 'Mega Virus', kind: 'boss', key: 'mega_virus', color: '#f59e0b',
    biology: 'Giant viruses really exist — Mimivirus is larger than some bacteria and was first mistaken for one.',
    inGame: 'Alternates between a shielded capsid (fires virion rings) and a vulnerable phase. Splits off swift viruses at half health.',
    tip: 'Dodge the rings while it\'s shielded; unload while it\'s vulnerable.',
  },
  {
    id: 'bacterial_colony', name: 'Bacterial Colony', kind: 'boss', key: 'bacterial_colony', color: '#ef4444',
    biology: 'Some bacteria form chains and clusters — Streptococcus literally means "twisted chain berry".',
    inGame: 'The core is protected while 3+ segments remain. Breaking a middle segment fragments the colony.',
    tip: 'Shoot segments near the head to break off the whole tail at once.',
  },
  {
    id: 'parasitic_worm', name: 'Parasitic Worm', kind: 'boss', key: 'parasitic_worm', color: '#a855f7',
    biology: 'Helminths (parasitic worms) are far too large to be engulfed. The body fights them with IgE, eosinophils and mast cells instead.',
    inGame: 'Its armoured body deflects shots. It burrows, then lunges along a telegraphed line.',
    tip: 'Only the head takes damage. Step off the purple line when it appears.',
  },
  {
    id: 'fungal_bloom', name: 'Fungal Bloom', kind: 'boss', key: 'fungal_bloom', color: '#10b981',
    biology: 'Fungi grow as networks of thread-like hyphae that absorb nutrients from their surroundings.',
    inGame: 'Four hyphae armour and heal the core. Spore clouds slow and damage you.',
    tip: 'Cut all four hyphae, then burst the core down before they regrow.',
  },
  {
    id: 'plasmodium', name: 'Plasmodium', kind: 'boss', key: 'plasmodium', color: '#c084fc',
    biology: 'The malaria parasite, spread by mosquitoes. It invades red blood cells, multiplies inside, then bursts them to release merozoites that invade new cells.',
    inGame: 'Hides in one of the red blood cells. The infected cell pulses faintly. Shooting healthy cells costs score and heals the parasite.',
    tip: 'Watch for the ring-stage pulse, hit that cell 3 times to rupture it, then strike while the parasite is exposed.',
  },
  {
    id: 'retrovirus', name: 'Retrovirus', kind: 'boss', key: 'retrovirus', color: '#e879f9',
    biology: 'Retroviruses like HIV copy their RNA into DNA and insert it into the host genome. HIV specifically infects helper T-cells and can hide in latent reservoirs for years.',
    inGame: 'Orbits you firing spikes that "infect" you (slower fire). Hijacks T-cells and periodically goes latent and heals.',
    tip: 'Using your ability or grabbing a power-up purges the infection.',
  },
  {
    id: 'influenza', name: 'Influenza', kind: 'boss', key: 'influenza', color: '#60a5fa',
    biology: 'Flu viruses change their surface proteins, hemagglutinin (H) and neuraminidase (N), through gradual drift and sudden "antigenic shift" — that\'s why strains are named like H1N1.',
    inGame: 'Resists one antibody class at a time and shifts strain every 25% health and every 10 seconds.',
    tip: 'Watch which class it resists and swap to another (Q / ⇄ button).',
  },
  {
    id: 'metastatic_tumor', name: 'Metastatic Tumor', kind: 'boss', key: 'metastatic_tumor', color: '#f472b6',
    biology: 'Tumours trigger angiogenesis — the growth of new blood vessels — to feed themselves. Metastasis is when cancer cells travel through the blood to seed new tumours.',
    inGame: 'Three blood vessels armour and heal it. It launches seeds that grow into new tumours.',
    tip: 'Cut the vessels first. Shoot seeds before they land.',
  },
  {
    id: 'autoimmune', name: 'Autoimmune T-Cell', kind: 'boss', key: 'autoimmune', color: '#f87171',
    biology: 'Autoimmunity happens when immune cells lose self-tolerance and attack the body\'s own tissues. Regulatory T-cells normally keep this in check.',
    inGame: 'Mirrors your position and fires like you. Later triggers cytokine storms (expanding rings) and dashes.',
    tip: 'Fly through the gap in each inflammation ring.',
  },
];
