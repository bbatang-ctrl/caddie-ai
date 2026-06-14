// Serverless proxy for swing analysis — handles both images and videos.
// ALL Google API calls happen here; GEMINI_API_KEY never reaches the browser.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb", // base64 overhead ~33%; covers original videos up to ~37 MB
    },
  },
};

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

  const { videoBase64, imageBase64, mimeType, notes, hcp, club } = req.body || {};
  if (!mimeType) return res.status(400).json({ error: "mimeType required" });
  if (!videoBase64 && !imageBase64) return res.status(400).json({ error: "videoBase64 or imageBase64 required" });

  const resolvedHcp = hcp || "unknown";
  const clubUsed = club || notes || "not specified";
  const prompt = buildPrompt(resolvedHcp, clubUsed, videoBase64 ? "video" : "image");

  try {
    // ── VIDEO PATH ──────────────────────────────────────────────────────────────
    if (videoBase64) {
      const videoBuffer = Buffer.from(videoBase64, "base64");
      const byteSize = videoBuffer.length;

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
      if (!uploadUrl) return res.status(500).json({ error: "Could not start video upload — no upload URL returned" });

      // Step 2: Upload the video bytes
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
      if (!uploadRes.ok) return res.status(500).json({ error: "Video bytes upload failed — try a shorter clip" });

      const fileData = await uploadRes.json();
      const fileUri = fileData?.file?.uri;
      const fileName = fileData?.file?.name;
      if (!fileUri) return res.status(500).json({ error: "Video upload failed — no file URI returned" });

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
            generationConfig: {
              maxOutputTokens: 1500,
              temperature: 0.7,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        }
      );
      const result = await analyzeRes.json();
      if (result.error) return res.status(500).json({ error: result.error.message || "Video analysis failed" });
      return res.status(200).json(result);
    }

    // ── IMAGE PATH ──────────────────────────────────────────────────────────────
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
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.4,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );
    const result = await analyzeRes.json();
    if (result.error) return res.status(500).json({ error: result.error.message || "Image analysis failed" });
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
