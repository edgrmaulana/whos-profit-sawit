// One-shot: settle network physics offline, bake x/y into public/data.json.
// Usage: node scripts/bake-layout.mjs   (run from repo root)
import fs from "fs";
const p = "public/data.json";
let d;
try {
  d = JSON.parse(fs.readFileSync(p, "utf8"));
} catch (err) {
  console.error("cannot read/parse", p, String(err));
  process.exit(1);
}
let s = 42;
const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const nodes = d.entities.map((e, i) => {
  const a = (i / d.entities.length) * Math.PI * 2;
  const rad = 260 + (i % 4) * 130;
  return { id: e.id, x: Math.cos(a) * rad + (rnd() - 0.5) * 40, y: Math.sin(a) * rad + (rnd() - 0.5) * 40, vx: 0, vy: 0 };
});
const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
const edges = d.rels.map((r) => ({ a: byId[r.a], b: byId[r.b] })).filter((e) => e.a && e.b);
for (let t = 0; t < 2000; t++) {
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j];
    let dx = a.x - b.x, dy = a.y - b.y;
    const dist = Math.hypot(dx, dy) || 1;
    const f = Math.min(1200 / (dist * dist), 1.2);
    dx /= dist; dy /= dist;
    a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
  }
  for (const e of edges) {
    const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, dist = Math.hypot(dx, dy) || 1;
    const pull = Math.max(-4, Math.min(4, (dist - 230) * 0.02));
    e.a.vx += (dx / dist) * pull; e.a.vy += (dy / dist) * pull;
    e.b.vx -= (dx / dist) * pull; e.b.vy -= (dy / dist) * pull;
  }
  for (const n of nodes) {
    n.vx *= 0.86; n.vy *= 0.86;
    n.vx -= n.x * 0.004; n.vy -= n.y * 0.004;
    const sp = Math.hypot(n.vx, n.vy);
    if (sp > 30) { n.vx *= 30 / sp; n.vy *= 30 / sp; }
    n.x += n.vx; n.y += n.vy;
  }
}
let mind = 1e9;
for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++)
  mind = Math.min(mind, Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y));
let mx = 0, my = 0;
nodes.forEach((n) => { mx += n.x; my += n.y; });
mx /= nodes.length; my /= nodes.length;
let maxr = 1;
nodes.forEach((n) => { maxr = Math.max(maxr, Math.hypot(n.x - mx, n.y - my)); });
const k = 520 / maxr;
d.entities.forEach((e) => {
  const n = byId[e.id];
  e.x = Math.round((n.x - mx) * k); e.y = Math.round((n.y - my) * k);
});
fs.writeFileSync(p, JSON.stringify(d));
console.log("nodes", nodes.length, "minDist", mind.toFixed(1), "maxR", maxr.toFixed(0), "scale", k.toFixed(2));
