export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  try {
    // Extract the content from request
    const { contents } = req.body;
    
    // Find the inline_data part and validate it
    const part = contents?.[0]?.parts?.[0];
    if (part?.inline_data) {
      const mimeType = part.inline_data.mime_type;
      
      // Gemini only supports these image types for inline data
      const supportedImages = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
      const supportedVideos = ["video/mp4", "video/mpeg", "video/mov", "video/avi", "video/wmv", "video/mpg", "video/webm"];
      
      const isImage = supportedImages.includes(mimeType);
      const isVideo = supportedVideos.includes(mimeType);
      
      if (!isImage && !isVideo) {
        return res.status(400).json({ 
          error: `Unsupported file type: ${mimeType}. Please upload a JPG, PNG, or MP4 file.` 
        });
      }
    }

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
    
    if (data.error) {
      return res.status(200).json({ error: data.error });
    }
    
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
