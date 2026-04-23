import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

// ── Fonts ─────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap";
if (!document.querySelector('link[href*="Syne"]')) document.head.appendChild(fontLink);

// ── Design tokens ──────────────────────────────────────────────────
const D = {
  black: "#080a08", dark: "#0e150e", surface: "#141f14", card: "#1a2a1a",
  border: "#243524", green: "#22c55e", greenLt: "#4ade80", greenDim: "#14532d",
  gold: "#f5c518", white: "#f8fafc", text: "#e8f5e9",
  muted: "#4a7a55", red: "#f87171", blue: "#60a5fa", orange: "#fb923c",
};

const S = {
  card: { background: D.card, border: `1px solid ${D.border}`, borderRadius: "16px", padding: "20px" },
  input: { background: D.surface, border: `1.5px solid ${D.border}`, borderRadius: "10px", color: D.text, fontSize: "14px", padding: "10px 14px", outline: "none", fontFamily: "'DM Sans', sans-serif", width: "100%", boxSizing: "border-box" },
  btn: (color = D.green) => ({ background: "transparent", border: `1.5px solid ${color}44`, borderRadius: "8px", color, fontSize: "12px", padding: "6px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: "600", transition: "all 0.15s" }),
};

function StatCard({ icon, label, value, sub, color = D.green }) {
  return (
    <div style={{ ...S.card, display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontSize: "24px" }}>{icon}</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "32px", fontWeight: "800", color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontWeight: "600", color: D.text, fontSize: "14px" }}>{label}</div>
      {sub && <div style={{ fontSize: "12px", color: D.muted }}>{sub}</div>}
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{ background: color + "22", border: `1px solid ${color}44`, borderRadius: "99px", padding: "2px 10px", fontSize: "11px", color, fontWeight: "600" }}>{label}</span>
  );
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"; }
function fmtDateTime(d) { return d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"; }
function timeAgo(d) {
  if (!d) return "never";
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(d);
}

// ── ADMIN CREDENTIALS (change these!) ────────────────────────────
const ADMIN_EMAIL = "bbatang@yahoo.com";
const ADMIN_PASSWORD = "obigolfp855!";

// ═════════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("obi_admin") === "true");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [swings, setSwings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [stats, setStats] = useState({ total: 0, active7: 0, active30: 0, newToday: 0, totalRounds: 0, totalSwings: 0 });
  const [activityLog, setActivityLog] = useState([]);

  // Admin auth — persists for the browser session
  const handleLogin = () => {
    if (loginEmail.trim() === ADMIN_EMAIL && loginPass === ADMIN_PASSWORD) {
      sessionStorage.setItem("obi_admin", "true");
      setAuthed(true);
      loadAll();
    } else {
      setLoginErr("Invalid credentials — check email and password");
    }
  };

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadUsers(), loadRounds(), loadSwings()]);
    setLoading(false);
  }

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setUsers(data);
      const now = new Date();
      const d7 = new Date(now - 7 * 86400000);
      const d30 = new Date(now - 30 * 86400000);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      setStats(prev => ({
        ...prev,
        total: data.length,
        active7: data.filter(u => u.updated_at && new Date(u.updated_at) > d7).length,
        active30: data.filter(u => u.updated_at && new Date(u.updated_at) > d30).length,
        newToday: data.filter(u => u.created_at && new Date(u.created_at) > today).length,
      }));
    }
  }

  async function loadRounds() {
    const { data, count } = await supabase
      .from("rounds")
      .select("*, profile:profiles(full_name, email)", { count: "exact" })
      .order("played_at", { ascending: false })
      .limit(100);
    if (data) {
      setRounds(data);
      setStats(prev => ({ ...prev, totalRounds: count || data.length }));
    }
  }

  async function loadSwings() {
    const { data, count } = await supabase
      .from("swing_analyses")
      .select("*, profile:profiles(full_name, email)", { count: "exact" })
      .order("analyzed_at", { ascending: false })
      .limit(50);
    if (data) {
      setSwings(data);
      setStats(prev => ({ ...prev, totalSwings: count || data.length }));
    }
  }

  async function loadUserActivity(userId) {
    const { data: userRounds } = await supabase.from("rounds").select("*").eq("user_id", userId).order("played_at", { ascending: false }).limit(10);
    const { data: userSwings } = await supabase.from("swing_analyses").select("*").eq("user_id", userId).order("analyzed_at", { ascending: false }).limit(5);
    const log = [
      ...(userRounds || []).map(r => ({ type: "round", date: r.played_at, desc: `Played ${r.course_name || "Unknown"} — ${r.total_score} strokes (${r.holes_played} holes)` })),
      ...(userSwings || []).map(s => ({ type: "swing", date: s.analyzed_at, desc: `Swing analysis${s.notes ? `: ${s.notes.slice(0, 50)}` : ""}` })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    setActivityLog(log);
  }

  async function deleteUserData(userId) {
    await callAdminAction(userId, "delete");
  }

  async function suspendUser(userId) {
    await callAdminAction(userId, "suspend");
  }

  async function unsuspendUser(userId) {
    await callAdminAction(userId, "unsuspend");
  }

  const filteredUsers = users.filter(u =>
    !search || (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  // ── LOGIN ─────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight: "100vh", background: D.black, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", backgroundImage: `radial-gradient(ellipse at 30% 20%, ${D.greenDim}44 0%, transparent 60%)` }}>
      <div style={{ width: "100%", maxWidth: "380px", padding: "24px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⛳</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: "800", color: D.white, letterSpacing: "2px" }}>OBI GOLF</div>
          <div style={{ color: D.muted, fontSize: "13px", marginTop: "4px", letterSpacing: "2px" }}>ADMIN PANEL</div>
        </div>
        <div style={{ ...S.card, marginBottom: "16px" }}>
          <input placeholder="Admin email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} style={{ ...S.input, marginBottom: "10px" }} />
          <input placeholder="Password" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} style={{ ...S.input }} />
          {loginErr && <div style={{ color: D.red, fontSize: "13px", marginTop: "8px" }}>{loginErr}</div>}
        </div>
        <button onClick={handleLogin} style={{ background: `linear-gradient(135deg, ${D.green}, #16a34a)`, border: "none", borderRadius: "12px", color: "#fff", fontSize: "15px", padding: "14px", cursor: "pointer", fontWeight: "600", fontFamily: "'DM Sans', sans-serif", width: "100%" }}>
          Sign In to Admin
        </button>
      </div>
      <style>{CSS}</style>
    </div>
  );

  // ── CONFIRM MODAL ─────────────────────────────────────────────
  const ConfirmModal = () => confirmAction ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ ...S.card, maxWidth: "360px", width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "14px" }}>{confirmAction.type === "delete" ? "🗑️" : "⛔"}</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "18px", fontWeight: "700", color: D.white, marginBottom: "8px" }}>
          {confirmAction.type === "delete" ? "Delete User?" : "Suspend User?"}
        </div>
        <div style={{ color: D.muted, fontSize: "14px", marginBottom: "6px" }}>{confirmAction.user.full_name || "Unknown"}</div>
        <div style={{ color: D.muted, fontSize: "13px", marginBottom: "20px" }}>{confirmAction.user.email}</div>
        {confirmAction.type === "delete" && (
          <div style={{ background: D.red + "11", border: `1px solid ${D.red}44`, borderRadius: "10px", padding: "10px 14px", marginBottom: "20px", fontSize: "13px", color: D.red }}>
            ⚠️ This permanently deletes all their rounds, swings, and profile data. Cannot be undone.
          </div>
        )}
        <div style={{ display: "flex", gap: "10px" }}>
          {actionMsg && <div style={{ color: actionMsg.startsWith("Error") ? D.red : D.green, fontSize: "13px", marginBottom: "10px", padding: "8px", background: "rgba(0,0,0,0.3)", borderRadius: "8px" }}>{actionMsg}</div>}
          <button onClick={() => { setConfirmAction(null); setActionMsg(""); }} style={{ ...S.btn(D.muted), flex: 1, padding: "10px" }}>Cancel</button>
          <button
            disabled={actionLoading}
            onClick={() => confirmAction.type === "delete" ? deleteUserData(confirmAction.user.id) : suspendUser(confirmAction.user.id)}
            style={{ ...S.btn(confirmAction.type === "delete" ? D.red : D.orange), flex: 1, padding: "10px", background: (confirmAction.type === "delete" ? D.red : D.orange) + "22", opacity: actionLoading ? 0.5 : 1 }}>
            {actionLoading ? "Working..." : confirmAction.type === "delete" ? "Delete Forever" : "Suspend User"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ── USER DETAIL MODAL ─────────────────────────────────────────
  const UserModal = () => selectedUser ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 999, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px", overflowY: "auto" }}>
      <div style={{ ...S.card, maxWidth: "500px", width: "100%", marginTop: "20px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: "700", color: D.white }}>{selectedUser.full_name || "Unknown User"}</div>
            <div style={{ color: D.muted, fontSize: "13px", marginTop: "2px" }}>{selectedUser.email}</div>
          </div>
          <button onClick={() => { setSelectedUser(null); setActivityLog([]); }} style={{ background: "none", border: "none", color: D.muted, fontSize: "20px", cursor: "pointer" }}>✕</button>
        </div>

        {/* Profile details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          {[
            ["Handicap", selectedUser.handicap_category || "—"],
            ["Dexterity", selectedUser.dexterity || "right"],
            ["Caddie Style", selectedUser.caddie_persona || "—"],
            ["Home Course", selectedUser.home_course || "—"],
            ["Joined", fmtDate(selectedUser.created_at)],
            ["Last Active", timeAgo(selectedUser.updated_at)],
            ["Status", selectedUser.suspended ? "Suspended" : "Active"],
            ["Rounds", rounds.filter(r => r.user_id === selectedUser.id).length],
          ].map(([label, value]) => (
            <div key={label} style={{ background: D.surface, borderRadius: "10px", padding: "10px 12px" }}>
              <div style={{ fontSize: "10px", color: D.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontSize: "14px", color: D.text, fontWeight: "500" }}>{String(value)}</div>
            </div>
          ))}
        </div>

        {/* Activity log */}
        {activityLog.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", color: D.muted, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>Recent Activity</div>
            {activityLog.slice(0, 8).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", paddingBottom: "10px", borderBottom: `1px solid ${D.border}`, marginBottom: "10px" }}>
                <span style={{ fontSize: "16px" }}>{a.type === "round" ? "⛳" : "🎬"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", color: D.text }}>{a.desc}</div>
                  <div style={{ fontSize: "11px", color: D.muted, marginTop: "2px" }}>{timeAgo(a.date)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {selectedUser.suspended ? (
            <button onClick={() => unsuspendUser(selectedUser.id)} style={{ ...S.btn(D.green), flex: 1, padding: "10px" }}>✅ Unsuspend</button>
          ) : (
            <button onClick={() => setConfirmAction({ type: "suspend", user: selectedUser })} style={{ ...S.btn(D.orange), flex: 1, padding: "10px", background: D.orange + "11" }}>⛔ Suspend</button>
          )}
          <button onClick={() => setConfirmAction({ type: "delete", user: selectedUser })} style={{ ...S.btn(D.red), flex: 1, padding: "10px", background: D.red + "11" }}>🗑 Delete User</button>
        </div>
      </div>
    </div>
  ) : null;

  // ── MAIN ADMIN ────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: D.black, fontFamily: "'DM Sans', sans-serif", color: D.text }}>
      <ConfirmModal/>
      <UserModal/>

      {/* Top bar */}
      <div style={{ background: D.dark, borderBottom: `1px solid ${D.border}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>⛳</span>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "18px", fontWeight: "800", color: D.white, letterSpacing: "1px" }}>OBI GOLF</div>
            <div style={{ fontSize: "9px", color: D.muted, letterSpacing: "2px" }}>ADMIN PANEL</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {loading && <div style={{ fontSize: "12px", color: D.muted }}>Loading...</div>}
          <button onClick={loadAll} style={{ ...S.btn(D.green) }}>🔄 Refresh</button>
          <button onClick={() => { sessionStorage.removeItem("obi_admin"); setAuthed(false); }} style={{ ...S.btn(D.red) }}>Sign Out</button>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ background: D.dark, borderBottom: `1px solid ${D.border}`, display: "flex", padding: "0 24px" }}>
        {[
          { id: "dashboard", label: "📊 Dashboard" },
          { id: "users",     label: `👥 Users (${users.length})` },
          { id: "rounds",    label: `⛳ Rounds (${stats.totalRounds})` },
          { id: "swings",    label: `🎬 Swings (${stats.totalSwings})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "12px 16px", background: "transparent", border: "none", borderBottom: `2px solid ${tab === t.id ? D.green : "transparent"}`, color: tab === t.id ? D.green : D.muted, fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: tab === t.id ? "600" : "400", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", fontWeight: "800", color: D.white, marginBottom: "20px" }}>Dashboard</div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "28px" }}>
              <StatCard icon="👥" label="Total Users" value={stats.total} sub="All time signups" color={D.green}/>
              <StatCard icon="🟢" label="Active (7d)" value={stats.active7} sub="Used app this week" color={D.greenLt}/>
              <StatCard icon="📅" label="Active (30d)" value={stats.active30} sub="Used app this month" color={D.blue}/>
              <StatCard icon="✨" label="New Today" value={stats.newToday} sub="Signed up today" color={D.gold}/>
              <StatCard icon="⛳" label="Total Rounds" value={stats.totalRounds} sub="All rounds saved" color={D.green}/>
              <StatCard icon="🎬" label="Swing Analyses" value={stats.totalSwings} sub="All analyses run" color={D.orange}/>
            </div>

            {/* Recent signups */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={S.card}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px", fontWeight: "700", color: D.white, marginBottom: "14px" }}>Recent Signups</div>
                {users.slice(0, 8).map((u, i) => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "10px", borderBottom: i < 7 ? `1px solid ${D.border}` : "none", marginBottom: "10px", cursor: "pointer" }}
                    onClick={() => { setSelectedUser(u); loadUserActivity(u.id); }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: D.greenDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontFamily: "'Syne', sans-serif", fontWeight: "700", color: D.greenLt, flexShrink: 0 }}>
                      {(u.full_name || u.email || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", color: D.text, fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name || "No name"}</div>
                      <div style={{ fontSize: "12px", color: D.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                    </div>
                    <div style={{ fontSize: "11px", color: D.muted, flexShrink: 0 }}>{timeAgo(u.created_at)}</div>
                  </div>
                ))}
              </div>

              <div style={S.card}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px", fontWeight: "700", color: D.white, marginBottom: "14px" }}>Recent Rounds</div>
                {rounds.slice(0, 8).map((r, i) => {
                  const diff = r.total_score - r.total_par;
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "10px", borderBottom: i < 7 ? `1px solid ${D.border}` : "none", marginBottom: "10px" }}>
                      <span style={{ fontSize: "18px" }}>⛳</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", color: D.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.profile?.full_name || "Unknown"}</div>
                        <div style={{ fontSize: "12px", color: D.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.course_name || "Unknown course"}</div>
                      </div>
                      <div style={{ fontSize: "14px", fontFamily: "'Syne', sans-serif", fontWeight: "700", color: diff < 0 ? D.green : diff === 0 ? D.blue : D.red, flexShrink: 0 }}>
                        {diff > 0 ? `+${diff}` : diff === 0 ? "E" : diff}
                      </div>
                      <div style={{ fontSize: "11px", color: D.muted, flexShrink: 0 }}>{timeAgo(r.played_at)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Handicap breakdown */}
            <div style={{ ...S.card, marginTop: "20px" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px", fontWeight: "700", color: D.white, marginBottom: "16px" }}>User Breakdown</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                {/* Handicap */}
                <div>
                  <div style={{ fontSize: "11px", color: D.muted, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>By Handicap</div>
                  {["beginner","high","mid","low"].map(h => {
                    const count = users.filter(u => u.handicap_category === h).length;
                    const pct = users.length > 0 ? (count / users.length) * 100 : 0;
                    return (
                      <div key={h} style={{ marginBottom: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                          <span style={{ fontSize: "12px", color: D.muted, textTransform: "capitalize" }}>{h}</span>
                          <span style={{ fontSize: "12px", color: D.text }}>{count}</span>
                        </div>
                        <div style={{ height: "4px", background: D.border, borderRadius: "2px" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: D.green, borderRadius: "2px", transition: "width 0.5s" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Dexterity */}
                <div>
                  <div style={{ fontSize: "11px", color: D.muted, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>By Dexterity</div>
                  {["right","left"].map(d => {
                    const count = users.filter(u => (u.dexterity || "right") === d).length;
                    const pct = users.length > 0 ? (count / users.length) * 100 : 0;
                    return (
                      <div key={d} style={{ marginBottom: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                          <span style={{ fontSize: "12px", color: D.muted, textTransform: "capitalize" }}>{d} handed</span>
                          <span style={{ fontSize: "12px", color: D.text }}>{count}</span>
                        </div>
                        <div style={{ height: "4px", background: D.border, borderRadius: "2px" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: D.blue, borderRadius: "2px" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Persona */}
                <div>
                  <div style={{ fontSize: "11px", color: D.muted, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>By Caddie Style</div>
                  {["pro","coach","oldschool"].map(p => {
                    const count = users.filter(u => u.caddie_persona === p).length;
                    const pct = users.length > 0 ? (count / users.length) * 100 : 0;
                    const labels = { pro: "Tour Pro", coach: "The Coach", oldschool: "Old School" };
                    return (
                      <div key={p} style={{ marginBottom: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                          <span style={{ fontSize: "12px", color: D.muted }}>{labels[p]}</span>
                          <span style={{ fontSize: "12px", color: D.text }}>{count}</span>
                        </div>
                        <div style={{ height: "4px", background: D.border, borderRadius: "2px" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: D.gold, borderRadius: "2px" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", fontWeight: "800", color: D.white }}>Users</div>
              <input placeholder="🔍 Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.input, maxWidth: "320px" }}/>
            </div>

            {/* Table */}
            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr 120px", gap: "0", padding: "12px 16px", background: D.surface, borderBottom: `1px solid ${D.border}` }}>
                {["Name","Email","HCP","Dexterity","Rounds","Last Active","Actions"].map(h => (
                  <div key={h} style={{ fontSize: "10px", color: D.muted, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: "600" }}>{h}</div>
                ))}
              </div>

              {filteredUsers.length === 0 && (
                <div style={{ padding: "40px", textAlign: "center", color: D.muted }}>No users found</div>
              )}

              {filteredUsers.map((u, i) => {
                const userRounds = rounds.filter(r => r.user_id === u.id).length;
                return (
                  <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr 120px", gap: "0", padding: "12px 16px", borderBottom: `1px solid ${D.border}`, alignItems: "center", background: u.suspended ? D.red + "08" : "transparent", cursor: "pointer" }}
                    onClick={() => { setSelectedUser(u); loadUserActivity(u.id); }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: D.greenDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontFamily: "'Syne', sans-serif", fontWeight: "700", color: D.greenLt, flexShrink: 0, overflow: "hidden" }}>
                        {u.avatar_url ? <img src={u.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }}/> : (u.full_name || u.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", color: D.text, fontWeight: "500" }}>{u.full_name || "—"}</div>
                        {u.suspended && <Badge label="Suspended" color={D.red}/>}
                      </div>
                    </div>
                    <div style={{ fontSize: "12px", color: D.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                    <div><Badge label={u.handicap_category || "—"} color={D.green}/></div>
                    <div style={{ fontSize: "13px", color: D.muted, textTransform: "capitalize" }}>{u.dexterity || "right"}</div>
                    <div style={{ fontSize: "13px", color: D.text, fontWeight: "600" }}>{userRounds}</div>
                    <div style={{ fontSize: "12px", color: D.muted }}>{timeAgo(u.updated_at)}</div>
                    <div style={{ display: "flex", gap: "6px" }} onClick={e => e.stopPropagation()}>
                      {u.suspended
                        ? <button onClick={() => unsuspendUser(u.id)} style={{ ...S.btn(D.green), fontSize: "11px", padding: "4px 8px" }}>Restore</button>
                        : <button onClick={() => setConfirmAction({ type: "suspend", user: u })} style={{ ...S.btn(D.orange), fontSize: "11px", padding: "4px 8px" }}>Suspend</button>
                      }
                      <button onClick={() => setConfirmAction({ type: "delete", user: u })} style={{ ...S.btn(D.red), fontSize: "11px", padding: "4px 8px" }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ROUNDS ── */}
        {tab === "rounds" && (
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", fontWeight: "800", color: D.white, marginBottom: "20px" }}>All Rounds</div>
            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr", padding: "12px 16px", background: D.surface, borderBottom: `1px solid ${D.border}` }}>
                {["Player","Course","Score","vs Par","Holes","Played"].map(h => (
                  <div key={h} style={{ fontSize: "10px", color: D.muted, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: "600" }}>{h}</div>
                ))}
              </div>
              {rounds.map((r, i) => {
                const diff = r.total_score - r.total_par;
                return (
                  <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr", padding: "12px 16px", borderBottom: `1px solid ${D.border}`, alignItems: "center" }}>
                    <div style={{ fontSize: "13px", color: D.text }}>{r.profile?.full_name || "Unknown"}</div>
                    <div style={{ fontSize: "13px", color: D.muted }}>{r.course_name || "—"}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px", fontWeight: "700", color: D.text }}>{r.total_score}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: "700", color: diff < 0 ? D.green : diff === 0 ? D.blue : D.red }}>
                      {diff > 0 ? `+${diff}` : diff === 0 ? "E" : diff}
                    </div>
                    <div style={{ fontSize: "13px", color: D.muted }}>{r.holes_played}</div>
                    <div style={{ fontSize: "12px", color: D.muted }}>{timeAgo(r.played_at)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SWINGS ── */}
        {tab === "swings" && (
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", fontWeight: "800", color: D.white, marginBottom: "20px" }}>Swing Analyses</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {swings.map((s, i) => (
                <div key={s.id} style={{ ...S.card }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontWeight: "600", color: D.text, fontSize: "15px" }}>{s.profile?.full_name || "Unknown"}</div>
                      <div style={{ fontSize: "12px", color: D.muted, marginTop: "2px" }}>{s.profile?.email}</div>
                    </div>
                    <div style={{ fontSize: "12px", color: D.muted }}>{timeAgo(s.analyzed_at)}</div>
                  </div>
                  {s.notes && <div style={{ fontSize: "13px", color: D.green, marginBottom: "8px", fontStyle: "italic" }}>"{s.notes}"</div>}
                  <div style={{ fontSize: "13px", color: D.muted, lineHeight: 1.6 }}>{s.analysis?.slice(0, 200)}...</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
  @keyframes popIn { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
  ::-webkit-scrollbar { width: 4px }
  ::-webkit-scrollbar-thumb { background: #243524; border-radius: 2px }
  * { box-sizing: border-box }
  input:focus { border-color: #22c55e !important }
`;
