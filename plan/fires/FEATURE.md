# Sub-plan B — Fires FEATURE work (code only, no data)

Depends on: Sub-plan A data merged into `public/data.json`.

## 1. `components/NetworkMap.tsx` changes

- Colors: add `Concession: "#ff8c00"` to `COLORS`; add `fire: "#ff3b30"` to `LINK`.
- Dossier group list: append `'fire'` to hardcoded `['owns','supplies','funds','concession','opposes','role']` (two spots: overview + detail).
- `MODES`: add `"fire"` pill (label FIRES).
- `START HERE` filter: include `"Concession"`? No — keep groups only, concessions surface via search/click.
- Overview stats: add haze totals line (6,811 spots; Kalteng 1,728 / Kalbar 1,240 / Sumsel 953 / S. Papua 1,413).

## 2. Verify

1. `npx tsc --noEmit && npm run build`.
2. Click KLK → dossier shows Menteng concession, 19 spots.
3. FIRES pill isolates `fire` edges only.
4. Rail shows `Concession` type + `fire` link with counts.

## 3. Out of scope

New pages, map tiles, hotspot polygons, backend. Feature ends at lens + dossier rendering.
