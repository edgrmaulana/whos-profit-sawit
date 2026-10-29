// NASA FIRMS VIIRS feed for the Indonesia bbox.
// Needs FIRMS_MAP_KEY (free: https://firms.modaps.eosdis.nasa.gov/api/map_key/)
// GET /api/firms -> { live, date, points: [{lat,lng,frp,conf}] } (30-min cache)
// GET /api/firms?season=1 -> { season, count, points: [{lat,lng,frp,d}] } for Aug-Sep 2026 (immutable cache)
const BBOX = "94,-12,142,12"; // WEST,SOUTH,EAST,NORTH

type Pt = { lat: number; lng: number; frp: number; conf: string; d: string };
// upstream CSVs run ~4MB per chunk: over Next's 2MB fetch-cache limit, so no-store
// upstream + keep the small processed sample in a module cache (history never changes)
let seasonCache: { at: number; body: object } | null = null;

function parse(text: string): Pt[] | null {
  const lines = text.trim().split("\n");
  const head = lines[0].split(",");
  if (!head.includes("latitude") || !head.includes("longitude")) return null;
  const ix = (c: string) => head.indexOf(c);
  const out: Pt[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",");
    const lat = parseFloat(c[ix("latitude")]), lng = parseFloat(c[ix("longitude")]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({ lat, lng, frp: parseFloat(c[ix("frp")]) || 0, conf: c[ix("confidence")] || "", d: c[ix("acq_date")] || "" });
  }
  return out;
}

export async function GET(req: Request) {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) return Response.json({ live: false, reason: "no-key" }, { status: 200 });
  let season = false;
  try { season = new URL(req.url).searchParams.get("season") === "1"; } catch { season = false; }
  try {
    if (season) {
      if (seasonCache && Date.now() - seasonCache.at < 7 * 864e5) return Response.json(seasonCache.body);
      // 5-day chunks, SP archive first (NRT purges old dates), NRT fallback
      const starts: string[] = [];
      const t0 = Date.UTC(2026, 7, 8), t1 = Date.UTC(2026, 9, 1);
      for (let t = t0; t <= t1; t += 5 * 864e5) starts.push(new Date(t).toISOString().slice(0, 10));
      // archive lives in SP; NRT long purged for Aug. Fetch all chunks concurrently.
      const chunks = await Promise.all(starts.map(async (date) => {
        for (const src of ["VIIRS_SNPP_SP", "VIIRS_SNPP_NRT"]) {
          try {
            const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${src}/${BBOX}/5/${date}`, { cache: "no-store" });
            if (!r.ok) continue;
            const rows = parse(await r.text());
            if (rows && rows.length) return rows;
          } catch { /* next source */ }
        }
        return [] as Pt[];
      }));
      const all: Pt[] = chunks.flat().filter((p) => p.d < "2026-10-01"); // Oct belongs to live
      if (!all.length) return Response.json({ season: false, reason: "no-data" }, { status: 200 });
      // stratify by month so the FRP cap keeps Sep peak shape, not just extreme flares
      const byM = new Map<string, Pt[]>();
      for (const p of all) {
        const k = p.d.slice(0, 7);
        const arr = byM.get(k);
        if (arr) arr.push(p); else byM.set(k, [p]);
      }
      const points: { lat: number; lng: number; frp: number; d: string }[] = [];
      for (const rows of byM.values()) {
        rows.sort((a, b) => b.frp - a.frp);
        for (const p of rows.slice(0, 4000)) points.push({ lat: p.lat, lng: p.lng, frp: p.frp, d: p.d });
      }
      const body = { season: true, count: all.length, points };
      seasonCache = { at: Date.now(), body };
      return Response.json(body, { status: 200 });
    }
    const pull = async (days: number) => {
      const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/${BBOX}/${days}`, { next: { revalidate: 1800 } });
      if (!r.ok) return null;
      return parse(await r.text());
    };
    let rows = await pull(1);
    if (!rows || !rows.length) rows = await pull(2);
    if (!rows) return Response.json({ live: false, reason: "no-data" }, { status: 200 });
    const points = rows.slice(0, 6000).map((p) => ({ lat: p.lat, lng: p.lng, frp: p.frp, conf: p.conf }));
    return Response.json({ live: true, date: rows.length ? rows[0].d : null, points });
  } catch {
    return Response.json(season ? { season: false, reason: "fetch-failed" } : { live: false, reason: "fetch-failed" }, { status: 200 });
  }
}
