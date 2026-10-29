// Pre-bake FIRMS season archive to public/season.json (slow FIRMS -> fast static file).
// Reads FIRMS_MAP_KEY from .env. Run: npm run bake:season
import { readFileSync, writeFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const key = (env.match(/^FIRMS_MAP_KEY=(.*)$/m) || [])[1]?.trim();
if (!key) { console.error("no key"); process.exit(1); }
const BBOX = "94,-12,142,12";
const starts = [];
for (let t = Date.UTC(2026, 7, 8); t <= Date.UTC(2026, 9, 1); t += 5 * 864e5)
  starts.push(new Date(t).toISOString().slice(0, 10));

const parse = (text) => {
  const lines = text.trim().split("\n");
  const head = lines[0].split(",");
  if (!head.includes("latitude") || !head.includes("longitude")) return null;
  const ix = (c) => head.indexOf(c);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",");
    const lat = parseFloat(c[ix("latitude")]), lng = parseFloat(c[ix("longitude")]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({ lat, lng, frp: parseFloat(c[ix("frp")]) || 0, d: c[ix("acq_date")] || "" });
  }
  return out;
};
const chunks = await Promise.all(starts.map(async (date) => {
  for (const src of ["VIIRS_SNPP_SP", "VIIRS_SNPP_NRT"]) {
    try {
      const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${src}/${BBOX}/5/${date}`);
      if (!r.ok) continue;
      const rows = parse(await r.text());
      if (rows && rows.length) return rows;
    } catch { /* next source */ }
  }
  return [];
}));
const all = chunks.flat().filter((p) => p.d < "2026-10-01"); // Oct belongs to ● LIVE
const byM = new Map();
for (const p of all) {
  const k = p.d.slice(0, 7), arr = byM.get(k);
  if (arr) arr.push(p); else byM.set(k, [p]);
}
const points = [];
for (const rows of byM.values()) {
  rows.sort((a, b) => b.frp - a.frp);
  for (const p of rows.slice(0, 4000)) points.push(p);
}
writeFileSync("public/season.json", JSON.stringify({ season: true, count: all.length, points }));
console.log("season.json:", all.length, "->", points.length);
