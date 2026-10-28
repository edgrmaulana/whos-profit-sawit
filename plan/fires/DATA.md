# Sub-plan A — Fires DATA intake (Greenpeace Oct 2026)

Sources:
- Press: `greenpeace.org/malaysia/press/84676` (MY/SG top-20 links)
- Report PDF: `.../509ed03a-when-clean-air-is-sacrificed-for-global-commodities.pdf` (tables pp. 25–26, 30)

Window: haze source spots 8 Aug–1 Oct 2026. Totals: 6,811 spots; 980 inside 233 oil-palm concessions.

## 1. New entities (`public/data.json`)

Groups (type `Company`): KLK, Bumitama Agri, First Resources, ANJ/Austindo, Makin Group,
Rajawali/Eagle High, Murdaya/CCM, Best Agro, Sungai Budi/TBLA, Agro Sentosa, Barito Pacific,
Carson Cumberbatch/Goodhope, Genting Plantations, TSH Resources, RGE/Tanoto.
Person: Fangiono family.

Concessions (type `Concession`, IDs `CON-xxxxx`):

| Concession                    | Parent                        | Spots | Days | Flag |
| ----------------------------- | ----------------------------- | ----- | ---- | ---- |
| PT Mekar Karya Kahuripan      | Makin                         | 52    | 12   | –    |
| PT Damai Agro Sejahtera       | Bumitama Agri                 | 48    | 11   | SG   |
| PT Sinar Karya Mandiri        | Palma Agro Lestari            | 40    | 12   | –    |
| PT Abadi Mulia Sentosa        | —                             | 32    | 10   | –    |
| PT Arrtu Energie Resources    | Rajawali / Eagle High         | 32    | 11   | –    |
| PT Hardaya Sawit Papua        | Murdaya / CCM                 | 31    | 8    | –    |
| PT Karya Luhur Sejati         | Best Agro                     | 29    | 10   | –    |
| PT Sebukit Inter Nusa         | —                             | 26    | 6    | –    |
| PT Kayung Agro Lestari        | ANJ / First Resources         | 25    | 7    | SG   |
| PT Samora Usaha Jaya          | Sungai Budi / TBLA            | 20    | 7    | –    |
| PT Jalin Vaneo Pasifik        | Agro Sentosa                  | 19    | 11   | –    |
| PT Menteng Jaya Sawit Perdana | KLK                           | 19    | 6    | MY   |
| PT Campang Tiga               | Campang Tiga                  | 19    | 10   | –    |
| PT Anugerah Palm Indonesia    | Barito Pacific                | 18    | 6    | –    |
| PT Sawit Makmur Sejahtera     | Carson Cumberbatch / Goodhope | 17    | 4    | –    |
| PT Russelindo Putra Prima     | Mugan                         | 14    | 8    | –    |
| Koperasi Tanjung Pawan        | — (co-op)                     | 12    | 4    | –    |
| PT Proteksindo Utama Mulia    | Cempaka Mas Abadi             | 11    | 3    | –    |
| PT Sinar Fajar Dua Ribu       | —                             | 10    | 9    | –    |
| PT Cipta Karsa Kahuripan      | —                             | 10    | 3    | –    |
| PT Mitra Karya Sentosa        | Fangiono / First Resources    | 10    | 6    | SG   |
| PT Arjuna Utama Sawit         | First Borneo Plantations      | 8     | 3    | SG   |

PBPH: PT Bumi Mekar Hijau → `owns` from existing `COM-SINARMAS` (213 spots / 29 days).

## 2. New rels

- `owns` group→concession, `ctx` = affiliation per report.
- `fire` concession→`CTY-ID`, `ctx` = "N spots over D days, 8 Aug–1 Oct 2026", `ev` = Greenpeace PDF.
- Historical note on group entities: Genting ~17,700 ha, TSH ~6,100 ha burned 2015–2019 (report p.30).

## 3. Sources to register

`SRC-GP-2026-PRESS` (press page), `SRC-GP-2026-PDF` (report PDF).

## 4. Steps

1. Append entities + rels + sources to `public/data.json`.
2. Validate JSON, count nodes/edges.
3. Done — feature work is Sub-plan B.

Out of scope: hotspot geodata, burn-scar polygons, full PBPH list, legal cases.
