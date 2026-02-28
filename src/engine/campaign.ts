/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CampaignLevel } from './types';

/**
 * 20 structured campaign levels telling the story of an immune response
 * from initial infection through to recovery.
 */
export const CAMPAIGN_LEVELS: CampaignLevel[] = [
  // --- ACT 1: First Contact (Levels 1-5) ---
  {
    level: 1,
    title: 'First Contact',
    briefing: 'A minor breach has been detected in the epithelial barrier. A small viral payload has entered the bloodstream. You are T-Cell Unit Alpha \u2014 the first responder. Neutralize all threats.',
    pathogens: [{ type: 'virus', count: 3 }],
    objectiveText: 'Eliminate all viruses',
  },
  {
    level: 2,
    title: 'Bacterial Infiltration',
    briefing: 'The breach is worse than we thought. Bacteria have followed the viral payload through the wound site. These are tougher than viruses \u2014 stay mobile.',
    pathogens: [{ type: 'virus', count: 2 }, { type: 'bacteria', count: 3 }],
    objectiveText: 'Clear the infection site',
  },
  {
    level: 3,
    title: 'Swarm Warning',
    briefing: 'Sensors detect anomalous protein structures \u2014 prions. They are tiny and nearly invisible, appearing in coordinated swarms. Watch for shimmer in the plasma.',
    pathogens: [{ type: 'virus', count: 2 }, { type: 'prion', count: 6 }],
    objectiveText: 'Destroy the prion swarm',
  },
  {
    level: 4,
    title: 'Escalation',
    briefing: 'The infection is spreading faster than anticipated. Multiple pathogen species are now present. The innate immune system is overwhelmed \u2014 adaptive response is critical.',
    pathogens: [{ type: 'virus', count: 3 }, { type: 'bacteria', count: 3 }, { type: 'parasite', count: 2 }],
    objectiveText: 'Contain the spread',
  },
  {
    level: 5,
    title: 'Mega Virus',
    briefing: 'A massive viral construct has been detected \u2014 larger than anything we have encountered. It appears to have a protective capsid that periodically regenerates. Strike during its vulnerable phases!',
    pathogens: [{ type: 'virus', count: 2 }],
    boss: 'mega_virus',
    objectiveText: 'Defeat the Mega Virus',
  },
  // --- ACT 2: Deep Infection (Levels 6-10) ---
  {
    level: 6,
    title: 'Fungal Foothold',
    briefing: 'With the immune system focused on viral threats, an opportunistic fungal colony has taken root in surrounding tissue. Fungi are resistant to standard antibodies \u2014 sustained fire is required.',
    pathogens: [{ type: 'fungus', count: 4 }, { type: 'virus', count: 2 }],
    objectiveText: 'Eradicate the fungal colony',
  },
  {
    level: 7,
    title: 'Biofilm Detected',
    briefing: 'Intelligence reports a bacterial biofilm forming on the vessel wall. The bacteria have encased themselves in a protective matrix. You must break through the outer shield before the inner colony can be destroyed.',
    pathogens: [{ type: 'bacteria', count: 3 }, { type: 'biofilm', count: 1 }],
    objectiveText: 'Break the biofilm shield',
  },
  {
    level: 8,
    title: 'Mutation',
    briefing: 'The pathogens are adapting. Some bacteria have developed armored cell walls. Some viruses have mutated into swift variants that evade our targeting systems. Expect resistance.',
    pathogens: [
      { type: 'bacteria', count: 3, variant: 'armored' },
      { type: 'virus', count: 3, variant: 'swift' },
      { type: 'parasite', count: 2 },
    ],
    objectiveText: 'Neutralize mutated strains',
  },
  {
    level: 9,
    title: 'Malignant Growth',
    briefing: 'Abnormal cell division detected \u2014 a cancerous growth is forming. It does not move but it is growing rapidly and spawning copies of itself. Destroy it before it metastasizes.',
    pathogens: [{ type: 'cancer', count: 2 }, { type: 'virus', count: 3 }],
    objectiveText: 'Eliminate cancer cells',
  },
  {
    level: 10,
    title: 'Bacterial Colony',
    briefing: 'A massive bacterial superstructure has formed \u2014 a connected chain of bacteria sharing nutrients and defenses. Destroying the colony will scatter the survivors. Prepare for the aftermath.',
    pathogens: [{ type: 'bacteria', count: 2 }, { type: 'biofilm', count: 1 }],
    boss: 'bacterial_colony',
    objectiveText: 'Defeat the Bacterial Colony',
  },
  // --- ACT 3: Critical Response (Levels 11-15) ---
  {
    level: 11,
    title: 'Multi-Front War',
    briefing: 'The infection has spread to multiple tissue sites. Every type of pathogen is now present in significant numbers. The host\u2019s condition is deteriorating. Hold the line.',
    pathogens: [
      { type: 'virus', count: 3 },
      { type: 'bacteria', count: 3 },
      { type: 'parasite', count: 2 },
      { type: 'fungus', count: 2 },
      { type: 'prion', count: 6 },
    ],
    objectiveText: 'Survive the multi-front assault',
  },
  {
    level: 12,
    title: 'Stalker Parasites',
    briefing: 'A new parasite variant has been identified \u2014 stalker class. These organisms have evolved to track immune cells specifically. They are fast, persistent, and deadly. Keep moving.',
    pathogens: [
      { type: 'parasite', count: 4, variant: 'stalker' },
      { type: 'virus', count: 3 },
      { type: 'bacteria', count: 2 },
    ],
    objectiveText: 'Eliminate stalker parasites',
  },
  {
    level: 13,
    title: 'Biofilm Fortress',
    briefing: 'Multiple biofilms have established a defensive perimeter. Behind them, cancer cells are proliferating unchecked. Break through the biofilm shields and destroy the tumors within.',
    pathogens: [{ type: 'biofilm', count: 2 }, { type: 'cancer', count: 2 }, { type: 'bacteria', count: 3 }],
    objectiveText: 'Destroy biofilm defenses and tumors',
  },
  {
    level: 14,
    title: 'Cytokine Storm',
    briefing: 'The immune system is in overdrive. Inflammatory signals are flooding the bloodstream. The chaos has attracted every pathogen in the region. This is the most intense battle yet.',
    pathogens: [
      { type: 'virus', count: 4, variant: 'swift' },
      { type: 'bacteria', count: 4, variant: 'armored' },
      { type: 'parasite', count: 3, variant: 'stalker' },
      { type: 'prion', count: 6 },
    ],
    objectiveText: 'Survive the cytokine storm',
  },
  {
    level: 15,
    title: 'Parasitic Worm',
    briefing: 'A massive parasitic organism has burrowed into the tissue \u2014 a multi-segmented worm that tracks immune cells aggressively. Its body weaves through the plasma. Aim for the head.',
    pathogens: [{ type: 'parasite', count: 2 }, { type: 'fungus', count: 2 }],
    boss: 'parasitic_worm',
    objectiveText: 'Defeat the Parasitic Worm',
  },
  // --- ACT 4: Recovery (Levels 16-20) ---
  {
    level: 16,
    title: 'Turning the Tide',
    briefing: 'The worst is behind us. The host\u2019s adaptive immune system has fully activated. Antibody production is at peak efficiency. Clear the remaining pockets of resistance.',
    pathogens: [
      { type: 'virus', count: 4 },
      { type: 'bacteria', count: 4 },
      { type: 'fungus', count: 3 },
    ],
    objectiveText: 'Clear remaining resistance',
  },
  {
    level: 17,
    title: 'Cancer Metastasis',
    briefing: 'The cancerous growths have spread \u2014 multiple tumors are now growing simultaneously, each spawning copies. Time is critical. Destroy them before they overwhelm the tissue.',
    pathogens: [{ type: 'cancer', count: 4 }, { type: 'prion', count: 6 }, { type: 'virus', count: 2 }],
    objectiveText: 'Stop the metastasis',
  },
  {
    level: 18,
    title: 'Last Stand',
    briefing: 'The remaining pathogens have consolidated into a final defensive position. Armored bacteria, stalker parasites, and biofilms protect a core of rapidly-mutating viruses. Break through.',
    pathogens: [
      { type: 'biofilm', count: 2 },
      { type: 'bacteria', count: 3, variant: 'armored' },
      { type: 'parasite', count: 3, variant: 'stalker' },
      { type: 'virus', count: 4, variant: 'swift' },
    ],
    objectiveText: 'Break the final defense',
  },
  {
    level: 19,
    title: 'Purge Protocol',
    briefing: 'Nearly there. A few scattered pockets of infection remain throughout the bloodstream. Sweep the area clean. Leave nothing behind.',
    pathogens: [
      { type: 'virus', count: 3 },
      { type: 'bacteria', count: 3 },
      { type: 'parasite', count: 2 },
      { type: 'fungus', count: 2 },
      { type: 'cancer', count: 1 },
      { type: 'biofilm', count: 1 },
    ],
    objectiveText: 'Complete the purge',
  },
  {
    level: 20,
    title: 'Fungal Bloom',
    briefing: 'One final threat remains \u2014 a massive fungal bloom has anchored itself deep in the tissue. It fills the area with toxic spore clouds and must be destroyed at its core. This is the final battle. For the host.',
    pathogens: [{ type: 'fungus', count: 3 }, { type: 'bacteria', count: 2 }],
    boss: 'fungal_bloom',
    objectiveText: 'Destroy the Fungal Bloom \u2014 FINAL BOSS',
  },
];

/** Time Attack constants */
export const TIME_ATTACK_INITIAL_SECONDS = 60;
export const TIME_ATTACK_KILL_BONUS_SECONDS = 2;
export const TIME_ATTACK_BOSS_BONUS_SECONDS = 15;
