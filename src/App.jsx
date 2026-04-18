import { useState, useEffect, useRef, useCallback } from "react";

// ── Google Fonts ──────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap";
document.head.appendChild(fontLink);

// ── Golf Ball Logo ───────────────────────────────────────────────
function ObiLogo({ size = 48, dark = false }) {
  const ballColor = "#f5c518";
  const shine = "#fde68a";
  const dimple = dark ? "#1a1a1a" : "#2a2a2a";
  const stroke = dark ? "#1a1a1a" : "#2a6a35";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="44" fill={ballColor} stroke={stroke} strokeWidth="3"/>
      <ellipse cx="40" cy="36" rx="10" ry="6" fill={shine} opacity="0.75" transform="rotate(-30 40 36)"/>
      {/* Dimple pattern */}
      <circle cx="38" cy="52" r="3.5" fill={dimple} opacity="0.2"/>
      <circle cx="50" cy="46" r="3.5" fill={dimple} opacity="0.2"/>
      <circle cx="62" cy="52" r="3.5" fill={dimple} opacity="0.2"/>
      <circle cx="44" cy="62" r="3.5" fill={dimple} opacity="0.2"/>
      <circle cx="56" cy="62" r="3.5" fill={dimple} opacity="0.2"/>
      <circle cx="50" cy="72" r="3.5" fill={dimple} opacity="0.2"/>
      <circle cx="38" cy="40" r="3"   fill={dimple} opacity="0.15"/>
      <circle cx="62" cy="40" r="3"   fill={dimple} opacity="0.15"/>
    </svg>
  );
}

// ── Theme ─────────────────────────────────────────────────────────
function getTheme(dark) {
  if (dark) return {
    bg: "#080f0a", surface: "#0d1e14", border: "#1a3020",
    green: "#4ade80", greenDim: "#1a4a25", greenBright: "#22c55e",
    text: "#d4ead8", muted: "#3a5a45", label: "#4a6a55",
    topbar: "#0d2216", card: "#0a1a0e", input: "#0a1a0e",
    tabBg: "#060d08", scoreBg: "#0d2216", isDark: true,
  };
  return {
    bg: "#f0f7ee", surface: "#ffffff", border: "#c8e0c0",
    green: "#1e6b2e", greenDim: "#d4edda", greenBright: "#2d8a3e",
    text: "#1a3020", muted: "#5a8060", label: "#6a9070",
    topbar: "#ffffff", card: "#f8fdf6", input: "#ffffff",
    tabBg: "#eaf4e6", scoreBg: "#ffffff", isDark: false,
  };
}

// ── Constants ─────────────────────────────────────────────────────
const HANDICAP_RANGES = [
  { label: "Beginner", sub: "30+", value: "beginner", hcp: 36 },
  { label: "High", sub: "18–29", value: "high", hcp: 24 },
  { label: "Mid", sub: "9–17", value: "mid", hcp: 13 },
  { label: "Low", sub: "0–8", value: "low", hcp: 4 },
];

const PERSONAS = [
  { id: "pro", label: "Tour Pro", icon: "🏆", desc: "Calm, clinical, Tour-level precision" },
  { id: "coach", label: "The Coach", icon: "🎯", desc: "Encouraging, positive, builds confidence" },
  { id: "oldschool", label: "Old School", icon: "🚬", desc: "Gritty, direct, zero fluff" },
];

const DEFAULT_BAG = [
  { club: "Driver", carry: 230 }, { club: "3-Wood", carry: 210 },
  { club: "5-Wood", carry: 195 }, { club: "4-Iron", carry: 180 },
  { club: "5-Iron", carry: 170 }, { club: "6-Iron", carry: 160 },
  { club: "7-Iron", carry: 150 }, { club: "8-Iron", carry: 140 },
  { club: "9-Iron", carry: 130 }, { club: "PW", carry: 120 },
  { club: "GW", carry: 105 }, { club: "SW", carry: 90 },
  { club: "LW", carry: 70 },
];

const QUICK_PROMPTS = [
  { label: "What club?", prompt: "What club should I hit from here?" },
  { label: "Walk the hole", prompt: "Walk me through the strategy for this hole." },
  { label: "I'm in rough", prompt: "My ball is sitting down in the rough. What's my play?" },
  { label: "Wind effect", prompt: "How is this wind affecting my shot and what should I adjust?" },
  { label: "Lay up or go?", prompt: "Should I lay up or go for it? Give me the risk/reward breakdown." },
  { label: "I just pulled it", prompt: "I just pulled my last shot left. What am I doing wrong and how do I fix it?" },
  { label: "Bunker shot", prompt: "I'm in a greenside bunker. Talk me through the shot." },
  { label: "Putting read", prompt: "Give me a putting read and routine for this green." },
];

// ── Helpers ───────────────────────────────────────────────────────
function windDir(deg) {
  return ["N","NE","E","SE","S","SW","W","NW"][Math.round(deg / 45) % 8];
}
function playingYards(yards, elev, windSpeed, windDeg) {
  const withElev = Math.round(yards + elev / 10);
  const headwind = Math.cos((windDeg * Math.PI) / 180);
  return Math.round(withElev + headwind * windSpeed * 0.7);
}
function wxIcon(code) {
  if (!code && code !== 0) return "🌤";
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫";
  if (code <= 67) return "🌧";
  if (code <= 77) return "🌨";
  return "⛈";
}
function scoreLabel(score, par) {
  if (!score || !par) return null;
  const d = score - par;
  if (d <= -2) return { label: "Eagle", color: "#f59e0b" };
  if (d === -1) return { label: "Birdie", color: "#22c55e" };
  if (d === 0) return { label: "Par", color: "#60a5fa" };
  if (d === 1) return { label: "Bogey", color: "#f87171" };
  return { label: d > 0 ? `+${d}` : `${d}`, color: "#ef4444" };
}
async function callGemini(systemPrompt, messages) {
  // System prompt injected as primer so it works on all tiers
  const primer = [
    { role: "user",  parts: [{ text: "Caddie instructions: " + systemPrompt }] },
    { role: "model", parts: [{ text: "Got it. Ready to caddie." }] },
  ];
  const contents = [
    ...primer,
    ...messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  ];

  // Call our own Vercel proxy instead of Google directly (avoids CORS)
  let res;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
      }),
    });
  } catch {
    throw new Error("NETWORK");
  }

  const data = await res.json();
  if (data.error) {
    const msg = typeof data.error === "string" ? data.error : data.error.message || "";
    const code = data.error.code;
    if (code === 400 || code === 403) throw new Error("BAD_KEY");
    if (code === 429) throw new Error("QUOTA");
    if (msg.includes("API key not configured")) throw new Error("NO_SERVER_KEY");
    throw new Error("API_ERROR");
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Obi.";
}

// ═════════════════════════════════════════════════════════════════
export default function ObiGolf() {
  const [darkMode, setDarkMode] = useState(true);
  const T = getTheme(darkMode);

  const [screen, setScreen] = useState("splash");
  const [obStep, setObStep] = useState(1);
  const [profile, setProfile] = useState({ name: "", handicap: "mid", hcp: 13, persona: "pro", missTend: "straight", bag: DEFAULT_BAG });

  const [course, setCourse] = useState("");
  const [courseInput, setCourseInput] = useState("");
  const [hole, setHole] = useState(1);
  const [holePars, setHolePars] = useState(Array(18).fill(4));
  const [scores, setScores] = useState(Array(18).fill(null));
  const [yardage, setYardage] = useState("");
  const [elevation, setElevation] = useState(0);
  const [lie, setLie] = useState("fairway");
  const [shotHistory, setShotHistory] = useState([]);
  const [weather, setWeather] = useState(null);
  const [wxLoading, setWxLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [view, setView] = useState("caddie");
  const [editingBag, setEditingBag] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    const t = setTimeout(() => setScreen("onboard"), 2200);
    return () => clearTimeout(t);
  }, []);

  const fetchWeather = useCallback(async () => {
    setWxLoading(true);
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }));
      const { latitude: lat, longitude: lon } = pos.coords;
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,relative_humidity_2m&wind_speed_unit=mph&temperature_unit=fahrenheit`);
      const d = await r.json();
      const c = d.current;
      setWeather({ temp: Math.round(c.temperature_2m), wind: Math.round(c.wind_speed_10m), windDeg: c.wind_direction_10m, humidity: c.relative_humidity_2m, code: c.weather_code });
    } catch {
      setWeather({ temp: 72, wind: 8, windDeg: 225, humidity: 55, code: 1 });
    }
    setWxLoading(false);
  }, []);

  useEffect(() => { if (screen === "app") fetchWeather(); }, [screen]);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ""));
    utt.rate = 0.93; utt.pitch = 1.0; utt.volume = 1.0;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input requires Chrome or Safari."); return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e) => sendMessage(e.results[0][0].transcript);
    rec.onerror = () => setListening(false);
    rec.start();
  };

  const buildSystem = () => {
    const personaMap = {
      pro: "You are a calm, precise Tour-level golf caddie named Obi. Quiet authority. Surgical advice. 2-3 sentences unless asked for more. Use proper golf terminology.",
      coach: "You are an encouraging golf coach-caddie named Obi. Warm, confidence-building, clear. Keep it positive and specific. 2-3 sentences.",
      oldschool: "You are a gritty old-school caddie named Obi with decades on the bag. Straight talk, no fluff, dry humor. Short and real.",
    };
    const bagStr = profile.bag.map(b => `${b.club}:${b.carry}y`).join(", ");
    const wx = weather ? `Wind ${weather.wind}mph from ${windDir(weather.windDeg)}. Temp ${weather.temp}°F. Humidity ${weather.humidity}%.` : "Weather unavailable.";
    const py = yardage ? playingYards(parseInt(yardage), elevation, weather?.wind || 0, weather?.windDeg || 0) : null;
    const recentShots = shotHistory.slice(-3).map(s => `Hole ${s.hole}: ${s.outcome}`).join(". ");
    return `${personaMap[profile.persona]}

PLAYER: Handicap ${profile.hcp} (${profile.handicap}). Typical miss: ${profile.missTend}.
BAG: ${bagStr}
HOLE: ${course || "unknown course"}, Hole ${hole}, Par ${holePars[hole-1]}
YARDAGE: ${yardage ? `${yardage}y actual, ~${py}y playing` : "not set"}. Lie: ${lie}. Elevation: ${elevation > 0 ? "+" : ""}${elevation}ft.
CONDITIONS: ${wx}
RECENT: ${recentShots || "none"}

RULES: Only use clubs from player's bag. Account for wind, elevation, lie. Be specific with club name and target. No markdown, no bullet points — spoken-friendly only. Keep it short.`;
  };

  const sendMessage = async (overrideText) => {
    const text = (overrideText !== undefined ? overrideText : input).trim();
    if (!text || loading) return;
    setInput("");
    const userMsg = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const reply = await callGemini(buildSystem(), newMsgs);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      speak(reply);
      if (["pulled","pushed","chunked","topped","shanked","flushed","rough","bunker"].some(w => text.toLowerCase().includes(w))) {
        setShotHistory(prev => [...prev, { hole, outcome: text }]);
      }
    } catch (e) {
      let errMsg = "Connection issue — check your internet and try again.";
      if (e.message === "NO_SERVER_KEY") errMsg = "API key not set on server. Add GEMINI_API_KEY in Vercel Environment Variables.";
      if (e.message === "BAD_KEY")       errMsg = "Invalid API key. Check your Vercel environment variable.";
      if (e.message === "QUOTA")         errMsg = "API quota exceeded — wait a minute and try again.";
      if (e.message === "NETWORK")       errMsg = "Network error — check your internet connection.";
      setMessages(prev => [...prev, { role: "assistant", content: errMsg }]);
    }
    setLoading(false);
  };

  const par = holePars[hole - 1];
  const py = yardage && weather ? playingYards(parseInt(yardage) || 0, elevation, weather.wind, weather.windDeg) : null;
  const totalStrokes = scores.reduce((a, b) => a + (b || 0), 0);
  const playedHoles = scores.filter(Boolean).length;
  const scoreDiff = playedHoles > 0 ? totalStrokes - holePars.slice(0, playedHoles).reduce((a, b) => a + b, 0) : 0;
  const recClub = py ? [...profile.bag].sort((a, b) => Math.abs(a.carry - py) - Math.abs(b.carry - py))[0] : null;

  // ── Shared inline styles ──
  const iStyle = { background: T.input, border: `1.5px solid ${T.border}`, borderRadius: "9px", color: T.text, fontSize: "14px", padding: "10px 12px", outline: "none", fontFamily: "'Outfit', sans-serif", width: "100%", boxSizing: "border-box" };
  const btnP = { background: T.greenDim, border: `1.5px solid ${T.green}`, borderRadius: "12px", color: T.green, fontSize: "15px", padding: "13px", cursor: "pointer", fontWeight: "600", fontFamily: "'Outfit', sans-serif", width: "100%", transition: "all 0.15s" };
  const arrowBtn = { background: T.card, border: `1.5px solid ${T.border}`, borderRadius: "8px", color: T.muted, fontSize: "15px", padding: "5px 10px", cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.15s" };
  const sectionTitle = { fontFamily: "'Bebas Neue', sans-serif", fontSize: "22px", color: T.text, margin: "0 0 12px", letterSpacing: "1px" };

  // ═══════════════════════════════════════════════════════════════
  // SPLASH
  // ═══════════════════════════════════════════════════════════════
  if (screen === "splash") {
    return (
      <div style={{ minHeight: "100vh", background: darkMode ? "#080f0a" : "#f0f7ee", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif", position: "relative", backgroundImage: darkMode ? "radial-gradient(ellipse at center, rgba(20,60,30,0.5) 0%, transparent 70%)" : "radial-gradient(ellipse at center, rgba(100,200,120,0.2) 0%, transparent 70%)" }}>
        <div style={{ animation: "splashIn 0.7s cubic-bezier(.34,1.56,.64,1) forwards", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ marginBottom: "16px", filter: "drop-shadow(0 8px 24px rgba(74,222,128,0.3))" }}>
            <ObiLogo size={100} dark={!darkMode} />
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "56px", color: darkMode ? "#f0faf0" : "#1a3020", margin: "0 0 6px", letterSpacing: "4px", textAlign: "center" }}>OBI GOLF</h1>
          <p style={{ color: darkMode ? "#3a5a45" : "#5a8060", fontSize: "14px", letterSpacing: "3px", textTransform: "uppercase", textAlign: "center" }}>Your AI Caddie</p>
        </div>
        <div style={{ position: "absolute", bottom: "48px", display: "flex", gap: "7px" }}>
          {[0,1,2].map(i => <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: darkMode ? "#4ade80" : "#2d8a3e", opacity: 0.5, animation: `bounce 1.2s infinite ${i * 0.2}s` }} />)}
        </div>
        <style>{globalStyles}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ONBOARDING
  // ═══════════════════════════════════════════════════════════════
  if (screen === "onboard") {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif", padding: "24px", backgroundImage: darkMode ? "radial-gradient(ellipse at 30% 20%, rgba(20,60,30,0.3) 0%, transparent 60%)" : "none" }}>
        <div style={{ width: "100%", maxWidth: "380px", animation: "slideUp 0.4s ease" }}>

          {/* Dark mode toggle on onboard */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <button onClick={() => setDarkMode(d => !d)} style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: "20px", padding: "6px 16px", cursor: "pointer", color: T.muted, fontSize: "13px", fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", gap: "6px" }}>
              {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
          </div>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <ObiLogo size={70} dark={!darkMode} />
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "38px", color: T.text, margin: "10px 0 4px", letterSpacing: "3px" }}>OBI GOLF</h1>
          </div>

          {/* Step 0 — API Key */}
          {obStep === 0 && (
            <>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "24px", color: T.text, textAlign: "center", letterSpacing: "2px", margin: "0 0 6px" }}>GET YOUR FREE API KEY</h2>
              <p style={{ color: T.label, fontSize: "13px", textAlign: "center", lineHeight: 1.6, margin: "0 0 18px" }}>Uses Google Gemini — completely free, no credit card needed.</p>
              <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: "12px", padding: "16px", marginBottom: "18px" }}>
                {[
                  ["1", <>Go to <strong style={{ color: T.green }}>aistudio.google.com</strong></>],
                  ["2", "Sign in with your Google account"],
                  ["3", <><strong style={{ color: T.green }}>Get API Key</strong> → Create new key</>],
                  ["4", "Copy and paste it below"],
                ].map(([n, text]) => (
                  <div key={n} style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div style={{ background: T.greenDim, color: T.green, borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", flexShrink: 0, marginTop: "1px" }}>{n}</div>
                    <span style={{ color: T.text, fontSize: "13px", lineHeight: 1.5 }}>{text}</span>
                  </div>
                ))}
              </div>
              <input placeholder="Paste Gemini API key (AIza...)" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} style={{ ...iStyle, fontFamily: "monospace", fontSize: "12px", marginBottom: "10px" }} />
              <button disabled={!apiKeyInput.trim()} onClick={() => { const k = apiKeyInput.trim(); setApiKey(k); localStorage.setItem("obi_gemini_key", k); setObStep(1); }} style={{ ...btnP, opacity: apiKeyInput.trim() ? 1 : 0.4, marginBottom: "8px" }}>Continue →</button>
              <button onClick={() => setObStep(1)} style={{ background: "transparent", border: "none", color: T.muted, fontSize: "13px", padding: "8px", cursor: "pointer", width: "100%", fontFamily: "'Outfit', sans-serif" }}>Skip for now (demo mode)</button>
            </>
          )}

          {/* Step 1 — Persona */}
          {obStep === 1 && (
            <>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "24px", color: T.text, textAlign: "center", letterSpacing: "2px", margin: "0 0 6px" }}>CHOOSE YOUR CADDIE</h2>
              <p style={{ color: T.label, fontSize: "13px", textAlign: "center", margin: "0 0 18px" }}>Changeable anytime in Settings</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                {PERSONAS.map(p => (
                  <button key={p.id} onClick={() => { setProfile(prev => ({ ...prev, persona: p.id })); setObStep(2); }} style={{ display: "flex", alignItems: "center", gap: "12px", background: profile.persona === p.id ? T.greenDim : T.surface, border: `1.5px solid ${profile.persona === p.id ? T.green : T.border}`, borderRadius: "12px", padding: "14px 16px", cursor: "pointer", transition: "all 0.15s", fontFamily: "'Outfit', sans-serif" }}>
                    <span style={{ fontSize: "24px" }}>{p.icon}</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: "600", color: T.text, fontSize: "15px" }}>{p.label}</div>
                      <div style={{ fontSize: "12px", color: T.label, marginTop: "2px" }}>{p.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2 — Handicap */}
          {obStep === 2 && (
            <>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "24px", color: T.text, textAlign: "center", letterSpacing: "2px", margin: "0 0 6px" }}>YOUR LEVEL</h2>
              <p style={{ color: T.label, fontSize: "13px", textAlign: "center", margin: "0 0 18px" }}>Anyone sharing this app can change it in Settings</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "18px" }}>
                {HANDICAP_RANGES.map(h => (
                  <button key={h.value} onClick={() => setProfile(p => ({ ...p, handicap: h.value, hcp: h.hcp }))} style={{ background: profile.handicap === h.value ? T.greenDim : T.surface, border: `1.5px solid ${profile.handicap === h.value ? T.green : T.border}`, borderRadius: "12px", padding: "14px", cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", fontFamily: "'Outfit', sans-serif" }}>
                    <span style={{ fontWeight: "700", fontSize: "15px", color: profile.handicap === h.value ? T.green : T.text }}>{h.label}</span>
                    <span style={{ fontSize: "11px", color: T.label }}>HCP {h.sub}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => {
                setScreen("app");
                const g = { pro: "Ready. Tell me the course and I'll have you dialed in.", coach: "Let's go! Tell me what course we're playing today.", oldschool: "Alright. Course name. Let's get to work." }[profile.persona];
                setMessages([{ role: "assistant", content: g }]);
                setTimeout(() => speak(g), 500);
              }} style={btnP}>Start Round →</button>
            </>
          )}
        </div>
        <style>{globalStyles}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN APP
  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", maxWidth: "480px", margin: "0 auto", background: T.bg, fontFamily: "'Outfit', sans-serif", display: "flex", flexDirection: "column", transition: "background 0.3s" }}>

      {/* ── Top Bar ── */}
      <div style={{ padding: "10px 16px 8px", background: T.topbar, borderBottom: `1.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: darkMode ? "0 2px 12px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ObiLogo size={36} dark={!darkMode} />
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "22px", color: T.text, lineHeight: 1, letterSpacing: "2px" }}>OBI GOLF</div>
            <div style={{ fontSize: "9px", color: T.muted, letterSpacing: "2px", textTransform: "uppercase" }}>AI Caddie</div>
          </div>
          {speaking && <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: T.green, animation: "pulse 1s infinite", marginLeft: "4px" }} />}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {weather && (
            <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: "20px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: T.label }}>
              <span>{wxIcon(weather.code)}</span>
              <span>{weather.temp}°F</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{weather.wind}mph {windDir(weather.windDeg)}</span>
            </div>
          )}
          {/* Dark mode toggle */}
          <button onClick={() => setDarkMode(d => !d)} style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: "20px", padding: "5px 10px", cursor: "pointer", fontSize: "14px", color: T.muted, fontFamily: "'Outfit', sans-serif", transition: "all 0.2s" }}>
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {/* ── Hole / Course Bar ── */}
      <div style={{ padding: "10px 14px", background: T.surface, borderBottom: `1.5px solid ${T.border}` }}>
        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
          <input placeholder="⛳ Course name (e.g. Pebble Beach, Augusta...)" value={courseInput} onChange={e => setCourseInput(e.target.value)}
            onBlur={() => { if (courseInput && courseInput !== course) { setCourse(courseInput); sendMessage(`I'm playing ${courseInput} today. What should I know about this course and hole ${hole}?`); } }}
            onKeyDown={e => { if (e.key === "Enter" && courseInput && courseInput !== course) { setCourse(courseInput); sendMessage(`I'm playing ${courseInput} today. What should I know about this course and hole ${hole}?`); } }}
            style={{ ...iStyle, fontSize: "13px", padding: "8px 12px" }} />
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button onClick={() => setHole(h => Math.max(1, h - 1))} style={arrowBtn}>‹</button>
            <div style={{ textAlign: "center", minWidth: "50px" }}>
              <div style={{ fontSize: "9px", color: T.muted, letterSpacing: "1.5px", textTransform: "uppercase" }}>Hole</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "28px", color: T.text, lineHeight: 1 }}>{hole}</div>
            </div>
            <button onClick={() => setHole(h => Math.min(18, h + 1))} style={arrowBtn}>›</button>
          </div>
          <div style={{ display: "flex", gap: "3px" }}>
            {[3, 4, 5].map(p => (
              <button key={p} onClick={() => { const np = [...holePars]; np[hole-1] = p; setHolePars(np); }} style={{ ...arrowBtn, padding: "4px 10px", fontSize: "12px", background: par === p ? T.greenDim : T.card, color: par === p ? T.green : T.muted, borderColor: par === p ? T.green : T.border }}>P{p}</button>
            ))}
          </div>
          <input type="number" placeholder="Yds" value={yardage} onChange={e => setYardage(e.target.value)} style={{ ...iStyle, width: "72px", padding: "6px 10px", fontSize: "14px" }} />
          <select value={lie} onChange={e => setLie(e.target.value)} style={{ ...iStyle, padding: "6px 8px", fontSize: "12px", flex: 1 }}>
            {["tee box","fairway","light rough","deep rough","bunker","hardpan","uphill lie","downhill lie","sidehill"].map(l => (
              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", background: T.tabBg, borderBottom: `1.5px solid ${T.border}` }}>
        {[
          { id: "caddie", icon: "🎙", label: "Caddie" },
          { id: "shot", icon: "🏌", label: "Shot" },
          { id: "scorecard", icon: "📋", label: "Card" },
          { id: "settings", icon: "⚙", label: "Settings" },
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id)} style={{ flex: 1, padding: "8px 4px", background: "transparent", border: "none", borderBottom: `2.5px solid ${view === t.id ? T.green : "transparent"}`, color: view === t.id ? T.green : T.muted, fontSize: "10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", transition: "color 0.15s", fontFamily: "'Outfit', sans-serif", fontWeight: view === t.id ? "600" : "400" }}>
            <span style={{ fontSize: "15px" }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ══════════ CADDIE VIEW ══════════ */}
      {view === "caddie" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {py && yardage && (
            <div style={{ margin: "10px 12px 0", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: "12px", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: darkMode ? "none" : "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div><div style={{ fontSize: "9px", color: T.muted, letterSpacing: "1.5px", textTransform: "uppercase" }}>Actual</div><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "28px", color: T.text, lineHeight: 1 }}>{yardage}y</div></div>
              <div style={{ color: T.muted, fontSize: "20px" }}>→</div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: "9px", color: T.green, letterSpacing: "1.5px", textTransform: "uppercase" }}>Playing</div><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "28px", color: T.green, lineHeight: 1 }}>{py}y</div></div>
              {recClub && (<><div style={{ color: T.muted, fontSize: "20px" }}>→</div><div style={{ textAlign: "right" }}><div style={{ fontSize: "9px", color: "#f5c842", letterSpacing: "1.5px", textTransform: "uppercase" }}>Club</div><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "24px", color: "#f5c842", lineHeight: 1 }}>{recClub.club}</div></div></>)}
            </div>
          )}

          <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <ObiLogo size={60} dark={!darkMode} />
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "20px", color: T.muted, marginTop: "12px", letterSpacing: "2px" }}>OBI IS READY</div>
                <div style={{ fontSize: "13px", color: T.label, marginTop: "6px" }}>Type a course name above or ask anything</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: "10px" }}>
                {m.role === "assistant" && (
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: T.greenDim, border: `1.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginRight: "8px", marginTop: "2px", flexShrink: 0 }}>
                    <ObiLogo size={20} dark={!darkMode} />
                  </div>
                )}
                <div style={{ maxWidth: "80%", background: m.role === "user" ? T.greenDim : T.surface, border: `1.5px solid ${m.role === "user" ? T.green : T.border}`, borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", boxShadow: darkMode ? "none" : "0 2px 6px rgba(0,0,0,0.05)" }}>
                  <div style={{ lineHeight: 1.6, fontSize: "14px", color: T.text }}>{m.content}</div>
                  {m.role === "assistant" && <button onClick={() => speak(m.content)} style={{ display: "block", marginTop: "6px", background: "none", border: "none", color: T.muted, fontSize: "11px", cursor: "pointer", padding: 0, fontFamily: "'Outfit', sans-serif" }}>🔊 Replay</button>}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: "5px", padding: "4px 14px", alignItems: "center" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: T.greenDim, border: `1.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginRight: "6px" }}><ObiLogo size={18} dark={!darkMode} /></div>
                {[0,1,2].map(i => <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: T.green, animation: `bounce 1s infinite ${i * 0.15}s` }} />)}
              </div>
            )}
          </div>

          <div style={{ padding: "6px 12px", display: "flex", gap: "6px", overflowX: "auto", scrollbarWidth: "none" }}>
            {QUICK_PROMPTS.map(q => (
              <button key={q.label} onClick={() => sendMessage(q.prompt)} style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: "20px", padding: "5px 12px", color: T.label, fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "'Outfit', sans-serif" }}>{q.label}</button>
            ))}
          </div>

          <div style={{ padding: "8px 12px 16px", display: "flex", gap: "8px", alignItems: "center", borderTop: `1.5px solid ${T.border}`, background: T.surface }}>
            <button onClick={startListening} style={{ width: "42px", height: "42px", borderRadius: "50%", background: listening ? T.green : T.card, border: `1.5px solid ${listening ? T.green : T.border}`, fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: listening ? "pulse 1s infinite" : "none", transition: "all 0.2s" }}>{listening ? "🔴" : "🎙"}</button>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Ask Obi anything..." style={{ ...iStyle, flex: 1, padding: "10px 14px" }} />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ width: "42px", height: "42px", borderRadius: "50%", background: input.trim() ? T.greenDim : T.card, border: `1.5px solid ${input.trim() ? T.green : T.border}`, color: input.trim() ? T.green : T.muted, fontSize: "16px", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>➤</button>
          </div>
        </div>
      )}

      {/* ══════════ SHOT VIEW ══════════ */}
      {view === "shot" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
          <h3 style={sectionTitle}>SHOT SITUATIONS</h3>
          <p style={{ color: T.label, fontSize: "13px", marginBottom: "14px" }}>Tap any situation for instant caddie advice.</p>
          {[
            { icon: "🌿", title: "In the Rough", prompt: `I'm in ${lie} with ${yardage || "unknown"} yards to pin. Ball sitting down. What club and technique?` },
            { icon: "🏖", title: "Greenside Bunker", prompt: "I'm in a greenside bunker. Walk me through club, setup, and technique." },
            { icon: "⛰", title: "Uneven Lie", prompt: "I have an uneven lie. How does this affect my shot and what adjustments?" },
            { icon: "🍃", title: "Punch Out", prompt: "I need to punch out from under trees. What club and where should I aim?" },
            { icon: "💦", title: "Carry the Water", prompt: `I need to carry water. ${yardage ? `It's ${yardage} yards.` : ""} Risk/reward and recommended play?` },
            { icon: "🎯", title: "Tight Pin", prompt: "The pin is tucked tight. Attack it or play center? Smart play for my handicap?" },
            { icon: "🌬", title: "Wind Shot", prompt: `${weather ? `Wind is ${weather.wind}mph from the ${windDir(weather.windDeg)}.` : "It's windy."} What shape and adjustment?` },
            { icon: "🔄", title: "Reset After Mishit", prompt: "I just mishit badly. Help me identify what went wrong and give me a mental reset." },
          ].map(s => (
            <button key={s.title} onClick={() => { setView("caddie"); sendMessage(s.prompt); }} style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: "12px", padding: "14px 16px", marginBottom: "8px", cursor: "pointer", fontFamily: "'Outfit', sans-serif", textAlign: "left", transition: "border-color 0.15s", boxShadow: darkMode ? "none" : "0 2px 6px rgba(0,0,0,0.04)" }}>
              <span style={{ fontSize: "24px" }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: T.text, fontWeight: "600", fontSize: "14px" }}>{s.title}</div>
                <div style={{ color: T.label, fontSize: "12px", marginTop: "2px", lineHeight: 1.4 }}>{s.prompt.slice(0, 58)}...</div>
              </div>
              <span style={{ color: T.muted, fontSize: "18px" }}>›</span>
            </button>
          ))}
          <div style={{ marginTop: "16px" }}>
            <h4 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "16px", color: T.label, letterSpacing: "2px", margin: "0 0 10px" }}>LOG SHOT OUTCOME</h4>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {["Flushed it 👌","Pulled left","Pushed right","Chunked it","Thinned it","Perfect draw","Good fade","Found bunker","In the rough"].map(o => (
                <button key={o} onClick={() => { setShotHistory(prev => [...prev, { hole, outcome: o }]); setView("caddie"); sendMessage(`I just hit and the result was: ${o}. What's my next play?`); }} style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: "20px", padding: "6px 12px", color: T.label, fontSize: "12px", cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>{o}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ SCORECARD VIEW ══════════ */}
      {view === "scorecard" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ ...sectionTitle, margin: 0 }}>SCORECARD</h3>
            {playedHoles > 0 && <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "26px", color: scoreDiff > 0 ? "#f87171" : scoreDiff < 0 ? T.green : "#60a5fa" }}>{scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff === 0 ? "EVEN" : scoreDiff}</div>}
          </div>
          {[{ label: "FRONT 9", range: [0, 9] }, { label: "BACK 9", range: [9, 18] }].map(({ label, range }) => (
            <div key={label} style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "10px", color: T.muted, letterSpacing: "2.5px", marginBottom: "8px" }}>{label}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: "3px" }}>
                {Array.from({ length: 9 }, (_, i) => i + range[0]).map(idx => {
                  const h = idx + 1;
                  const sl = scores[idx] ? scoreLabel(scores[idx], holePars[idx]) : null;
                  return (
                    <div key={h} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div style={{ textAlign: "center", fontSize: "9px", color: hole === h ? T.green : T.muted, fontWeight: hole === h ? "700" : "400" }}>{h}</div>
                      <div style={{ textAlign: "center", fontSize: "9px", color: T.label }}>P{holePars[idx]}</div>
                      <input type="number" min="1" max="15" value={scores[idx] || ""} onChange={e => { const ns = [...scores]; ns[idx] = parseInt(e.target.value) || null; setScores(ns); }}
                        style={{ background: hole === h ? T.greenDim : T.surface, border: `1.5px solid ${sl ? sl.color + "88" : hole === h ? T.green : T.border}`, borderRadius: "6px", color: sl ? sl.color : T.text, textAlign: "center", fontSize: "14px", fontWeight: "700", padding: "5px 2px", outline: "none", fontFamily: "'Bebas Neue', sans-serif", width: "100%", boxSizing: "border-box" }} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: "12px", padding: "14px 18px", marginTop: "4px" }}>
            {[["Total strokes", totalStrokes || "—", T.text], ["Holes played", `${playedHoles} / 18`, T.label], playedHoles > 0 && ["vs Par", scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff === 0 ? "Even" : `${scoreDiff}`, scoreDiff > 0 ? "#f87171" : scoreDiff < 0 ? T.green : "#60a5fa"]].filter(Boolean).map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: T.label, fontSize: "14px" }}>{l}</span>
                <span style={{ color: c, fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px" }}>{v}</span>
              </div>
            ))}
          </div>
          <button onClick={() => { setView("caddie"); sendMessage(`Round complete. Score: ${totalStrokes} on par ${holePars.reduce((a,b)=>a+b,0)}. That's ${scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff < 0 ? scoreDiff : "even par"}. Give me an honest debrief and top practice priorities.`); }} style={{ ...btnP, marginTop: "14px" }}>🧠 Get Round Debrief from Obi</button>
        </div>
      )}

      {/* ══════════ SETTINGS VIEW ══════════ */}
      {view === "settings" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
          <h3 style={sectionTitle}>SETTINGS</h3>

          {/* Dark Mode */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", color: T.muted, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>Display</div>
            <button onClick={() => setDarkMode(d => !d)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: "12px", padding: "14px 16px", cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>
              <span style={{ color: T.text, fontSize: "14px", fontWeight: "500" }}>{darkMode ? "🌙 Dark Mode" : "☀️ Light Mode"}</span>
              <div style={{ width: "44px", height: "24px", borderRadius: "12px", background: darkMode ? T.greenDim : T.border, border: `1.5px solid ${darkMode ? T.green : T.border}`, position: "relative", transition: "all 0.2s" }}>
                <div style={{ position: "absolute", top: "2px", left: darkMode ? "22px" : "2px", width: "18px", height: "18px", borderRadius: "50%", background: darkMode ? T.green : T.muted, transition: "all 0.2s" }} />
              </div>
            </button>
          </div>

          {/* API Key */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", color: T.muted, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>Gemini API Key</div>
            <input placeholder="AIza..." value={apiKey} onChange={e => { setApiKey(e.target.value); localStorage.setItem("obi_gemini_key", e.target.value); }} style={{ ...iStyle, fontFamily: "monospace", fontSize: "12px", marginBottom: "6px" }} />
            <div style={{ fontSize: "11px", color: T.muted }}>Free at aistudio.google.com — no credit card needed</div>
          </div>

          {/* Persona */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", color: T.muted, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>Caddie Persona</div>
            {PERSONAS.map(p => (
              <button key={p.id} onClick={() => setProfile(prev => ({ ...prev, persona: p.id }))} style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", background: profile.persona === p.id ? T.greenDim : T.surface, border: `1.5px solid ${profile.persona === p.id ? T.green : T.border}`, borderRadius: "10px", padding: "12px 14px", marginBottom: "6px", cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>
                <span style={{ fontSize: "20px" }}>{p.icon}</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: "600", color: T.text, fontSize: "14px" }}>{p.label}</div>
                  <div style={{ fontSize: "11px", color: T.label }}>{p.desc}</div>
                </div>
                {profile.persona === p.id && <span style={{ color: T.green }}>✓</span>}
              </button>
            ))}
          </div>

          {/* Handicap */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", color: T.muted, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>Handicap Level</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {HANDICAP_RANGES.map(h => (
                <button key={h.value} onClick={() => setProfile(p => ({ ...p, handicap: h.value, hcp: h.hcp }))} style={{ background: profile.handicap === h.value ? T.greenDim : T.surface, border: `1.5px solid ${profile.handicap === h.value ? T.green : T.border}`, borderRadius: "10px", padding: "12px", cursor: "pointer", fontFamily: "'Outfit', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                  <span style={{ fontWeight: "700", fontSize: "14px", color: profile.handicap === h.value ? T.green : T.text }}>{h.label}</span>
                  <span style={{ fontSize: "11px", color: T.label }}>({h.sub})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bag */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", color: T.muted, letterSpacing: "2px", textTransform: "uppercase" }}>My Bag</div>
              <button onClick={() => setEditingBag(!editingBag)} style={{ ...arrowBtn, padding: "4px 12px", fontSize: "12px", color: editingBag ? T.green : T.muted, borderColor: editingBag ? T.green : T.border }}>{editingBag ? "✓ Done" : "Edit Distances"}</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {profile.bag.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 10px", background: T.surface, borderRadius: "8px", border: `1px solid ${T.border}` }}>
                  <span style={{ color: T.label, fontSize: "13px", minWidth: "72px" }}>{item.club}</span>
                  {editingBag ? (
                    <input type="number" value={item.carry} onChange={e => { const nb = [...profile.bag]; nb[idx] = { ...nb[idx], carry: parseInt(e.target.value) || 0 }; setProfile(p => ({ ...p, bag: nb })); }} style={{ ...iStyle, width: "65px", padding: "4px 8px", fontSize: "13px" }} />
                  ) : (
                    <div style={{ flex: 1, height: "3px", background: T.border, borderRadius: "2px" }}>
                      <div style={{ height: "100%", width: `${(item.carry / 260) * 100}%`, background: T.green, borderRadius: "2px", opacity: 0.7 }} />
                    </div>
                  )}
                  <span style={{ color: T.text, fontSize: "13px", fontWeight: "600", minWidth: "42px", textAlign: "right" }}>{item.carry}y</span>
                </div>
              ))}
            </div>
          </div>

          {/* Miss */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", color: T.muted, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>Typical Miss</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {["straight","fade","slice","draw","hook","pull","push"].map(m => (
                <button key={m} onClick={() => setProfile(p => ({ ...p, missTend: m }))} style={{ background: profile.missTend === m ? T.greenDim : T.surface, border: `1.5px solid ${profile.missTend === m ? T.green : T.border}`, color: profile.missTend === m ? T.green : T.label, borderRadius: "20px", padding: "5px 12px", fontSize: "12px", cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>{m}</button>
              ))}
            </div>
          </div>

          {/* Elevation */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", color: T.muted, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>Elevation Change</div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button onClick={() => setElevation(e => e - 5)} style={{ ...arrowBtn, fontSize: "18px", padding: "6px 14px" }}>−</button>
              <div style={{ flex: 1, textAlign: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: "26px", color: T.text }}>{elevation > 0 ? "+" : ""}{elevation}ft</div>
              <button onClick={() => setElevation(e => e + 5)} style={{ ...arrowBtn, fontSize: "18px", padding: "6px 14px" }}>+</button>
            </div>
          </div>

          <button onClick={fetchWeather} style={{ ...btnP, background: T.surface, borderColor: T.border, marginBottom: "8px" }}>{wxLoading ? "Refreshing..." : "🔄 Refresh Weather"}</button>
          <button onClick={() => { setMessages([]); setScores(Array(18).fill(null)); setHole(1); setYardage(""); setCourse(""); setCourseInput(""); setShotHistory([]); const g = { pro: "New round. Ready when you are.", coach: "Fresh start! Let's make this round count.", oldschool: "New round. Let's go." }[profile.persona]; setMessages([{ role: "assistant", content: g }]); setView("caddie"); }} style={{ ...btnP, background: darkMode ? "#1a0e0e" : "#fff5f5", color: "#f87171", borderColor: "#f87171" + "66" }}>🗑 Start New Round</button>
        </div>
      )}

      <style>{globalStyles}</style>
    </div>
  );
}

const globalStyles = `
  @keyframes splashIn { from { opacity:0; transform:scale(0.85) } to { opacity:1; transform:scale(1) } }
  @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
  @keyframes pulse { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.4; transform:scale(0.9) } }
  @keyframes bounce { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none }
  select option { color:#1a3020 }
  ::-webkit-scrollbar { width:3px; height:3px }
  ::-webkit-scrollbar-thumb { background:#1a3020; border-radius:2px }
  * { -webkit-tap-highlight-color: transparent; box-sizing: border-box }
`;
