export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Verify admin password
  const { userId, adminPassword, action } = req.body;
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!userId) return res.status(400).json({ error: "userId required" });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Server not configured — add SUPABASE_SERVICE_KEY to Vercel env vars" });
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${serviceKey}`,
    "apikey": serviceKey,
  };

  try {
    if (action === "delete") {
      // Delete in order: swings, rounds, friendships, range_shots, then profile
      const tables = [
        `swing_analyses?user_id=eq.${userId}`,
        `rounds?user_id=eq.${userId}`,
        `friendships?user_id=eq.${userId}`,
        `friendships?friend_id=eq.${userId}`,
        `range_shots?user_id=eq.${userId}`,
        `profiles?id=eq.${userId}`,
      ];
      for (const table of tables) {
        await fetch(`${supabaseUrl}/rest/v1/${table}`, { method: "DELETE", headers });
      }

      // Also delete from Supabase Auth (requires service role)
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
      });

      return res.status(200).json({ success: true, message: "User deleted" });
    }

    if (action === "suspend") {
      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ suspended: true, updated_at: new Date().toISOString() }),
      });
      return res.status(200).json({ success: true, message: "User suspended" });
    }

    if (action === "unsuspend") {
      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ suspended: false, updated_at: new Date().toISOString() }),
      });
      return res.status(200).json({ success: true, message: "User unsuspended" });
    }

    return res.status(400).json({ error: "Unknown action" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
