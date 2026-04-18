export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  try {
    const { contents } = req.body;
    const part = contents?.[0]?.parts?.[0];

    // If it's a video, use File API upload first
    if (part?.inline_data?.mime_type?.startsWith("video/")) {
      const { data: base64Data, mime_type: mimeType } = part.inline_data;

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, "base64");
      const fileSize = buffer.length;

      // Step 1 — Start resumable upload
      const startRes = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "X-Goog-Upload-Protocol": "resumable",
            "X-Goog-Upload-Command": "start",
            "X-Goog-Upload-Header-Content-Length": fileSize,
            "X-Goog-Upload-Header-Content-Type": mimeType,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ file: { display_name: "swing_video" } }),
        }
      );

      const uploadUrl = startRes.headers.get("x-goog-upload-url");
      if (!uploadUrl) {
        return res.status(500).json({ error: "Could not start video upload. Try a shorter video or a photo instead." });
      }

      // Step 2 — Upload the actual video bytes
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "X-Goog-Upload-Command": "upload, finalize",
          "X-Goog-Upload-Offset": "0",
          "Content-Type": mimeType,
          "Content-Length": fileSize,
        },
        body: buffer,
      });

      const fileData = await uploadRes.json();
      const fileUri = fileData?.file?.uri;

      if (!fileUri) {
        return res.status(500).json({ error: "Video upload failed. Try a shorter clip under 30 seconds." });
      }

      // Step 3 — Wait for file to be processed
      let fileReady = false;
      let attempts = 0;
      while (!fileReady && attempts < 10) {
        await new Promise(r => setTimeout(r, 2000));
        const checkRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/files/${fileData.file.name.split("/").pop()}?key=${apiKey}`
        );
        const checkData = await checkRes.json();
        if (checkData?.file?.state === "ACTIVE") fileReady = true;
        attempts++;
      }

      if (!fileReady) {
        return res.status(500).json({ error: "Video processing timed out. Try a shorter clip." });
      }

      // Step 4 — Analyze with Gemini using file URI
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
                { text: contents[0].parts[1]?.text || "Analyze this golf swing like a PGA teaching professional." }
              ]
            }],
            generationConfig: {
              maxOutputTokens: 1500,
              temperature: 0.7,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        }
      );

      const analyzeData = await analyzeRes.json();
      if (analyzeData.error) return res.status(200).json({ error: analyzeData.error });
      return res.status(200).json(analyzeData);

    } else {
      // Image — use inline data directly as before
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              maxOutputTokens: 1500,
              temperature: 0.7,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        }
      );
      const data = await response.json();
      if (data.error) return res.status(200).json({ error: data.error });
      return res.status(200).json(data);
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
