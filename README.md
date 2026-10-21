<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Cytoscape: Immune Defense

A cellular biology themed Asteroids-style arcade game where you pilot a **T-cell** through the bloodstream, defending the host against waves of invading pathogens.

[![Deploy to GitHub Pages](https://github.com/CptNope/Cytoscape-Immune-Defense/actions/workflows/deploy.yml/badge.svg)](https://github.com/CptNope/Cytoscape-Immune-Defense/actions/workflows/deploy.yml)
![Version](https://img.shields.io/badge/version-2.3.0-emerald)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)

**[Play Now](https://cptnope.github.io/Cytoscape-Immune-Defense/)** — Installable as a PWA on any device · [Skip the intro](https://cptnope.github.io/Cytoscape-Immune-Defense/#play)

[Changelog](CHANGELOG.md) · [Roadmap](ROADMAP.md)

</div>

---

## About

Cytoscape: Immune Defense is a fast-paced, browser-based arcade game inspired by classic Asteroids. You control a white blood cell (T-cell) navigating a microscopic battlefield, firing antibodies at viruses, bacteria, parasites, and fungi. Each pathogen type has unique behaviors, resistances, and variants — requiring different strategies to survive.

The game is built as a **Progressive Web App (PWA)** and can be installed on Android, iOS, Windows, macOS, and Linux for a native-like offline experience.

## Gameplay

### Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| **Move** | `WASD` / `Arrow Keys` | Touch & drag anywhere on the left half |
| **Fire** | `Space` or `F` | Hold anywhere on the right half |
| **Cell ability** | `E` or `Shift` | ✦ button |
| **Switch antibody class** | `Q` or `Tab` | ⇄ button |
| **Pause** | `Escape` | Pause button |

### Pathogens

| Type | Color | Behavior |
|------|-------|----------|
| **Virus** | Yellow | Standard movement, may have **Swift** variant (faster, blue) |
| **Bacteria** | Red | Standard movement, may have **Armored** variant (tougher, double shell) |
| **Parasite** | Purple | **Tracks the player**, may have **Stalker** variant (aggressive homing, pink) |
| **Fungus** | Green | Large, slow, damage-resistant with branching spore structures |

Later waves add **prions** (near-invisible swarms), **cancer cells** (grow and copy themselves) and **biofilms** (shielded colonies).

### Bosses

A boss appears every 5 levels in Endless mode, cycling through all nine and getting tougher each loop. Each has attacks, telegraphs and phases based on the real organism:

| Boss | Mechanic |
|------|----------|
| **Mega Virus** | Shielded capsid fires virion rings; splits off swift viruses at half health |
| **Bacterial Colony** | Core is protected while 3+ segments remain; breaking a link fragments the chain |
| **Parasitic Worm** | Armoured body deflects shots; burrows, then lunges along a telegraphed line |
| **Fungal Bloom** | Hyphae armour and heal the core; spore clouds slow and damage you |
| **Plasmodium** | Hides inside red blood cells — find the infected one (don't shoot healthy cells!) |
| **Retrovirus** | Infects you (slower fire), hijacks T-cells, goes latent to heal |
| **Influenza** | Antigenic shift: resists one antibody class at a time — switch classes |
| **Metastatic Tumor** | Blood vessels armour it; seeds new tumours across the tissue |
| **Autoimmune T-Cell** | Final boss: mirrors you, fires back, triggers cytokine-storm rings |

### Progression

- **Cell types** — Killer T-Cell, Macrophage, NK Cell, Plasma B-Cell, each with an active ability
- **Antibody classes** — IgG (standard), IgM (spread), IgA (piercing), IgE (anti-parasite); swap mid-run
- **Clonal selection** — pick 1 of 3 mutations after each wave (spread shots, piercing, NK escort drones…)
- **Immune memory** — permanent bonus damage against every pathogen type you've killed enough of
- **Upgrades** to level 10, a 2-slot **cytokine** loadout, cosmetic membranes, and free respec
- **Codex** — real biology for every pathogen and boss, unlocked as you defeat them
- **Campaign** — 30 missions across two acts with star ratings and level select

### Power-Ups

Destroyed pathogens have a 15% chance to drop a power-up:

| Power-Up | Effect | Duration |
|----------|--------|----------|
| **Rapid Fire** | Faster shot rate | 5 seconds |
| **Shield** | Absorbs damage, bounces pathogens away | 5 seconds |
| **Damage Boost** | Double antibody damage | 5 seconds |
| **System Purge** | Destroys all pathogens on screen (bosses take 20% damage) | Instant |

### Mechanics

- **Wave System** — Clear all pathogens to advance to the next level; each wave spawns more enemies with increased speed. Big waves stream in as reinforcements once the screen is full, so the game stays smooth on every device
- **Adaptive Resistance** — Pathogens evolve to match your strength: upgrades, immune memory, your cell type and the mutations you draft all raise their health (shown as *Resistance ×N*), so the game stays challenging without erasing your progress
- **Pathogen Splitting** — Destroyed pathogens split into two smaller ones (like Asteroids) until they're too small
- **Resistance System** — Fungi take half damage; parasites resist fast antibodies (IgG/IgA) but not slow ones (IgM/IgE)
- **Variant System** — Some pathogens spawn with special traits: armored, swift, or stalker
- **Screen Wrap** — All entities wrap around screen edges

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Vite 6** | Build tool & dev server |
| **Tailwind CSS 4** | Styling |
| **Motion (Framer Motion)** | UI animations |
| **Lucide React** | Icons |
| **HTML5 Canvas** | Game rendering |
| **vite-plugin-pwa** | Service worker & manifest generation |
| **Workbox** | Offline caching strategies |
| **GitHub Actions** | CI/CD to GitHub Pages |

## Progressive Web App (PWA)

This game is a fully installable PWA with:

- **Offline Support** — Play without an internet connection after first visit
- **Automatic Updates** — Version-based cache busting with user-facing update prompt
- **iOS Support** — Full `apple-mobile-web-app` meta tags, apple-touch-icons for all device sizes, standalone mode
- **Android Support** — Web app manifest with maskable icons, `display: standalone`
- **Desktop Support** — Installable via Chrome/Edge on Windows, macOS, Linux

### Installing

- **iOS Safari** — Tap Share → "Add to Home Screen"
- **Android Chrome** — Tap the install banner or Menu → "Install app"
- **Desktop Chrome/Edge** — Click the install icon in the address bar

## Development

### Prerequisites

- **Node.js** ≥ 20

### Getting Started

```bash
# Clone the repository
git clone https://github.com/CptNope/Cytoscape-Immune-Defense.git
cd Cytoscape-Immune-Defense

# Install dependencies
npm install

# Start development server
npm run dev
```

The dev server runs at `http://localhost:3000`.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm test` | Run unit tests (vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | TypeScript type checking |
| `npm run generate-icons` | Regenerate all PWA icons from `public/icon.svg` |
| `npm run clean` | Remove `dist/` directory |

### Releasing Updates

To push an update to all installed clients:

1. Bump `version` in `package.json` (e.g., `1.1.0` → `1.2.0`)
2. Add an entry to [`CHANGELOG.md`](CHANGELOG.md)
3. Commit and push to `main`
4. GitHub Actions will auto-deploy; the service worker detects the new version and users see an update prompt

### Project Structure

```
├── .github/workflows/   # GitHub Actions CI/CD
├── CHANGELOG.md          # Version history
├── ROADMAP.md            # Planned features & expansion
├── public/
│   ├── icon.svg          # Source SVG icon
│   ├── icons/            # Generated PNG icons (all sizes)
│   ├── apple-touch-icon.png
│   └── favicon.ico
├── scripts/
│   └── generate-icons.mjs  # Icon generation script (Sharp)
├── src/
│   ├── main.tsx          # React entry point
│   ├── App.tsx           # Root component
│   ├── index.css         # Global styles (Tailwind)
│   ├── vite-env.d.ts     # Type declarations
│   ├── components/
│   │   ├── Game.tsx       # Game component (React integration layer, game loop)
│   │   ├── TouchControls.tsx    # Twin-zone touch controls + ability/swap buttons
│   │   ├── DraftOverlay.tsx     # Clonal selection between waves
│   │   ├── LoadoutPanel.tsx     # Cell type, cytokines, cosmetics
│   │   ├── CodexPanel.tsx       # Pathogen encyclopedia & immune memory
│   │   ├── Tutorial.tsx         # First-run hints
│   │   └── …                    # Menus, briefing, stats, audio, PWA prompt
│   └── engine/
│       ├── types.ts       # All game interfaces (Vector, Entity, Pathogen, etc.)
│       ├── constants.ts   # Game physics & balance constants
│       ├── physics.ts     # Pure functions: collision, wrapping, velocity
│       ├── renderer.ts    # Canvas rendering (extracted draw logic)
│       ├── bosses.ts      # All 9 bosses: AI, attacks, phases (engine-only, tested headlessly)
│       ├── combat.ts      # Damage rules: resistances, classes, memory, armour
│       ├── hazards.ts     # Enemy projectiles, spore clouds, telegraphs, rings
│       ├── weapons.ts     # Antibody classes (IgG/IgM/IgA/IgE)
│       ├── cells.ts       # Playable cell types & abilities
│       ├── mutations.ts   # Clonal selection mutations
│       ├── memory.ts      # Immune memory
│       ├── progression.ts # XP, upgrades, loadout, cosmetics, persistence
│       ├── campaign.ts    # 30 campaign missions, stars, par times
│       ├── codex.ts       # Biology facts
│       ├── interpolation.ts # Render interpolation & in-place compaction
│       ├── scores.ts      # localStorage top scores persistence
│       ├── index.ts       # Barrel re-exports
│       └── __tests__/     # Unit tests (vitest)
├── index.html            # HTML template with PWA meta tags
├── vite.config.ts        # Vite + PWA plugin configuration
├── package.json
└── tsconfig.json
```

## Deployment

The app auto-deploys to GitHub Pages via GitHub Actions on every push to `main`. The workflow:

1. Checks out code
2. Installs dependencies (`npm ci`)
3. Builds production bundle (`npm run build`)
4. Deploys `dist/` to GitHub Pages

**Live URL:** [https://cptnope.github.io/Cytoscape-Immune-Defense/](https://cptnope.github.io/Cytoscape-Immune-Defense/)

## License

This project is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
