# SAWIT-HAZE.MONEY — Who's profiting from the current sawit haze?

Interactive map of the Indonesian palm-oil haze economy: fire points on a stylized
ASEAN map + a network of concessions, owners, funders, and enforcement actions.
bl00d.money-style, built with Next.js + canvas (zero chart deps).

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## Re-bake layout (after data merges)

```bash
npm run bake
```

Settles the network offline and writes `x/y` into `public/data.json`.
Entities without coordinates fall back to live simulation.

## Data

- `public/data.json` — entities / rels / sources / tracked
- `public/asean.geojson` — Natural Earth coastlines (subset)
- `plan/` — mock plan + fires intake sub-plans (`plan/fires/`)

Key sources: Greenpeace (press + fire report PDF), WALHI actor-mapping,
TFC haze piece, NEA notices (CNA/BT/ST), TMR/Bloomberg, Career Candour.

## Views

- **NETWORK** — ownership / supply / money / concession / fire / notice lenses,
  click node for dossier, `/` to search
- **FIRE MAP** — 2026 haze source points by province (Greenpeace Aug–Oct),
  click province for detail, worst-concession jump buttons

Fire dots are density-scaled and jittered around province centroids —
counts real, positions illustrative. Concession-level pins need per-concession
coordinates (not yet available).
