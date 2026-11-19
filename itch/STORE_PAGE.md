# itch.io launch kit — Cytoscape: Immune Defense

Everything needed to fill in the itch.io "Create a new project" form. Copy each block into the matching field.

## 1. Build the upload

```bash
npm ci
npm run build:itch
```

This writes `release/cytoscape-immune-defense-itch-v<version>.zip`, with `index.html` at the root of the zip as itch requires. The itch build differs from the GitHub Pages build in three ways:

- All paths are relative (itch serves the game from its own CDN folder, so `/Cytoscape-Immune-Defense/...` paths would 404)
- No service worker and no "Update available" prompt (itch delivers new versions itself, and a service worker inside itch's iframe would serve stale builds)
- It opens on the game menu instead of the landing page (the store page does the introducing); "About the game" in the menu still shows the landing page

You can also download the zip from the **itch.io build** workflow run on GitHub (Actions → itch.io build → the run's artifacts), or let that workflow push straight to itch (see section 6).

## 2. Project settings

| Field | Value |
|---|---|
| **Title** | Cytoscape: Immune Defense |
| **Project URL** | `https://<your-itch-username>.itch.io/cytoscape-immune-defense` |
| **Short description or tagline** | You are a T-cell. Hunt viruses, bacteria, parasites and fungi before they overrun the host. |
| **Classification** | Games |
| **Kind of project** | HTML |
| **Release status** | Released |
| **Pricing** | No payments, or "Donate" (free, with a suggested donation) |
| **Uploads** | the zip from step 1 → tick **"This file will be played in the browser"** |

### Embed options

| Option | Setting |
|---|---|
| **Embed in page** | Manually set size: **960 × 640** (the menu and HUD were checked at this size) |
| **Mobile friendly** | ✅ on, orientation **Default** (touch controls are built in: drag left half to move, hold right half to fire) |
| **Automatically start on page load** | off (the "Run game" click lets audio start) |
| **Fullscreen button** | ✅ on |
| **Enable scrollbars** | off |
| **Click to launch in fullscreen** (mobile) | ✅ on, so phones get the whole screen |
| **SharedArrayBuffer support** | off (not needed) |

### Details

| Field | Value |
|---|---|
| **Genre** | Shooter (secondary: Action) |
| **Tags** (itch allows 10) | `arcade`, `asteroids`, `biology`, `educational`, `roguelite`, `shoot-em-up`, `boss-battle`, `touch-friendly`, `singleplayer`, `science` |
| **AI generation disclosure** | Answer honestly for code and art (the cell art is procedural SVG drawn by the game's own code) |
| **App store links / Custom noun** | leave blank |
| **Inputs** | Keyboard, Touchscreen |
| **Accessibility** | Configurable (quality setting, audio controls, reduce-motion respected) |
| **Average session** | A few minutes |
| **Languages** | English |
| **Links** | Source code: https://github.com/CptNope/Cytoscape-Immune-Defense · Web app (installable, works offline): https://cptnope.github.io/Cytoscape-Immune-Defense/ · Developer: https://jeremyanderson.tech/ |
| **License** | Apache-2.0 (source available) |

### Images

- **Cover image** (630 × 500): `itch/cover-630x500.png` (a 2× version is `itch/cover-1260x1000.png`; itch accepts either and downsizes)
- **Screenshots**, in this order: `itch/screenshots/01-title.png` … `05-campaign.png`
- **Theme** (Edit theme on the page, as live): BG `#050303`, BG 2 `#0d0808`, text `#d1d5db`, links `#34d399`, headers `#ffffff`, buttons `#10b981`; banner `itch/banner-960.png`, embed background `itch/embed-bg-960x640.png`
- **External links** (Metadata → External links): Homepage → https://jeremyanderson.tech/project/cytoscape-immune-defense/, Source code → https://github.com/CptNope/Cytoscape-Immune-Defense
- **Live page**: https://cptnope.itch.io/cytoscape-immune-defense

The screenshots were taken headless without web fonts; a few more taken on your own machine mid-boss-fight would sell the game better than menus.

## 3. Description

Paste this into the description field (itch's editor accepts pasted formatted text; or switch it to HTML and paste from a Markdown preview).

---

**You are a T-cell. The host is counting on you.**

Cytoscape: Immune Defense is an Asteroids-style arcade shooter set in the bloodstream. Pilot an immune cell through a microscopic battlefield, fire antibodies at invading pathogens, and keep the infection from overrunning the host.

**Every pathogen fights differently**

- **Viruses** split and swarm; swift variants move almost twice as fast
- **Bacteria** come armoured with a double cell wall
- **Parasites** hunt you down and shrug off fast antibodies
- **Fungi** are huge, slow and take half damage
- Later waves bring near-invisible **prions**, **cancer cells** that copy themselves and shielded **biofilms**

**Nine bosses based on real biology**

A Mega Virus that splits under pressure. A malaria parasite hiding in red blood cells (don't shoot the healthy ones). An influenza strain that shifts which antibody it resists. A tumour that grows its own blood supply. And a final boss that's one of your own T-cells turned against the body.

**Build your immune response**

- Four playable cells, each with an ability: Killer T-Cell, Macrophage, NK Cell, Plasma B-Cell
- Four antibody classes (IgG, IgM, IgA, IgE) you swap mid-run to counter each pathogen
- Clonal selection: pick 1 of 3 mutations after every wave
- Immune memory: permanent bonus damage against everything you've killed enough of
- Upgrades, a cytokine loadout and adaptive resistance that keeps the challenge fair as you grow

**Four ways to play**

- **Endless**: survive as long as you can, with a boss every 5 waves
- **Campaign**: 30 story missions across two acts, with star ratings
- **Time Attack**: 60 seconds on the clock, every kill adds time
- **Zen**: no damage, no score, just drift through the bloodstream

A codex unlocks the real biology behind every pathogen and boss as you defeat them.

**Controls**

| | Keyboard | Touch |
|---|---|---|
| Move | WASD / Arrow keys | Drag on the left half |
| Fire | Space or F | Hold on the right half |
| Ability | E or Shift | ✦ button |
| Switch antibody | Q or Tab | ⇄ button |
| Pause | Esc | Pause button |

Progress saves in your browser. Want it as an app that works offline? Install the web version: https://cptnope.github.io/Cytoscape-Immune-Defense/

Free and open source (Apache-2.0): https://github.com/CptNope/Cytoscape-Immune-Defense

Made by [Jeremy Anderson Tech](https://jeremyanderson.tech/), Shrewsbury, MA.

---

## 4. Before you hit Publish

- [ ] Upload the zip, tick "played in the browser", save
- [ ] Open the page while it's still a draft and play a run in the embed: keyboard works after one click into the game, sound plays, fullscreen button works
- [ ] Try it on a phone: "Run game" opens fullscreen, touch controls respond
- [ ] Set visibility to **Public** and save

## 5. After launch

- Post a devlog on the itch page announcing the launch (itch's "Devlog" tab), and link it from the jeremyanderson.tech project page
- Add the itch link to the README and the landing page footer

## 6. Automatic uploads with butler (optional)

`.github/workflows/itch.yml` builds the zip on every published GitHub release (or when run by hand) and keeps it as a workflow artifact. To also push it to itch automatically:

1. Get an API key at https://itch.io/user/settings/api-keys
2. In the GitHub repo: Settings → Secrets and variables → Actions
   - **Secret** `BUTLER_API_KEY` = the key
   - **Variable** `ITCH_GAME` = `<your-itch-username>/cytoscape-immune-defense`
3. The workflow then pushes to the `html` channel with the version from `package.json`. In itch's upload list, tick "This file will be played in the browser" on the `html` channel once after its first push.

Without the secret the workflow still builds the zip and skips the push.
