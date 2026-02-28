# Roadmap — Cytoscape: Immune Defense

This document outlines planned features and expansion ideas for the game, organized by release version.

> **Version history:** v1.0 initial release → v1.1 PWA & scores → v1.2 engine refactor & tests → v1.3 audio & feedback → v1.4 progression & unlockables → v1.5 new enemies & bosses → v1.6 game modes → v1.7 visual polish → v1.8 responsive design

---

## v1.3 — Audio & Feedback ✅

- [x] Sound effects — thrust, fire, explosions, power-up pickup, damage hit, level clear
- [x] Background music — ambient biological/electronic soundtrack
- [x] Volume controls and mute toggle (persisted to localStorage)
- [x] Haptic feedback on mobile (vibration API) for damage and power-ups
- [x] Improved screen shake with directional bias

## v1.4 — Progression & Unlockables ✅

- [x] **XP/Leveling system** — earn XP across runs, unlock permanent upgrades
- [x] **Upgrade tree** — spend XP on ship stats:
  - Hull integrity (more health)
  - Thruster power (faster acceleration)
  - Antibody potency (more damage)
  - Rapid response (faster fire rate base)
  - Membrane shield (longer shield duration)
- [x] **Cytokine signals** (passive abilities) — unlocked at level milestones:
  - Auto-targeting antibodies
  - Regeneration (slow health recovery)
  - Chain reaction (explosions damage nearby pathogens)
- [x] Stats tracking — total kills, total score, time played, pathogens killed by type

## v1.5 — New Enemies & Bosses ✅

- [x] **Prion** — tiny, fast, nearly invisible, appears in swarms
- [x] **Cancer cell** — doesn't move but grows over time, spawns smaller copies
- [x] **Biofilm** — bacteria cluster that must be broken apart before individual bacteria can be killed
- [x] **Boss fights** every 5 levels:
  - Level 5: **Mega Virus** — large virus with shield phases
  - Level 10: **Bacterial Colony** — connected bacteria chain that splits
  - Level 15: **Parasitic Worm** — multi-segment entity that tracks aggressively
  - Level 20: **Fungal Bloom** — fills screen with spore clouds, must destroy central core

## v1.6 — Game Modes ✅

- [x] **Endless Mode** — current mode, renamed
- [x] **Campaign Mode** — 20 structured levels with story text between waves
  - Story: follow the immune response from initial infection to recovery
  - Introduce pathogen types gradually with tutorial text
- [x] **Time Attack** — survive as long as possible with a countdown timer; kills add time
- [x] **Zen Mode** — no damage, no scoring, relaxing exploration with ambient effects

## v1.7 — Visual Polish ✅

- [x] Animated background — flowing blood cells, plasma current effects, drifting platelets
- [x] Ship damage visual states — cracks, flickering at low health, red warning glow
- [x] Trail effects for swift variant pathogens and prions
- [x] Entity type labels on all game objects (pathogens, bosses, power-ups, ship)
- [x] Power-up labels showing pickup name
- [ ] Pathogen death animations — disintegration, cell lysis effects
- [ ] Level transition animation — "immune response escalating" screen
- [ ] Dark/light theme toggle (microscope slide vs dark field)

## v1.8 — Responsive Design ✅

- [x] All menus scrollable and viewable on small phone screens (portrait & landscape)
- [x] ModeSelect — scrollable, clamp() font sizes, min() grid columns, safe-area padding
- [x] CampaignBriefing — scrollable, responsive text/button sizes, safe-area padding
- [x] UpgradeScreen — scroll-friendly layout, responsive title/padding/margins
- [x] StatsPanel — scrollable, responsive heading sizes, compact gaps
- [x] HUD — compact on phones, scales up at sm/md breakpoints
- [x] Game Over — scrollable, responsive score/heading text, reduced padding on mobile
- [x] Pause menu — responsive heading and button sizes
- [x] Mobile controls — repositioned and resized for small screens
- [x] iOS safe-area insets respected on notched devices

## v2.0 — Multiplayer & Social

- [ ] **Online leaderboard** — global high scores via serverless API (Cloudflare Workers or Supabase)
- [ ] **Daily challenges** — unique seed-based runs with shared leaderboard
- [ ] **Co-op mode** (stretch goal) — two players on same screen via WebRTC
- [ ] Share score card — generate shareable image with score, level, and stats
- [ ] Achievement system with badges

## v2.1 — Accessibility & Platform

- [ ] Colorblind mode — distinct shapes/patterns per pathogen type instead of color-only
- [ ] Reduced motion mode — disable particles, screen shake, scanlines
- [ ] Keyboard remapping
- [ ] Gamepad support (Gamepad API)
- [ ] Screen reader announcements for menus and game state changes

---

## Technical Debt & Maintenance

- [x] Extract game engine into separate module (decouple from React component)
- [x] Add unit tests for physics and collision detection
- [ ] Add E2E tests with Playwright
- [x] Performance profiling — optimize particle system for low-end devices (capped at 200)
- [ ] Bundle size optimization — lazy load non-critical assets
- [ ] Migrate to Web Workers for game loop (keep UI thread free)

---

## Contributing

Ideas and PRs welcome! If you'd like to work on any of these, open an issue first to discuss the approach.
