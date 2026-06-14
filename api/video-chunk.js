// Proxies raw video chunks from the browser to Google's resumable upload URL.
// Solves two problems at once:
//   1. CORS — browsers can't POST directly to generativelanguage.googleapis.com
//   2. Vercel body limit — each chunk is ≤ 3 MB, well under the 4.5 MB cap
//
// Called by analyzeSwingVideo() in AppPart1.jsx for each chunk.
// Headers: X-Upload-Url (Google session URL), X-Upload-Offset (byte offset),
//          X-Upload-Last ("true" for the final chunk).
// Body: raw binary chunk (bodyParser must be disabled).

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
  const mimeType  = req.headers["content-type"] || "video/mp4";

  if (!uploadUrl) return res.status(400).json({ error: "X-Upload-Url header required" });

  // Collect raw binary body
  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const body = Buffer.concat(buffers);

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
        error: `Google upload error (HTTP ${uploadRes.status}): ${t.slice(0, 200)}`,
      });
    }

    if (isLast) {
      // Final chunk — Google returns the file metadata
      const data = await uploadRes.json().catch(() => ({}));
      return res.status(200).json({
        fileUri:  data?.file?.uri  || null,
        fileName: data?.file?.name || null,
      });
    }

    // Intermediate chunk — just acknowledge
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
