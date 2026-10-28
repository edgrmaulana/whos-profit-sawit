"use client";

import { useEffect, useRef, useState } from "react";

type Entity = { id: string; name: string; type: string; role?: string; country?: string; profile?: string; x?: number; y?: number };
type Rel = { a: string; b: string; rel: string; ctx?: string };
type Data = { entities: Entity[]; rels: Rel[]; sources?: { id: string; title: string; pub: string; url: string }[]; built?: string; tracked?: { usd: number; parts?: { label: string; usd: number }[] } };

type Node = Entity & { x: number; y: number; vx: number; vy: number; color: string };
type Edge = { rel: string; ctx?: string; a: Node; b: Node };

const COLORS: Record<string, string> = {
  Person: "#a7d8e0", Company: "#e8ff00", Government: "#4f9dff",
  Country: "#b48cff", "Fund/Asset Manager": "#ff5c2b", Organization: "#6fd38a", Concession: "#ff8c00",
};
const LINK: Record<string, string> = {
  owns: "#ff5c2b", supplies: "#e5322d", funds: "#ffc93c",
  concession: "#6fd38a", opposes: "#ff3b8d", role: "#a7d8e0",
  fire: "#ff3b30", notice: "#7dd3fc",
};
const MODES = ["network", "owns", "supplies", "money", "concession", "fire", "notice", "opposes"];

// ---- stylized ASEAN fire map (schematic shapes, real province counts) ----
type Prov = { name: string; lng: number; lat: number; spots: number; note: string };
const PROVS: Prov[] = [
  { name: "Central Kalimantan", lng: 113.5, lat: -1.8, spots: 1728, note: "Worst province. ~47Mt CO₂e, above 2015/2019 levels." },
  { name: "South Papua", lng: 140.3, lat: -7.5, spots: 1413, note: "Merauke food estate frontier; 807 hotspots in WALHI study." },
  { name: "West Kalimantan", lng: 110.5, lat: 0.2, spots: 1240, note: "~31.4Mt CO₂e, above 2015/2019 levels." },
  { name: "South Sumatra", lng: 104, lat: -3.5, spots: 953, note: "~20.6Mt CO₂e. Ogan Komering Ilir worst regency (639)." },
  { name: "South Kalimantan", lng: 115, lat: -3, spots: 404, note: "Banjar + Kotabaru worst regencies." },
  { name: "East Kalimantan", lng: 116.5, lat: 0.5, spots: 249, note: "Paser worst regency (125)." },
  { name: "Maluku", lng: 128.5, lat: -3.5, spots: 152, note: "Buru worst regency (50)." },
  { name: "Jambi", lng: 103.3, lat: -1.8, spots: 137, note: "Tanjung Jabung Timur worst (50)." },
  { name: "Riau", lng: 102, lat: 0.5, spots: 45, note: "Lowest monitored; Indragiri Hilir worst (19)." },
];
// real ASEAN coastlines load from /asean.geojson (Natural Earth, world.geo.json)
const HAZE_HIT = [
  { name: "Singapore", lng: 103.8, lat: 1.35, label: "SG · haze 5d" },
  { name: "Sarawak", lng: 112.5, lat: 2.8, label: "Sarawak · haze 55d" },
  { name: "Kuala Lumpur", lng: 101.7, lat: 3.1, label: "KL · haze 13d" },
];
// fit ASEAN lng 94..142 / lat 12..-12 into canvas
function projectMaker(w: number, h: number) {
  const s = Math.max(1, Math.min((w - 120) / 48, (h - 140) / 24));
  return (lng: number, lat: number): [number, number] => [(lng - 118) * s, (0 - lat) * s];
}
function haloText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.strokeStyle = "#080808"; ctx.lineWidth = 3;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
function mulberry(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
const DOTS: { lng: number; lat: number; hot: boolean }[] = (() => {
  const out: { lng: number; lat: number; hot: boolean }[] = [];
  PROVS.forEach((p, pi) => {
    const rnd = mulberry(1000 + pi);
    const n = Math.min(140, Math.round(p.spots / 12));
    for (let i = 0; i < n; i++) {
      out.push({ lng: p.lng + (rnd() - 0.5) * 1.8, lat: p.lat + (rnd() - 0.5) * 1.4, hot: p.spots > 500 });
    }
  });
  return out;
})();
type Faces = number[][][][];

function money(u: number) {
  return u >= 1e9 ? "$" + (u / 1e9).toFixed(2) + "B" : u >= 1e6 ? "$" + (u / 1e6).toFixed(1) + "M" : "$" + u;
}

export default function NetworkMap() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<Data | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [mode, setMode] = useState("network");
  const [typeOff, setTypeOff] = useState<Set<string>>(new Set());
  const [linkOff, setLinkOff] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"net" | "map">("net");
  const [prov, setProv] = useState<string | null>(null);
  const [geo, setGeo] = useState<Faces | null>(null);
  useEffect(() => {
    fetch("/asean.geojson").then((r) => r.json()).then((g: { features: { geometry?: { type: string; coordinates: number[] } }[] }) => {
      const faces: Faces = [];
      for (const f of g.features) {
        const t = f.geometry?.type, c = f.geometry?.coordinates as number[][][] | number[][][][] | undefined;
        if (!c) continue;
        if (t === "Polygon") faces.push(c as number[][][]);
        else if (t === "MultiPolygon") for (const p of c as number[][][][]) faces.push(p);
      }
      setGeo(faces.filter((p) => p.length));
    }).catch(() => {});
  }, []);
  const st = useRef({ nodes: [] as Node[], edges: [] as Edge[], cam: { x: 0, y: 0, z: 1 }, ticks: 0, theta: 0, dragging: false, sim: true, deg: {} as Record<string, number>, parts: [] as { e: Edge; t: number }[] });
  const nodeR = (n: Node) => 4.5 + Math.min(7, Math.sqrt(st.current.deg[n.id] || 1) * 1.9);
  const quadAt = (a: number[], c: number[], b: number[], t: number): [number, number] => {
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  };
  const drawRef = useRef<() => void>(() => {});

  useEffect(() => {
    fetch("/data.json").then((r) => r.json()).then((d: Data) => {
      const nodes: Node[] = d.entities.map((e, i) => {
        const a = (i / d.entities.length) * Math.PI * 2;
        const rad = 220 + (i % 3) * 140;
        return { ...e, x: typeof e.x === "number" ? e.x : Math.cos(a) * rad, y: typeof e.y === "number" ? e.y : Math.sin(a) * rad, vx: 0, vy: 0, color: COLORS[e.type] || "#ccc" };
      });
      const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
      const edges: Edge[] = d.rels.map((r) => {
        const key = [r.a, r.b].sort().join("|");
        let hh = 0;
        for (let k = 0; k < key.length; k++) hh = (hh * 31 + key.charCodeAt(k)) | 0;
        return { ...r, dir: hh % 2 ? 1 : -1, a: byId[r.a], b: byId[r.b] };
      }).filter((e) => e.a && e.b);
      const deg: Record<string, number> = {};
      for (const e of edges) { deg[e.a.id] = (deg[e.a.id] || 0) + 1; deg[e.b.id] = (deg[e.b.id] || 0) + 1; }
      st.current.nodes = nodes; st.current.edges = edges; st.current.ticks = 0;
      st.current.sim = d.entities.some((e) => typeof e.x !== "number" || typeof e.y !== "number"); st.current.deg = deg;
      st.current.parts = edges.filter((e) => e.rel === "funds" || e.rel === "supplies").slice(0, 40).map((e) => ({ e, t: Math.random() }));
      setData(d);
    });
  }, []);

  const visible = (n: Node) => !typeOff.has(n.type);
  const visibleE = (e: Edge) =>
    visible(e.a) && visible(e.b) && !linkOff.has(e.rel) &&
    (mode === "network" || e.rel === mode || (mode === "money" && e.rel === "funds"));
  const toScreen = (nx: number, ny: number, w: number, h: number): [number, number] => {
    const c = st.current.cam, t = st.current.theta;
    const cos = Math.cos(t), sin = Math.sin(t);
    const rx = nx * cos - ny * sin, ry = nx * sin + ny * cos;
    return [(rx - c.x) * c.z + w / 2, (ry - c.y) * c.z + h / 2];
  };
  const edgeCurve = (e: Edge, w: number, h: number): { a: number[]; c: number[]; b: number[] } => {
    const a = toScreen(e.a.x, e.a.y, w, h), b = toScreen(e.b.x, e.b.y, w, h);
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const off = len * 0.12 * ((e as Edge & { dir?: number }).dir || 1);
    return { a, c: [mx - (dy / len) * off, my + (dx / len) * off], b };
  };

  // canvas draw + physics loop
  useEffect(() => {
    const cv = cvRef.current;
    if (!cv || !data) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0; let dead = false;
    const sel = st.current.nodes.find((n) => n.id === selId) || null;
    const draw = () => {
      const dpr = devicePixelRatio || 1;
      const w = innerWidth, h = innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#080808"; ctx.fillRect(0, 0, w, h);
      const S = st.current;
      for (const e of S.edges) {
        if (!visibleE(e)) continue;
        const cur = edgeCurve(e, w, h);
        const a = cur.a, c = cur.c, b = cur.b;
        const hot = sel !== null && (e.a === sel || e.b === sel);
        ctx.strokeStyle = hot ? "#fff" : LINK[e.rel] || "#555";
        ctx.globalAlpha = hot ? 0.95 : sel ? 0.15 : 0.42;
        ctx.lineWidth = hot ? 1.4 : 0.7;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]); ctx.stroke();
        if (hot) {
          const qa = quadAt(a, c, b, 0.86), pa = quadAt(a, c, b, 0.8);
          const ang = Math.atan2(qa[1] - pa[1], qa[0] - pa[0]);
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.moveTo(qa[0] + Math.cos(ang) * 6, qa[1] + Math.sin(ang) * 6);
          ctx.lineTo(qa[0] + Math.cos(ang + 2.6) * 5, qa[1] + Math.sin(ang + 2.6) * 5);
          ctx.lineTo(qa[0] + Math.cos(ang - 2.6) * 5, qa[1] + Math.sin(ang - 2.6) * 5);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      for (const p of S.parts) {
        if (!visibleE(p.e)) continue;
        const cur = edgeCurve(p.e, w, h);
        const q = quadAt(cur.a, cur.c, cur.b, p.t);
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = LINK[p.e.rel] || "#fff";
        ctx.fillRect(q[0] - 1, q[1] - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
      for (const n of S.nodes) {
        if (!visible(n)) continue;
        const sc = toScreen(n.x, n.y, w, h);
        const sx = sc[0], sy = sc[1];
        if (sx < -50 || sy < -50 || sx > w + 50 || sy > h + 50) continue;
        const r = nodeR(n);
        const dim = sel !== null && sel !== n && !S.edges.some((e) => visibleE(e) && ((e.a === sel && e.b === n) || (e.b === sel && e.a === n)));
        ctx.globalAlpha = dim ? 0.22 : 1;
        const isSel = sel !== null && n === sel;
        if (isSel) {
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(sx, sy, r + 6, 0, 7); ctx.stroke();
          ctx.globalAlpha *= 0.4;
          ctx.beginPath(); ctx.arc(sx, sy, r + 10, 0, 7); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (r > 6 && !dim) { ctx.shadowColor = n.color; ctx.shadowBlur = 12; }
        ctx.fillStyle = isSel ? "#fff" : n.color;
        if (n.type === "Concession") {
          ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.PI / 4);
          ctx.fillRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5); ctx.restore();
        } else {
          ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill();
          if (n.type === "Person" && r > 4) {
            ctx.shadowBlur = 0; ctx.fillStyle = "#080808";
            ctx.beginPath(); ctx.arc(sx, sy, r * 0.45, 0, 7); ctx.fill();
          }
        }
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
      ctx.font = "11px IBM Plex Mono, monospace";
      {
        const L0 = w > 900 ? 232 : 0, R0 = w > 900 ? w - 360 : w;
        const order: { n: Node; force: boolean }[] = [];
        const nb = new Set<Node>();
        if (sel !== null) {
          order.push({ n: sel, force: true });
          for (const e of S.edges) {
            if (!visibleE(e)) continue;
            if (e.a === sel) nb.add(e.b); else if (e.b === sel) nb.add(e.a);
          }
          [...nb].filter((nn) => visible(nn))
            .sort((aa, bb) => (S.deg[bb.id] || 0) - (S.deg[aa.id] || 0)).slice(0, 8)
            .forEach((nn) => order.push({ n: nn, force: true }));
        }
        S.nodes.filter((nn) => visible(nn) && nn !== sel && !nb.has(nn))
          .sort((aa, bb) => (S.deg[bb.id] || 0) - (S.deg[aa.id] || 0)).slice(0, 14)
          .forEach((nn) => order.push({ n: nn, force: false }));
        const boxes: number[][] = [];
        for (const o of order) {
          const n = o.n, r = nodeR(n);
          const sc2 = toScreen(n.x, n.y, w, h);
          const tw = ctx.measureText(n.name.toUpperCase()).width;
          const bx = sc2[0] + r + 7, by = sc2[1] - 8;
          if (!o.force) {
            if (bx < L0 || bx + tw > R0 || sc2[1] < 70 || sc2[1] > h - 60) continue;
            if (boxes.some((q) => bx < q[0] + q[2] && bx + tw > q[0] && by < q[1] + q[3] && by + 13 > q[1])) continue;
          }
          boxes.push([bx, by, tw, 13]);
          haloText(ctx, n.name.toUpperCase(), bx, sc2[1] + 4, (sel !== null && n === sel) ? "#fff" : "rgba(241,241,237,.78)");
        }
      }
      ctx.globalAlpha = 1;
    };
    drawRef.current = draw;
    const drawMap = () => {
      const dpr = devicePixelRatio || 1;
      const w = innerWidth, h = innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#080808"; ctx.fillRect(0, 0, w, h);
      const c = st.current.cam;
      const proj = projectMaker(w, h);
      const P = (lng: number, lat: number): [number, number] => {
        const [X, Y] = proj(lng, lat);
        return [(X - c.x) * c.z + w / 2, (Y - c.y) * c.z + h / 2];
      };
      // graticule
      ctx.strokeStyle = "#141414"; ctx.lineWidth = 1;
      for (let lng = 95; lng <= 140; lng += 5) {
        const [ax, ay] = P(lng, 12), [bx, by] = P(lng, -12);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      for (let lat = -10; lat <= 10; lat += 5) {
        const [ax, ay] = P(94, lat), [bx, by] = P(142, lat);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      // real coastlines
      if (geo) {
        for (const poly of geo) {
          for (const ring of poly) {
            ctx.beginPath();
            ring.forEach(([lng, lat], i) => { const [sx, sy] = P(lng, lat); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); });
            ctx.closePath();
          }
          ctx.fillStyle = "#0e100f"; ctx.fill();
          ctx.strokeStyle = "#333"; ctx.lineWidth = 1; ctx.stroke();
        }
        // Singapore missing from dataset — dot island
        const [gx, gy] = P(103.8, 1.3);
        ctx.fillStyle = "#0e100f";
        ctx.fillRect(gx - 3, gy - 2, 6, 4);
        ctx.strokeStyle = "#333";
        ctx.strokeRect(gx - 3, gy - 2, 6, 4);
      }
      // fire dots, additive glow
      ctx.globalCompositeOperation = "lighter";
      for (const d of DOTS) {
        const [sx, sy] = P(d.lng, d.lat);
        if (sx < -10 || sy < -10 || sx > w + 10 || sy > h + 10) continue;
        ctx.globalAlpha = d.hot ? 0.14 : 0.09;
        ctx.fillStyle = "#ff3b30";
        ctx.beginPath(); ctx.arc(sx, sy, d.hot ? 7 : 5, 0, 7); ctx.fill();
      }
      for (const d of DOTS) {
        const [sx, sy] = P(d.lng, d.lat);
        if (sx < -10 || sy < -10 || sx > w + 10 || sy > h + 10) continue;
        ctx.globalAlpha = d.hot ? 0.9 : 0.55;
        ctx.fillStyle = d.hot ? "#ff6a3d" : "#ff3b30";
        ctx.beginPath(); ctx.arc(sx, sy, d.hot ? 2 : 1.5, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.font = "10px IBM Plex Mono, monospace";
      for (const p of PROVS) {
        const [sx, sy] = P(p.lng, p.lat);
        if (sx < 0 || sy < 0 || sx > w || sy > h) continue;
        if (p.spots < 400 && prov !== p.name) continue;
        haloText(ctx, `${p.name.toUpperCase()} · ${p.spots}`, sx + 9, sy - 7, prov === p.name ? "#fff" : "#bdbdb9");
      }
      if (prov) {
        const p = PROVS.find((x) => x.name === prov);
        if (p) {
          const [sx, sy] = P(p.lng, p.lat);
          ctx.strokeStyle = "#fff"; ctx.setLineDash([4, 3]);
          ctx.beginPath(); ctx.arc(sx, sy, 16, 0, 7); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      for (const m of HAZE_HIT) {
        const [sx, sy] = P(m.lng, m.lat);
        ctx.strokeStyle = "#7dd3fc"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx, sy + 4); ctx.stroke();
        haloText(ctx, m.label.toUpperCase(), sx + 7, sy + 3, "#7dd3fc");
      }
      if (w > 760) {
        haloText(ctx, "● FIRE CLUSTER (~12 SPOTS/DOT)", w - 218, 96, "#ff6a3d");
        haloText(ctx, "+ HAZE-HIT CITY", w - 218, 110, "#7dd3fc");
      }
    };
    let last = performance.now();
    const step = (now?: number) => {
      if (dead) return;
      const t = now ?? performance.now();
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const S = st.current;
      if (!S.dragging && sel === null && view === "net") S.theta = (S.theta + dt * 0.066) % (Math.PI * 2);
      for (const p of S.parts) { p.t += dt * 0.5; if (p.t > 1) p.t -= 1; }
      if (S.sim && S.ticks++ < 600) {
        for (let i = 0; i < S.nodes.length; i++) for (let j = i + 1; j < S.nodes.length; j++) {
          const a = S.nodes[i], b = S.nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy) || 1;
          const f = Math.min(600 / (d * d), 0.4);
          dx /= d; dy /= d; a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
        }
        for (const e of S.edges) {
          const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, d = Math.hypot(dx, dy) || 1;
          const pull = Math.max(-3, Math.min(3, (d - 170) * 0.012));
          e.a.vx += (dx / d) * pull; e.a.vy += (dy / d) * pull;
          e.b.vx -= (dx / d) * pull; e.b.vy -= (dy / d) * pull;
        }
        for (const n of S.nodes) {
          n.vx *= 0.86; n.vy *= 0.86;
          const sp = Math.hypot(n.vx, n.vy);
          if (sp > 40) { n.vx = (n.vx / sp) * 40; n.vy = (n.vy / sp) * 40; }
          n.x = Math.max(-1600, Math.min(1600, n.x + n.vx));
          n.y = Math.max(-1600, Math.min(1600, n.y + n.vy));
        }
        draw(); raf = requestAnimationFrame(step);
        return;
      }
      draw(); raf = requestAnimationFrame(step);
    };
    if (view === "map") { drawRef.current = drawMap; drawMap(); const onR = () => drawMap(); addEventListener("resize", onR); return () => { dead = true; removeEventListener("resize", onR); }; }
    step();
    const onR = () => draw();
    addEventListener("resize", onR);
    return () => { dead = true; cancelAnimationFrame(raf); removeEventListener("resize", onR); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selId, mode, typeOff, linkOff, view, prov, geo]);

  // pan / zoom / click
  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    let drag: { x: number; y: number; cx: number; cy: number } | null = null;
    const down = (e: MouseEvent) => { drag = { x: e.clientX, y: e.clientY, cx: st.current.cam.x, cy: st.current.cam.y }; st.current.dragging = true; };
    const up = () => { drag = null; st.current.dragging = false; };
    const move = (e: MouseEvent) => {
      if (!drag) return;
      st.current.cam.x = drag.cx - (e.clientX - drag.x) / st.current.cam.z;
      st.current.cam.y = drag.cy - (e.clientY - drag.y) / st.current.cam.z;
      drawRef.current();
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      st.current.cam.z = Math.min(4, Math.max(0.3, st.current.cam.z * (e.deltaY < 0 ? 1.12 : 0.89)));
      drawRef.current();
    };
    const click = (e: MouseEvent) => {
      const w = innerWidth, h = innerHeight;
      if (view === "map") {
        const c = st.current.cam;
        const proj = projectMaker(w, h);
        let bp: Prov | null = null, bd = 34;
        for (const p of PROVS) {
          const [X, Y] = proj(p.lng, p.lat);
          const sx = (X - c.x) * c.z + w / 2, sy = (Y - c.y) * c.z + h / 2;
          const d = Math.hypot(sx - e.clientX, sy - e.clientY);
          if (d < bd) { bd = d; bp = p; }
        }
        setProv(bp ? bp.name : null);
        drawRef.current();
        return;
      }
      let best: Node | null = null, bd = 16;
      for (const n of st.current.nodes) {
        if (!visible(n)) continue;
        const [sx, sy] = toScreen(n.x, n.y, w, h);
        const d = Math.hypot(sx - e.clientX, sy - e.clientY);
        if (d < bd) { bd = d; best = n; }
      }
      if (best) {
        setSelId(best.id);
        st.current.cam.x = best.x; st.current.cam.y = best.y;
      }
    };
    cv.addEventListener("mousedown", down);
    addEventListener("mouseup", up);
    addEventListener("mousemove", move);
    cv.addEventListener("wheel", wheel, { passive: false });
    cv.addEventListener("click", click);
    return () => {
      cv.removeEventListener("mousedown", down);
      removeEventListener("mouseup", up);
      removeEventListener("mousemove", move);
      cv.removeEventListener("wheel", wheel);
      cv.removeEventListener("click", click);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeOff, view]);

  const S = st.current;
  const sel = S.nodes.find((n) => n.id === selId) || null;
  const selRels = sel ? S.edges.filter((e) => e.a === sel || e.b === sel) : [];
  const types = [...new Set(S.nodes.map((n) => n.type))];
  const links = [...new Set(S.edges.map((e) => e.rel))];
  const hits = query.trim() ? S.nodes.filter((n) => n.name.toLowerCase().includes(query.toLowerCase())).slice(0, 12) : [];
  const toggle = (set: Set<string>, v: string, apply: (n: Set<string>) => void) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v); else n.add(v);
    apply(n);
  };

  return (
    <div id="app">
      <canvas id="net" ref={cvRef} />
      <header>
        <div className="mark"><b>SAWIT-HAZE<i>.MONEY</i></b><span>THE SAWIT HAZE, MAPPED</span></div>
        <div className="searchwrap">
          <input id="q" placeholder="SEARCH ENTITIES  ( / )" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query.trim() !== "" && (
            <div id="results">
              {hits.length === 0 && <div className="tiny" style={{ padding: "8px 12px" }}>no match</div>}
              {hits.map((n) => (
                <button key={n.id} onClick={() => { setSelId(n.id); setQuery(""); }}>
                  <span>{n.name}</span><span>{n.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <nav className="top">
          <button aria-pressed={view === "net"} onClick={() => { setView("net"); setProv(null); }}>NETWORK</button>
          <button aria-pressed={view === "map"} onClick={() => { setView("map"); setSelId(null); }}>FIRE MAP</button>
        </nav>
      </header>
      <aside id="rail">
        <div><h3>ENTITY TYPE</h3><div id="types">
          {types.map((t) => (
            <button key={t} className="opt" aria-pressed={!typeOff.has(t)} onClick={() => toggle(typeOff, t, setTypeOff)}>
              <span className="dot" style={{ color: COLORS[t] }} />{t}
              <span className="n">{S.nodes.filter((n) => n.type === t).length}</span>
            </button>
          ))}
        </div></div>
        <div><h3>LINK TYPE</h3><div id="links">
          {links.map((l) => (
            <button key={l} className="opt" aria-pressed={!linkOff.has(l)} onClick={() => toggle(linkOff, l, setLinkOff)}>
              <span className="dot" style={{ color: LINK[l] || "#fff" }} />{l}
              <span className="n">{S.edges.filter((e) => e.rel === l).length}</span>
            </button>
          ))}
        </div></div>
        <p className="hint">Drag to pan. Scroll to zoom. Click node for dossier.</p>
      </aside>
      <aside id="dossier">
        {view === "map" && (() => {
          const p = PROVS.find((x) => x.name === prov);
          const jumps: [string, string][] = [["CON-BMH", "Bumi Mekar Hijau · 213"], ["CON-MEKAR", "Mekar Karya Kahuripan · 52"], ["CON-DAMAI", "Damai Agro Sejahtera · 48"], ["CON-MAYAWANA", "Mayawana Persada · 26"], ["CON-MENTENG", "Menteng (KLK) · 19"]];
          const go = (id: string) => { setView("net"); setProv(null); setSelId(id); };
          if (!p) return (
            <>
              <div className="tiny">Fire Map · stylized ASEAN · Greenpeace Aug–Oct 2026</div>
              <h1>Who&apos;s profiting from the sawit haze?</h1>
              <p className="prose">6,811 haze source points. 980 inside oil-palm concessions. Click a province for detail. Crosses mark haze-hit cities.</p>
              <div className="sec"><h4>TRACK RECORD</h4>
                <div className="prose" style={{ fontSize: 12 }}>· 2,719 spots re-burned on 2015–2023 scars — same landscapes, same managers.</div>
                <div className="prose" style={{ fontSize: 12 }}>· 97–99% of burned peat never restored; 54% converted to monoculture.</div>
              </div>
              <div className="sec"><h4>WORST CONCESSIONS →</h4>
                {jumps.map(([id, label]) => (
                  <button key={id} className="rel" onClick={() => go(id)}>
                    <span style={{ color: "#ff8c00" }}>●</span><span className="who">{label}</span>
                    <span className="mono" style={{ fontSize: 10 }}>→</span>
                    <span className="what">open in network</span>
                  </button>
                ))}
              </div>
            </>
          );
          return (
            <>
              <div className="tiny">Fire Map · province</div>
              <h1>{p.name}</h1>
              <div className="big" style={{ color: "#ff3b30" }}>{p.spots.toLocaleString()}</div>
              <p className="prose">haze source spots, 8 Aug–1 Oct 2026.</p>
              <div className="kv"><dt>NOTE</dt><dd className="prose">{p.note}</dd></div>
              <div className="sec"><h4>WORST CONCESSIONS →</h4>
                {jumps.map(([id, label]) => (
                  <button key={id} className="rel" onClick={() => go(id)}>
                    <span style={{ color: "#ff8c00" }}>●</span><span className="who">{label}</span>
                    <span className="mono" style={{ fontSize: 10 }}>→</span>
                    <span className="what">open in network</span>
                  </button>
                ))}
              </div>
            </>
          );
        })()}
        {view === "net" && !sel && (() => {
          const facts = S.edges.length;
          const nsrc = data?.sources?.length || 0;
          const parts = data?.tracked?.parts || [];
          const total = data?.tracked?.usd || 1;
          const barColors = ["#ffc93c", "#ff5c2b", "#6fd38a", "#4f9dff", "#b48cff"];
          return (
          <>
            <div className="tiny" style={{ display: "flex", justifyContent: "space-between" }}><span>INDEX / OVERVIEW</span><span>BUILT {data?.built || "—"}</span></div>
            <h1>Who&apos;s profiting from the current sawit haze?</h1>
            <div className="stat3">
              <div><b>{S.nodes.length}</b><span className="tiny">ENTITIES</span></div>
              <div><b>{facts}</b><span className="tiny">FACTS</span></div>
              <div><b>{nsrc}</b><span className="tiny">SOURCES</span></div>
            </div>
            <div className="sec"><h4>MONEY TRACKED</h4>
              <div className="big" style={{ color: "var(--signal)" }}>{money(data?.tracked?.usd || 0)}</div>
              <div className="tbar">
                {parts.map((p, i) => (
                  <span key={p.label} style={{ width: `${Math.max(2, (p.usd / total) * 100)}%`, background: barColors[i % barColors.length] }} />
                ))}
              </div>
              {parts.map((p, i) => (
                <div key={p.label} className="prose" style={{ fontSize: 12 }}><span style={{ color: barColors[i % barColors.length] }}>■ </span>{p.label} — {money(p.usd)}</div>
              ))}
              <div className="prose" style={{ fontSize: 12 }}>· 2026 fires: 6,811 haze spots, 980 in oil-palm concessions (Greenpeace, 8 Aug–1 Oct)</div>
            </div>
            <p className="prose" style={{ fontSize: 12, color: "var(--fg2)" }}>Unlike the rest of this site, fire counts come from satellite detections, not courts. Spots counted once per concession; concessions attributed once to parent groups. NEA notices are allegations, not findings — the Act has never fined anyone.</p>
            <div className="sec"><h4>START HERE</h4>
              {S.nodes.filter((n) => ["Company", "Fund", "Fund/Asset Manager", "Government"].includes(n.type) || ["COM-KLK", "COM-BUMITAMA", "COM-FIRSTRES", "COM-MUSIM", "COM-SINARMAS", "GOV-NEA-SG"].includes(n.id)).slice(0, 6).map((n) => (
                <button key={n.id} className="rel" onClick={() => setSelId(n.id)}>
                  <span style={{ color: n.color }}>●</span><span className="who">{n.name}</span>
                  <span className="mono" style={{ fontSize: 10 }}>{n.type}</span>
                  <span className="what">{n.role}</span>
                </button>
              ))}
            </div>
            </>
          );
        })()}
        {view === "net" && sel && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="tiny" style={{ color: sel.color }}>● {sel.type}{sel.country ? ` · ${sel.country}` : ""}</span>
              <button className="closebtn" onClick={() => setSelId(null)}>CLOSE ✕</button>
            </div>
            <h1>{sel.name}</h1>
            <p className="prose">{sel.role}</p>
            <div className="kv"><dt>PROFILE</dt><dd className="prose">{sel.profile || "—"}</dd></div>
            {["owns", "supplies", "funds", "concession", "fire", "notice", "opposes", "role"].map((g) => {
              const grp = selRels.filter((e) => e.rel === g);
              if (!grp.length) return null;
              return (
                <div key={g} className="sec"><h4>{g.toUpperCase()} · {grp.length}</h4>
                  {grp.map((e, i) => {
                    const o = e.a === sel ? e.b : e.a;
                    return (
                      <button key={i} className="rel" onClick={() => setSelId(o.id)}>
                        <span style={{ color: o.color }}>●</span><span className="who">{o.name}</span>
                        <span className="mono" style={{ fontSize: 10 }}>{e.a === sel ? "→" : "←"}</span>
                        <span className="what">{e.rel}{e.ctx ? ` — ${e.ctx}` : ""}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </aside>
      <div id="ctrls">
        <button onClick={() => { st.current.cam.z = Math.min(4, st.current.cam.z * 1.25); drawRef.current(); }}>+</button>
        <button onClick={() => { st.current.cam.z = Math.max(0.3, st.current.cam.z * 0.8); drawRef.current(); }}>−</button>
        <button onClick={() => { st.current.cam = { x: 0, y: 0, z: 1 }; setSelId(null); drawRef.current(); }}>⟲</button>
      </div>
      <div id="modes">
        {MODES.map((m) => (
          <button key={m} data-m={m} aria-pressed={mode === m} onClick={() => setMode(m)}>
            {m.toUpperCase()}
          </button>
        ))}
      </div>
      <div id="crumbs">
        {view === "map"
          ? (prov ? `${prov.toUpperCase()} · ${PROVS.find((p) => p.name === prov)?.spots} SPOTS` : "Fire Map · 6,811 SPOTS · 9 PROVINCES")
          : (sel ? <><button onClick={() => setSelId(null)}>← ALL</button> {` ${sel.name} · ${sel.type}`}</>
            : `${S.nodes.filter(visible).length} ENTITIES · ${S.edges.filter(visibleE).length} LINKS`)}
      </div>
    </div>
  );
}
