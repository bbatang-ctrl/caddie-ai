export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "Key not configured" });
  return res.status(200).json({ key });
}
