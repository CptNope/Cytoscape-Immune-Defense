# Changelog

All notable changes to Cytoscape: Immune Defense will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-10-21 — Selection Pressure

### Added
- **Adaptive resistance**:
  - Pathogens evolve to match your strength. The game estimates your damage output from upgrades, immune memory, cell type, equipped cytokines and the mutations you've drafted this run
  - Enemy health scales with about 0.7× your power, so a stronger build still kills noticeably faster without melting everything. Speed rises a little (up to +30%), there's a gentle wave ramp, and hits land harder on tougher hosts
  - Bosses scale from the same estimate. Shown in the HUD as **Resistance ×N**, with a "PATHOGENS ADAPTED" note when it jumps. Zen mode never scales
- **On-screen limits that keep the chaos**:
  - Pathogens, antibodies, enemy projectiles, hazards and particles have limits, higher on capable devices and lower on weaker ones
  - Wave pathogens over the limit queue up as **reinforcements** that stream in as you kill, so big waves keep their full size
  - At the limit, pathogens split into fewer pieces and the oldest antibodies fizzle out
- **Load governor**: if frames start taking too long, the limits tighten automatically (down to half), then relax again once the device keeps up
- **Power-ups redrawn as immune molecules**, spinning and bobbing in, and blinking before they expire:
  - Rapid Fire is interleukin-2 (a four-helix bundle)
  - Shield is a mucin sugar coat
  - Damage Boost is a perforin pore
  - System Purge is a cytokine storm

### Fixed
- **Late-game freezes**: waves grew without limit and every kill could spawn more shots (Complement Cascade, NK drones, side shots), so one step could take longer than a frame and the game never caught up
- **Chain Reaction could cascade across the whole screen in one step**. It now hits at most 8 pathogens per kill, and only two links deep

### Changed
- Pathogen name labels fade out a few seconds after each pathogen appears (the artwork identifies them; dozens of text labels were costly to draw)
- Hit flash is a single translucent overlay instead of a second sprite draw

## [2.1.0] - 2026-10-21 — Under the Microscope

### Changed
- **Every cell and microbe redrawn from real biology**, as SVG artwork with animated parts:
  - **Virus**: enveloped capsid with spike proteins that ripple around the envelope. **Swift** variant is now a bacteriophage that "walks" on its tail fibres
  - **Bacteria**: rod-shaped cells with cell wall, chromosome, ribosomes and a plasmid, swimming tail-first on beating flagella (one, a tuft, or all over). **Armored** variant has a slimy polysaccharide capsule
  - **Parasite**: *Trypanosoma* with its undulating membrane. **Stalker** variant is *Giardia*, with its two nuclei "eyes" and eight flagella
  - **Fungus**: budding yeast cells sending out septate hyphae, with spores swelling at the tips
  - **Prion**: a stacked β-sheet aggregate of misfolded protein
  - **Cancer cell**: blebbing membrane, irregular nuclei and enlarged nucleoli
  - **Biofilm**: bacteria embedded in a slime matrix that thins as its shield is worn down
- **Bosses**:
  - **Mega Virus** is Mimivirus, a real giant virus, with its hairy fibril coat and the star-shaped "stargate" that glows before it fires
  - **Retrovirus** is HIV: gp120 knobs and a cone-shaped capsid holding two RNA strands
  - **Influenza** has HA and NA spikes coloured by the antibody class it resists, and its 7+1 RNA segments
  - **Fungal Bloom** is an *Aspergillus* spore head
  - **Plasmodium** is a schizont: a rosette of merozoites around malaria pigment
  - **Parasitic Worm** is a tapeworm: a hooked scolex followed by rippling proglottid segments
  - **Metastatic Tumor**, **Autoimmune T-Cell**, the tumour's blood vessels and the host red blood cells are redrawn too
- **Player cells**:
  - Each is a crawling immune cell with a ruffled leading edge at the front and a uropod tail
  - **Killer T-Cell**: lytic granules at the front
  - **Macrophage**: pseudopods, and phagosomes full of digested microbes
  - **NK Cell**: dense cytotoxic granules
  - **Plasma B-Cell**: clock-face nucleus and stacked rough ER, with antibodies drifting out
- **Antibodies have their real shapes**: IgG and IgE are Ys, IgA a two-Y dimer, IgM a five-armed pentamer
- **Motion**:
  - Pathogens spring in when they appear, turn smoothly toward where they're swimming, stretch with speed, and squash and flash when hit
  - The player cell stretches as it moves, and membrane ripples trail behind it while thrusting
- **Codex and cell picker show the artwork**, animated with Motion; it stays still when the system's reduce-motion setting is on, and undiscovered codex entries show as silhouettes

### Performance
- Artwork is rasterised once into cached bitmaps, and its glow is baked in instead of using live canvas `shadowBlur`. Benchmarked with 60 pathogens, a frame is about **2× faster on high quality and 30% faster on low**
- On low quality the animated parts are frozen into the bitmap, so each organism is a single image draw. Parts that show game state (biofilm shield, Mega Virus charge) stay live

### Added
- `.claude/skills/motion-dev-animations`: Motion.dev skill for Claude Code (from #4)
- Unit tests for the artwork, the entity-to-art mapping and the motion springs

## [2.0.0] - 2026-10-20 — Immune Response

### Fixed
- **Endless waves could never end** — split children were clamped to a minimum size *before* the "too small to split" check, so pathogens could keep splitting forever. Splitting now stops after three sizes, like classic Asteroids
- **Parasites resisted every shot** — the resistance checked bullet speed including the ship's velocity, which was always over the limit. It now uses each antibody class's launch speed: IgG/IgA are resisted, IgM/IgE are not
- **Fungal resistance ignored upgrades** — it set damage to a flat 0.5, cancelling Antibody Potency and Damage Boost. It's now a 50% multiplier
- **Bomb one-shot bosses** — System Purge now deals 20% of a boss's max health instead
- **Bacterial Colony segments never moved** and couldn't be hit; they're now real, chained, shootable segments
- **No bosses after level 20** in Endless — bosses now rotate every 5 levels forever, scaling up each loop
- **No invulnerability after hits** — overlapping pathogens could hit you every frame; you now get ~0.75s of i-frames
- Overlapping HUD and audio buttons at desktop widths

### Added — Bosses & enemy attacks
- Enemy projectile system (virions, toxins, spores, spikes, enemy antibodies, merozoites), hazards (spore clouds, inflammation rings) and telegraphs (lunge lines, landing circles)
- Status effects: **Infected** (slower fire, cured by abilities or power-ups) and **Slowed**
- Reworked bosses: Mega Virus (virion rings, capsid fracture), Bacterial Colony (chain that fragments), Parasitic Worm (armoured body, burrow & lunge), Fungal Bloom (regrowing hyphae, spore clouds)
- New bosses: **Plasmodium**, **Retrovirus**, **Influenza**, **Metastatic Tumor**, **Autoimmune T-Cell**
- Boss health bar with phase/strain readout, intro banners with a biology tagline, slow-motion on boss kills
- Boss health scales with endless loops and your damage upgrades
- **Campaign Act II** — missions 21–30 introduce the new bosses; star ratings (clear / ≤25% damage / par time) and a level-select grid

### Added — Progression
- **Antibody classes**: IgG, IgM (spread, +25% vs bacteria), IgA (piercing, +30% vs viruses), IgE (2.5× vs parasites). Unlock by level, swap mid-run with Q / ⇄
- **Cell types** with active abilities: Killer T-Cell (Perforin Burst), Macrophage (Phagocytosis; passively eats small pathogens), NK Cell (Lytic Dash), Plasma B-Cell (homing shots; Antibody Storm)
- **Clonal selection**: pick 1 of 3 mutations after each wave (12 mutations incl. NK escort drones, complement cascade, opsonization)
- **Immune memory**: permanent bonus damage vs each pathogen type, up to +30%
- **Cytokine loadout** (2 slots) with two new cytokines: Interferon and Fever
- Upgrades now go to **level 10** (diminishing returns past 5), free **respec**, purchasable **membrane colours**
- **Codex** with real biology for every pathogen and boss

### Added — Polish & accessibility
- Cell-lysis death rings, hit flashes, opsonization tags, cell-specific ship visuals
- First-run tutorial that ticks off as you play
- Colorblind-friendly palette (Okabe–Ito), toggle in the menu or in-game settings

### Changed
- Old saves migrate automatically: the first two unlocked cytokines are equipped, existing upgrades are kept
- Boss-fight logic lives in the engine (`bosses.ts`) and is covered by headless simulation tests

## [1.11.0] - 2026-10-20

### Changed
- **Smooth motion on high-refresh screens** — the renderer now interpolates every entity (and the ship's rotation) between the last two 60Hz simulation steps, so 90/120/144Hz displays and uneven frame pacing get fluid movement instead of repeated frames. Screen wraps and teleports are detected and not smeared
- **Everything gameplay-timed runs on a game clock** — fire rate, prion flicker and "time played" used the wall clock (`Date.now()`); they now advance exactly one step per simulation update, so they're identical on every device, freeze while paused, and fire rate no longer speeds up relative to the game when a slow device has to drop time
- **Less garbage-collection stutter** — bullets, particles, power-ups and floating texts are updated in place instead of building new arrays with `.filter()` every frame, and killed pathogens are removed in one pass per step instead of re-filtering the whole list on every kill
- **Particle budget** — explosions now respect the particle cap up front (90 on low quality, half the particles per explosion) instead of spawning and trimming
- **Cheaper labels** — pathogen type labels are drawn in one batched pass with the font set once, and label strings are cached
- Collision checks use squared distances (no `sqrt` per bullet × pathogen)

### Added
- CI workflow: typecheck, unit tests and build run on every pull request
- Unit tests for interpolation and in-place compaction

### Fixed
- Type error: `applyVelocity` / `applyFriction` now accept anything with `pos` and `vel` (floating texts)

## [1.10.0] - 2026-10-20

### Performance (low-end tablets & phones)
- **No more React re-renders every frame** — screen shake, damage flash and the time-attack clock were stored in React state and updated 60×/sec, re-rendering the whole UI tree every frame. They now live in refs; React only re-renders when the HUD actually changes
- **Fixed-timestep game loop** — gameplay runs at 60 updates/sec of game time regardless of display rate, so 30fps tablets no longer play in slow motion and 120Hz phones no longer play at double speed. Duplicate frames aren't redrawn, and menus redraw at ~30fps
- **Adaptive render quality** — a "low" mode disables canvas `shadowBlur` glows (the biggest GPU cost on mobile), thins the animated background, skips motion trails, draws particles as squares and renders at 1× pixel density. It's chosen automatically for low-spec touch devices and switched on mid-game if the frame rate stays under ~45fps
- **Cheaper drawing** — antibodies are batched into one path, particles skip per-item `save()/restore()`, the canvas context is opaque (`alpha: false`) and cached
- **Lighter overlays** — removed `backdrop-blur` from the in-game HUD (re-composited every frame over the moving canvas) and the scanline layer on low quality
- **Explosion sounds** — noise buffers are generated once per size instead of on every kill
- Removed the vibration pulse on every shot (caused jank on some Android devices)

### Fixed
- **Phones were zoomed in too far** — the play area is now at least 640 world units on its short side and scaled to fit the screen, so phones see the same battlefield as tablets instead of a cropped, oversized slice
- **Sharper rendering** on high-DPI screens (device pixel ratio up to 2× on high quality); removed `image-rendering: pixelated`
- **Wonky touch controls** — rewritten as twin touch zones:
  - Left half: floating joystick that appears under your thumb, has a dead zone, and drags along when you overshoot so reversing direction is instant
  - Right half: hold anywhere to fire
  - Each zone tracks its own pointer with pointer capture — previously the stick listened to every finger on the screen, so tapping fire could yank the stick
  - Handles `pointercancel` / lost capture, so the stick can no longer get stuck on
  - Smoother steering: capped turn rate, thrust scales with how far you push, and no thrust while the ship is still facing away
- **Pause didn't actually pause** — the game loop read a stale `isPaused` value. The game now also auto-pauses when the app is backgrounded
- **Controls cut off by the mobile browser bar** — layout uses `100dvh` instead of `100vh`
- Keyboard controls work with Caps Lock on; Space/arrows no longer scroll the page

## [1.9.0] - 2026-02-28

### Fixed
- **Mobile controls too low in portrait** — joystick and fire button moved higher (`bottom-16` / `bottom-24` at sm) so they're not cut off at the bottom edge
- **Ship movement too wild** — reduced thrust from `0.15` to `0.10` and increased friction from `0.98` to `0.97` for smoother, more controllable movement
- **Enemies too large on small screens** — pathogen radius now scales down based on screen size (`minDim / 600` factor), so enemies fit better on phones
- **Fire button stays engaged after retry** — `virtualControlsRef` (fire, joystick) is now fully reset in `initGame()` so auto-firing doesn't carry over between matches
- **Full responsive design** — all screens now work in portrait and landscape on phones, tablets, and desktop:
  - **ModeSelect**: scrollable container, `clamp()` font sizes, `min()` grid columns for narrow screens, safe-area padding for notched devices
  - **CampaignBriefing**: scrollable, responsive text/button sizes, constrained widths, safe-area padding
  - **UpgradeScreen**: `items-start` + scroll instead of `items-center` (prevents vertical overflow clipping), responsive title (`text-3xl sm:text-5xl`), compact padding/margins on small screens, bottom padding for scroll
  - **StatsPanel**: scrollable, responsive heading sizes, compact gaps
  - **HUD**: compact on phones (`p-2`, `w-20` health bar, `text-[10px]` health text), scales up at `sm`/`md` breakpoints; time attack timer and campaign objective also scale
  - **Game Over screen**: scrollable (`max-h-[95vh] overflow-y-auto`), responsive score text (`text-3xl sm:text-5xl md:text-6xl`), reduced padding on mobile, compact border radius
  - **Pause menu**: responsive heading and button sizes
  - **Mobile controls**: joystick and fire button repositioned closer to edges on small screens, smaller sizes (`w-24 h-24 sm:w-32 sm:h-32`), pause button repositioned
- All overlays use `overflow-y-auto` to prevent content being cut off on short viewports
- iOS safe-area insets respected via `env(safe-area-inset-*)` padding

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
