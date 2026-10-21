# Project skills

Skills Claude Code loads automatically when working in this repo.

| Skill | Source | Pinned commit | License |
|-------|--------|---------------|---------|
| `motion-dev-animations` | [199-biotechnologies/motion-dev-animations-skill](https://github.com/199-biotechnologies/motion-dev-animations-skill) | `3feedfb` (2026-03-30) | MIT |

## How it applies to Cytoscape

- **Use it for the React UI**: menus, upgrade screen, campaign briefing, HUD overlays, mutation draft cards, and the landing page. The game already depends on `motion` (`motion/react`), so nothing new needs installing.
- **Not for gameplay rendering**: the playfield is a canvas driven by the fixed-timestep engine in `src/engine/`. Don't move pathogens, bullets or particles into Motion components.
- Keep the game's existing rules: animate `transform`/`opacity` only, honour `prefers-reduced-motion`, and keep overlays cheap on low-end tablets.

## Updating

Vetted on 2026-10-21: guidance and examples only, no network calls, no install scripts beyond `npm install motion`. Re-check the upstream diff before pulling a newer version. The author's backup, research notes and test logs were left out on purpose.
