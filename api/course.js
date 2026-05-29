// Proxy for golfcourseapi.com — keeps API key server-side.
// GET /api/course?name=pebble+beach&hole=1&lat=37.5&lng=-122.3
//
// GolfCourseAPI returns par/yardage/handicap per hole but NOT tee/green GPS.
// We use it for hole metadata and the course-level location as a map fallback.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GOLF_COURSE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GOLF_COURSE_API_KEY not set" });

  const { name, hole, lat, lng } = req.query;
  if (!name) return res.status(400).json({ error: "name param required" });
  const holeNum = parseInt(hole) || 1;
  const knownLat = parseFloat(lat) || null;
  const knownLng = parseFloat(lng) || null;

  try {
    // Step 1: search for the course by name
    const searchResp = await fetch(
      "https://api.golfcourseapi.com/v1/search?search_query=" + encodeURIComponent(name),
      { headers: { "Authorization": "Key " + apiKey } }
    );
    if (!searchResp.ok) return res.status(searchResp.status).json({ error: "Search failed" });
    const searchData = await searchResp.json();

    const courses = searchData.courses || [];
    if (!courses.length) return res.status(200).json({ found: false });

    // Pick the closest course when we have a known location — prevents picking
    // a same-named course in another state (e.g. two "Crystal Springs" courses).
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
      const lower = name.toLowerCase();
      best = courses.find(c => c.club_name?.toLowerCase().includes(lower)) || courses[0];
    }

    // Step 2: get full course detail
    const detailResp = await fetch(
      "https://api.golfcourseapi.com/v1/courses/" + best.id,
      { headers: { "Authorization": "Key " + apiKey } }
    );
    if (!detailResp.ok) return res.status(200).json({ found: false });
    const detail = await detailResp.json();

    // GolfCourseAPI wraps everything under detail.course
    const courseObj = detail.course || detail;

    // Course location — prefer detail over search result
    const courseLat = parseFloat(courseObj.location?.latitude || best.location?.latitude || 0) || null;
    const courseLng = parseFloat(courseObj.location?.longitude || best.location?.longitude || 0) || null;

    // Validate the course location is near our known anchor (prevents totally wrong courses)
    if (knownLat && knownLng && courseLat && courseLng) {
      const degDist = Math.abs(courseLat - knownLat) + Math.abs(courseLng - knownLng);
      if (degDist > 1.5) { // >~100 miles apart — definitely wrong course
        return res.status(200).json({ found: false, reason: "location_mismatch" });
      }
    }

    // Tees are nested as { male: [...], female: [...] }
    // Prefer male tees; each tee has a holes[] array with par/yardage/handicap
    const teeSections = courseObj.tees || {};
    const allTees = [
      ...(teeSections.male || []),
      ...(teeSections.female || []),
    ];

    let holeData = null;
    for (const tee of allTees) {
      const holes = tee.holes || [];
      // Holes may be 0-indexed or 1-indexed; check both
      const h = holes.find(h =>
        h.number === holeNum ||
        h.hole_number === holeNum ||
        parseInt(h.number) === holeNum
      ) || holes[holeNum - 1]; // fallback: 0-indexed position
      if (h) { holeData = h; break; }
    }

    return res.status(200).json({
      found: true,
      courseId: best.id,
      courseName: courseObj.club_name || courseObj.course_name || best.club_name || name,
      // Course-level location — used as map center fallback when OSM has no data
      location: { lat: courseLat, lng: courseLng },
      // Per-hole metadata (par/yardage/strokeIndex) — no GPS in this API
      hole: holeData ? {
        number: holeNum,
        par: holeData.par || null,
        yards: holeData.yardage || holeData.yards || null,
        strokeIndex: holeData.handicap || holeData.stroke_index || null,
      } : null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
