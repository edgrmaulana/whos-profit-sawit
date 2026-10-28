# Plan — SAWIT-HAZE.MONEY web mock (bl00d.money-style)

Goal: who's profiting from the current sawit haze, and the track record of it. Fire points on a stylized ASEAN map + network of concessions and owners.

## 1. Reference (bl00d.money)

- Full-bleed network canvas, dark single world.
- Thin index rail left (filters), dossier panel right (entity detail).
- Search top-center. Mode pills bottom. Zoom controls right.
- Schema: `entities` / `rels` / `facts` / `sources` / `tracked`.
- Entity types: Person, Company, Government, Country, Fund/Asset Manager, Organization, Weapon/System, Contract/Deal.
- Rel types: owns, supplies/funds, concession, opposes, role.

## 2. Our adaptation (sawit)

| bl00d.money | sawit-haze.money         |
| ------------- | ------------------------ |
| Arms makers   | Plantation + refiner cos |
| Weapons       | Mills / refineries       |
| Contracts     | HGU concessions          |
| Military aid  | CPO export + biodiesel $ |
| Wanted stamps | Grievance flags          |

Entity set v1 (14, in `public/data.json`): Wilmar, Sinar Mas/SMART, Astra Agro, Sime Darby,
Indofood/Salim, Temasek-linked funds, BlackRock, Govt of Indonesia, Widjaja family,
Kuok Khoon Hong, WALHI, Milieudefensie, EU, Indonesia.

Rel set v1 (18): owns ×2, funds ×3, concession ×2, supplies ×8, opposes ×3.

## 3. Stack

Next.js 15 (App Router) + React 19 + TypeScript. Canvas 2D, zero chart deps.
One client component: `components/NetworkMap.tsx`. Data: `public/data.json`.

```text
app/layout.tsx        metadata + fonts
app/page.tsx          renders <NetworkMap/>
app/globals.css       dark tokens (ported)
components/NetworkMap.tsx  canvas + rail + dossier + search + modes
public/data.json      entities / rels / tracked
```

## 4. Mock build steps

1. `npm install` — done (next, react, react-dom, TS).
2. `npm run dev` — check canvas renders, nodes labeled.
3. Click node → dossier shows profile + grouped rels.
4. Toggle rail filters, bottom mode pills, search `/`.
5. Replace sample rows with sourced data (add `sources[]`, `ev[]` per rel like bl00d).
6. Add pages later: `/index` (table), `/cases` (cards), `/tips` (form). Skip for mock.

## 5. Data rules

- Every rel needs `ctx` + source id before publish.
- Money in USD ints. Dates as `YYYY–YYYY` ranges.
- Sample figures flagged; never present as fact.

## 6. Out of scope (mock)

Auth, CMS, i18n, arsenal blueprints, case-file reports, tip backend.
