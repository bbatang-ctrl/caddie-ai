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

function buildPrompt(hcp, club, mediaType, golferLevel) {
  const mediaNote = mediaType === "video"
    ? "Watch the FULL swing motion carefully from start to finish."
    : "Analyze this golf swing image thoroughly.";

  // golferLevel: "tour" | "competitive" | "club" | "beginner" | "unknown"
  // Provides context ONLY — the score must still be earned by what Gemini sees.
  const levelContext =
    golferLevel === "tour"        ? "Context: This is a professional or Tour-level player's swing." :
    golferLevel === "competitive" ? "Context: This is a competitive low-handicap amateur (0–8 HCP)." :
    golferLevel === "club"        ? "Context: This is a recreational club golfer (9–18 HCP)." :
    golferLevel === "beginner"    ? "Context: This is a beginner or high-handicap player (19+ HCP)." :
    "";

  // IMPORTANT: keep all text fields SHORT — Gemini must not exceed token budget.
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
      ? `,"keyFrames":{"setup":<fraction early in clip — stable address before takeaway>,"backswingTop":<fraction — peak of backswing, highest hand position>,"impact":<fraction — club-ball contact moment only, typically 0.10–0.30 AFTER backswingTop value; do NOT return follow-through or finish>}`
      : "") +
    `}`;

  return (
    `You are a strict PGA Master Professional with 20+ years of tour-level coaching. ` +
    `Score golf swings against absolute biomechanical standards — the same standards ` +
    `used at the highest level of the game.\n\n` +

    `SCORING BANDS — evaluate ONLY what you observe in the ${mediaType}, not the stated handicap:\n` +
    `• 85–100  Tour professional: Athletic posture, 90°+ shoulder turn, lag maintained ` +
    `through impact (P6), full weight transfer to lead side, face square at contact, ` +
    `balanced finish with hips fully rotated. Effortless power and consistency.\n` +
    `• 70–84   Competitive amateur (low handicap): Sound fundamentals throughout with ` +
    `only 1–2 minor timing or sequencing flaws a skilled player can self-correct.\n` +
    `• 50–69   Club-level golfer: Correct intent but 3–4 mechanical flaws causing ` +
    `inconsistency — e.g. early extension, limited hip turn, slight over-the-top, ` +
    `or incomplete follow-through. The typical recreational golfer lands here.\n` +
    `• 25–49   Beginner / high handicap: Multiple fundamental errors across setup, ` +
    `rotation, and timing that require structured coaching to fix.\n\n` +

    `NON-NEGOTIABLE RULES:\n` +
    `1. Score from VISIBLE MECHANICS only. If the swing shows Tour-level fundamentals ` +
    `(full rotation, proper lag, correct sequencing, pure compression) it MUST score 85+. ` +
    `Deflating a technically excellent swing is a grading error.\n` +
    `2. If the swing has obvious amateur faults (reverse pivot, casting/scooping, ` +
    `chicken-wing follow-through, significant over-the-top, early extension) ` +
    `it MUST score below 70 regardless of who is swinging.\n` +
    `3. Category scores (1–10) must be consistent with "overall". ` +
    `If overall ≥ 85: every category ≥ 8. If overall ≤ 50: no category above 6.\n` +
    `4. Poor video quality, unusual camera angles, or broadcast overlays do NOT lower ` +
    `the score. If an angle limits your view of a specific category, assign it 7 ` +
    `(neutral) and note the limitation. Score what you CAN see accurately.\n` +
    `5. "overall" is your holistic expert judgment — NOT a mathematical average of ` +
    `category scores. A pro's effortless tempo and sequencing can push overall above ` +
    `the category average; an amateur's glaring fault can pull it below.\n\n` +

    `${levelContext ? levelContext + "\n" : ""}` +
    `Club: ${club}. Handicap (coaching language context only — does NOT affect scoring): ${hcp}.\n\n` +
    `${mediaNote} Return ONLY valid JSON, no markdown, no explanation:\n\n${schema}`
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

  // Parse action from req.query (Next.js) or directly from the URL string (plain Vercel).
  // Belt-and-suspenders: some Vercel environments don't populate req.query automatically.
  const action = req.query?.action ||
    (req.url ? new URLSearchParams((req.url.split("?")[1]) || "").get("action") : null);

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
      const { fileUri, fileName, mimeType, hcp, club, notes, golferLevel } = req.body || {};
      if (!fileUri || !fileName) return res.status(400).json({ error: "fileUri and fileName required" });

      const check = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
      ).then(r => r.json()).catch(() => ({}));
      const state = check?.state || check?.file?.state;
      if (state !== "ACTIVE") {
        return res.status(202).json({ notReady: true, state: state || "PROCESSING" });
      }

      const prompt = buildPrompt(hcp || "unknown", club || notes || "not specified", "video", golferLevel || "unknown");

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
            generationConfig: { maxOutputTokens: 2500, temperature: 0.1 },
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
    const { imageBase64, mimeType, notes, hcp, club, golferLevel } = req.body || {};
    if (!mimeType)    return res.status(400).json({ error: "mimeType required" });
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" });

    const prompt = buildPrompt(hcp || "unknown", club || notes || "not specified", "image", golferLevel || "unknown");

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
          generationConfig: { maxOutputTokens: 1000, temperature: 0.1 },
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
