// Proxy for golfcourseapi.com — keeps API key server-side.
// GET /api/course?name=pebble+beach&hole=1&lat=37.5&lng=-122.3
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GOLF_COURSE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GOLF_COURSE_API_KEY not set" });

  const { name, hole, lat, lng, debug } = req.query;
  if (!name) return res.status(400).json({ error: "name param required" });
  const holeNum = parseInt(hole) || 1;
  const knownLat = parseFloat(lat) || null;
  const knownLng = parseFloat(lng) || null;

  try {
    // Step 1: search for the course
    const searchResp = await fetch(
      "https://api.golfcourseapi.com/v1/search?search_query=" + encodeURIComponent(name),
      { headers: { "Authorization": "Key " + apiKey } }
    );
    if (!searchResp.ok) return res.status(searchResp.status).json({ error: "Search failed" });
    const searchData = await searchResp.json();

    const courses = searchData.courses || [];
    if (!courses.length) return res.status(200).json({ found: false });

    // Pick the best match — if we have a known location, prefer closest course.
    // This fixes cases where multiple courses share the same name (e.g. "Crystal Springs").
    let best;
    if (knownLat && knownLng) {
      const dist = (c) => {
        const cLat = parseFloat(c.location?.latitude || c.latitude || 0);
        const cLng = parseFloat(c.location?.longitude || c.longitude || 0);
        if (!cLat || !cLng) return Infinity;
        return Math.abs(cLat - knownLat) + Math.abs(cLng - knownLng);
      };
      best = courses.slice().sort((a, b) => dist(a) - dist(b))[0];
    } else {
      // No location hint — prefer name match, else first result
      const lower = name.toLowerCase();
      best = courses.find(c => c.club_name?.toLowerCase().includes(lower)) || courses[0];
    }

    // Step 2: get full course detail including holes
    const detailResp = await fetch(
      "https://api.golfcourseapi.com/v1/courses/" + best.id,
      { headers: { "Authorization": "Key " + apiKey } }
    );
    if (!detailResp.ok) return res.status(200).json({ found: false });
    const detail = await detailResp.json();

    // Debug mode: return raw API response so we can inspect the real field names
    if (debug === "1") {
      return res.status(200).json({ _raw: detail, _best: best });
    }

    // Extract hole data — golfcourseapi nests holes inside tees[]
    const tees = detail.tees || [];
    let holeData = null;

    for (const tee of tees) {
      const holes = tee.holes || tee.hole_details || [];
      const h = holes.find(h =>
        h.number === holeNum ||
        h.hole_number === holeNum ||
        parseInt(h.number) === holeNum ||
        parseInt(h.hole_number) === holeNum
      );
      if (h) { holeData = h; break; }
    }

    const courseLat = parseFloat(best.location?.latitude || best.latitude || detail.location?.latitude || 0) || null;
    const courseLng = parseFloat(best.location?.longitude || best.longitude || detail.location?.longitude || 0) || null;

    const result = {
      found: true,
      courseId: best.id,
      courseName: best.club_name || detail.club_name || name,
      location: { lat: courseLat, lng: courseLng },
      hole: holeData ? {
        number: holeNum,
        par: holeData.par || null,
        yards: holeData.yardage || holeData.yards || holeData.distance || null,
        strokeIndex: holeData.handicap || holeData.stroke_index || null,
        tee_lat:   parseFloat(holeData.tee_latitude  || holeData.tee_lat  || 0) || null,
        tee_lng:   parseFloat(holeData.tee_longitude || holeData.tee_lng  || 0) || null,
        green_lat: parseFloat(holeData.green_latitude  || holeData.green_lat  || 0) || null,
        green_lng: parseFloat(holeData.green_longitude || holeData.green_lng  || 0) || null,
      } : null,
    };

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
