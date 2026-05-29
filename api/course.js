// Proxy for golfcourseapi.com — keeps API key server-side.
// GET /api/course?name=pebble+beach&hole=1
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GOLF_COURSE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GOLF_COURSE_API_KEY not set" });

  const { name, hole } = req.query;
  if (!name) return res.status(400).json({ error: "name param required" });
  const holeNum = parseInt(hole) || 1;

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

    // Pick the best match — prefer exact name match, else first result
    const lower = name.toLowerCase();
    const best = courses.find(c => c.club_name?.toLowerCase().includes(lower))
      || courses[0];

    // Step 2: get full course detail including holes
    const detailResp = await fetch(
      "https://api.golfcourseapi.com/v1/courses/" + best.id,
      { headers: { "Authorization": "Key " + apiKey } }
    );
    if (!detailResp.ok) return res.status(200).json({ found: false });
    const detail = await detailResp.json();

    // Extract the hole we need
    // golfcourseapi returns tees[], each tee has holes[]
    // Pick the first tee (usually the main/championship tee) or whichever has most data
    const tees = detail.tees || [];
    let holeData = null;
    let teeData = null;

    for (const tee of tees) {
      const h = (tee.holes || []).find(h => h.number === holeNum || h.hole_number === holeNum);
      if (h) { holeData = h; teeData = tee; break; }
    }

    // Build a normalised response
    const result = {
      found: true,
      courseId: best.id,
      courseName: best.club_name || name,
      location: {
        lat: parseFloat(best.location?.latitude || best.latitude || 0) || null,
        lng: parseFloat(best.location?.longitude || best.longitude || 0) || null,
      },
      hole: holeData ? {
        number: holeNum,
        par: holeData.par || null,
        yards: holeData.yardage || holeData.yards || null,
        strokeIndex: holeData.handicap || holeData.stroke_index || null,
        // GPS — returned when the API has them
        tee_lat: parseFloat(holeData.tee_latitude || holeData.tee_lat || 0) || null,
        tee_lng: parseFloat(holeData.tee_longitude || holeData.tee_lng || 0) || null,
        green_lat: parseFloat(holeData.green_latitude || holeData.green_lat || 0) || null,
        green_lng: parseFloat(holeData.green_longitude || holeData.green_lng || 0) || null,
      } : null,
    };

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
