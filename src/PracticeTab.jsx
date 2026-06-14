import React, { useState } from "react";
import { Video, X, Trash2 } from "lucide-react";

function cn() { return Array.from(arguments).filter(Boolean).join(" "); }

// ─── Score colour system ────────────────────────────────────────────────────
// Overall (0–100)
function scoreColor(s)  {
  if (s <= 40) return "#f87171";
  if (s <= 65) return "#fbbf24";
  if (s <= 80) return "#60a5fa";
  return "#CFFF04";
}
function scoreBg(s) {
  if (s <= 40) return "rgba(248,113,113,0.10)";
  if (s <= 65) return "rgba(251,191,36,0.10)";
  if (s <= 80) return "rgba(96,165,250,0.10)";
  return "rgba(207,255,4,0.10)";
}
function scoreLabel(s) {
  if (s <= 40) return "Needs Work";
  if (s <= 65) return "Developing";
  if (s <= 80) return "Amateur";
  return "Advanced";
}
// Category score (1–10)
function catColor(s) {
  if (s <= 4) return "#f87171";
  if (s <= 6) return "#fbbf24";
  if (s <= 8) return "#60a5fa";
  return "#CFFF04";
}

// ─── Parse raw analysis text → structured object ────────────────────────────
function parseAnalysis(text) {
  if (!text) return null;
  try {
    const js = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const p = JSON.parse(js);
    if (!p?.categories && !p?.phases) return null;
    // Normalise legacy "phases" format → "categories"
    if (p.phases && !p.categories) {
      const ph = p.phases;
      p.categories = {
        setup:         ph.setup,
        backswing:     ph.backswing,
        downswing:     ph.downswing,
        impact:        ph.impact,
        followthrough: ph.followThrough || ph.followthrough || { score: 5, note: "" },
        tempo:         { score: 5, note: "Not scored in this analysis" },
      };
    }
    return p;
  } catch {
    return null;
  }
}

const CAT_LABELS = {
  setup:         "Setup",
  backswing:     "Backswing",
  downswing:     "Downswing",
  impact:        "Impact",
  followthrough: "Follow Through",
  tempo:         "Tempo",
};

// ─── Score Circle (SVG ring) ────────────────────────────────────────────────
function ScoreCircle({ score, size = 84 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const color = scoreColor(score);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"/>
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
        />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize: Math.round(size * 0.29), fontWeight:700, color, lineHeight:1 }}>
          {score}
        </span>
        <span style={{ fontSize:8, color:"rgba(255,255,255,0.35)", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", marginTop:2 }}>
          /100
        </span>
      </div>
    </div>
  );
}

// ─── Score Badge (small coloured circle for list items) ─────────────────────
function ScoreBadge({ score }) {
  const color = scoreColor(score);
  return (
    <div style={{
      width:40, height:40, borderRadius:"50%",
      border:`2.5px solid ${color}`, background: scoreBg(score),
      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
    }}>
      <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:12, fontWeight:700, color }}>
        {score}
      </span>
    </div>
  );
}

// ─── Horizontal category bar ────────────────────────────────────────────────
function CategoryBar({ label, score, note }) {
  const color = catColor(score);
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5 }}>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"rgba(255,255,255,0.55)" }}>
          {label}
        </span>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:14, fontWeight:700, color }}>
          {score}<span style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginLeft:1 }}>/10</span>
        </span>
      </div>
      <div style={{ height:5, borderRadius:99, background:"rgba(255,255,255,0.07)", overflow:"hidden", marginBottom:5 }}>
        <div style={{
          height:"100%", borderRadius:99, background:color,
          width:`${(score / 10) * 100}%`,
          boxShadow:`0 0 8px ${color}55`,
        }}/>
      </div>
      {note && <p style={{ fontSize:11, color:"rgba(255,255,255,0.40)", lineHeight:1.45, margin:0 }}>{note}</p>}
    </div>
  );
}

// ─── Progress summary card (shown when 2+ swings have structured data) ───────
function ProgressCard({ parsedSwings, swingCount }) {
  if (!parsedSwings || parsedSwings.length < 2) return null;

  // parsedSwings is newest-first; reverse so chart reads oldest→newest (left→right)
  const chrono = parsedSwings.slice().reverse();
  const scores = chrono.map(s => s.parsed.overall || 0);
  const first  = scores[0];
  const last   = scores[scores.length - 1];
  const diff   = last - first;
  const trendColor = diff > 0 ? "#4ade80" : diff < 0 ? "#f87171" : "#60a5fa";
  const trendSign  = diff > 0 ? "+" : "";

  // Most improved category: oldest vs newest parsed swing
  const oldest = chrono[0].parsed;
  const newest = chrono[chrono.length - 1].parsed;
  let bestKey = null, bestGain = 0;
  Object.keys(CAT_LABELS).forEach(key => {
    const gain = (newest.categories?.[key]?.score || 0) - (oldest.categories?.[key]?.score || 0);
    if (gain > bestGain) { bestGain = gain; bestKey = key; }
  });

  // Latest primary fault
  const latestFault = newest.primaryFault || null;

  // Sparkline — plot every parsed swing score
  const W = 68, H = 28;
  const minS = Math.min(...scores);
  const maxS = Math.max(...scores);
  const range = maxS - minS || 1;
  const pts = scores.map((s, i) => {
    const x = scores.length === 1 ? W / 2 : (i / (scores.length - 1)) * (W - 4) + 2;
    const y = (H - 6) - ((s - minS) / range) * (H - 12) + 4;
    return [x.toFixed(1), y.toFixed(1)];
  });
  const polyline = pts.map(p => p.join(",")).join(" ");
  const dot = pts[pts.length - 1];

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14,
      padding: "12px 14px",
    }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(255,255,255,0.30)", margin:0 }}>
          Your Progress
        </p>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.25)", background:"rgba(255,255,255,0.05)", borderRadius:99, padding:"2px 8px" }}>
          {swingCount} swings analyzed
        </span>
      </div>

      {/* Trend row: sparkline + score delta */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom: (bestKey || latestFault) ? 8 : 0 }}>
        <svg width={W} height={H} style={{ flexShrink:0, overflow:"visible" }}>
          <polyline points={polyline} fill="none" stroke={trendColor} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round"/>
          <circle cx={dot[0]} cy={dot[1]} r="2.5" fill={trendColor}/>
        </svg>
        <div style={{ display:"flex", alignItems:"baseline", gap:5 }}>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:17, fontWeight:700, color:trendColor, lineHeight:1 }}>
            {trendSign}{diff}
          </span>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.28)" }}>pts since first swing</span>
        </div>
      </div>

      {/* Most improved category */}
      {bestKey && bestGain > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom: latestFault ? 6 : 0 }}>
          <span style={{ fontSize:11 }}>📈</span>
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.45)", margin:0, lineHeight:1.35 }}>
            <span style={{ color:"rgba(255,255,255,0.60)", fontWeight:600 }}>Most improved: </span>
            {CAT_LABELS[bestKey]}
            <span style={{ color:"#4ade80", fontWeight:700 }}> +{bestGain}</span>
          </p>
        </div>
      )}

      {/* Biggest remaining fault */}
      {latestFault && (
        <div style={{ display:"flex", alignItems:"flex-start", gap:7 }}>
          <span style={{ fontSize:11, flexShrink:0, lineHeight:"1.5" }}>⚠️</span>
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.40)", margin:0, lineHeight:1.4 }}>
            <span style={{ color:"rgba(255,255,255,0.55)", fontWeight:600 }}>Fix next: </span>
            {latestFault.length > 80 ? latestFault.slice(0, 80) + "…" : latestFault}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Comparison table (shown when 2+ swings have structured data) ───────────
function ComparisonTable({ swings }) {
  // swings: [{ label, parsed }] newest-first — we show oldest → newest (left → right)
  if (!swings || swings.length < 2) return null;
  const cols = swings.slice(0, 3).reverse(); // oldest first

  return (
    <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, overflow:"hidden", marginBottom:16 }}>
      <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(255,255,255,0.30)", padding:"12px 14px 8px", margin:0 }}>
        Swing Comparison
      </p>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead>
            <tr style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
              <th style={{ padding:"6px 14px", textAlign:"left", fontFamily:"'Space Grotesk',sans-serif", fontSize:8, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"rgba(255,255,255,0.25)", whiteSpace:"nowrap" }}>
                Category
              </th>
              {cols.map((s, i) => (
                <th key={i} style={{ padding:"6px 10px", textAlign:"center", fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:700, color: i === cols.length - 1 ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.35)", whiteSpace:"nowrap" }}>
                  {i === cols.length - 1 ? "Latest" : i === 0 ? (cols.length > 2 ? "Oldest" : "Previous") : "Middle"}
                  <span style={{ display:"block", fontWeight:400, fontSize:8, color:"rgba(255,255,255,0.25)" }}>{s.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Overall */}
            <tr style={{ borderTop:"1px solid rgba(255,255,255,0.05)", background:"rgba(255,255,255,0.02)" }}>
              <td style={{ padding:"8px 14px", fontFamily:"'Space Grotesk',sans-serif", fontSize:10, fontWeight:700, textTransform:"uppercase", color:"rgba(255,255,255,0.45)" }}>
                Overall
              </td>
              {cols.map((s, i) => {
                const cur  = s.parsed?.overall || 0;
                const prev = i > 0 ? (cols[i-1].parsed?.overall || 0) : null;
                const diff = prev != null ? cur - prev : null;
                const col  = diff == null ? scoreColor(cur) : diff > 0 ? "#4ade80" : diff < 0 ? "#f87171" : "rgba(255,255,255,0.5)";
                return (
                  <td key={i} style={{ padding:"8px 10px", textAlign:"center" }}>
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:15, fontWeight:700, color:col }}>{cur}</span>
                    {diff != null && diff !== 0 && (
                      <span style={{ display:"block", fontSize:9, color:col, lineHeight:1 }}>{diff > 0 ? `+${diff}` : diff}</span>
                    )}
                  </td>
                );
              })}
            </tr>
            {/* Categories */}
            {Object.entries(CAT_LABELS).map(([key, label], ri) => (
              <tr key={key} style={{ borderTop:"1px solid rgba(255,255,255,0.04)", background: ri % 2 === 1 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                <td style={{ padding:"6px 14px", fontSize:11, color:"rgba(255,255,255,0.35)", whiteSpace:"nowrap" }}>{label}</td>
                {cols.map((s, i) => {
                  const cur  = s.parsed?.categories?.[key]?.score || 0;
                  const prev = i > 0 ? (cols[i-1].parsed?.categories?.[key]?.score || 0) : null;
                  const diff = prev != null ? cur - prev : null;
                  const col  = diff == null ? catColor(cur) : diff > 0 ? "#4ade80" : diff < 0 ? "#f87171" : "rgba(255,255,255,0.4)";
                  return (
                    <td key={i} style={{ padding:"6px 10px", textAlign:"center" }}>
                      <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:12, fontWeight:700, color:col }}>{cur}</span>
                      {diff != null && diff !== 0 && (
                        <span style={{ display:"block", fontSize:8, color:col, lineHeight:1 }}>{diff > 0 ? `+${diff}` : diff}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Full expanded analysis view ────────────────────────────────────────────
function SwingAnalysisView({ parsed, videoUrl, frames, speaking, speakText, stopSpeak }) {
  if (!parsed) return null;
  const overall = parsed.overall || 0;
  const color   = scoreColor(overall);
  const cats    = parsed.categories || {};
  const readText = parsed.summary
    || `Overall score ${overall} out of 100. ${parsed.primaryFault || ""}. ${typeof parsed.drill === "string" ? parsed.drill : ""}`;

  return (
    <div>
      {/* Video playback */}
      {videoUrl && (
        <video
          src={videoUrl} controls playsInline loop
          style={{ width:"100%", background:"#000", maxHeight:220, objectFit:"contain", display:"block" }}
        />
      )}

      <div style={{ padding:"14px 14px 8px" }}>

        {/* Key frames filmstrip */}
        {videoUrl && frames && frames.setup && (
          <div style={{ borderRadius:12, border:"1px solid rgba(255,255,255,0.07)", overflow:"hidden", marginBottom:14 }}>
            <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:8, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(255,255,255,0.25)", padding:"8px 12px 6px", margin:0 }}>
              Key Frames · Pose Analysis
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", borderTop:"1px solid rgba(255,255,255,0.05)" }}>
              {[{key:"setup",label:"Setup"},{key:"top",label:"Top"},{key:"impact",label:"Impact"}].map(({key,label}) =>
                frames[key] ? (
                  <div key={key} style={{ borderRight:"1px solid rgba(255,255,255,0.05)" }}>
                    <img src={frames[key]} alt={label} style={{ width:"100%", aspectRatio:"9/16", objectFit:"cover", display:"block" }}/>
                    <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:8, fontWeight:700, textAlign:"center", color:"rgba(255,255,255,0.25)", padding:"5px 0", textTransform:"uppercase", letterSpacing:"0.1em", margin:0 }}>
                      {label}
                    </p>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
        {videoUrl && frames === null && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:"1px solid rgba(255,255,255,0.07)", marginBottom:14, background:"rgba(255,255,255,0.02)" }}>
            <div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid #4ade80", borderTopColor:"transparent", animation:"spin 0.8s linear infinite", flexShrink:0 }}/>
            <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.35)", fontFamily:"'Space Grotesk',sans-serif" }}>Analyzing movement frames…</span>
          </div>
        )}

        {/* ── Overall score ── */}
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16, padding:14, borderRadius:14, background:"rgba(255,255,255,0.025)", border:`1px solid ${color}22` }}>
          <ScoreCircle score={overall} size={84}/>
          <div style={{ flex:1 }}>
            <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(255,255,255,0.30)", margin:"0 0 4px" }}>
              Overall Score
            </p>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.60)", lineHeight:1.4, margin:"0 0 10px" }}>
              {overall >= 81 ? "Tour-level fundamentals."
               : overall >= 66 ? "Solid swing — fixable gaps remain."
               : overall >= 41 ? "Fundamentals developing. Keep grinding."
               : "Significant faults to address — every pro started here."}
            </p>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px", borderRadius:99, background: scoreBg(overall), border:`1px solid ${color}40` }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:color }}/>
              <span style={{ fontSize:10, fontWeight:700, color, fontFamily:"'Space Grotesk',sans-serif", letterSpacing:"0.04em" }}>
                {scoreLabel(overall)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Category bars ── */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"14px 14px 3px", marginBottom:14 }}>
          <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(255,255,255,0.30)", margin:"0 0 12px" }}>
            Breakdown
          </p>
          {Object.entries(CAT_LABELS).map(([key, label]) => {
            const cat = cats[key];
            if (!cat) return null;
            return <CategoryBar key={key} label={label} score={cat.score || 0} note={cat.note}/>;
          })}
        </div>

        {/* ── Primary fault ── */}
        {parsed.primaryFault && (
          <div style={{ border:"1px solid rgba(248,113,113,0.28)", background:"rgba(248,113,113,0.06)", borderRadius:14, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
              <span style={{ fontSize:15 }}>⚠️</span>
              <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"#f87171" }}>
                Fix This First
              </span>
            </div>
            <p style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,0.88)", lineHeight:1.45, margin:0 }}>
              {parsed.primaryFault}
            </p>
          </div>
        )}

        {/* ── Drill ── */}
        {parsed.drill && (
          <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
              <span style={{ fontSize:15 }}>🏌️</span>
              <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(255,255,255,0.35)" }}>
                Fix It Drill
              </span>
            </div>
            {typeof parsed.drill === "string" ? (
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.72)", lineHeight:1.6, margin:0 }}>{parsed.drill}</p>
            ) : (
              <ol style={{ margin:0, paddingLeft:0, listStyle:"none" }}>
                {parsed.drill.map((step, i) => (
                  <li key={i} style={{ display:"flex", gap:10, marginBottom:8 }}>
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:700, color:"#60a5fa", background:"rgba(96,165,250,0.12)", borderRadius:"50%", minWidth:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize:13, color:"rgba(255,255,255,0.72)", lineHeight:1.55 }}>{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* ── Positives ── */}
        {Array.isArray(parsed.positives) && parsed.positives.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(255,255,255,0.30)", margin:"0 0 8px" }}>
              What's Working
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {parsed.positives.map((pos, i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 12px", borderRadius:10, background:"rgba(74,222,128,0.05)", border:"1px solid rgba(74,222,128,0.14)" }}>
                  <span style={{ color:"#4ade80", fontWeight:700, fontSize:13, lineHeight:"1.45", flexShrink:0 }}>✓</span>
                  <span style={{ fontSize:13, color:"rgba(255,255,255,0.72)", lineHeight:1.45 }}>{pos}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Coaching summary ── */}
        {parsed.summary && (
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"12px 14px", marginBottom:4 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(255,255,255,0.30)", margin:0 }}>
                Obi's Take
              </p>
              {speakText && (
                <button
                  onClick={() => speaking ? (stopSpeak && stopSpeak()) : speakText(readText)}
                  style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color: speaking ? "#4ade80" : "rgba(255,255,255,0.30)", background:"none", border:"none", cursor:"pointer", padding:"2px 0" }}
                >
                  {speaking ? "⏹ Stop" : "🔊 Read"}
                </button>
              )}
            </div>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.65)", lineHeight:1.65, margin:0, fontStyle:"italic" }}>
              "{parsed.summary}"
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Main PracticeTab ────────────────────────────────────────────────────────
export default function PracticeTab({
  swingFile, setSwingFile,
  swingNotes, setSwingNotes,
  swingAnalysis, setSwingAnalysis,
  swingLoading,
  swingHistory, setSwingHistory,
  swingThumb, setSwingThumb,
  swingInputRef,
  handleSwingAnalyze,
  speaking, speakText, stopSpeak,
  supabase, fmtDateShort,
  renderSwingAnalysis,   // kept in signature — used by App.jsx elsewhere
  profile,
  // extra props App.jsx passes — accepted silently
  practiceSubTab, setPracticeSubTab,
  analysisExpanded, setAnalysisExpanded,
  expandedSwing, setExpandedSwing,
}) {
  const [expanded, setExpanded] = useState(null);

  // Build array of { label, parsed } for parsed swings (for comparison)
  const parsedSwings = swingHistory
    .map((s, i) => {
      const parsed = parseAnalysis(s.analysis || "");
      if (!parsed) return null;
      const label = s.club_used && s.club_used !== "unknown"
        ? s.club_used
        : `#${swingHistory.length - i}`;
      return { label, parsed };
    })
    .filter(Boolean);

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="px-4 pt-5 pb-3 shrink-0">
        <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Practice</p>
        <h1 className="display text-[24px] font-bold tracking-tight leading-tight mt-0.5">Swing Lab.</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 min-h-0 space-y-4">

        {/* ── Progress summary (shown when 2+ parsed swings exist) ── */}
        {parsedSwings.length >= 2 && !swingLoading && (
          <ProgressCard parsedSwings={parsedSwings} swingCount={swingHistory.length}/>
        )}

        {/* ── Upload CTA ── */}
        <button
          onClick={() => {
            setSwingAnalysis(""); setSwingNotes(""); setSwingFile(null); setSwingThumb(null);
            if (swingInputRef.current) { swingInputRef.current.value = ""; swingInputRef.current.click(); }
          }}
          className="w-full rounded-xl bg-foreground text-background p-4 flex items-center gap-3 hover:opacity-95 transition"
        >
          <div className="h-11 w-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Video className="h-5 w-5" strokeWidth={2.5}/>
          </div>
          <div className="text-left flex-1">
            <p className="display text-[15px] font-bold tracking-tight">Analyze a swing</p>
            <p className="text-[12px] opacity-60 mt-0.5">Upload video or photo — AI breakdown</p>
          </div>
          <svg className="h-5 w-5 shrink-0 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </button>

        <input
          ref={swingInputRef} type="file" accept="video/*,image/*" className="hidden"
          onChange={e => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            setSwingFile(f); setSwingThumb(null);
            if (f.type.startsWith("image/")) {
              setSwingThumb(URL.createObjectURL(f));
            } else if (f.type.startsWith("video/")) {
              const vid = document.createElement("video");
              vid.src = URL.createObjectURL(f); vid.currentTime = 0.5;
              vid.onloadeddata = function () {
                const cv = document.createElement("canvas");
                cv.width = 120; cv.height = 90;
                cv.getContext("2d").drawImage(vid, 0, 0, 120, 90);
                setSwingThumb(cv.toDataURL("image/jpeg", 0.7));
              };
            }
          }}
        />

        {/* ── Staged file ── */}
        {swingFile && !swingLoading && (
          <div className="rounded-xl border border-primary/40 bg-card overflow-hidden">
            <div className="flex items-center gap-3 p-3.5 border-b border-border">
              {swingThumb
                ? <img src={swingThumb} alt="swing" className="h-14 w-20 object-cover rounded-lg shrink-0"/>
                : <div className="h-14 w-20 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Video className="h-6 w-6 text-primary" strokeWidth={2}/></div>
              }
              <div className="min-w-0 flex-1">
                <p className="display text-[13px] font-bold truncate">{swingFile.name}</p>
                <p className="text-[11px] text-muted-foreground">{(swingFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button
                onClick={() => { setSwingFile(null); setSwingThumb(null); if (swingInputRef.current) swingInputRef.current.value = ""; }}
                className="text-muted-foreground hover:text-foreground shrink-0 p-1"
              >
                <X className="h-4 w-4" strokeWidth={2.5}/>
              </button>
            </div>
            <div className="p-3.5 space-y-3">
              <input
                type="text" placeholder="Club used (e.g. 7-iron, driver)…" value={swingNotes}
                onChange={e => setSwingNotes(e.target.value)}
                className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition"
              />
              <button
                onClick={handleSwingAnalyze}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 display text-[13px] font-bold uppercase tracking-wider hover:opacity-90 transition"
              >
                Analyze with Obi
              </button>
            </div>
          </div>
        )}

        {/* ── Analyzing spinner ── */}
        {swingLoading && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" style={{ animation:"spin 0.8s linear infinite" }}/>
            <p className="display text-[15px] font-bold">Analyzing your swing…</p>
            <p className="text-[12px] text-muted-foreground mt-1">Usually about 15 seconds</p>
          </div>
        )}

        {/* ── Comparison table (2+ parsed swings) ── */}
        {parsedSwings.length >= 2 && !swingLoading && (
          <ComparisonTable swings={parsedSwings}/>
        )}

        {/* ── Swing history ── */}
        {swingHistory.length > 0 && (
          <div>
            <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
              All swings ({swingHistory.length})
            </p>
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {swingHistory.map((s, i) => {
                const key     = s.id || ("idx-" + i);
                const isExp   = expanded === key;
                const thumb   = s.thumbnail || null;
                const label   = s.club_used && s.club_used !== "unknown"
                  ? s.club_used
                  : "Swing " + (swingHistory.length - i);
                const parsed  = parseAnalysis(s.analysis || "");
                const overall = parsed?.overall ?? null;

                // One-line preview text
                const preview = parsed?.summary
                  ? parsed.summary.slice(0, 88) + (parsed.summary.length > 88 ? "…" : "")
                  : (s.analysis || "").replace(/[*_#\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 88);

                return (
                  <div key={key}>

                    {/* ── List row ── */}
                    <div
                      className="flex items-center gap-3 px-3 py-3 cursor-pointer"
                      onClick={() => setExpanded(isExp ? null : key)}
                    >
                      {/* Thumbnail */}
                      <div className="shrink-0">
                        {thumb
                          ? <img src={thumb} alt="" className="h-14 w-[72px] object-cover rounded-lg"/>
                          : <div className="h-14 w-[72px] rounded-lg bg-secondary flex items-center justify-center">
                              <Video className="h-5 w-5 text-muted-foreground" strokeWidth={1.75}/>
                            </div>
                        }
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="display text-[13px] font-bold tracking-tight">{label}</p>
                        <p className="display text-[10px] font-bold text-muted-foreground mt-0.5">{fmtDateShort(s.created_at)}</p>
                        {!isExp && preview && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-snug">{preview}</p>
                        )}
                      </div>

                      {/* Score badge + action buttons */}
                      <div className="flex flex-col items-center gap-2 shrink-0 ml-1">
                        {overall != null && <ScoreBadge score={overall}/>}
                        <div className="flex gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); setExpanded(isExp ? null : key); }}
                            className={cn(
                              "display text-[9px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 border transition",
                              isExp
                                ? "bg-foreground text-background border-foreground"
                                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                            )}
                          >
                            {isExp ? "Close" : "View"}
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (!window.confirm("Delete this swing?")) return;
                              if (s.id) supabase.from("swing_analyses").delete().eq("id", s.id).then(() => {});
                              setSwingHistory(h => h.filter((_, j) => j !== i));
                              if (isExp) setExpanded(null);
                            }}
                            className="display text-[9px] font-bold uppercase tracking-wider rounded-lg px-2 py-1.5 border border-destructive/30 text-destructive hover:bg-destructive/10 transition"
                          >
                            <Trash2 className="h-3 w-3" strokeWidth={2.5}/>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ── Expanded analysis ── */}
                    {isExp && (
                      <div className="border-t border-border bg-card">
                        {parsed ? (
                          <SwingAnalysisView
                            parsed={parsed}
                            videoUrl={s.videoUrl || null}
                            frames={s.frames ?? undefined}
                            speaking={speaking}
                            speakText={speakText}
                            stopSpeak={stopSpeak}
                          />
                        ) : (
                          // Fallback for old plain-text entries
                          <div className="p-4">
                            <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
                              {s.analysis}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {swingHistory.length === 0 && !swingFile && !swingLoading && (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Video className="h-7 w-7 text-primary" strokeWidth={1.75}/>
            </div>
            <p className="display text-[15px] font-bold text-foreground">No swings yet</p>
            <p className="text-[12px] text-muted-foreground mt-1.5 leading-snug">
              Upload a video or photo and Obi will break down your swing
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
