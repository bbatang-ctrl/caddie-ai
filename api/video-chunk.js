// Proxies raw video chunks from the browser to Google's resumable upload URL.
// Solves two problems:
//   1. CORS — browsers can't POST directly to generativelanguage.googleapis.com
//   2. Vercel body limit — each chunk is ≤ 3 MB, under the 4.5 MB cap
//
// Headers: X-Upload-Url, X-Upload-Offset, X-Upload-Last ("true" on final chunk)
// Body: raw binary chunk — bodyParser MUST be disabled.

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Upload-Url, X-Upload-Offset, X-Upload-Last"
  );
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uploadUrl = req.headers["x-upload-url"];
  const offset    = parseInt(req.headers["x-upload-offset"] || "0");
  const isLast    = req.headers["x-upload-last"] === "true";
  // Strip parameters like "; codecs=..." — Google rejects them
  const mimeType  = (req.headers["content-type"] || "video/mp4").split(";")[0].trim();

  if (!uploadUrl) return res.status(400).json({ error: "X-Upload-Url header required" });

  // Read raw binary body with Node.js events (more reliable than for-await in Vercel)
  let body;
  try {
    body = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", chunk => chunks.push(Buffer.from(chunk)));
      req.on("end",  ()    => resolve(Buffer.concat(chunks)));
      req.on("error", err  => reject(err));
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to read request body: " + err.message });
  }

  // Forward chunk to Google's resumable upload session
  try {
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "X-Goog-Upload-Command": isLast ? "upload, finalize" : "upload",
        "X-Goog-Upload-Offset": String(offset),
        "Content-Type": mimeType,
      },
      body,
    });

    if (!uploadRes.ok) {
      const t = await uploadRes.text().catch(() => "");
      return res.status(500).json({
        error: `Google upload error (HTTP ${uploadRes.status}): ${t.slice(0, 300)}`,
      });
    }

    if (isLast) {
      const data = await uploadRes.json().catch(() => ({}));
      return res.status(200).json({
        fileUri:  data?.file?.uri  || null,
        fileName: data?.file?.name || null,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Upload proxy error: " + err.message });
  }
}
