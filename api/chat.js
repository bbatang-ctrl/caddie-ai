export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured on server" });

  try {
    const { contents } = req.body;

    // Check if this is a file_data request (range mode analysis)
    // or a regular chat request
    const hasFileData = contents?.some(c =>
      c.parts?.some(p => p.file_data)
    );

    // For file_data (video analysis) — send directly to Gemini, no primer needed
    // For regular chat — add system primer
    let finalContents = contents;
    if (!hasFileData) {
      // Regular chat — this shouldn't normally come through here
      // but handle it gracefully
      finalContents = contents;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: finalContents,
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.3,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
