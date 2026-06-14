// Serverless proxy for swing analysis. ALL API keys stay server-side.
//
// VIDEO flow (3 calls):
//   1. Browser → Supabase Storage (direct, no Vercel, no CORS, no size limit)
//   2. POST ?action=upload-to-google { videoUrl, mimeType }
//        → server downloads from Supabase, uploads to Google File API in 8 MB chunks
//        → returns { fileUri, fileName }
//   3. POST ?action=complete { fileUri, fileName, mimeType, hcp, club, notes }
//        → server checks ACTIVE state + calls Gemini
//        → returns 202 { notReady } if still processing (client retries)
//
// IMAGE flow (1 call):
//   POST (no action) { imageBase64, mimeType, hcp, club, notes }

export const config = {
  api: {
    bodyParser: { sizeLimit: "5mb" }, // all non-video payloads are small JSON
  },
};

function buildPrompt(hcp, club, mediaType) {
  const mediaNote = mediaType === "video"
    ? "Watch the FULL swing motion carefully."
    : "Analyze this golf swing image.";

  // IMPORTANT: keep notes SHORT (≤15 words each) — Gemini must not exceed token budget.
  // The entire JSON response must fit in one completion; truncated JSON cannot be parsed.
  const schema =
    `{"overall":<integer 1-100>,` +
    `"categories":{` +
    `"setup":{"score":<1-10>,"note":"<ONE sentence, max 15 words>"},` +
    `"backswing":{"score":<1-10>,"note":"<ONE sentence, max 15 words>"},` +
    `"downswing":{"score":<1-10>,"note":"<ONE sentence, max 15 words>"},` +
    `"impact":{"score":<1-10>,"note":"<ONE sentence, max 15 words>"},` +
    `"followthrough":{"score":<1-10>,"note":"<ONE sentence, max 15 words>"},` +
    `"tempo":{"score":<1-10>,"note":"<ONE sentence, max 15 words>"}},` +
    `"primaryFault":"<the single most critical fault, max 20 words, specific and visual>",` +
    `"drill":"<drill name followed by 2 sentence instructions>",` +
    `"positives":["<strength 1, max 12 words>","<strength 2, max 12 words>"],` +
    `"summary":"<EXACTLY 2 sentences, warm encouraging tone, speak directly to the player>"` +
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
    // ── ACTION: upload-to-google ───────────────────────────────────────────────
    // Receives a short-lived Supabase signed URL, downloads the video binary,
    // and uploads it to Google File API in 8 MB chunks (server-to-server —
    // no CORS issues, no Vercel body-size limit on outgoing requests).
    if (action === "upload-to-google") {
      const { videoUrl, mimeType } = req.body || {};
      if (!videoUrl) return res.status(400).json({ error: "videoUrl required" });

      const videoMimeType = (mimeType || "video/mp4").split(";")[0].trim();

      // Download from Supabase Storage
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) return res.status(500).json({ error: "Failed to download video: HTTP " + videoRes.status });
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

      // Start Google resumable upload session
      const startRes = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "X-Goog-Upload-Protocol": "resumable",
            "X-Goog-Upload-Command": "start",
            "X-Goog-Upload-Header-Content-Length": String(videoBuffer.length),
            "X-Goog-Upload-Header-Content-Type": videoMimeType,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ file: { display_name: "golf_swing" } }),
        }
      );
      if (!startRes.ok) {
        const t = await startRes.text().catch(() => "");
        return res.status(500).json({ error: "Google upload start failed: " + t.slice(0, 300) });
      }
      const uploadUrl = startRes.headers.get("x-goog-upload-url");
      if (!uploadUrl) return res.status(500).json({ error: "No upload URL from Google" });

      // Upload in 8 MB chunks — Google's required granularity for resumable uploads.
      // This runs server-to-server so the 8 MB chunk size is not a problem.
      const CHUNK = 8 * 1024 * 1024;
      let fileUri = null, fileName = null;
      let offset = 0;

      while (offset < videoBuffer.length) {
        const end = Math.min(offset + CHUNK, videoBuffer.length);
        const chunk = videoBuffer.slice(offset, end);
        const isLast = end >= videoBuffer.length;

        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "X-Goog-Upload-Command": isLast ? "upload, finalize" : "upload",
            "X-Goog-Upload-Offset": String(offset),
            "Content-Type": videoMimeType,
          },
          body: chunk,
        });

        if (!uploadRes.ok) {
          const t = await uploadRes.text().catch(() => "");
          return res.status(500).json({
            error: `Google chunk upload failed at offset ${offset} (HTTP ${uploadRes.status}): ${t.slice(0, 200)}`,
          });
        }

        if (isLast) {
          const data = await uploadRes.json().catch(() => ({}));
          fileUri = data?.file?.uri || null;
          fileName = data?.file?.name || null;
        }

        offset = end;
      }

      if (!fileUri) return res.status(500).json({ error: "No file URI after upload" });
      return res.status(200).json({ fileUri, fileName });
    }

    // ── ACTION: complete ──────────────────────────────────────────────────────
    // Checks once if Google has finished processing; returns 202 if not ready.
    // The client retries every 3 s so each server invocation stays under Vercel's timeout.
    if (action === "complete") {
      const { fileUri, fileName, mimeType, hcp, club, notes } = req.body || {};
      if (!fileUri || !fileName) return res.status(400).json({ error: "fileUri and fileName required" });

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
            // 2500 tokens gives ample room for the full JSON schema without truncation.
            // 1500 was too tight — Gemini would cut off mid-response, producing invalid JSON.
            generationConfig: { maxOutputTokens: 2500, temperature: 0.7 },
          }),
        }
      );
      const result = await analyzeRes.json();
      if (result.error) return res.status(500).json({ error: `Gemini: ${result.error.message || "failed"} (${result.error.status || "?"})` });

      // Detect truncation — if Gemini ran out of tokens the JSON will be incomplete and unparseable
      const finishReason = result?.candidates?.[0]?.finishReason;
      if (finishReason === "MAX_TOKENS") {
        return res.status(500).json({ error: "Analysis was cut off mid-response (video too long or complex). Try a shorter clip (15–30 s works best)." });
      }

      return res.status(200).json(result);
    }

    // ── DEFAULT: image ────────────────────────────────────────────────────────
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
