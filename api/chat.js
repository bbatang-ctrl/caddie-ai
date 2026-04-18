export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured on server" });

  // Use gemini-2.0-flash-001 — stable, fast, reliable for conversation
  const MODEL = "gemini-2.5-flash";

  const body = {
    ...req.body,
    generationConfig: {
      maxOutputTokens: 300,
      temperature: 0.7,
      stopSequences: [],
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ error: data.error });
    }

    // Check finish reason — if SAFETY or OTHER, return a fallback
    const candidate = data.candidates?.[0];
    const finishReason = candidate?.finishReason;

    if (!candidate || !candidate.content) {
      return res.status(200).json({
        candidates: [{
          content: { parts: [{ text: "Let me think about that — can you give me the yardage and lie?" }] },
          finishReason: "STOP"
        }]
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    if (err.name === "AbortError") {
      // Timeout — return a short fallback instead of failing
      return res.status(200).json({
        candidates: [{
          content: { parts: [{ text: "Taking a second — what's the yardage?" }] },
          finishReason: "STOP"
        }]
      });
    }
    return res.status(500).json({ error: err.message });
  }
}
