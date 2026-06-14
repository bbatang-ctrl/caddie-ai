// Serverless proxy for swing analysis — handles both images and videos.
// ALL Google API calls happen here; GEMINI_API_KEY never reaches the browser.
//
// VIDEO: client POSTs raw binary (Content-Type: video/*) with metadata in query params.
//        This avoids base64 conversion, which causes "string did not match expected pattern"
//        on Safari/iOS WebView when the encoded string exceeds ~30 MB.
// IMAGE: client POSTs JSON body { imageBase64, mimeType, hcp, club, notes }.

export const config = {
  api: {
    bodyParser: false, // We read the raw body ourselves — handles both binary and JSON
  },
};

// Read the entire request body into a Buffer.
// Handles both Vercel pre-buffered bodies (req.body) and raw Node.js streams.
async function getBody(req) {
  // Vercel may already have buffered into req.body (even with bodyParser: false)
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === "string") return Buffer.from(req.body, "utf8");
    // Parsed JSON object (bodyParser config ignored by some Vercel runtimes)
    if (typeof req.body === "object") return Buffer.from(JSON.stringify(req.body), "utf8");
  }
  // Fall back to reading from stream
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Build the analysis prompt server-side so it never has to travel to the browser.
function buildPrompt(hcp, club, mediaType) {
  const mediaNote =
    mediaType === "video"
      ? "Watch the FULL swing motion carefully."
      : "Analyze this golf swing image.";

  const schema =
    `{"overall":<integer 1-100>,` +
    `"categories":{` +
    `"setup":{"score":<1-10>,"note":"<one specific observation>"},` +
    `"backswing":{"score":<1-10>,"note":"<one specific observation>"},` +
    `"downswing":{"score":<1-10>,"note":"<one specific observation>"},` +
    `"impact":{"score":<1-10>,"note":"<one specific observation>"},` +
    `"followthrough":{"score":<1-10>,"note":"<one specific observation>"},` +
    `"tempo":{"score":<1-10>,"note":"<one specific observation>"}},` +
    `"primaryFault":"<the single most important thing to fix, specific and visual>",` +
    `"drill":"<step-by-step drill name and instructions to fix the primary fault>",` +
    `"positives":["<specific positive 1>","<specific positive 2>"],` +
    `"summary":"<2-3 sentence coaching summary in warm encouraging tone, use first person as if speaking to the player>"` +
    (mediaType === "video"
      ? `,"keyFrames":{"setup":<0.0-1.0 fraction through video where player is at address>,"backswingTop":<fraction at top of backswing>,"impact":<fraction at moment of impact>}`
      : "") +
    `}`;

  return (
    `You are an expert PGA Master Professional with 20+ years teaching experience. ` +
    `You analyze golf swings using objective biomechanical standards — the same ` +
    `standards regardless of skill level. A professional golfer should score ` +
    `significantly higher than a beginner on every metric.\n\n` +
    `CRITICAL: Score against absolute golf fundamentals. A touring pro should ` +
    `score 85-95/100. A 15-handicap should score 55-70/100. A complete beginner ` +
    `should score 25-45/100. Do NOT inflate beginner scores — low scores are ` +
    `helpful and honest.\n\n` +
    `Player handicap context: ${hcp}. Club: ${club}.\n\n` +
    `${mediaNote} Return ONLY valid JSON in exactly this format, ` +
    `no markdown, no explanation outside the JSON:\n\n${schema}`
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not set" });

  const contentType = (req.headers["content-type"] || "").split(";")[0].trim();
  const isVideo = contentType.startsWith("video/") || contentType === "application/octet-stream";

  const rawBody = await getBody(req);

  try {
    // ── VIDEO PATH — raw binary body, metadata in query params ─────────────────
    if (isVideo) {
      const mimeType = req.query?.mimeType || contentType || "video/mp4";
      const hcp      = req.query?.hcp   || "unknown";
      const club     = req.query?.club  || req.query?.notes || "not specified";

      if (!rawBody.length) return res.status(400).json({ error: "Empty video body" });

      const videoBuffer = rawBody;
      const byteSize    = videoBuffer.length;
      const prompt      = buildPrompt(hcp, club, "video");

      // Step 1: Start resumable upload to Google File API
      const startRes = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "X-Goog-Upload-Protocol": "resumable",
            "X-Goog-Upload-Command": "start",
            "X-Goog-Upload-Header-Content-Length": String(byteSize),
            "X-Goog-Upload-Header-Content-Type": mimeType,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ file: { display_name: "golf_swing" } }),
        }
      );
      if (!startRes.ok) {
        const errText = await startRes.text().catch(() => "");
        return res.status(500).json({ error: `Failed to start video upload: ${errText}` });
      }

      const uploadUrl = startRes.headers.get("x-goog-upload-url");
      if (!uploadUrl) return res.status(500).json({ error: "No upload URL from Google — check GEMINI_API_KEY" });

      // Step 2: Upload video bytes
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "X-Goog-Upload-Command": "upload, finalize",
          "X-Goog-Upload-Offset": "0",
          "Content-Type": mimeType,
          "Content-Length": String(byteSize),
        },
        body: videoBuffer,
      });
      if (!uploadRes.ok) return res.status(500).json({ error: "Video upload failed — try a shorter clip" });

      const fileData = await uploadRes.json();
      const fileUri  = fileData?.file?.uri;
      const fileName = fileData?.file?.name;
      if (!fileUri) return res.status(500).json({ error: "No file URI returned after upload" });

      // Step 3: Poll until ACTIVE (max 20 × 2 s = 40 s)
      let ready = false;
      for (let i = 0; i < 20 && !ready; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const check = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
        ).then(r => r.json()).catch(() => ({}));
        if (check?.state === "ACTIVE" || check?.file?.state === "ACTIVE") ready = true;
      }
      if (!ready) return res.status(500).json({ error: "Video processing timed out — try a clip under 30 seconds" });

      // Step 4: Analyze with Gemini
      const analyzeRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [
                { file_data: { mime_type: mimeType, file_uri: fileUri } },
                { text: prompt },
              ],
            }],
            generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
          }),
        }
      );
      const result = await analyzeRes.json();
      if (result.error) return res.status(500).json({ error: `Gemini: ${result.error.message || "video analysis failed"} (${result.error.status || "?"})` });
      return res.status(200).json(result);
    }

    // ── IMAGE PATH — JSON body { imageBase64, mimeType, hcp, club, notes } ─────
    let body;
    try {
      body = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid JSON body for image upload" });
    }

    const { imageBase64, mimeType, notes, hcp, club } = body;
    if (!mimeType)     return res.status(400).json({ error: "mimeType required" });
    if (!imageBase64)  return res.status(400).json({ error: "imageBase64 required" });

    const resolvedHcp = hcp   || "unknown";
    const clubUsed    = club  || notes || "not specified";
    const prompt      = buildPrompt(resolvedHcp, clubUsed, "image");

    const analyzeRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: prompt },
            ],
          }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.4 },
        }),
      }
    );
    const result = await analyzeRes.json();
    if (result.error) return res.status(500).json({ error: `Gemini: ${result.error.message || "image analysis failed"} (${result.error.status || "?"})` });
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
