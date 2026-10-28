# Sub-plan A2 — TFC haze data intake (Financial Coconut, Oct 2026)

Source: `thefinancialcoconut.com/blog/haze-who-is-burning-indonesia` (+ refs: NEA notices, Eco-Business costings, WALHI studies).

Complements Sub-plan A (Greenpeace). New angles here: enforcement actions, investor cost, SG-listed links.

## 1. New entities

Groups (type `Company`): Musim Mas (NEW — named by WALHI alongside Sinar Mas, Wilmar, First Resources).
Concessions (type `Concession`, only ones NOT already in DATA.md):
- PT Bumi Andalas Permai (NEA notice, Sumatra)
- PT Bangkanesia (NEA notice, Sumatra)
- PT Mananjung Hayak (NEA notice, Kalimantan)

Already covered in DATA.md — skip, just add rels: PT Bumi Mekar Hijau, PT Paramitra Mulia Langgeng,
PT Sumatera Alam Anugerah, PT SBA Wood Industries, PT Hutan Lestari Raya,
PT Buana Megatama Jaya, PT Baratama Putra Perkasa.

New org entity? NEA Singapore (type `Government`, country SG) — enforcement actor.

## 2. New rels

- New rel type `notice` (color TBD): `NEA SG` → each of the 10 concessions.
  `ctx` = "Preventive Measure Notice under THPA, 16/19 Oct 2026. Notice ≠ guilt; requires firefighters + action plan."
- WALHI stat as `ctx` on `ORG-WALHI`: "74% of 34,262 Kalimantan hotspots Jan–Jul 2026 inside concessions (10,739 oil palm / 7,880 mining / 6,905 forest)."
- Merauke food estate: `fire`-style note concession→`GOV-ID`: 807 hotspots, 674 in ministry-run clusters (WALHI 14 Oct study).
- First Resources dispute: append to its `ctx` — "disputes: says hotspots outside boundaries / spread inward (Ecobiz Asia)."
- Cost figure for dossier overview: S$3.2–3.9B SG haze bill vs S$2M THPA cap, zero fines since 2014.

## 3. Sources to register

`SRC-TFC-2026-HAZE` (blog), plus upstream: `SRC-NEA-2026-NOTICES`, `SRC-WALHI-2026-KALIMANTAN`, `SRC-WALHI-2026-MERAUKE`, `SRC-ECOBUSINESS-2026-COST`.

## 4. Steps

1. Add Musim Mas + 3 concessions + NEA SG entities.
2. Add 10 `notice` rels + WALHI/Merauke/dispute `ctx` updates + cost line.
3. Feature note (for Sub-plan B): `notice` needs color + dossier group entry; enforcement actor renders as Government node.
4. `npx tsc --noEmit && npm run build`; verify NEA node fans out to 10 concessions.

Out of scope: THPA legal explainer page, investor-portfolio mapping, mining-concession intake (flagged: 7,880 mining hotspots — candidate phase 3).
