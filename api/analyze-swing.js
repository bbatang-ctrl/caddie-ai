// Serverless proxy for swing analysis.
// ALL API keys stay server-side. Video upload bypasses Vercel body limits via
// a three-step flow: start (server → Google, returns upload URL) →
// upload (browser → Google directly) → complete (server polls + analyzes).
//
// IMAGE: single call with JSON body { imageBase64, mimeType, hcp, club, notes }.
// VIDEO: two calls — ?action=start then ?action=complete.

export const config = {
  api: {
    bodyParser: { sizeLimit: "4mb" }, // All payloads are small JSON now
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
    // ── ACTION: start ─────────────────────────────────────────────────────────
    // Server starts a Google resumable upload session using the API key.
    // Returns only the upload URL — no API key in the URL, safe to send to browser.
    if (action === "start") {
      const { mimeType, fileSize } = req.body || {};
      if (!mimeType) return res.status(400).json({ error: "mimeType required" });

      const startRes = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "X-Goog-Upload-Protocol": "resumable",
            "X-Goog-Upload-Command": "start",
            "X-Goog-Upload-Header-Content-Length": String(fileSize || 0),
            "X-Goog-Upload-Header-Content-Type": mimeType,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ file: { display_name: "golf_swing" } }),
        }
      );
      if (!startRes.ok) {
        const t = await startRes.text().catch(() => "");
        return res.status(500).json({ error: "Failed to start upload: " + t });
      }
      const uploadUrl = startRes.headers.get("x-goog-upload-url");
      if (!uploadUrl) return res.status(500).json({ error: "No upload URL returned by Google" });
      return res.status(200).json({ uploadUrl });
    }

    // ── ACTION: complete ──────────────────────────────────────────────────────
    // Browser already uploaded the video directly to Google.
    // Server polls until file is ready, then calls Gemini.
    if (action === "complete") {
      const { fileUri, fileName, mimeType, hcp, club, notes } = req.body || {};
      if (!fileUri || !fileName) return res.status(400).json({ error: "fileUri and fileName required" });

      // Check once if Google has finished processing the video.
      // If not ready yet, return 202 so the client can retry — this keeps each
      // invocation well under Vercel's function timeout limit.
      const check = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
      ).then(r => r.json()).catch(() => ({}));
      const state = check?.state || check?.file?.state;
      if (state !== "ACTIVE") {
        return res.status(202).json({ notReady: true, state: state || "PROCESSING" });
      }

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
                { file_data: { mime_type: mimeType || "video/mp4", file_uri: fileUri } },
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
