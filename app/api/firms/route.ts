// Live NASA FIRMS VIIRS feed for the Indonesia bbox.
// Needs FIRMS_MAP_KEY (free: https://firms.modaps.eosdis.nasa.gov/api/map_key/)
// GET /api/firms -> { live, date, points: [{lat,lng,frp,conf}], } (30-min cache)
const BBOX = "94,-12,142,12"; // WEST,SOUTH,EAST,NORTH

export async function GET() {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) return Response.json({ live: false, reason: "no-key" }, { status: 200 });
  try {
    const pull = async (days: number) => {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/${BBOX}/${days}`;
      const r = await fetch(url, { next: { revalidate: 1800 } });
      if (!r.ok) return null;
      const text = await r.text();
      const lines = text.trim().split("\n");
      const head = lines[0].split(",");
      if (!head.includes("latitude") || !head.includes("longitude")) return null;
      return { head, lines };
    };
    let got = await pull(1);
    if (!got || got.lines.length < 2) got = await pull(2);
    if (!got) return Response.json({ live: false, reason: "no-data" }, { status: 200 });
    const { head, lines } = got;
    const ix = (c: string) => head.indexOf(c);
    const points: { lat: number; lng: number; frp: number; conf: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split(",");
      const lat = parseFloat(c[ix("latitude")]), lng = parseFloat(c[ix("longitude")]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      points.push({ lat, lng, frp: parseFloat(c[ix("frp")]) || 0, conf: c[ix("confidence")] || "" });
      if (points.length >= 6000) break;
    }
    return Response.json({ live: true, date: lines.length > 1 ? lines[1].split(",")[ix("acq_date")] : null, points });
  } catch {
    return Response.json({ live: false, reason: "fetch-failed" }, { status: 200 });
  }
}
