// Serverless proxy for swing analysis. ALL API keys stay server-side.
//
// IMAGE (default, no ?action): { imageBase64, mimeType, hcp, club, notes }
// VIDEO (?action=video):       { videoBase64, mimeType, hcp, club, notes }
//
// Both use Gemini's inline_data — same path, same security model, no CORS, no
// resumable-upload complexity. Vercel's 4.5 MB body cap means video clips
// should be ≤ 3 MB raw (base64 adds ~33% overhead).

export const config = {
  api: {
    // 5 MB so our body-parser doesn't block base64 video payloads.
    // Vercel's platform hard cap is 4.5 MB and enforces before this.
    bodyParser: { sizeLimit: "5mb" },
  },
};

function buildPrompt(hcp, club, mediaType) {
  const mediaNote = mediaType === "video"
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
      ? `,"keyFrames":{"setup":<0.0-1.0>,"backswingTop":<0.0-1.0>,"impact":<0.0-1.0>}`
      : "") +
    `}`;

  return (
    `You are an expert PGA Master Professional with 20+ years teaching experience. ` +
    `You analyze golf swings using objective biomechanical standards — the same ` +
    `standards regardless of skill level.\n\n` +
    `CRITICAL: Score against absolute golf fundamentals. A touring pro should ` +
    `score 85-95/100. A 15-handicap should score 55-70/100. A complete beginner ` +
    `should score 25-45/100. Do NOT inflate scores.\n\n` +
    `Player handicap: ${hcp}. Club: ${club}.\n\n` +
    `${mediaNote} Return ONLY valid JSON in exactly this format, ` +
    `no markdown, no explanation:\n\n${schema}`
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

  const action = req.query?.action;

  try {
    // ── ACTION: video ─────────────────────────────────────────────────────────
    // Identical pattern to images — base64 inline_data in generateContent.
    // No File API, no resumable upload, no CORS issues, API key stays here.
    if (action === "video") {
      const { videoBase64, mimeType, hcp, club, notes } = req.body || {};
      if (!mimeType)    return res.status(400).json({ error: "mimeType required" });
      if (!videoBase64) return res.status(400).json({ error: "videoBase64 required" });

      const prompt = buildPrompt(hcp || "unknown", club || notes || "not specified", "video");

      const analyzeRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [
                { inline_data: { mime_type: mimeType, data: videoBase64 } },
                { text: prompt },
              ],
            }],
            generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
          }),
        }
      );
      const result = await analyzeRes.json();
      if (result.error) return res.status(500).json({ error: `Gemini: ${result.error.message || "failed"} (${result.error.status || "?"})` });
      return res.status(200).json(result);
    }

    // ── DEFAULT: image with base64 JSON body ──────────────────────────────────
    const { imageBase64, mimeType, notes, hcp, club } = req.body || {};
    if (!mimeType)    return res.status(400).json({ error: "mimeType required" });
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" });

    const prompt = buildPrompt(hcp || "unknown", club || notes || "not specified", "image");

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
    if (result.error) return res.status(500).json({ error: `Gemini: ${result.error.message || "failed"} (${result.error.status || "?"})` });
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
