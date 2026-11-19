# Contributing to Cytoscape: Immune Defense

Thanks for your interest! Bug reports, ideas, balance feedback and pull requests are all welcome.

[README](README.md) · [Architecture](docs/ARCHITECTURE.md) · [Gameplay guide](docs/GAMEPLAY.md) · [Roadmap](ROADMAP.md) · [Issues](https://github.com/CptNope/Cytoscape-Immune-Defense/issues)

## Ways to help

- **Report a bug**: [open an issue](https://github.com/CptNope/Cytoscape-Immune-Defense/issues/new) with your device, browser, where you played (itch.io or the web app), what happened and what you expected. A screenshot or a short clip helps a lot.
- **Suggest an idea**: open an issue describing it. Biology-based ideas (new pathogens, bosses, cells) are especially welcome.
- **Pick up roadmap work**: the open items in [ROADMAP.md](ROADMAP.md) are fair game; comment on or open an issue first so work isn't duplicated.
- **Support the game**: [donate on itch.io](https://cptnope.itch.io/cytoscape-immune-defense/purchase) or leave a rating.

## Setup

```bash
git clone https://github.com/CptNope/Cytoscape-Immune-Defense.git
cd Cytoscape-Immune-Defense
npm install
npm run dev     # http://localhost:3000/Cytoscape-Immune-Defense/
```

Node.js 22 is recommended (20.15+ works).

## Before you open a pull request

```bash
npm run lint    # TypeScript must pass
npm test        # all unit tests must pass
npm run build   # the Pages build must succeed
npm run build:itch   # if you touched paths, assets, the PWA or vite.config.ts
```

CI runs the first three on every pull request and attaches a playable preview build.

## Conventions

- **Game rules belong in `src/engine/`** as plain TypeScript with no React, so they can be tested headlessly. `Game.tsx` wires them together; components handle UI only. See [ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Add or update tests** in `src/engine/__tests__/` for any rule you change: damage, bosses, progression, balance.
- **Keep it fast on phones.** Avoid allocating in the per-frame path, respect the entity caps in `budget.ts`, and check new effects with Low quality.
- **Keep the biology honest.** If something is based on real immunology, the codex text should be accurate.
- **Every entity needs a shape and a label**, not just a colour, so the colourblind palette keeps working.
- **Save data must stay compatible**: new profile fields need defaults in `progression.ts` so old saves load.
- Source files start with the Apache-2.0 SPDX header used throughout the repo.
- Use clear commit messages; user-facing changes get a line in [CHANGELOG.md](CHANGELOG.md) under the next version.

## License

By contributing you agree that your contributions are licensed under the [Apache License 2.0](LICENSE), like the rest of the project.
