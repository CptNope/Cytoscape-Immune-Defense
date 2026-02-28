# Changelog

All notable changes to Cytoscape: Immune Defense will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0] - 2026-02-28

### Fixed
- **Full responsive design** — all screens now work in portrait and landscape on phones, tablets, and desktop:
  - **ModeSelect**: scrollable container, `clamp()` font sizes, `min()` grid columns for narrow screens, safe-area padding for notched devices
  - **CampaignBriefing**: scrollable, responsive text/button sizes, constrained widths, safe-area padding
  - **UpgradeScreen**: `items-start` + scroll instead of `items-center` (prevents vertical overflow clipping), responsive title (`text-3xl sm:text-5xl`), compact padding/margins on small screens, bottom padding for scroll
  - **StatsPanel**: scrollable, responsive heading sizes, compact gaps
  - **HUD**: compact on phones (`p-2`, `w-20` health bar, `text-[10px]` health text), scales up at `sm`/`md` breakpoints; time attack timer and campaign objective also scale
  - **Game Over screen**: scrollable (`max-h-[95vh] overflow-y-auto`), responsive score text (`text-3xl sm:text-5xl md:text-6xl`), reduced padding on mobile, compact border radius
  - **Pause menu**: responsive heading and button sizes
  - **Mobile controls**: joystick and fire button repositioned closer to edges on small screens (`bottom-8 left-4`), smaller sizes (`w-24 h-24 sm:w-32 sm:h-32`), pause button repositioned
- All overlays use `overflow-y-auto` to prevent content being cut off on short viewports
- iOS safe-area insets respected via `env(safe-area-inset-*)` padding

## [1.7.0] - 2026-02-27

### Added
- **Enhanced animated background** with layered visual depth:
  - Deep plasma current streaks (bezier-curved, slow-moving)
  - Far-depth biconcave red blood cells (small, faded, drifting)
  - Mid-depth red blood cells (medium, slightly brighter)
  - Tiny drifting platelets
- **Ship damage visual states** based on health percentage:
  - Below 60%: jagged crack lines appear on the hull (count increases as health drops)
  - Below 30%: ship turns red, pulsing red warning glow, occasional flickering
  - Below 15%: critical state — heavy flickering, bright red cracks
- **Entity type labels** on all game objects:
  - Pathogens show type name (e.g., "Virus", "Bacteria (armored)", "Prion")
  - Bosses retain their existing health bar labels
  - Power-ups show pickup name (e.g., "Rapid Fire", "Shield", "Bomb")
  - Ship labeled "T-Cell"
- **Trail effects** for swift variant pathogens and prions — fading motion trail behind fast-moving entities
- **Biconcave RBC drawing function** (`drawRBC`) for realistic red blood cell shapes

### Fixed
- **Red flash/shake persisting after retry** — `shake`, `flash`, and `isPaused` are now reset in `initGame()` so visual effects don't carry over between runs

### Changed
- Background rendering completely rewritten with 4 visual depth layers
- `drawShip` now accepts health parameters for damage-state rendering
- `RenderState` interface extended with `shipHealth` and `shipMaxHealth`

## [1.6.0] - 2026-02-27

### Added
- **4 game modes** accessible from a new Mode Select screen:
  - **Endless Mode** — the classic survival experience, waves escalate forever
  - **Campaign Mode** — 20 story-driven levels following the immune response from initial infection to recovery
    - 4 narrative acts: First Contact, Deep Infection, Critical Response, Recovery
    - Each level has a briefing screen with story text, enemy roster preview, and objective
    - Progress persisted to localStorage (resume from highest completed level)
    - Boss encounters at levels 5, 10, 15, and 20
    - Victory screen when all 20 levels completed
  - **Time Attack** — 60-second countdown; every kill adds +2s, boss kills add +15s
    - Flashing red timer when ≤10s remain
    - Game over when timer hits zero
  - **Zen Mode** — no damage, no scoring, no XP; just relaxing exploration
    - Pathogens bounce harmlessly off the ship
    - Waves respawn gently when cleared
- **Mode Select UI** (`ModeSelect.tsx`) — animated card grid with icons, descriptions, and campaign progress indicator
- **Campaign Briefing UI** (`CampaignBriefing.tsx`) — story text, objective, enemy roster preview, and boss callout before each mission
- **Campaign level data** (`campaign.ts`) — 20 structured levels with curated enemy compositions and story
- **Mode-aware HUD**: time attack countdown, campaign objective display, zen mode label
- **Mode-aware Game Over screen**: campaign victory (green), time's up (yellow), zen session (purple), system failure (red)
- `GameMode` and `CampaignLevel` types added to the engine type system
- `spawnTypedPathogen` and `spawnCampaignWave` helpers for campaign-specific spawning

### Changed
- "Play" button on Upgrade Screen now navigates to Mode Select instead of starting directly
- Game Over "UPGRADES" button renamed to "MENU" for clarity
- Level progression logic refactored to be mode-aware (campaign, endless, time attack, zen each have distinct behavior)
- Ship-pathogen collision is harmless in Zen Mode (bounce only)

## [1.5.0] - 2026-02-27

### Added
- **3 new enemy types** with unique behaviors:
  - **Prion** — tiny (radius 8), fast, nearly invisible (30% opacity, flickering), appears in swarms of 6, starting at level 3
  - **Cancer Cell** — stationary, grows over time (radius 20→60), periodically spawns smaller copies every 10s, starting at level 5
  - **Biofilm** — bacteria cluster (radius 45) with a protective shield layer (8 HP) that must be broken before inner bacteria (4 HP) can be damaged, starting at level 7
- **Boss fights** every 5 levels with unique mechanics:
  - **Level 5: Mega Virus** — large (radius 70, 40 HP), alternates between invulnerable shield phase (3s) and vulnerable phase (5s)
  - **Level 10: Bacterial Colony** — chain of 6 connected segments (48 HP total), splits into individual bacteria on death
  - **Level 15: Parasitic Worm** — 8-segment snake entity (50 HP) that aggressively tracks the player, segments follow the head
  - **Level 20: Fungal Bloom** — massive (radius 80, 60 HP), periodically spawns spore clouds in all directions
- **Boss health bars** with labeled name displayed above each boss
- **Boss SFX**: ominous rising horn + rumble on boss spawn, triumphant fanfare on boss defeat
- Boss levels spawn fewer regular pathogens alongside the boss
- Visual effects: Mega Virus shield glow, Fungal Bloom pulsing aura, Parasitic Worm connected segments, Biofilm shield layer, Cancer Cell mitosis inner details, Prion jagged shapes with opacity
- Kill color coding for new types: prion (slate), cancer (pink), biofilm (sky blue)
- New enemy types do not split on death (unlike regular pathogens)
- 36 new unit tests for the progression system (XP, upgrades, cytokines, stats, modifiers)

### Changed
- `Pathogen` type extended with `PathogenType` and `BossType` unions, `maxHealth`, and optional fields for boss/cancer/biofilm/prion mechanics
- Pathogen rendering refactored with dedicated draw functions per type
- Level progression now spawns new enemy types with increasing probability based on current level
- Boss levels override normal wave spawning with boss + reduced escort pathogens

## [1.4.0] - 2026-02-27

### Added
- **Progression system** (`src/engine/progression.ts`) — persistent player profile with XP, upgrades, and stats
  - XP earned = score from each run, persisted to localStorage
  - Player leveling system with 20 levels and escalating XP thresholds
- **Upgrade tree** — 5 ship upgrades, each with 5 purchasable levels:
  - Hull Integrity (+10 max health per level)
  - Thruster Power (+0.02 thrust per level)
  - Antibody Potency (+0.25 damage per level)
  - Rapid Response (-15ms shot delay per level)
  - Membrane Shield (+50 frames shield duration per level)
- **Cytokine signals** — 3 passive abilities unlocked at player level milestones:
  - Auto-Targeting (Lv.5) — antibodies gently track nearest pathogen within range
  - Regeneration (Lv.10) — slowly recover 1 health every 5 seconds
  - Chain Reaction (Lv.15) — explosions damage nearby pathogens
- **Upgrade screen** (`UpgradeScreen.tsx`) — between-run UI showing player level, XP, upgrade tree, and cytokine signals
- **Stats panel** (`StatsPanel.tsx`) — lifetime statistics: total kills, kills by pathogen type, score, runs, time played, highest level
- XP earned summary on game over screen with kill count and level reached
- "UPGRADES" button on game over screen to return to upgrade tree
- Health bar now shows current/max health (reflecting hull integrity upgrades)

### Changed
- Roadmap version labels realigned to match actual semver releases (v1.0→v1.1→v1.2→v1.3→v1.4)
- Menu screen replaced with full upgrade screen (player level, XP bar, upgrade tree, cytokine signals, stats access)
- Game over screen now shows XP earned and offers both "UPGRADES" and "RETRY" buttons
- Shot delay, thrust power, bullet damage, and shield duration now driven by upgrade modifiers
- `SHIP_THRUST` and `POWERUP_DURATION` replaced with computed `GameModifiers` from player profile

## [1.3.0] - 2026-02-27

### Added
- **Procedural audio engine** (`src/engine/audio.ts`) — all sounds synthesized via Web Audio API, no audio files needed
  - Fire sound (laser chirp)
  - Explosions (noise burst with low-pass filter, 3 sizes: small/medium/large)
  - Power-up pickup (ascending C-major chime)
  - Damage hit (harsh sawtooth buzz)
  - Shield bounce (metallic ping)
  - Level clear (triumphant ascending arpeggio)
  - Bomb / system purge (deep rumble + high sweep)
  - Game over (descending ominous tone)
  - Continuous thrust hum (sawtooth drone with fade in/out)
- **Generative ambient background music** — layered sine-wave drones with LFO modulation
- **Volume controls UI** (`AudioControls.tsx`) — mute toggle, SFX volume slider, music volume slider
- Audio settings persisted to localStorage (`cytoscape-audio-settings`)
- **Haptic feedback** on mobile via Vibration API — distinct patterns for fire, damage, power-ups, and bombs
- Directional screen shake — shake now biases toward the direction of impact instead of random jitter

### Changed
- `RenderState` now accepts optional `shakeAngle` for directional shake
- Renderer shake calculation uses 60% directional bias + 40% random for organic feel
- Audio initializes on first user gesture (play button) to comply with browser autoplay policies
- Music starts on game start, stops on game over
- Thrust sound automatically starts/stops based on ship movement

## [1.2.0] - 2026-02-27

### Added
- Unit test suite with vitest — 41 tests covering physics, collision, wrapping, and score persistence
- `npm test` and `npm run test:watch` scripts
- `src/engine/` module system: types, constants, physics, renderer, scores
- Barrel re-export via `src/engine/index.ts`

### Changed
- **Major refactor**: extracted game engine from 1200-line `Game.tsx` monolith into 6 focused modules
  - `types.ts` — all interfaces (Vector, Entity, Pathogen, Ship, etc.)
  - `constants.ts` — game balance constants with named exports
  - `physics.ts` — pure functions: collision detection, wrapping, velocity, friction
  - `renderer.ts` — all canvas draw logic extracted from component
  - `scores.ts` — localStorage persistence for top scores
- `Game.tsx` is now a React integration layer importing from `src/engine/`
- Magic numbers replaced with named constants (POWERUP_DURATION, POWERUP_DROP_RATE, etc.)
- Particle system now capped at 200 particles to prevent low-end device performance issues

### Fixed
- Accessibility: added `aria-label` attributes to mobile fire button and pause button
- README: fixed duplicated `src/` in project structure, updated scripts table

## [1.1.0] - 2026-02-27

### Added
- Persistent local top scores — top 10 scores saved to localStorage, survives updates and cache clears
- Top scores leaderboard displayed on menu and game over screens
- CHANGELOG.md for tracking updates
- ROADMAP.md for planned features and expansion

### Changed
- High score display replaced with full top scores leaderboard

## [1.0.0] - 2026-02-27

### Added
- Core game engine — T-cell ship with physics, thrust, and screen wrapping
- Four pathogen types: virus, bacteria, parasite, fungus
- Three pathogen variants: armored, swift, stalker
- Antibody projectile system with collision detection
- Pathogen splitting mechanic (Asteroids-style)
- Resistance system — fungi and parasites resist certain damage
- Wave-based level progression with scaling difficulty
- Power-up system: rapid fire, shield, damage boost, system purge (bomb)
- Mobile touch controls — virtual joystick and fire button
- Pause system (Escape key / mobile pause button)
- Particle effects, screen shake, damage flash
- Floating score text on kills
- HUD with health bar, score, and level display
- Menu screen with control instructions
- Game over screen with final score
- Full PWA support — installable on Android, iOS, Windows, macOS, Linux
- Service worker with Workbox (cache-first strategy, offline support)
- PWA update prompt for seamless version updates
- SVG app icon with generated PNG icons for all platforms
- Apple-touch-icons and iOS standalone mode support
- Maskable icons for Android adaptive icon support
- GitHub Actions CI/CD pipeline for auto-deploy to GitHub Pages
- Comprehensive README with gameplay docs, tech stack, and dev instructions
