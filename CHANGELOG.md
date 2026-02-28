# Changelog

All notable changes to Cytoscape: Immune Defense will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
