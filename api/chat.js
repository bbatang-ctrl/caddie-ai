export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured on server" });

  if (req.method === "GET") {
    const testBody = {
      contents: [{ role: "user", parts: [{ text: "Say the word READY and nothing else." }] }],
      generationConfig: { maxOutputTokens: 10 },
    };
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(testBody) }
      );
      const data = await response.json();
      return res.status(200).json({ googleResponse: data });
    } catch (err) {
      return res.status(500).json({ fetchError: err.message });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req.body) }
    );
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
