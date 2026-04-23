import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";

// Fonts
const fontLink = document.createElement("link");
fontLink.rel  = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap";
if(!document.querySelector('link[href*="Space+Grotesk"]')) document.head.appendChild(fontLink);

// ── Design System ─────────────────────────────────────────────────
// Accent: clean golf-flag green used sparingly as an action color only
// Base: near-black / near-white with warm neutral cards
const DARK_THEME = {
  bg:       "#0c0c0f",      // near black with cool tint
  dark:     "#111116",      // top bar / nav
  surface:  "#18181f",      // inputs, secondary surfaces
  card:     "#1e1e27",      // cards
  cardHov:  "#232330",      // card hover
  border:   "#2a2a38",      // subtle borders
  accent:   "#34d399",      // emerald — used SPARINGLY for CTAs only
  accentDim:"#064e3b",      // accent background tint
  gold:     "#f59e0b",      // scores, highlights
  goldDim:  "#451a03",      // gold tint bg
  white:    "#f1f5f9",      // primary text
  text:     "#e2e8f0",      // body text
  muted:    "#64748b",      // secondary text
  subtle:   "#334155",      // tertiary / placeholders
  red:      "#f87171",      // errors, negative scores
  blue:     "#818cf8",      // neutral info
  isDark:   true,
};
const LIGHT_THEME = {
  bg:       "#fafafa",
  dark:     "#ffffff",
  surface:  "#f4f4f8",
  card:     "#ffffff",
  cardHov:  "#f8f8fc",
  border:   "#e2e4ea",
  accent:   "#059669",      // darker emerald for light bg readability
  accentDim:"#d1fae5",
  gold:     "#d97706",
  goldDim:  "#fef3c7",
  white:    "#0f172a",
  text:     "#1e293b",
  muted:    "#64748b",
  subtle:   "#94a3b8",
  red:      "#dc2626",
  blue:     "#4f46e5",
  isDark:   false,
};

function Ball({ size=32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="46" fill="#f59e0b"/>
      <circle cx="50" cy="50" r="46" fill="url(#ballGrad)"/>
      <ellipse cx="38" cy="34" rx="12" ry="7" fill="#fde68a" opacity="0.85" transform="rotate(-35 38 34)"/>
      <circle cx="36" cy="54" r="4" fill="#1a1a1a" opacity="0.2"/>
      <circle cx="50" cy="47" r="4" fill="#1a1a1a" opacity="0.2"/>
      <circle cx="64" cy="54" r="4" fill="#1a1a1a" opacity="0.2"/>
      <circle cx="43" cy="64" r="4" fill="#1a1a1a" opacity="0.2"/>
      <circle cx="57" cy="64" r="4" fill="#1a1a1a" opacity="0.2"/>
      <circle cx="50" cy="74" r="4" fill="#1a1a1a" opacity="0.2"/>
      <defs><radialGradient id="ballGrad" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#fffbeb" stopOpacity="0.4"/><stop offset="100%" stopColor="#92400e" stopOpacity="0.25"/></radialGradient></defs>
    </svg>
  );
}

function Avatar({ name, size=40, highlight=false, photoUrl=null, onClick=null, T=DARK_THEME }) {
  const ini = (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const gradients = [
    "linear-gradient(135deg,#6366f1,#8b5cf6)",
    "linear-gradient(135deg,#0ea5e9,#6366f1)",
    "linear-gradient(135deg,#f59e0b,#ef4444)",
    "linear-gradient(135deg,#10b981,#0ea5e9)",
    "linear-gradient(135deg,#f43f5e,#8b5cf6)",
    "linear-gradient(135deg,#f59e0b,#10b981)",
  ];
  const grad = gradients[(name||"?").charCodeAt(0)%gradients.length];
  return (
    <div onClick={onClick} style={{ width:size,height:size,borderRadius:"50%",overflow:"hidden",border:`2px solid ${highlight?T.accent:T.border}`,flexShrink:0,cursor:onClick?"pointer":"default",background:grad,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:highlight?`0 0 0 3px ${T.accentDim}`:"none" }}>
      {photoUrl
        ? <img src={photoUrl} alt={name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        : <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:size*0.36,color:"#fff",fontWeight:"700",letterSpacing:"-0.5px"}}>{ini}</span>
      }
    </div>
  );
}

function ScorePill({ score, par, large=false }) {
  if (!score||!par) return null;
  const d = score-par;
  const configs = {
    "-2": { label:"Eagle",  color:"#f59e0b", bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.3)" },
    "-1": { label:"Birdie", color:"#10b981", bg:"rgba(16,185,129,0.12)", border:"rgba(16,185,129,0.3)" },
     "0": { label:"Par",    color:"#818cf8", bg:"rgba(129,140,248,0.12)", border:"rgba(129,140,248,0.3)" },
     "1": { label:"Bogey",  color:"#f87171", bg:"rgba(248,113,113,0.12)", border:"rgba(248,113,113,0.3)" },
  };
  const cfg = configs[String(Math.max(-2,Math.min(1,d)))]||{ label:`+${d}`, color:"#f87171", bg:"rgba(248,113,113,0.12)", border:"rgba(248,113,113,0.3)" };
  return (
    <div style={{ display:"inline-flex",alignItems:"center",gap:"4px",background:cfg.bg,borderRadius:"99px",padding:large?"6px 14px":"3px 10px",border:`1px solid ${cfg.border}` }}>
      <span style={{ color:cfg.color,fontSize:large?"12px":"10px",fontWeight:"500",fontFamily:"'Inter',sans-serif",opacity:0.8 }}>{cfg.label}</span>
      <span style={{ color:cfg.color,fontSize:large?"16px":"13px",fontFamily:"'Space Grotesk',sans-serif",fontWeight:"700" }}>{d>0?`+${d}`:d===0?"E":d}</span>
    </div>
  );
}

const HANDICAPS=[{label:"Beginner",sub:"30+",value:"beginner",hcp:36},{label:"High",sub:"18-29",value:"high",hcp:24},{label:"Mid",sub:"9-17",value:"mid",hcp:13},{label:"Low",sub:"0-8",value:"low",hcp:4}];
const PERSONAS=[{id:"pro",icon:"🏆",label:"Tour Pro",desc:"Calm. Clinical. Precise."},{id:"coach",icon:"🎯",label:"The Coach",desc:"Encouraging & confidence-building."},{id:"oldschool",icon:"🚬",label:"Old School",desc:"Gritty, direct, zero fluff."}];
const DEFAULT_BAG=[{club:"Driver",carry:230},{club:"3-Wood",carry:210},{club:"5-Wood",carry:195},{club:"4-Iron",carry:180},{club:"5-Iron",carry:170},{club:"6-Iron",carry:160},{club:"7-Iron",carry:150},{club:"8-Iron",carry:140},{club:"9-Iron",carry:130},{club:"PW",carry:120},{club:"GW",carry:105},{club:"SW",carry:90},{club:"LW",carry:70}];
const QUICK_PROMPTS=[{label:"🏌 Club?",prompt:"What club should I hit from here?"},{label:"🗺 Hole plan",prompt:"Walk me through the strategy for this hole."},{label:"🌿 In rough",prompt:"My ball is sitting down in the rough. What's my play?"},{label:"💨 Wind",prompt:"How is this wind affecting my shot and what should I adjust?"},{label:"⚖️ Lay up?",prompt:"Should I lay up or go for it? Give me the risk/reward breakdown."},{label:"🏖 Bunker",prompt:"I'm in a greenside bunker. Talk me through the shot."},{label:"🎯 Putting",prompt:"Give me a putting read and routine for this green."},{label:"🔄 Reset",prompt:"I just mishit badly. Help me reset mentally for the next shot."}];
const JABS=["That's why you pay for the caddie 😂","Course management called… 💀","Bold strategy. Very bold. 😅","Obi is disappointed in you 🙏","The rough misses you already 🌿","Scratch player energy… not 😂","That one hurt to watch 😬","Back to the range with you 🏌"];

const windDir=d=>["N","NE","E","SE","S","SW","W","NW"][Math.round(d/45)%8];
const wxIcon=c=>!c&&c!==0?"🌤":c===0?"☀️":c<=3?"⛅":c<=48?"🌫":c<=67?"🌧":c<=77?"🌨":"⛈";
const randJab=()=>JABS[Math.floor(Math.random()*JABS.length)];
function playingYards(y,elev,ws,wd){return Math.round((y+elev/10)+Math.cos(wd*Math.PI/180)*ws*0.7);}
function fmtDate(d){return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});}
function fmtDateShort(d){return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"});}

async function callGemini(sys,msgs){
  const contents=[{role:"user",parts:[{text:"Caddie instructions: "+sys}]},{role:"model",parts:[{text:"Got it. Ready to caddie."}]},...msgs.map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}))];
  const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents})});
  const data=await res.json();
  if(data.error)throw new Error(typeof data.error==="string"?data.error:data.error.message||"API error");
  return data.candidates?.[0]?.content?.parts?.[0]?.text||"No response from Obi.";
}

async function analyzeSwing(b64,mime,notes,bag,hcp){
  const goalLabels={full_swing:"full swing mechanics",driver:"driver swing",irons:"iron play",short_game:"short game (chips/pitches)",bunker:"bunker play",putting:"putting stroke",tempo:"tempo and rhythm",custom:"the specific area mentioned in notes"};
  const goalFocus=goalLabels[notes?.split("GOAL:")[1]?.trim()]||"overall swing mechanics";
  const cleanNotes=notes?.replace(/GOAL:[^\n]*/,"").trim()||"none";
  const contents=[{role:"user",parts:[{inline_data:{mime_type:mime,data:b64}},{text:`You are an expert PGA teaching professional. Player HCP: ${hcp}. The player wants to focus specifically on: ${goalFocus}. Additional notes: ${cleanNotes}.\nAnalyze this golf swing with a focus on ${goalFocus}. Cover: Setup & Address, Backswing, Downswing & Transition, Impact, Follow Through.\nThen give: PRIMARY FAULT related to ${goalFocus} (the one thing to fix first), DRILL (specific step-by-step drill to fix it), POSITIVES (what they do well).\nBe encouraging, specific, and visual. Write like a great teaching pro talking directly to their student.`}]}];
  const res=await fetch("/api/swing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents})});
  const data=await res.json();
  if(data.error)throw new Error(typeof data.error==="string"?data.error:data.error.message||"Analysis failed");
  return data.candidates?.[0]?.content?.parts?.[0]?.text||"Could not analyze swing.";
}

async function analyzeSwingVideo(videoFile, notes, bag, hcp) {
  const apiKey = await fetch("/api/gemini-key").then(r=>r.json()).then(d=>d.key).catch(()=>null);
  if (!apiKey) throw new Error("Could not get API key");

  const promptText = `You are an expert PGA teaching professional analyzing a full golf swing video. Player HCP: ${hcp}. Notes: ${notes||"none"}.
Watch the FULL swing motion in this video and analyze: Setup & Address, Backswing, Downswing & Transition, Impact position, Follow Through & Finish.
Then give: PRIMARY FAULT (the single most important thing to fix), DRILL (specific step-by-step drill to fix it), POSITIVES (1-2 things they do well).
Be specific about what you see in the VIDEO MOTION - mention timing, sequencing, speed. Write like a great teaching pro talking to their student.`;

  // Step 1 - Upload video to Google File API directly from browser
  const uploadRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": videoFile.size,
        "X-Goog-Upload-Header-Content-Type": videoFile.type,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: "golf_swing" } }),
    }
  );

  const uploadUrl = uploadRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Could not start video upload");

  // Step 2 - Upload video bytes
  const finalRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0",
      "Content-Type": videoFile.type,
    },
    body: videoFile,
  });

  const fileData = await finalRes.json();
  const fileUri = fileData?.file?.uri;
  const fileName = fileData?.file?.name;
  if (!fileUri) throw new Error("Video upload failed - try a shorter clip");

  // Step 3 - Wait for processing
  let ready = false;
  let attempts = 0;
  while (!ready && attempts < 15) {
    await new Promise(r => setTimeout(r, 2000));
    const check = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
    ).then(r => r.json());
    if (check?.state === "ACTIVE" || check?.file?.state === "ACTIVE") ready = true;
    attempts++;
  }
  if (!ready) throw new Error("Video processing timed out - try a clip under 30 seconds");

  // Step 4 - Analyze with Gemini
  const analyzeRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { file_data: { mime_type: videoFile.type, file_uri: fileUri } },
            { text: promptText }
          ]
        }],
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.7,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  const result = await analyzeRes.json();
  if (result.error) throw new Error(result.error.message || "Analysis failed");
  return result.candidates?.[0]?.content?.parts?.[0]?.text || "Could not analyze swing.";
}

// S is a static style baseline using DARK_THEME defaults.
// Inside the component, override per-property with the live D theme token where needed.
const S={
  input:{background:DARK_THEME.surface,border:`1.5px solid ${DARK_THEME.border}`,borderRadius:"12px",color:DARK_THEME.text,fontSize:"15px",padding:"13px 16px",outline:"none",fontFamily:"'Inter',sans-serif",width:"100%",boxSizing:"border-box"},
  btnPrimary:{background:`linear-gradient(135deg,#22c55e,#16a34a)`,border:"none",borderRadius:"14px",color:"#fff",fontSize:"16px",padding:"15px",cursor:"pointer",fontWeight:"600",fontFamily:"'Inter',sans-serif",width:"100%",boxShadow:`0 4px 20px ${DARK_THEME.accent}44`},
  btnSecondary:{background:DARK_THEME.surface,border:`1.5px solid ${DARK_THEME.border}`,borderRadius:"14px",color:DARK_THEME.text,fontSize:"15px",padding:"13px",cursor:"pointer",fontWeight:"500",fontFamily:"'Inter',sans-serif",width:"100%"},
  btnGhost:{background:"transparent",border:"none",color:DARK_THEME.muted,fontSize:"14px",padding:"10px",cursor:"pointer",fontFamily:"'Inter',sans-serif",width:"100%"},
  card:{background:DARK_THEME.card,border:`1px solid ${DARK_THEME.border}`,borderRadius:"18px",padding:"18px",boxShadow:"0 2px 20px rgba(0,0,0,0.3)"},
  pill:{background:DARK_THEME.surface,border:`1px solid ${DARK_THEME.border}`,borderRadius:"99px",padding:"5px 12px",fontSize:"12px",color:DARK_THEME.muted,fontFamily:"'Inter',sans-serif",cursor:"pointer",whiteSpace:"nowrap"},
};

// ── Light theme tokens ───────────────────────────────────────────
const LIGHT = {
  black:"#f0f7f0", dark:"#e8f4e8", surface:"#ffffff", card:"#f4fbf4",
  border:"#c8e0c0", green:"#16a34a", greenLt:"#22c55e", greenDim:"#dcfce7",
  gold:"#d97706", goldLt:"#fef3c7", white:"#111827", text:"#1a3020",
  muted:"#4a7a55", subtle:"#6b9e7a", red:"#dc2626", blue:"#2563eb",
};
const DARK = {
  black:"#080a08", dark:"#0e150e", surface:"#141f14", card:"#1a2a1a",
  border:"#243524", green:"#22c55e", greenLt:"#4ade80", greenDim:"#14532d",
  gold:"#f5c518", goldLt:"#fde68a", white:"#f8fafc", text:"#e8f5e9",
  muted:"#4a7a55", subtle:"#2d4a35", red:"#f87171", blue:"#60a5fa",
};


// ── Multi-Step Onboarding Component ──────────────────────────────
function OnboardingFlow({ D, S, profile, setProfile, authName, setAuthName, onComplete }) {
  const [step, setStep] = useState(0);
  const [localName, setLocalName] = useState(authName || "");
  const [homeCourse, setHomeCourse] = useState("");
  const [ageRange, setAgeRange] = useState("");

  const steps = [
    { id: "name",      title: "What's your name?",           sub: "Obi will use this every time you play" },
    { id: "dexterity", title: "How do you swing?",           sub: "Obi tailors all advice to your swing side" },
    { id: "handicap",  title: "What's your level?",          sub: "Helps Obi calibrate strategy and advice" },
    { id: "age",       title: "What's your age range?",      sub: "Optional — helps personalize coaching style" },
    { id: "course",    title: "Do you have a home course?",  sub: "Optional — Obi will know it well" },
    { id: "persona",   title: "Choose your caddie style",    sub: "You can always change this in Settings" },
  ];

  const current = steps[step];
  const progress = ((step) / steps.length) * 100;

  const next = () => {
    // Save data at each step
    if (step === 0) setAuthName(localName);
    if (step === 3) setProfile(p => ({ ...p, ageRange }));
    if (step === 4) setProfile(p => ({ ...p, homeCourse }));

    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      // Final step — save everything and complete
      setAuthName(localName);
      setProfile(p => ({ ...p, homeCourse, ageRange }));
      setTimeout(() => onComplete(), 50);
    }
  };

  const skip = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else onComplete();
  };

  const canNext = () => {
    if (current.id === "name") return localName.trim().length > 0;
    return true;
  };

  return (
    <div style={{ animation: "fadeUp 0.4s both" }}>
      {/* Progress bar */}
      <div style={{ height: "3px", background: D.border, borderRadius: "2px", marginBottom: "28px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${D.green}, ${D.accent})`, borderRadius: "2px", transition: "width 0.4s ease" }}/>
      </div>

      {/* Step indicator */}
      <div style={{ fontSize: "11px", color: D.muted, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px", textAlign: "center" }}>
        Step {step + 1} of {steps.length}
      </div>

      <div style={{ ...S.card, marginBottom: "16px" }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "22px", fontWeight: "700", color: D.white, marginBottom: "6px" }}>{current.title}</div>
        <div style={{ color: D.muted, fontSize: "14px", marginBottom: "20px" }}>{current.sub}</div>

        {/* STEP 0 — Name */}
        {current.id === "name" && (
          <div>
            <input
              autoFocus
              placeholder="Your first name"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && canNext() && next()}
              style={{ ...S.input, fontSize: "18px", fontWeight: "600" }}
            />
          </div>
        )}

        {/* STEP 1 — Dexterity */}
        {current.id === "dexterity" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { v: "right", label: "Right Handed", icon: "🏌️", desc: "Standard swing" },
              { v: "left",  label: "Left Handed",  icon: "🏌️‍♂️", desc: "Mirror swing" },
            ].map(dx => (
              <button key={dx.v} onClick={() => { setProfile(p => ({ ...p, dexterity: dx.v })); }}
                style={{ background: profile.dexterity === dx.v ? D.accentDim : D.surface, border: `2px solid ${profile.dexterity === dx.v ? D.green : D.border}`, borderRadius: "14px", padding: "20px 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", transition: "all 0.2s" }}>
                <span style={{ fontSize: "36px" }}>{dx.icon}</span>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: "700", fontSize: "14px", color: profile.dexterity === dx.v ? D.accent : D.text }}>{dx.label}</span>
                <span style={{ fontSize: "11px", color: D.muted }}>{dx.desc}</span>
                {profile.dexterity === dx.v && <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: D.green, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px" }}>✓</div>}
              </button>
            ))}
          </div>
        )}

        {/* STEP 2 — Handicap */}
        {current.id === "handicap" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { label: "Beginner", sub: "30+",   value: "beginner", hcp: 36, icon: "🌱", desc: "Just starting out" },
              { label: "High",     sub: "18–29", value: "high",     hcp: 24, icon: "📈", desc: "Building consistency" },
              { label: "Mid",      sub: "9–17",  value: "mid",      hcp: 13, icon: "⛳", desc: "Breaking 90" },
              { label: "Low",      sub: "0–8",   value: "low",      hcp: 4,  icon: "🏆", desc: "Scratch territory" },
            ].map(h => (
              <button key={h.value} onClick={() => setProfile(p => ({ ...p, handicap: h.value, hcp: h.hcp }))}
                style={{ background: profile.handicap === h.value ? D.accentDim : D.surface, border: `2px solid ${profile.handicap === h.value ? D.green : D.border}`, borderRadius: "14px", padding: "16px 10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", transition: "all 0.2s" }}>
                <span style={{ fontSize: "28px" }}>{h.icon}</span>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: "700", fontSize: "15px", color: profile.handicap === h.value ? D.accent : D.text }}>{h.label}</span>
                <span style={{ fontSize: "11px", color: D.muted }}>HCP {h.sub}</span>
                <span style={{ fontSize: "11px", color: D.subtle }}>{h.desc}</span>
                {profile.handicap === h.value && <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: D.green, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", marginTop: "4px" }}>✓</div>}
              </button>
            ))}
          </div>
        )}

        {/* STEP 3 — Age range */}
        {current.id === "age" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { v: "under25", label: "Under 25", icon: "🔥" },
              { v: "25-40",   label: "25 – 40",  icon: "💪" },
              { v: "40-55",   label: "40 – 55",  icon: "⛳" },
              { v: "55plus",  label: "55+",       icon: "🏆" },
            ].map(a => (
              <button key={a.v} onClick={() => setAgeRange(a.v)}
                style={{ background: ageRange === a.v ? D.accentDim : D.surface, border: `2px solid ${ageRange === a.v ? D.green : D.border}`, borderRadius: "14px", padding: "16px 10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", transition: "all 0.2s" }}>
                <span style={{ fontSize: "28px" }}>{a.icon}</span>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: "700", fontSize: "14px", color: ageRange === a.v ? D.accent : D.text }}>{a.label}</span>
                {ageRange === a.v && <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: D.green, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px" }}>✓</div>}
              </button>
            ))}
          </div>
        )}

        {/* STEP 4 — Home course */}
        {current.id === "course" && (
          <div>
            <input
              placeholder="e.g. Pebble Beach, Augusta National, my local muni..."
              value={homeCourse}
              onChange={e => setHomeCourse(e.target.value)}
              style={{ ...S.input, marginBottom: "8px" }}
            />
            <div style={{ fontSize: "12px", color: D.muted, lineHeight: 1.5 }}>
              Obi will know your home course layout, typical conditions, and key holes to watch out for.
            </div>
          </div>
        )}

        {/* STEP 5 — Persona */}
        {current.id === "persona" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { id: "pro",       icon: "🏆", label: "Tour Pro",   desc: "Calm, clinical, Tour-level precision. Speaks with quiet authority." },
              { id: "coach",     icon: "🎯", label: "The Coach",  desc: "Encouraging, warm, confidence-building. Keeps you positive." },
              { id: "oldschool", icon: "🚬", label: "Old School", desc: "Gritty, direct, zero fluff. Old-school caddie energy." },
            ].map(p => (
              <button key={p.id} onClick={() => setProfile(prev => ({ ...prev, persona: p.id }))}
                style={{ display: "flex", alignItems: "center", gap: "14px", width: "100%", background: profile.persona === p.id ? D.accentDim : D.surface, border: `2px solid ${profile.persona === p.id ? D.green : D.border}`, borderRadius: "14px", padding: "16px", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                <span style={{ fontSize: "28px" }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", color: D.white, fontSize: "16px" }}>{p.label}</div>
                  <div style={{ fontSize: "12px", color: D.muted, marginTop: "3px", lineHeight: 1.4 }}>{p.desc}</div>
                </div>
                {profile.persona === p.id && <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: D.green, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", flexShrink: 0 }}>✓</div>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <button onClick={next} disabled={!canNext()} style={{ ...S.btnPrimary, opacity: canNext() ? 1 : 0.4, marginBottom: "10px" }}>
        {step === steps.length - 1 ? "Let's Play Golf 🏌️" : step === steps.length - 2 ? "Almost there →" : "Next →"}
      </button>
      {step > 0 && current.id !== "name" && (
        <button onClick={skip} style={{ ...S.btnGhost }}>Skip for now</button>
      )}
      {step > 0 && (
        <button onClick={() => setStep(s => s - 1)} style={{ ...S.btnGhost, marginTop: "2px" }}>← Back</button>
      )}
    </div>
  );
}

export default function ObiGolf(){
  const [darkMode,setDarkMode]=useState(()=>localStorage.getItem("obi_dark")!=="false");
  const D = darkMode ? DARK_THEME : LIGHT_THEME;

  // Shared styles — theme-reactive
  const S={
    input:{background:D.surface,border:`1.5px solid ${D.border}`,borderRadius:"12px",color:D.text,fontSize:"15px",padding:"13px 16px",outline:"none",fontFamily:"'Inter',sans-serif",width:"100%",boxSizing:"border-box",transition:"border-color 0.2s"},
    btnPrimary:{background:D.accent,border:"none",borderRadius:"12px",color:"#fff",fontSize:"15px",padding:"14px",cursor:"pointer",fontWeight:"600",fontFamily:"'Inter',sans-serif",width:"100%",letterSpacing:"-0.2px"},
    btnSecondary:{background:D.surface,border:`1.5px solid ${D.border}`,borderRadius:"12px",color:D.text,fontSize:"15px",padding:"13px",cursor:"pointer",fontWeight:"500",fontFamily:"'Inter',sans-serif",width:"100%"},
    btnGhost:{background:"transparent",border:"none",color:D.muted,fontSize:"14px",padding:"10px",cursor:"pointer",fontFamily:"'Inter',sans-serif",width:"100%"},
    card:{background:D.card,border:`1px solid ${D.border}`,borderRadius:"16px",padding:"16px",boxShadow:darkMode?"0 1px 3px rgba(0,0,0,0.4)":"0 1px 3px rgba(0,0,0,0.07),0 4px 16px rgba(0,0,0,0.04)"},
    pill:{background:D.surface,border:`1px solid ${D.border}`,borderRadius:"99px",padding:"5px 12px",fontSize:"12px",color:D.muted,fontFamily:"'Inter',sans-serif",cursor:"pointer",whiteSpace:"nowrap"},
  };

  const [user,setUser]=useState(null);
  const [userProfile,setUserProfile]=useState(null);
  const [authScreen,setAuthScreen]=useState("login");
  const [authLoading,setAuthLoading]=useState(true);
  const [authEmail,setAuthEmail]=useState("");
  const [authPass,setAuthPass]=useState("");
  const [authName,setAuthName]=useState("");
  const [authError,setAuthError]=useState("");
  const [tab,setTab]=useState("caddie");
  const [subView,setSubView]=useState("chat");
  const [avatarUrl,setAvatarUrl]=useState(null);
  const [uploadingAvatar,setUploadingAvatar]=useState(false);
  const [showAvatarZoom,setShowAvatarZoom]=useState(null);
  const avatarInputRef=useRef(null);
  const [profile,setProfile]=useState({handicap:"mid",hcp:13,persona:"pro",missTend:"straight",bag:DEFAULT_BAG,dexterity:"right",ageRange:"",homeCourse:""});
  const [onboardStep,setOnboardStep]=useState(0);
  const [editingBag,setEditingBag]=useState(false);
  const [course,setCourse]=useState("");
  const [courseInput,setCourseInput]=useState("");
  const [hole,setHole]=useState(1);
  const [holePars,setHolePars]=useState(Array(18).fill(4));
  const [scores,setScores]=useState(Array(18).fill(null));
  const [yardage,setYardage]=useState("");
  const [elevation,setElevation]=useState(0);
  const [lie,setLie]=useState("fairway");
  const [shotHistory,setShotHistory]=useState([]);
  const [showCard,setShowCard]=useState(null);
  const [weather,setWeather]=useState(null);
  const [wxLoading,setWxLoading]=useState(false);
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [speaking,setSpeaking]=useState(false);
  const [listening,setListening]=useState(false);
  const chatRef=useRef(null);
  const [swingFile,setSwingFile]=useState(null);
  const [swingNotes,setSwingNotes]=useState("");
  const [swingAnalysis,setSwingAnalysis]=useState("");
  const [swingLoading,setSwingLoading]=useState(false);
  const [swingHistory,setSwingHistory]=useState([]);
  const [selectedSwing,setSelectedSwing]=useState(null);
  const fileRef=useRef(null);

  // Range Mode state
  const [practiceSubTab,setPracticeSubTab]=useState("swinglab"); // swinglab | range
  const [rangeClub,setRangeClub]=useState("7-Iron");
  const [rangeFile,setRangeFile]=useState(null);
  const [rangeLoading,setRangeLoading]=useState(false);
  const [rangeShotResult,setRangeShotResult]=useState(null);
  const [rangeHistory,setRangeHistory]=useState([]);
  const [clubStats,setClubStats]=useState({});
  const [showClubProfile,setShowClubProfile]=useState(null);
  const [isRecording,setIsRecording]=useState(false);
  const [mediaRecorder,setMediaRecorder]=useState(null);
  const rangeFileRef=useRef(null);
  const rangeVideoRef=useRef(null);
  const [friends,setFriends]=useState([]);
  const [friendReqs,setFriendReqs]=useState([]);
  const [feed,setFeed]=useState([]);
  const [leaderboard,setLeaderboard]=useState([]);
  const [roundHistory,setRoundHistory]=useState([]);
  const [socialTab,setSocialTab]=useState("feed");
  const [searchQ,setSearchQ]=useState("");
  const [searchRes,setSearchRes]=useState([]);
  const [jabPost,setJabPost]=useState(null);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user??null);setAuthLoading(false);
      if(session?.user)loadProfile(session.user.id);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>{
      setUser(session?.user??null);
      if(session?.user)loadProfile(session.user.id);
    });
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[messages,loading]);

  // Persist dark mode
  useEffect(()=>{ localStorage.setItem("obi_dark", darkMode); },[darkMode]);

  // Helper to get first name
  const firstName = (name) => (name||"").split(" ")[0] || "there";

  async function loadProfile(uid){
    const {data}=await supabase.from("profiles").select("*").eq("id",uid).single();
    if(data){
      setUserProfile(data);
      if(data.avatar_url) setAvatarUrl(data.avatar_url);
      setProfile(p=>({...p,handicap:data.handicap_category||"mid",hcp:data.handicap_index||13,persona:data.caddie_persona||"pro",missTend:data.miss_tendency||"straight",bag:data.bag_distances||DEFAULT_BAG,dexterity:data.dexterity||"right",ageRange:data.age_range||"",homeCourse:data.home_course||""}));
      loadSocial(uid);loadRounds(uid);loadSwings(uid);loadRangeHistory(uid);
    } else setAuthScreen("onboard");
  }

  async function saveProfile(){
    if(!user)return;
    const nameInput = document.getElementById("profile-name-input");
    const newName = nameInput?.value?.trim() || authName || userProfile?.full_name || "";
    await supabase.from("profiles").upsert({id:user.id,email:user.email,full_name:newName,handicap_category:profile.handicap,handicap_index:profile.hcp,caddie_persona:profile.persona,miss_tendency:profile.missTend,bag_distances:profile.bag,avatar_url:avatarUrl||userProfile?.avatar_url||null,dexterity:profile.dexterity||"right",age_range:profile.ageRange||"",home_course:profile.homeCourse||"",updated_at:new Date().toISOString()});
    loadProfile(user.id);setTab("caddie");
  }

  async function uploadAvatar(file){
    if(!user||!file)return;
    setUploadingAvatar(true);
    try{
      // Convert to base64 data URL and store directly in profile
      const reader=new FileReader();
      reader.onload=(e)=>{
        const dataUrl=e.target.result;
        setAvatarUrl(dataUrl);
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    }catch(err){
      console.error("Avatar upload failed:",err);
      setUploadingAvatar(false);
    }
  }

  async function handleLogin(){setAuthError("");setAuthLoading(true);const{error}=await supabase.auth.signInWithPassword({email:authEmail,password:authPass});if(error)setAuthError(error.message);setAuthLoading(false);}
  async function handleSignup(){setAuthError("");setAuthLoading(true);const{error}=await supabase.auth.signUp({email:authEmail,password:authPass});if(error)setAuthError(error.message);else setAuthScreen("onboard");setAuthLoading(false);}
  async function handleGoogle(){await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});}
  async function handleLogout(){await supabase.auth.signOut();setUser(null);setUserProfile(null);}

  const fetchWeather=useCallback(async()=>{
    setWxLoading(true);
    try{
      const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:8000}));
      const{latitude:lat,longitude:lon}=pos.coords;
      const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,relative_humidity_2m&wind_speed_unit=mph&temperature_unit=fahrenheit`);
      const d=await r.json();const c=d.current;
      setWeather({temp:Math.round(c.temperature_2m),wind:Math.round(c.wind_speed_10m),windDeg:c.wind_direction_10m,humidity:c.relative_humidity_2m,code:c.weather_code});
    }catch{setWeather({temp:72,wind:8,windDeg:225,humidity:55,code:1});}
    setWxLoading(false);
  },[]);

  useEffect(()=>{if(user)fetchWeather();},[user]);

  const speak=(text)=>{
    if(!window.speechSynthesis)return;
    window.speechSynthesis.cancel();
    const utt=new SpeechSynthesisUtterance(text.replace(/[*_#`]/g,""));
    utt.rate=0.93;utt.pitch=1.0;utt.volume=1.0;
    utt.onstart=()=>setSpeaking(true);utt.onend=()=>setSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  const startListening=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Voice input needs Chrome or Safari.");return;}
    const rec=new SR();rec.lang="en-US";rec.interimResults=false;
    rec.onstart=()=>setListening(true);rec.onend=()=>setListening(false);
    rec.onresult=(e)=>sendMessage(e.results[0][0].transcript);
    rec.onerror=()=>setListening(false);rec.start();
  };

  const buildSystem=()=>{
    const pm={pro:"You are a calm, precise Tour-level golf caddie named Obi. Quiet authority. Always complete your sentences. 2-3 sentences per response.",coach:"You are an encouraging golf coach-caddie named Obi. Warm, confidence-building. Always complete sentences. 2-3 sentences.",oldschool:"You are a gritty old-school caddie named Obi. Straight talk. Always complete sentences. Short and real."};
    const bagStr=profile.bag.map(b=>`${b.club}:${b.carry}y`).join(", ");
    const wx=weather?`Wind ${weather.wind}mph from ${windDir(weather.windDeg)}. Temp ${weather.temp}F.`:"Weather unavailable.";
    const py=yardage?playingYards(parseInt(yardage),elevation,weather?.wind||0,weather?.windDeg||0):null;
    const name=firstName(userProfile?.full_name);
    const handed=profile.dexterity==="left"?"left-handed":"right-handed";
    return `${pm[profile.persona]}\nPLAYER: Name is ${name}. ALWAYS address them by first name. ${handed} golfer. HCP ${profile.hcp} (${profile.handicap}). Miss: ${profile.missTend}. Home course: ${profile.homeCourse||"unknown"}.\nBAG: ${bagStr}\nHOLE: ${course||"unknown"}, Hole ${hole}, Par ${holePars[hole-1]}\nYARDAGE: ${yardage?`${yardage}y actual, ~${py}y playing`:"not set"}. Lie: ${lie}. Elevation: ${elevation}ft.\nCONDITIONS: ${wx}\nRECENT: ${shotHistory.slice(-3).map(s=>`H${s.hole}: ${s.outcome}`).join(". ")||"none"}\nRULES: Only clubs from bag. Be specific. No markdown. No bullet points. Always finish sentences. ALWAYS use ${name}'s first name naturally. Tailor all advice to a ${handed} player.`;
  };

  const sendMessage=async(override)=>{
    const text=(override!==undefined?override:input).trim();
    if(!text||loading)return;
    setInput("");
    const userMsg={role:"user",content:text};
    const newMsgs=[...messages,userMsg];
    setMessages(newMsgs);setLoading(true);
    try{
      const reply=await callGemini(buildSystem(),newMsgs);
      setMessages(prev=>[...prev,{role:"assistant",content:reply}]);
      speak(reply);
      if(["pulled","pushed","chunked","topped","shanked","flushed","rough","bunker"].some(w=>text.toLowerCase().includes(w)))
        setShotHistory(prev=>[...prev,{hole,outcome:text}]);
    }catch(e){
      const msg=e.message?.includes("quota")||e.message?.includes("429")?"API quota hit — wait a minute.":"Connection issue. Try again.";
      setMessages(prev=>[...prev,{role:"assistant",content:msg}]);
    }
    setLoading(false);
  };

  async function saveRound(){
    if(!user)return;
    const pl=scores.filter(Boolean).length;
    if(pl===0){alert("No scores entered yet.");return;}
    const tot=scores.reduce((a,b)=>a+(b||0),0);
    const par=holePars.slice(0,pl).reduce((a,b)=>a+b,0);
    const{data}=await supabase.from("rounds").insert({user_id:user.id,course_name:course||"Unknown Course",total_score:tot,total_par:par,holes_played:pl,scores,hole_pars:holePars,weather_conditions:weather,is_public:true,played_at:new Date().toISOString()}).select().single();
    if(data){setShowCard(data);loadRounds(user.id);loadSocial(user.id);}
  }

  async function loadRounds(uid){const{data}=await supabase.from("rounds").select("*").eq("user_id",uid).order("played_at",{ascending:false}).limit(20);if(data)setRoundHistory(data);}

  async function loadSocial(uid){
    const{data:fd}=await supabase.from("friendships").select("*, friend:profiles!friendships_friend_id_fkey(*)").eq("user_id",uid).eq("status","accepted");
    if(fd)setFriends(fd.map(f=>f.friend));
    const{data:rd}=await supabase.from("friendships").select("*, requester:profiles!friendships_user_id_fkey(*)").eq("friend_id",uid).eq("status","pending");
    if(rd)setFriendReqs(rd);
    const fids=fd?.map(f=>f.friend_id)||[];
    const allIds=[...fids,uid];
    const{data:feedData}=await supabase.from("rounds").select("*, profile:profiles(*)").in("user_id",allIds).eq("is_public",true).order("played_at",{ascending:false}).limit(30);
    if(feedData)setFeed(feedData);
    const mo=new Date();mo.setMonth(mo.getMonth()-1);
    const{data:lb}=await supabase.from("rounds").select("*, profile:profiles(*)").in("user_id",allIds).gte("played_at",mo.toISOString()).order("total_score",{ascending:true}).limit(20);
    if(lb)setLeaderboard(lb);
  }

  async function loadSwings(uid){const{data}=await supabase.from("swing_analyses").select("*").eq("user_id",uid).order("analyzed_at",{ascending:false}).limit(10);if(data)setSwingHistory(data);}

  async function loadRangeHistory(uid){
    const{data}=await supabase.from("range_shots").select("*").eq("user_id",uid).order("recorded_at",{ascending:false}).limit(100);
    if(data){
      setRangeHistory(data);
      buildClubStats(data);
    }
  }

  function buildClubStats(shots){
    const stats={};
    shots.forEach(s=>{
      if(!s.club)return;
      if(!stats[s.club])stats[s.club]={shots:[],shapes:{},launches:{}};
      stats[s.club].shots.push(s);
      const shape=s.shot_shape||"straight";
      stats[s.club].shapes[shape]=(stats[s.club].shapes[shape]||0)+1;
      const launch=s.launch_angle||"mid";
      stats[s.club].launches[launch]=(stats[s.club].launches[launch]||0)+1;
    });
    // Compute averages
    Object.keys(stats).forEach(club=>{
      const sh=stats[club].shots;
      const carries=sh.map(s=>s.estimated_carry).filter(Boolean);
      stats[club].avgCarry=carries.length>0?Math.round(carries.reduce((a,b)=>a+b,0)/carries.length):null;
      stats[club].minCarry=carries.length>0?Math.min(...carries):null;
      stats[club].maxCarry=carries.length>0?Math.max(...carries):null;
      stats[club].count=sh.length;
      // Most common shape
      const shapes=stats[club].shapes;
      stats[club].typicalShape=Object.keys(shapes).sort((a,b)=>shapes[b]-shapes[a])[0]||"straight";
      stats[club].shapeCount=shapes[stats[club].typicalShape]||0;
      // Most common launch
      const launches=stats[club].launches;
      stats[club].typicalLaunch=Object.keys(launches).sort((a,b)=>launches[b]-launches[a])[0]||"mid";
      // Consistency — coefficient of variation
      if(carries.length>1){
        const mean=stats[club].avgCarry;
        const variance=carries.reduce((a,b)=>a+Math.pow(b-mean,2),0)/carries.length;
        const cv=Math.sqrt(variance)/mean;
        stats[club].consistency=cv<0.04?"Elite":cv<0.07?"Very Good":cv<0.10?"Good":cv<0.14?"Average":"Inconsistent";
        stats[club].consistencyStars=cv<0.04?5:cv<0.07?4:cv<0.10?3:cv<0.14?2:1;
      } else {
        stats[club].consistency="Not enough data";
        stats[club].consistencyStars=0;
      }
    });
    setClubStats(stats);
    // Update bag distances with real observed data
    if(Object.keys(stats).length>0){
      setProfile(p=>({
        ...p,
        bag:p.bag.map(b=>({
          ...b,
          carry:stats[b.club]?.avgCarry||b.carry,
          observed:!!stats[b.club]?.avgCarry,
        }))
      }));
    }
  }

  async function analyzeRangeShot(videoFile, club){
    const apiKey=await fetch("/api/gemini-key").then(r=>r.json()).then(d=>d.key).catch(()=>null);
    if(!apiKey)throw new Error("Could not get API key");

    const handed=profile.dexterity==="left"?"left-handed":"right-handed";
    const knownCarry=profile.bag.find(b=>b.club===club)?.carry||150;

    const promptText=`You are an expert golf ball flight and swing analyst. The player is ${handed} and hitting a ${club} (typical carry ~${knownCarry} yards).

Analyze this swing/shot video from 5-10 feet behind the player and provide:

1. SHOT SHAPE: One of: straight, slight draw, draw, strong draw, hook, slight fade, fade, strong fade, slice
2. LAUNCH ANGLE: One of: low, mid-low, mid, mid-high, high
3. ESTIMATED CARRY: Your best estimate in yards based on swing speed, club, and contact quality. Give a specific number.
4. CONTACT QUALITY: One of: flush, slightly thin, thin, slightly fat, fat, toe, heel
5. SWING PATH: One of: in-to-out, slightly in-to-out, neutral, slightly out-to-in, out-to-in
6. BALL FLIGHT: One of: penetrating, boring, mid-trajectory, high, ballooning
7. ONE TIP: One specific actionable tip to improve this shot (1 sentence)

Respond in this EXACT JSON format with no other text:
{
  "shot_shape": "fade",
  "launch_angle": "mid",
  "estimated_carry": 152,
  "contact_quality": "flush",
  "swing_path": "neutral",
  "ball_flight": "mid-trajectory",
  "tip": "Your tip here"
}`;

    // Upload video to Google File API
    const uploadRes=await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {method:"POST",headers:{"X-Goog-Upload-Protocol":"resumable","X-Goog-Upload-Command":"start","X-Goog-Upload-Header-Content-Length":videoFile.size,"X-Goog-Upload-Header-Content-Type":videoFile.type,"Content-Type":"application/json"},body:JSON.stringify({file:{display_name:"range_shot"}})}
    );
    const uploadUrl=uploadRes.headers.get("x-goog-upload-url");
    if(!uploadUrl)throw new Error("Upload failed");

    const finalRes=await fetch(uploadUrl,{method:"POST",headers:{"X-Goog-Upload-Command":"upload, finalize","X-Goog-Upload-Offset":"0","Content-Type":videoFile.type},body:videoFile});
    const fileData=await finalRes.json();
    const fileUri=fileData?.file?.uri;
    const fileName=fileData?.file?.name;
    if(!fileUri)throw new Error("Video upload failed");

    // Wait for processing
    let ready=false;let attempts=0;
    while(!ready&&attempts<15){
      await new Promise(r=>setTimeout(r,2000));
      const check=await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`).then(r=>r.json());
      if(check?.state==="ACTIVE"||check?.file?.state==="ACTIVE")ready=true;
      attempts++;
    }
    if(!ready)throw new Error("Processing timed out");

    const analyzeRes=await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        contents:[{role:"user",parts:[{file_data:{mime_type:videoFile.type,file_uri:fileUri}},{text:promptText}]}],
        generationConfig:{maxOutputTokens:500,temperature:0.3,thinkingConfig:{thinkingBudget:0}},
      })}
    );
    const result=await analyzeRes.json();
    if(result.error)throw new Error(result.error.message||"Analysis failed");
    const text=result.candidates?.[0]?.content?.parts?.[0]?.text||"{}";
    const clean=text.replace(/```json|```/g,"").trim();
    return JSON.parse(clean);
  }

  async function runRangeAnalysis(){
    if(!rangeFile)return;
    setRangeLoading(true);setRangeShotResult(null);
    try{
      const result=await analyzeRangeShot(rangeFile,rangeClub);
      setRangeShotResult(result);
      // Save to database
      if(user){
        const{data}=await supabase.from("range_shots").insert({
          user_id:user.id,
          club:rangeClub,
          shot_shape:result.shot_shape,
          launch_angle:result.launch_angle,
          estimated_carry:result.estimated_carry,
          contact_quality:result.contact_quality,
          swing_path:result.swing_path,
          ball_flight:result.ball_flight,
          tip:result.tip,
          recorded_at:new Date().toISOString(),
        }).select().single();
        loadRangeHistory(user.id);
      }
    }catch(err){
      setRangeShotResult({error:err.message});
    }
    setRangeLoading(false);
    setRangeFile(null);
  }
  async function searchUsers(q){if(!q.trim()){setSearchRes([]);return;}const{data}=await supabase.from("profiles").select("*").ilike("full_name",`%${q}%`).neq("id",user?.id).limit(8);if(data)setSearchRes(data);}
  async function sendFriendReq(fid){await supabase.from("friendships").insert({user_id:user.id,friend_id:fid,status:"pending"});setSearchRes(prev=>prev.filter(u=>u.id!==fid));}
  async function acceptFriendReq(reqId,requesterId){await supabase.from("friendships").update({status:"accepted"}).eq("id",reqId);await supabase.from("friendships").insert({user_id:user.id,friend_id:requesterId,status:"accepted"});loadSocial(user.id);}

  async function runSwingAnalysis(){
    if(!swingFile)return;
    setSwingLoading(true);setSwingAnalysis("");
    try{
      if(swingFile.type.startsWith("video/")){
        // Send full video directly to Google File API — full motion analysis
        const notesWithGoal=profile.practiceGoal?`GOAL:${profile.practiceGoal}\n${swingNotes}`:swingNotes;
        const analysis=await analyzeSwingVideo(swingFile,notesWithGoal,profile.bag,profile.hcp);
        setSwingAnalysis(analysis);
        if(user){await supabase.from("swing_analyses").insert({user_id:user.id,notes:swingNotes,analysis,analyzed_at:new Date().toISOString()});loadSwings(user.id);}
      } else {
        // Image — use existing inline method
        const reader=new FileReader();
        reader.onload=async(e)=>{
          try{
            const b64=e.target.result.split(",")[1];
            const notesWithGoal=profile.practiceGoal?`GOAL:${profile.practiceGoal}\n${swingNotes}`:swingNotes;
            const analysis=await analyzeSwing(b64,swingFile.type,notesWithGoal,profile.bag,profile.hcp);
            setSwingAnalysis(analysis);
            if(user){await supabase.from("swing_analyses").insert({user_id:user.id,notes:swingNotes,analysis,analyzed_at:new Date().toISOString()});loadSwings(user.id);}
          }catch(err){setSwingAnalysis("Analysis failed: "+err.message);}
          setSwingLoading(false);
        };
        reader.readAsDataURL(swingFile);
        return;
      }
    }catch(err){
      setSwingAnalysis("Analysis failed: "+err.message);
    }
    setSwingLoading(false);
  }

  function shareRound(round){
    const d=round.total_score-round.total_par;
    const ds=d>0?`+${d}`:d===0?"even par":`${d}`;
    const txt=`🏌️ Just finished ${round.course_name||"a round"} on Obi Golf\n⛳ ${round.total_score} strokes (${ds})\n📍 ${round.holes_played} holes played\n\nGet your AI caddie → obigolf.app`;
    if(navigator.share)navigator.share({title:"My Obi Golf Round",text:txt});
    else{navigator.clipboard?.writeText(txt);alert("Copied to clipboard!");}
  }

  const par=holePars[hole-1];
  const py=yardage&&weather?playingYards(parseInt(yardage)||0,elevation,weather.wind,weather.windDeg):null;
  const totalScore=scores.reduce((a,b)=>a+(b||0),0);
  const played=scores.filter(Boolean).length;
  const scoreDiff=played>0?totalScore-holePars.slice(0,played).reduce((a,b)=>a+b,0):0;
  const recClub=py?[...profile.bag].sort((a,b)=>Math.abs(a.carry-py)-Math.abs(b.carry-py))[0]:null;

  // LOADING
  if(authLoading)return(
    <div style={{minHeight:"100vh",background:D.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"20px"}}>
      <div style={{animation:"popIn 0.6s cubic-bezier(.34,1.56,.64,1) both"}}><Ball size={76}/></div>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"32px",fontWeight:"700",color:D.white,letterSpacing:"-0.5px",animation:"fadeUp 0.6s 0.2s both"}}>Obi Golf</div>
      <div style={{display:"flex",gap:"7px",animation:"fadeUp 0.6s 0.4s both"}}>{[0,1,2].map(i=><div key={i} style={{width:"6px",height:"6px",borderRadius:"50%",background:D.accent,animation:`pulse 1.2s infinite ${i*0.2}s`}}/>)}</div>
      <style>{CSS}</style>
    </div>
  );

  // AUTH
  if(!user||authScreen==="onboard")return(
    <div style={{minHeight:"100vh",background:D.black,fontFamily:"'Inter',sans-serif",backgroundImage:`radial-gradient(ellipse at 20% 10%,${D.accentDim}66 0%,transparent 50%),radial-gradient(ellipse at 80% 90%,${D.accentDim}33 0%,transparent 50%)`}}>
      <div style={{maxWidth:"420px",margin:"0 auto",padding:"40px 24px",display:"flex",flexDirection:"column",minHeight:"100vh",justifyContent:"center"}}>
        <div style={{textAlign:"center",marginBottom:"36px",animation:"fadeUp 0.5s both"}}>
          <Ball size={56}/>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"36px",fontWeight:"800",color:D.white,letterSpacing:"2px",marginTop:"12px"}}>OBI GOLF</div>
          <div style={{color:D.muted,fontSize:"14px",marginTop:"4px",letterSpacing:"1px"}}>AI CADDIE · COACH · COMMUNITY</div>
        </div>

        {authScreen==="onboard"&&(
          <OnboardingFlow
            D={D} S={S} profile={profile} setProfile={setProfile}
            authName={authName} setAuthName={setAuthName}
            onComplete={saveProfile}
          />
        )}

        {authScreen==="login"&&!user&&(
          <div style={{animation:"fadeUp 0.4s both"}}>
            <div style={{...S.card,marginBottom:"16px"}}>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"22px",fontWeight:"700",color:D.white,marginBottom:"20px",letterSpacing:"-0.3px"}}>Sign in</div>
              <input placeholder="Email address" type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} style={{...S.input,marginBottom:"12px"}}/>
              <input placeholder="Password" type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{...S.input,marginBottom:authError?"8px":"0"}}/>
              {authError&&<div style={{color:D.red,fontSize:"13px",marginTop:"8px"}}>{authError}</div>}
            </div>
            <button onClick={handleLogin} style={{...S.btnPrimary,marginBottom:"10px"}}>Sign In</button>
            <button onClick={handleGoogle} style={{...S.btnSecondary,marginBottom:"10px",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}><span style={{fontSize:"18px"}}>🔵</span> Continue with Google</button>
            <button onClick={()=>setAuthScreen("signup")} style={S.btnGhost}>{"Don't have an account? Create one →"}</button>
          </div>
        )}

        {authScreen==="signup"&&!user&&(
          <div style={{animation:"fadeUp 0.4s both"}}>
            <div style={{...S.card,marginBottom:"16px"}}>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"22px",fontWeight:"700",color:D.white,marginBottom:"20px",letterSpacing:"-0.3px"}}>Create account</div>
              <input placeholder="Email address" type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} style={{...S.input,marginBottom:"12px"}}/>
              <input placeholder="Password (min 6 characters)" type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)} style={{...S.input,marginBottom:authError?"8px":"0"}}/>
              {authError&&<div style={{color:D.red,fontSize:"13px",marginTop:"8px"}}>{authError}</div>}
            </div>
            <button onClick={handleSignup} style={{...S.btnPrimary,marginBottom:"10px"}}>Create Account</button>
            <button onClick={handleGoogle} style={{...S.btnSecondary,marginBottom:"10px",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}><span style={{fontSize:"18px"}}>🔵</span> Continue with Google</button>
            <button onClick={()=>setAuthScreen("login")} style={S.btnGhost}>{"Already have an account? Sign in →"}</button>
          </div>
        )}
      </div>
      <style>{CSS}</style>
    </div>
  );

  // SUMMARY MODAL
  const SummaryModal=({round})=>{
    const diff=round.total_score-round.total_par;
    const diffStr=diff>0?`+${diff}`:diff===0?"E":`${diff}`;
    const diffColor=diff>0?D.red:diff<0?D.green:D.blue;
    return(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={()=>setShowCard(null)}>
        <div onClick={e=>e.stopPropagation()} style={{background:`linear-gradient(160deg,${D.card} 0%,${D.dark} 100%)`,border:`1px solid ${D.border}`,borderRadius:"24px",padding:"28px 24px",width:"100%",maxWidth:"360px",animation:"popIn 0.4s cubic-bezier(.34,1.56,.64,1) both"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <Ball size={36}/>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:"700",color:D.white,letterSpacing:"-0.3px"}}>Obi Golf</div>
            </div>
            <div style={{background:D.accentDim,borderRadius:"99px",padding:"4px 10px",fontSize:"11px",color:D.accent,fontWeight:"600",letterSpacing:"0.5px"}}>ROUND RECAP</div>
          </div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"17px",fontWeight:"600",letterSpacing:"-0.2px",color:D.accentLt,marginBottom:"2px"}}>{round.course_name||"Unknown Course"}</div>
          <div style={{fontSize:"13px",color:D.muted,marginBottom:"24px"}}>{fmtDate(round.played_at)}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"24px"}}>
            {[["SCORE",round.total_score,D.white],["vs PAR",diffStr,diffColor],["HOLES",`${round.holes_played}/18`,D.text]].map(([l,v,c])=>(
              <div key={l} style={{background:D.surface,borderRadius:"14px",padding:"14px 8px",textAlign:"center",border:`1px solid ${D.border}`}}>
                <div style={{fontSize:"9px",color:D.muted,letterSpacing:"1.5px",marginBottom:"6px"}}>{l}</div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"24px",fontWeight:"700",letterSpacing:"-0.3px",color:c,lineHeight:1}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{background:D.surface,borderRadius:"14px",padding:"14px 16px",marginBottom:"20px",borderLeft:`3px solid ${D.green}`}}>
            <div style={{fontSize:"11px",color:D.accent,letterSpacing:"1.5px",marginBottom:"6px"}}>OBI SAYS</div>
            <div style={{fontSize:"14px",color:D.text,lineHeight:1.6,fontStyle:"italic"}}>"{diff<0?"Outstanding round. That's the kind of golf that gets talked about in the clubhouse.":diff===0?"Solid par golf. Consistent — let's find those birdies next time.":"Every round is data. Obi will have you better prepared next time."}"</div>
          </div>
          <div style={{fontSize:"12px",color:D.muted,textAlign:"center",marginBottom:"20px"}}>🏌️ {userProfile?.full_name||"Golfer"} · HCP {userProfile?.handicap_index||"—"} · obigolf.app</div>
          <div style={{display:"flex",gap:"10px"}}>
            <button onClick={()=>shareRound(round)} style={{...S.btnPrimary,flex:1}}>📤 Share</button>
            <button onClick={()=>setShowCard(null)} style={{...S.btnSecondary,flex:1}}>Done</button>
          </div>
        </div>
      </div>
    );
  };

  // MAIN APP
  return(
    <div style={{minHeight:"100vh",maxWidth:"480px",margin:"0 auto",background:D.black,fontFamily:"'Inter',sans-serif",display:"flex",flexDirection:"column",position:"relative"}}>
      {showCard&&<SummaryModal round={showCard}/>}

      {/* Avatar zoom modal */}
      {showAvatarZoom&&(
        <div onClick={()=>setShowAvatarZoom(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
          <div onClick={e=>e.stopPropagation()} style={{maxWidth:"360px",width:"100%",textAlign:"center"}}>
            <img src={showAvatarZoom} alt="Profile" style={{width:"280px",height:"280px",borderRadius:"50%",objectFit:"cover",border:"3px solid "+D.green,boxShadow:"0 0 40px "+D.accent+"44"}}/>
            <div style={{marginTop:"16px",color:D.muted,fontSize:"13px"}}>Tap anywhere to close</div>
          </div>
        </div>
      )}

      {jabPost&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={()=>setJabPost(null)}>
          <div onClick={e=>e.stopPropagation()} style={{...S.card,maxWidth:"320px",width:"100%",textAlign:"center",animation:"popIn 0.3s both"}}>
            <div style={{fontSize:"40px",marginBottom:"12px"}}>😂</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"18px",color:D.white,marginBottom:"8px"}}>Jab Sent!</div>
            <div style={{fontSize:"14px",color:D.muted,marginBottom:"20px",fontStyle:"italic"}}>"{jabPost}"</div>
            <button onClick={()=>setJabPost(null)} style={S.btnPrimary}>👍 Nice</button>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{padding:"12px 18px",background:D.dark,borderBottom:`1px solid ${D.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(12px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <Ball size={28}/>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"17px",fontWeight:"700",color:D.white,letterSpacing:"-0.3px"}}>Obi Golf
            {speaking&&<span style={{display:"inline-block",width:"6px",height:"6px",borderRadius:"50%",background:D.accent,animation:"pulse 1s infinite",marginLeft:"8px",verticalAlign:"middle"}}/>}
          </div>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          {weather&&(
            <div style={{background:D.surface,border:`1px solid ${D.border}`,borderRadius:"99px",padding:"5px 12px",display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",color:D.muted}}>
              <span>{wxIcon(weather.code)}</span>
              <span style={{color:D.text}}>{weather.temp}°</span>
              <span style={{color:D.border}}>·</span>
              <span>{weather.wind}mph {windDir(weather.windDeg)}</span>
            </div>
          )}
          <button onClick={()=>setDarkMode(d=>!d)} style={{background:D.surface,border:`1px solid ${D.border}`,borderRadius:"99px",padding:"6px 10px",cursor:"pointer",fontSize:"14px",color:D.muted,fontFamily:"'Inter',sans-serif",lineHeight:1}}>
            {darkMode?"☀️":"🌙"}
          </button>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"480px",background:D.dark,borderTop:`1px solid ${D.border}`,display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)",backdropFilter:"blur(12px)"}}>
        {[{id:"caddie",icon:"⛳",label:"Caddie"},{id:"practice",icon:"🎬",label:"Practice"},{id:"social",icon:"👥",label:"Social",badge:friendReqs.length},{id:"profile",icon:"👤",label:"Profile"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 4px 8px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",position:"relative"}}>
            <div style={{width:"40px",height:"32px",borderRadius:"10px",background:tab===t.id?D.accentDim:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
              <span style={{fontSize:"18px",opacity:tab===t.id?1:0.45,transition:"all 0.2s"}}>{t.icon}</span>
            </div>
            <span style={{fontSize:"10px",color:tab===t.id?D.accent:D.muted,fontFamily:"'Inter',sans-serif",fontWeight:tab===t.id?"600":"400",transition:"color 0.2s"}}>{t.label}</span>
            {t.badge>0&&<div style={{position:"absolute",top:"6px",right:"calc(50% - 24px)",width:"7px",height:"7px",borderRadius:"50%",background:D.red,border:`1.5px solid ${D.dark}`}}/>}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{flex:1,paddingBottom:"80px",overflowY:"auto"}}>

        {/* CADDIE TAB */}
        {tab==="caddie"&&(
          <div style={{display:"flex",flexDirection:"column"}}>
            {/* Course bar */}
            <div style={{padding:"12px 16px",background:D.dark,borderBottom:`1px solid ${D.border}`}}>
              <input placeholder="⛳  Course name — e.g. Pebble Beach, Augusta..." value={courseInput} onChange={e=>setCourseInput(e.target.value)}
                onBlur={()=>{if(courseInput&&courseInput!==course){setCourse(courseInput);sendMessage(`I'm playing ${courseInput}. Quick key tips and what should I know about hole ${hole}?`);}}}
                onKeyDown={e=>{if(e.key==="Enter"&&courseInput&&courseInput!==course){setCourse(courseInput);sendMessage(`I'm playing ${courseInput}. Quick key tips and what should I know about hole ${hole}?`);}}}
                style={{...S.input,marginBottom:"10px",fontSize:"14px"}}/>
              <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                  <button onClick={()=>setHole(h=>Math.max(1,h-1))} style={{background:D.surface,border:`1px solid ${D.border}`,borderRadius:"8px",color:D.muted,padding:"4px 10px",cursor:"pointer",fontSize:"16px"}}>‹</button>
                  <div style={{textAlign:"center",minWidth:"48px"}}>
                    <div style={{fontSize:"9px",color:D.muted,letterSpacing:"1.5px",textTransform:"uppercase"}}>HOLE</div>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"24px",fontWeight:"700",letterSpacing:"-0.3px",color:D.white,lineHeight:1}}>{hole}</div>
                  </div>
                  <button onClick={()=>setHole(h=>Math.min(18,h+1))} style={{background:D.surface,border:`1px solid ${D.border}`,borderRadius:"8px",color:D.muted,padding:"4px 10px",cursor:"pointer",fontSize:"16px"}}>›</button>
                </div>
                <div style={{display:"flex",gap:"3px"}}>
                  {[3,4,5].map(p=>(
                    <button key={p} onClick={()=>{const n=[...holePars];n[hole-1]=p;setHolePars(n);}} style={{background:par===p?D.accentDim:D.surface,border:`1px solid ${par===p?D.green:D.border}`,borderRadius:"8px",color:par===p?D.accent:D.muted,padding:"4px 10px",fontSize:"12px",cursor:"pointer",fontWeight:"600"}}>P{p}</button>
                  ))}
                </div>
                <input type="number" placeholder="Yds" value={yardage} onChange={e=>setYardage(e.target.value)} style={{...S.input,width:"70px",padding:"6px 10px",fontSize:"15px",fontWeight:"600",textAlign:"center"}}/>
                <select value={lie} onChange={e=>setLie(e.target.value)} style={{...S.input,padding:"6px 8px",fontSize:"12px",flex:1}}>
                  {["tee box","fairway","light rough","deep rough","bunker","hardpan","uphill lie","downhill lie"].map(l=>(
                    <option key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub tabs */}
            <div style={{display:"flex",background:D.dark,borderBottom:`1px solid ${D.border}`}}>
              {[{id:"chat",label:"Chat"},{id:"situations",label:"Situations"},{id:"scorecard",label:"Scorecard"}].map(t=>(
                <button key={t.id} onClick={()=>setSubView(t.id)} style={{flex:1,padding:"10px",background:"transparent",border:"none",borderBottom:`2px solid ${subView===t.id?D.green:"transparent"}`,color:subView===t.id?D.green:D.muted,fontSize:"12px",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:subView===t.id?"600":"400",transition:"all 0.15s"}}>{t.label}</button>
              ))}
            </div>

            {/* CHAT */}
            {subView==="chat"&&(
              <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 230px)"}}>
                {py&&yardage&&(
                  <div style={{margin:"10px 16px 0",background:D.surface,border:`1px solid ${D.border}`,borderRadius:"14px",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:"10px",color:D.muted,marginBottom:"3px"}}>Actual</div>
                      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"26px",fontWeight:"700",color:D.white,lineHeight:1}}>{yardage}<span style={{fontSize:"13px",fontWeight:"400",color:D.muted}}>y</span></div>
                    </div>
                    <div style={{color:D.subtle,fontSize:"16px"}}>→</div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:"10px",color:D.accent,marginBottom:"3px"}}>Playing</div>
                      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"26px",fontWeight:"700",color:D.accent,lineHeight:1}}>{py}<span style={{fontSize:"13px",fontWeight:"400"}}>y</span></div>
                    </div>
                    {recClub&&(<>
                      <div style={{color:D.subtle,fontSize:"16px"}}>→</div>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:"10px",color:D.gold,marginBottom:"3px"}}>Club</div>
                        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:"700",color:D.gold,lineHeight:1}}>{recClub.club}</div>
                      </div>
                    </>)}
                  </div>
                )}
                <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:"12px"}}>
                  {messages.length===0&&(
                    <div style={{textAlign:"center",padding:"40px 20px",animation:"fadeUp 0.5s both"}}>
                      <Ball size={56}/>
                      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:"700",color:D.white,marginTop:"14px"}}>Obi is ready.</div>
                      <div style={{color:D.muted,fontSize:"14px",marginTop:"6px",lineHeight:1.6}}>Enter the course name above<br/>or ask anything about your shot</div>
                    </div>
                  )}
                  {messages.map((m,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",animation:"fadeUp 0.3s both"}}>
                      {m.role==="assistant"&&<div style={{marginRight:"10px",marginTop:"4px",flexShrink:0}}><Ball size={28}/></div>}
                      <div style={{maxWidth:"78%",background:m.role==="user"?D.accent:D.surface,border:`1px solid ${m.role==="user"?"transparent":D.border}`,borderRadius:m.role==="user"?"20px 20px 4px 20px":"20px 20px 20px 4px",padding:"11px 15px"}}>
                        <div style={{fontSize:"14px",lineHeight:1.65,color:m.role==="user"?"#fff":D.text}}>{m.content}</div>
                        {m.role==="assistant"&&<button onClick={()=>speak(m.content)} style={{background:"none",border:"none",color:D.muted,fontSize:"11px",cursor:"pointer",padding:"4px 0 0",fontFamily:"'Inter',sans-serif"}}>🔊 Replay</button>}
                      </div>
                    </div>
                  ))}
                  {loading&&(
                    <div style={{display:"flex",gap:"6px",alignItems:"center",paddingLeft:"4px"}}>
                      <Ball size={28}/>
                      <div style={{display:"flex",gap:"4px",marginLeft:"10px"}}>{[0,1,2].map(i=><div key={i} style={{width:"8px",height:"8px",borderRadius:"50%",background:D.accent,animation:`bounce 1s infinite ${i*0.15}s`}}/>)}</div>
                    </div>
                  )}
                </div>
                <div style={{padding:"8px 16px",display:"flex",gap:"8px",overflowX:"auto",scrollbarWidth:"none"}}>
                  {QUICK_PROMPTS.map(q=><button key={q.label} onClick={()=>sendMessage(q.prompt)} style={{...S.pill,flexShrink:0}}>{q.label}</button>)}
                </div>
                <div style={{padding:"10px 16px 16px",display:"flex",gap:"10px",alignItems:"center",background:D.dark,borderTop:`1px solid ${D.border}`}}>
                  <button onClick={startListening} style={{width:"46px",height:"46px",borderRadius:"50%",background:listening?D.green:D.surface,border:`1.5px solid ${listening?D.green:D.border}`,fontSize:"18px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,animation:listening?"pulse 1s infinite":"none",boxShadow:listening?`0 0 0 4px ${D.accentDim}`:"none"}}>
                    {listening?"🔴":"🎙"}
                  </button>
                  <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="Ask Obi anything..." style={{...S.input,flex:1,padding:"12px 16px"}}/>
                  <button onClick={()=>sendMessage()} disabled={loading||!input.trim()} style={{width:"46px",height:"46px",borderRadius:"50%",background:input.trim()?`linear-gradient(135deg,${D.green},#16a34a)`:D.surface,border:`1.5px solid ${input.trim()?D.green:D.border}`,color:"#fff",fontSize:"18px",cursor:input.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:input.trim()?`0 4px 16px ${D.accent}44`:"none"}}>➤</button>
                </div>
              </div>
            )}

            {/* SITUATIONS */}
            {subView==="situations"&&(
              <div style={{padding:"16px"}}>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:"700",letterSpacing:"-0.3px",color:D.white,marginBottom:"4px"}}>Shot Situations</div>
                <div style={{color:D.muted,fontSize:"14px",marginBottom:"16px"}}>Tap any situation for instant advice from Obi</div>
                {[{icon:"🌿",title:"In the Rough",prompt:`I'm in ${lie} with ${yardage||"unknown"} yards to pin. Ball sitting down. What club and technique?`},{icon:"🏖",title:"Greenside Bunker",prompt:"I'm in a greenside bunker. Walk me through club, setup, and technique."},{icon:"⛰",title:"Uneven Lie",prompt:"I have an uneven lie. How does this affect my shot and what adjustments do I make?"},{icon:"🍃",title:"Punch Out",prompt:"I need to punch out from under trees. What club and where do I aim?"},{icon:"💦",title:"Carry the Water",prompt:`Need to carry water. ${yardage?`${yardage} yards.`:""}Risk/reward and recommended play?`},{icon:"🎯",title:"Tight Pin",prompt:"Pin is tucked tight. Attack it or play center? Smart play for my handicap?"},{icon:"🌬",title:"Into the Wind",prompt:`Wind is ${weather?.wind||"strong"}mph from ${weather?windDir(weather.windDeg):"the front"}. Club and shape?`},{icon:"🔄",title:"Reset After Mishit",prompt:"I just mishit badly. Help me identify what went wrong and reset mentally."}].map(s=>(
                  <button key={s.title} onClick={()=>{setSubView("chat");sendMessage(s.prompt);}} style={{display:"flex",alignItems:"center",gap:"14px",width:"100%",background:D.card,border:`1px solid ${D.border}`,borderRadius:"16px",padding:"16px",marginBottom:"10px",cursor:"pointer",textAlign:"left"}}>
                    <div style={{width:"48px",height:"48px",borderRadius:"14px",background:D.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",flexShrink:0}}>{s.icon}</div>
                    <div style={{flex:1}}><div style={{fontWeight:"600",color:D.white,fontSize:"15px"}}>{s.title}</div><div style={{color:D.muted,fontSize:"12px",marginTop:"3px",lineHeight:1.4}}>{s.prompt.slice(0,58)}…</div></div>
                    <div style={{color:D.muted,fontSize:"18px"}}>›</div>
                  </button>
                ))}
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"16px",fontWeight:"700",color:D.text,margin:"20px 0 10px"}}>Log Shot Outcome</div>
                <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                  {["Flushed it 👌","Pulled left","Pushed right","Chunked it","Thinned it","Perfect draw","Good fade","Found bunker","In the rough"].map(o=>(
                    <button key={o} onClick={()=>{setShotHistory(prev=>[...prev,{hole,outcome:o}]);setSubView("chat");sendMessage(`Shot result: ${o}. What's my next play?`);}} style={{...S.pill}}>{o}</button>
                  ))}
                </div>
              </div>
            )}

            {/* SCORECARD */}
            {subView==="scorecard"&&(
              <div style={{padding:"16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:"700",letterSpacing:"-0.3px",color:D.white}}>Scorecard</div>
                  {played>0&&<ScorePill score={totalScore} par={holePars.slice(0,played).reduce((a,b)=>a+b,0)} large/>}
                </div>
                {[{label:"FRONT 9",r:[0,9]},{label:"BACK 9",r:[9,18]}].map(({label,r})=>(
                  <div key={label} style={{marginBottom:"16px"}}>
                    <div style={{fontSize:"10px",color:D.muted,letterSpacing:"2.5px",marginBottom:"8px"}}>{label}</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(9,1fr)",gap:"4px"}}>
                      {Array.from({length:9},(_,i)=>i+r[0]).map(idx=>{
                        const h=idx+1;
                        const sc=scores[idx];
                        const d=sc?sc-holePars[idx]:null;
                        const sc_color=d===null?D.border:d<=-2?D.gold:d===-1?D.green:d===0?D.blue:D.red;
                        return(
                          <div key={h} style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                            <div style={{textAlign:"center",fontSize:"9px",color:hole===h?D.green:D.muted,fontWeight:hole===h?"700":"400"}}>{h}</div>
                            <div style={{textAlign:"center",fontSize:"9px",color:D.subtle}}>P{holePars[idx]}</div>
                            <input type="number" min="1" max="15" value={scores[idx]||""} onChange={e=>{const ns=[...scores];ns[idx]=parseInt(e.target.value)||null;setScores(ns);}}
                              style={{background:hole===h?D.accentDim:D.surface,border:`1.5px solid ${sc_color}`,borderRadius:"8px",color:d!==null?sc_color:D.text,textAlign:"center",fontSize:"15px",fontWeight:"700",padding:"6px 2px",outline:"none",fontFamily:"'Space Grotesk',sans-serif",width:"100%",boxSizing:"border-box"}}/>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div style={{...S.card,marginBottom:"12px"}}>
                  {[["Total strokes",totalScore||"—",D.white],["Holes played",`${played}/18`,D.muted],played>0&&["vs Par",scoreDiff>0?`+${scoreDiff}`:scoreDiff===0?"Even":`${scoreDiff}`,scoreDiff>0?D.red:scoreDiff<0?D.green:D.blue]].filter(Boolean).map(([l,v,c])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                      <span style={{color:D.muted,fontSize:"14px"}}>{l}</span>
                      <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:"700",color:c}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:"10px",marginBottom:"10px"}}>
                  <button onClick={()=>{setSubView("chat");sendMessage(`Round done. Score ${totalScore} on par ${holePars.reduce((a,b)=>a+b,0)}. ${scoreDiff>0?`+${scoreDiff}`:"Even par"}. Honest debrief please.`);}} style={{...S.btnSecondary,flex:1}}>🧠 Debrief</button>
                  <button onClick={saveRound} style={{...S.btnPrimary,flex:1}}>💾 Save Round</button>
                </div>
                <button onClick={()=>{setMessages([]);setScores(Array(18).fill(null));setHole(1);setYardage("");setCourse("");setCourseInput("");setShotHistory([]);const g={pro:"New round. Ready.",coach:"Fresh start! Let's go.",oldschool:"New round. Let's go."}[profile.persona];setMessages([{role:"assistant",content:g}]);setSubView("chat");}} style={S.btnGhost}>🗑 New Round</button>
              </div>
            )}
          </div>
        )}

        {/* PRACTICE TAB */}
        {tab==="practice"&&(
          <div style={{display:"flex",flexDirection:"column"}}>

            {/* Practice sub tabs */}
            <div style={{display:"flex",background:D.dark,borderBottom:`1px solid ${D.border}`,position:"sticky",top:"64px",zIndex:10}}>
              {[{id:"swinglab",label:"🎬 Swing Lab"},{id:"range",label:"🏌️ Range Mode"}].map(t=>(
                <button key={t.id} onClick={()=>setPracticeSubTab(t.id)} style={{flex:1,padding:"12px 4px",background:"transparent",border:"none",borderBottom:`2.5px solid ${practiceSubTab===t.id?D.green:"transparent"}`,color:practiceSubTab===t.id?D.green:D.muted,fontSize:"13px",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:practiceSubTab===t.id?"600":"400",transition:"all 0.15s"}}>{t.label}</button>
              ))}
            </div>

            {/* ── SWING LAB ── */}
            {practiceSubTab==="swinglab"&&(
              <div style={{padding:"20px 16px"}}>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"24px",fontWeight:"700",letterSpacing:"-0.3px",color:D.white,marginBottom:"4px"}}>Swing Lab</div>
                <div style={{color:D.muted,fontSize:"14px",marginBottom:"20px",lineHeight:1.6}}>Upload a swing video and Obi analyzes it like a PGA teaching pro.</div>

                <div style={{marginBottom:"16px"}}>
                  <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>What are we working on today?</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"10px"}}>
                    {[
                      {v:"full_swing",label:"Full Swing",icon:"🏌️",desc:"Overall mechanics"},
                      {v:"driver",label:"Driver",icon:"💥",desc:"Distance & accuracy"},
                      {v:"irons",label:"Irons",icon:"🎯",desc:"Approach consistency"},
                      {v:"short_game",label:"Short Game",icon:"🌿",desc:"Chips & pitches"},
                      {v:"bunker",label:"Bunker Play",icon:"🏖",desc:"Sand shots"},
                      {v:"putting",label:"Putting",icon:"⛳",desc:"Stroke mechanics"},
                      {v:"tempo",label:"Tempo & Rhythm",icon:"🎵",desc:"Timing & sequencing"},
                      {v:"custom",label:"Something Else",icon:"💬",desc:"Describe below"},
                    ].map(g=>(
                      <button key={g.v} onClick={()=>setProfile(p=>({...p,practiceGoal:g.v}))} style={{background:profile.practiceGoal===g.v?D.accentDim:D.surface,border:`1.5px solid ${profile.practiceGoal===g.v?D.green:D.border}`,borderRadius:"12px",padding:"12px 10px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"flex-start",gap:"4px",textAlign:"left",transition:"all 0.15s"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"6px",width:"100%"}}>
                          <span style={{fontSize:"18px"}}>{g.icon}</span>
                          <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:"700",fontSize:"13px",color:profile.practiceGoal===g.v?D.accent:D.text,flex:1}}>{g.label}</span>
                          {profile.practiceGoal===g.v&&<div style={{width:"16px",height:"16px",borderRadius:"50%",background:D.accent,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"10px",flexShrink:0}}>✓</div>}
                        </div>
                        <span style={{fontSize:"11px",color:D.muted,paddingLeft:"24px"}}>{g.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{marginBottom:"16px"}}>
                  <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"8px"}}>{profile.practiceGoal==="custom"?"Describe what you want to work on *":"Any specific details? (optional)"}</div>
                  <textarea placeholder={profile.practiceGoal==="driver"?"e.g. I keep slicing it left...":profile.practiceGoal==="irons"?"e.g. I chunk my 7-iron...":profile.practiceGoal==="putting"?"e.g. I push putts right...":"e.g. I've been struggling with my takeaway..."} value={swingNotes} onChange={e=>setSwingNotes(e.target.value)} rows={3} style={{...S.input,resize:"none",lineHeight:1.6,fontSize:"14px"}}/>
                </div>

                <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"8px"}}>Upload Your Swing</div>
                <div onClick={()=>fileRef.current?.click()} style={{background:swingFile?D.accentDim:D.surface,border:`2px dashed ${swingFile?D.green:D.border}`,borderRadius:"18px",padding:"24px",textAlign:"center",cursor:"pointer",marginBottom:"14px",transition:"all 0.2s"}}>
                  <input ref={fileRef} type="file" accept="video/*,image/*" onChange={e=>setSwingFile(e.target.files[0])} style={{display:"none"}}/>
                  {swingFile?<div><div style={{fontSize:"36px",marginBottom:"8px"}}>🎬</div><div style={{color:D.accent,fontWeight:"600",fontSize:"15px"}}>{swingFile.name}</div><div style={{color:D.muted,fontSize:"12px",marginTop:"4px"}}>Tap to change</div></div>:<div><div style={{fontSize:"44px",marginBottom:"10px"}}>📹</div><div style={{color:D.white,fontWeight:"600",fontSize:"16px"}}>Upload Swing Video</div><div style={{color:D.muted,fontSize:"13px",marginTop:"6px",lineHeight:1.5}}>Face-on or down-the-line · Video or photo</div></div>}
                </div>

                <button onClick={runSwingAnalysis} disabled={!swingFile||swingLoading||(profile.practiceGoal==="custom"&&!swingNotes.trim())} style={{...S.btnPrimary,opacity:(swingFile&&!swingLoading)?1:0.4,marginBottom:"20px"}}>
                  {swingLoading?"🔍 Obi is analyzing...":"🎯 Analyze My Swing"}
                </button>

                {swingLoading&&<div style={{...S.card,textAlign:"center",padding:"28px",marginBottom:"16px"}}><div style={{display:"flex",gap:"6px",justifyContent:"center",marginBottom:"14px"}}>{[0,1,2].map(i=><div key={i} style={{width:"10px",height:"10px",borderRadius:"50%",background:D.accent,animation:`bounce 1s infinite ${i*0.15}s`}}/>)}</div><div style={{color:D.text,fontWeight:"600",fontSize:"15px",marginBottom:"4px"}}>Obi is watching your swing</div><div style={{color:D.muted,fontSize:"13px"}}>This takes 15-20 seconds...</div></div>}

                {swingAnalysis&&!swingLoading&&(
                  <div style={{...S.card,marginBottom:"20px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"}}><Ball size={32}/><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"17px",fontWeight:"700",color:D.white}}>Obi's Analysis</div></div>
                    <div style={{fontSize:"14px",color:D.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{swingAnalysis}</div>
                    <div style={{display:"flex",gap:"8px",marginTop:"14px"}}>
                      <button onClick={()=>speak(swingAnalysis)} style={{...S.pill}}>🔊 Read aloud</button>
                      <button onClick={()=>{setSwingAnalysis("");setSwingFile(null);setSwingNotes("");}} style={{...S.pill}}>🔄 New analysis</button>
                    </div>
                  </div>
                )}

                {swingHistory.length>0&&(
                  <div>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"17px",fontWeight:"600",letterSpacing:"-0.2px",color:D.white,margin:"0 0 12px"}}>Previous Analyses</div>
                    {swingHistory.map((s,i)=>(
                      <div key={i} style={{...S.card,marginBottom:"10px",cursor:"pointer"}} onClick={()=>setSelectedSwing(selectedSwing?.id===s.id?null:s)}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                          <div style={{color:D.muted,fontSize:"13px"}}>{fmtDate(s.analyzed_at)}</div>
                          {s.notes&&<div style={{fontSize:"12px",color:D.accent,fontStyle:"italic",maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.notes}</div>}
                        </div>
                        {selectedSwing?.id===s.id?<div style={{fontSize:"13px",color:D.text,lineHeight:1.6,marginTop:"10px",whiteSpace:"pre-wrap"}}>{s.analysis}</div>:<div style={{fontSize:"13px",color:D.muted,marginTop:"4px"}}>{s.analysis?.slice(0,120)}… <span style={{color:D.accent}}>Read more</span></div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── RANGE MODE ── */}
            {practiceSubTab==="range"&&(
              <div style={{padding:"20px 16px"}}>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"24px",fontWeight:"700",letterSpacing:"-0.3px",color:D.white,marginBottom:"4px"}}>Range Mode</div>
                <div style={{color:D.muted,fontSize:"14px",marginBottom:"20px",lineHeight:1.6}}>
                  Record your shot, get instant ball flight stats. Builds your real carry distances and shot shape profile over time.
                </div>

                {/* Setup tip */}
                <div style={{background:D.accentDim,border:`1px solid ${D.accent}33`,borderRadius:"12px",padding:"12px 16px",marginBottom:"20px",display:"flex",gap:"10px",alignItems:"flex-start"}}>
                  <span style={{fontSize:"20px",flexShrink:0}}>📱</span>
                  <div style={{fontSize:"13px",color:D.text,lineHeight:1.6}}>
                    <strong style={{color:D.accentLt}}>Setup:</strong> Place your phone 5-10 feet behind you, angled to see your full swing and ball launch. Use iPhone Slo-Mo for best results.
                  </div>
                </div>

                {/* Club selector */}
                <div style={{marginBottom:"16px"}}>
                  <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>Select Club</div>
                  <div style={{display:"flex",gap:"6px",overflowX:"auto",scrollbarWidth:"none",paddingBottom:"4px"}}>
                    {profile.bag.map(b=>{
                      const cs=clubStats[b.club];
                      const isSelected=rangeClub===b.club;
                      return(
                        <button key={b.club} onClick={()=>setRangeClub(b.club)} style={{flexShrink:0,background:isSelected?D.accentDim:D.surface,border:`1.5px solid ${isSelected?D.green:D.border}`,borderRadius:"12px",padding:"10px 12px",cursor:"pointer",textAlign:"center",minWidth:"70px",transition:"all 0.15s"}}>
                          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:"700",fontSize:"13px",color:isSelected?D.accent:D.text}}>{b.club}</div>
                          <div style={{fontSize:"11px",color:isSelected?D.green:D.muted,marginTop:"2px"}}>
                            {cs?.avgCarry?`${cs.avgCarry}y avg`:`${b.carry}y`}
                          </div>
                          {cs?.count>0&&<div style={{fontSize:"10px",color:D.subtle,marginTop:"1px"}}>{cs.count} shots</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Club stats card if we have data */}
                {clubStats[rangeClub]?.count>=3&&(
                  <div style={{...S.card,marginBottom:"16px",background:`linear-gradient(135deg,${D.accentDim},${D.surface})`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"16px",fontWeight:"700",color:D.white}}>{rangeClub} — Your Numbers</div>
                      <button onClick={()=>setShowClubProfile(rangeClub)} style={{...S.pill,color:D.accent,borderColor:D.accent+"44"}}>Full Profile</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"12px"}}>
                      {[
                        ["AVG CARRY",`${clubStats[rangeClub].avgCarry}y`,D.green],
                        ["RANGE",`${clubStats[rangeClub].minCarry}-${clubStats[rangeClub].maxCarry}y`,D.text],
                        ["SHOTS",clubStats[rangeClub].count,D.blue],
                      ].map(([l,v,c])=>(
                        <div key={l} style={{background:"rgba(0,0,0,0.2)",borderRadius:"10px",padding:"10px 8px",textAlign:"center"}}>
                          <div style={{fontSize:"9px",color:D.muted,letterSpacing:"1.5px",marginBottom:"4px"}}>{l}</div>
                          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:"800",color:c,lineHeight:1}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                      <div style={{...S.pill,background:D.surface}}>
                        {({straight:"➡️",draw:"↩️","slight draw":"↪️",hook:"🔄","slight fade":"↩️",fade:"↪️","strong fade":"🔃",slice:"🔃"}[clubStats[rangeClub].typicalShape]||"➡️")} {clubStats[rangeClub].typicalShape} ({Math.round((clubStats[rangeClub].shapeCount/clubStats[rangeClub].count)*100)}%)
                      </div>
                      <div style={{...S.pill,background:D.surface}}>
                        📐 {clubStats[rangeClub].typicalLaunch} launch
                      </div>
                      <div style={{...S.pill,background:D.surface,color:clubStats[rangeClub].consistencyStars>=4?D.green:clubStats[rangeClub].consistencyStars>=3?D.gold:D.red}}>
                        {"⭐".repeat(Math.max(0,clubStats[rangeClub].consistencyStars||0))} {clubStats[rangeClub].consistency}
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload area */}
                <div onClick={()=>rangeFileRef.current?.click()} style={{background:rangeFile?D.accentDim:D.surface,border:`2px dashed ${rangeFile?D.green:D.border}`,borderRadius:"18px",padding:"24px",textAlign:"center",cursor:"pointer",marginBottom:"14px",transition:"all 0.2s"}}>
                  <input ref={rangeFileRef} type="file" accept="video/*" onChange={e=>setRangeFile(e.target.files[0])} style={{display:"none"}}/>
                  {rangeFile?(
                    <div>
                      <div style={{fontSize:"36px",marginBottom:"8px"}}>🎬</div>
                      <div style={{color:D.accent,fontWeight:"600",fontSize:"15px"}}>{rangeFile.name}</div>
                      <div style={{color:D.muted,fontSize:"12px",marginTop:"4px"}}>Tap to change · {rangeClub} selected</div>
                    </div>
                  ):(
                    <div>
                      <div style={{fontSize:"44px",marginBottom:"10px"}}>🏌️</div>
                      <div style={{color:D.white,fontWeight:"600",fontSize:"16px"}}>Upload Shot Video</div>
                      <div style={{color:D.muted,fontSize:"13px",marginTop:"6px",lineHeight:1.5}}>Record your shot then upload here<br/>5-10 seconds is plenty</div>
                    </div>
                  )}
                </div>

                <button onClick={runRangeAnalysis} disabled={!rangeFile||rangeLoading} style={{...S.btnPrimary,opacity:rangeFile&&!rangeLoading?1:0.4,marginBottom:"20px"}}>
                  {rangeLoading?"📡 Analyzing shot...":"📊 Analyze Shot"}
                </button>

                {/* Loading */}
                {rangeLoading&&(
                  <div style={{...S.card,textAlign:"center",padding:"28px",marginBottom:"16px"}}>
                    <div style={{display:"flex",gap:"6px",justifyContent:"center",marginBottom:"14px"}}>{[0,1,2].map(i=><div key={i} style={{width:"10px",height:"10px",borderRadius:"50%",background:D.accent,animation:`bounce 1s infinite ${i*0.15}s`}}/>)}</div>
                    <div style={{color:D.text,fontWeight:"600",fontSize:"15px",marginBottom:"4px"}}>Reading your ball flight...</div>
                    <div style={{color:D.muted,fontSize:"13px"}}>Analyzing shape, carry, and contact · 15-20 seconds</div>
                  </div>
                )}

                {/* Shot result */}
                {rangeShotResult&&!rangeLoading&&(
                  rangeShotResult.error?(
                    <div style={{...S.card,marginBottom:"16px",borderColor:D.red+"44"}}>
                      <div style={{color:D.red,fontSize:"14px"}}>Analysis failed: {rangeShotResult.error}</div>
                    </div>
                  ):(
                    <div style={{...S.card,marginBottom:"16px",background:`linear-gradient(135deg,${D.card},${D.dark})`}}>
                      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px"}}>
                        <Ball size={32}/>
                        <div>
                          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"17px",fontWeight:"700",color:D.white}}>Shot Analysis</div>
                          <div style={{fontSize:"12px",color:D.accent}}>{rangeClub}</div>
                        </div>
                      </div>

                      {/* Big carry number */}
                      <div style={{textAlign:"center",padding:"16px",background:"rgba(0,0,0,0.2)",borderRadius:"14px",marginBottom:"14px"}}>
                        <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"4px"}}>Estimated Carry</div>
                        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"56px",fontWeight:"800",color:D.accent,lineHeight:1}}>{rangeShotResult.estimated_carry}</div>
                        <div style={{fontSize:"14px",color:D.muted}}>yards</div>
                        {clubStats[rangeClub]?.avgCarry&&(
                          <div style={{fontSize:"12px",color:D.muted,marginTop:"6px"}}>
                            Your avg: {clubStats[rangeClub].avgCarry}y · {rangeShotResult.estimated_carry>clubStats[rangeClub].avgCarry?`+${rangeShotResult.estimated_carry-clubStats[rangeClub].avgCarry} above avg`:`${rangeShotResult.estimated_carry-clubStats[rangeClub].avgCarry} below avg`}
                          </div>
                        )}
                      </div>

                      {/* Stats grid */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"14px"}}>
                        {[
                          ["Shot Shape",rangeShotResult.shot_shape,D.blue],
                          ["Launch",rangeShotResult.launch_angle,D.gold],
                          ["Contact",rangeShotResult.contact_quality,rangeShotResult.contact_quality==="flush"?D.green:rangeShotResult.contact_quality?.includes("thin")||rangeShotResult.contact_quality?.includes("fat")?D.red:D.gold],
                          ["Ball Flight",rangeShotResult.ball_flight,D.text],
                          ["Swing Path",rangeShotResult.swing_path,D.blue],
                          ["Club",rangeClub,D.muted],
                        ].map(([l,v,c])=>(
                          <div key={l} style={{background:"rgba(0,0,0,0.2)",borderRadius:"10px",padding:"10px 8px",textAlign:"center"}}>
                            <div style={{fontSize:"9px",color:D.muted,letterSpacing:"1px",marginBottom:"4px",textTransform:"uppercase"}}>{l}</div>
                            <div style={{fontSize:"12px",color:c,fontWeight:"600",textTransform:"capitalize"}}>{v||"—"}</div>
                          </div>
                        ))}
                      </div>

                      {/* Obi tip */}
                      {rangeShotResult.tip&&(
                        <div style={{background:D.accentDim,borderRadius:"12px",padding:"12px 14px",borderLeft:`3px solid ${D.green}`}}>
                          <div style={{fontSize:"10px",color:D.accent,letterSpacing:"1.5px",marginBottom:"6px"}}>OBI SAYS</div>
                          <div style={{fontSize:"14px",color:D.text,lineHeight:1.6}}>{rangeShotResult.tip}</div>
                        </div>
                      )}

                      <div style={{display:"flex",gap:"8px",marginTop:"12px"}}>
                        <button onClick={()=>speak(`${rangeClub}. Estimated carry ${rangeShotResult.estimated_carry} yards. Shot shape: ${rangeShotResult.shot_shape}. Contact: ${rangeShotResult.contact_quality}. ${rangeShotResult.tip||""}`)} style={{...S.pill}}>🔊 Read</button>
                        <button onClick={()=>{setRangeShotResult(null);setRangeFile(null);}} style={{...S.pill}}>🔄 Next shot</button>
                      </div>
                    </div>
                  )
                )}

                {/* Shot history by club */}
                {rangeHistory.length>0&&(
                  <div>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"17px",fontWeight:"600",letterSpacing:"-0.2px",color:D.white,margin:"0 0 12px"}}>Recent Shots</div>
                    {rangeHistory.slice(0,20).map((s,i)=>{
                      const diff=clubStats[s.club]?.avgCarry?s.estimated_carry-clubStats[s.club].avgCarry:null;
                      return(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px 14px",background:D.surface,borderRadius:"10px",border:`1px solid ${D.border}`,marginBottom:"6px"}}>
                          <div style={{minWidth:"72px"}}>
                            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:"700",fontSize:"13px",color:D.text}}>{s.club}</div>
                            <div style={{fontSize:"11px",color:D.muted}}>{fmtDateShort(s.recorded_at)}</div>
                          </div>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                              <span style={{...S.pill,fontSize:"11px",padding:"2px 8px"}}>{s.shot_shape||"—"}</span>
                              <span style={{...S.pill,fontSize:"11px",padding:"2px 8px"}}>{s.contact_quality||"—"}</span>
                            </div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:"800",color:D.accent,lineHeight:1}}>{s.estimated_carry}</div>
                            <div style={{fontSize:"10px",color:diff>0?D.green:diff<0?D.red:D.muted}}>{diff!=null?(diff>0?`+${diff}`:`${diff}`):""}y</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* All club profiles summary */}
                {Object.keys(clubStats).length>0&&(
                  <div style={{marginTop:"20px"}}>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"17px",fontWeight:"600",letterSpacing:"-0.2px",color:D.white,margin:"0 0 12px"}}>My Club Profiles</div>
                    <div style={{color:D.muted,fontSize:"13px",marginBottom:"14px"}}>Based on your actual range data — used by Obi for on-course advice</div>
                    {Object.entries(clubStats).sort((a,b)=>(b[1].avgCarry||0)-(a[1].avgCarry||0)).map(([club,cs])=>(
                      <div key={club} style={{...S.card,marginBottom:"10px",cursor:"pointer"}} onClick={()=>setShowClubProfile(showClubProfile===club?null:club)}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                            <div style={{textAlign:"center",minWidth:"60px"}}>
                              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:"700",letterSpacing:"-0.3px",color:D.accent,lineHeight:1}}>{cs.avgCarry||"—"}</div>
                              <div style={{fontSize:"10px",color:D.muted}}>avg yards</div>
                            </div>
                            <div>
                              <div style={{fontWeight:"600",color:D.white,fontSize:"15px"}}>{club}</div>
                              <div style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>{cs.count} shots · {cs.typicalShape}</div>
                            </div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:"12px",color:D.muted}}>{cs.minCarry}–{cs.maxCarry}y</div>
                            <div style={{fontSize:"11px",color:cs.consistencyStars>=4?D.green:cs.consistencyStars>=3?D.gold:D.red,marginTop:"2px"}}>{cs.consistency}</div>
                          </div>
                        </div>
                        {showClubProfile===club&&(
                          <div style={{marginTop:"14px",paddingTop:"14px",borderTop:`1px solid ${D.border}`}}>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                              <div>
                                <div style={{fontSize:"11px",color:D.muted,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"1px"}}>Shot Shapes</div>
                                {Object.entries(cs.shapes).sort((a,b)=>b[1]-a[1]).map(([shape,count])=>(
                                  <div key={shape} style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                                    <span style={{fontSize:"12px",color:D.text,textTransform:"capitalize"}}>{shape}</span>
                                    <span style={{fontSize:"12px",color:D.muted}}>{count} ({Math.round((count/cs.count)*100)}%)</span>
                                  </div>
                                ))}
                              </div>
                              <div>
                                <div style={{fontSize:"11px",color:D.muted,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"1px"}}>Launch Angles</div>
                                {Object.entries(cs.launches).sort((a,b)=>b[1]-a[1]).map(([launch,count])=>(
                                  <div key={launch} style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                                    <span style={{fontSize:"12px",color:D.text,textTransform:"capitalize"}}>{launch}</span>
                                    <span style={{fontSize:"12px",color:D.muted}}>{count} ({Math.round((count/cs.count)*100)}%)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div style={{marginTop:"12px",fontSize:"13px",color:D.muted,fontStyle:"italic"}}>
                              Distance range: {cs.minCarry}y (min) — {cs.avgCarry}y (avg) — {cs.maxCarry}y (max)
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab==="social"&&(
          <div style={{display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",background:D.dark,borderBottom:`1px solid ${D.border}`,position:"sticky",top:"64px",zIndex:10}}>
              {[{id:"feed",label:"Feed"},{id:"leaderboard",label:"🏆 Board"},{id:"friends",label:"Friends"},{id:"rounds",label:"My Rounds"}].map(t=>(
                <button key={t.id} onClick={()=>setSocialTab(t.id)} style={{flex:1,padding:"10px 4px",background:"transparent",border:"none",borderBottom:`2px solid ${socialTab===t.id?D.green:"transparent"}`,color:socialTab===t.id?D.green:D.muted,fontSize:"11px",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:socialTab===t.id?"600":"400"}}>{t.label}</button>
              ))}
            </div>
            <div style={{padding:"16px"}}>
              {socialTab==="feed"&&(
                <>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"22px",fontWeight:"700",letterSpacing:"-0.3px",color:D.white,marginBottom:"16px"}}>Activity Feed</div>
                  {feed.length===0?(
                    <div style={{textAlign:"center",padding:"48px 20px"}}>
                      <div style={{fontSize:"52px",marginBottom:"14px"}}>👥</div>
                      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:"700",color:D.white,marginBottom:"8px"}}>Find Your Crew</div>
                      <div style={{color:D.muted,fontSize:"14px",lineHeight:1.6}}>Add friends to see their rounds, trash talk them, and compete on the leaderboard</div>
                      <button onClick={()=>setSocialTab("friends")} style={{...S.btnPrimary,marginTop:"20px",maxWidth:"200px",margin:"20px auto 0"}}>Find Friends</button>
                    </div>
                  ):feed.map((r,i)=>{
                    const diff=r.total_score-r.total_par;
                    const isMe=r.user_id===user?.id;
                    return(
                      <div key={i} style={{background:D.card,border:`1px solid ${D.border}`,borderRadius:"16px",marginBottom:"12px",overflow:"hidden"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
                          <Avatar name={r.profile?.full_name} size={44} highlight={isMe} photoUrl={r.profile?.avatar_url} onClick={()=>r.profile?.avatar_url&&setShowAvatarZoom(r.profile.avatar_url)}/>
                          <div style={{flex:1}}><div style={{fontWeight:"600",color:D.white,fontSize:"15px"}}>{r.profile?.full_name||"Golfer"}{isMe?" (You)":""}</div><div style={{fontSize:"12px",color:D.muted}}>{fmtDateShort(r.played_at)}</div></div>
                          <ScorePill score={r.total_score} par={r.total_par}/>
                        </div>
                        <div style={{background:D.surface,borderRadius:"10px",padding:"10px 14px",marginBottom:"12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:"700",color:D.text,fontSize:"15px"}}>{r.course_name||"Unknown Course"}</div><div style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>{r.holes_played} holes · par {r.total_par}</div></div>
                          <div style={{textAlign:"right"}}><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"30px",fontWeight:"800",color:diff<0?D.green:diff===0?D.blue:D.red,lineHeight:1}}>{r.total_score}</div><div style={{fontSize:"11px",color:D.muted}}>strokes</div></div>
                        </div>
                        <div style={{display:"flex",gap:"8px"}}>
                          <button onClick={()=>{const j=randJab();setJabPost(j);}} style={{...S.pill,flex:1,textAlign:"center"}}>😂 Jab</button>
                          <button onClick={()=>speak(`${r.profile?.full_name||"Your buddy"} shot ${r.total_score} at ${r.course_name||"the course"}. ${diff<0?"Birdie machine!":diff===0?"Solid par golf.":"Keep grinding!"}`)} style={{...S.pill,flex:1,textAlign:"center"}}>👏 React</button>
                          {isMe&&<button onClick={()=>shareRound(r)} style={{background:D.accentDim,border:`1px solid ${D.accent}44`,borderRadius:"99px",padding:"5px 14px",color:D.accent,fontSize:"12px",cursor:"pointer",fontFamily:"'Inter',sans-serif",flex:1,textAlign:"center"}}>📤 Share</button>}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {socialTab==="leaderboard"&&(
                <>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"22px",fontWeight:"700",letterSpacing:"-0.3px",color:D.white,marginBottom:"4px"}}>Monthly Board</div>
                  <div style={{color:D.muted,fontSize:"13px",marginBottom:"16px"}}>Best rounds among you and your friends this month</div>
                  {leaderboard.length===0?(
                    <div style={{textAlign:"center",padding:"48px 20px"}}><div style={{fontSize:"52px",marginBottom:"14px"}}>🏆</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",color:D.white,marginBottom:"8px"}}>No rounds yet</div><div style={{color:D.muted,fontSize:"14px"}}>Save a round to appear here</div></div>
                  ):leaderboard.map((r,i)=>{
                    const diff=r.total_score-r.total_par;
                    const isMe=r.user_id===user?.id;
                    const medals=["🥇","🥈","🥉"];
                    return(
                      <div key={i} style={{background:i===0?`linear-gradient(135deg,${D.accentDim},${D.surface})`:D.card,border:`1px solid ${i===0?D.green:D.border}`,borderRadius:"16px",padding:"14px 16px",marginBottom:"10px",display:"flex",alignItems:"center",gap:"12px"}}>
                        <div style={{fontSize:"28px",minWidth:"36px",textAlign:"center"}}>{medals[i]||`${i+1}`}</div>
                        <Avatar name={r.profile?.full_name} size={40} highlight={isMe} photoUrl={r.profile?.avatar_url}/>
                        <div style={{flex:1}}><div style={{fontWeight:"600",color:D.white,fontSize:"14px"}}>{r.profile?.full_name||"Golfer"}{isMe?" 👈":""}</div><div style={{fontSize:"12px",color:D.muted}}>{r.course_name||"Unknown"} · {fmtDateShort(r.played_at)}</div></div>
                        <div style={{textAlign:"right"}}><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"24px",fontWeight:"700",letterSpacing:"-0.3px",color:diff<0?D.green:diff===0?D.blue:D.red,lineHeight:1}}>{diff>0?`+${diff}`:diff===0?"E":diff}</div><div style={{fontSize:"11px",color:D.muted}}>{r.total_score}</div></div>
                      </div>
                    );
                  })}
                </>
              )}
              {socialTab==="friends"&&(
                <>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"22px",fontWeight:"700",letterSpacing:"-0.3px",color:D.white,marginBottom:"16px"}}>Friends</div>
                  {friendReqs.length>0&&(
                    <div style={{marginBottom:"20px"}}>
                      <div style={{fontSize:"11px",color:D.gold,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>FRIEND REQUESTS ({friendReqs.length})</div>
                      {friendReqs.map(req=>(
                        <div key={req.id} style={{...S.card,display:"flex",alignItems:"center",gap:"12px",marginBottom:"8px"}}>
                          <Avatar name={req.requester?.full_name} size={44} photoUrl={req.requester?.avatar_url}/>
                          <div style={{flex:1}}><div style={{fontWeight:"600",color:D.white,fontSize:"15px"}}>{req.requester?.full_name}</div><div style={{fontSize:"12px",color:D.muted}}>wants to connect</div></div>
                          <button onClick={()=>acceptFriendReq(req.id,req.user_id)} style={{background:`linear-gradient(135deg,${D.green},#16a34a)`,border:"none",borderRadius:"10px",padding:"8px 16px",color:"#fff",fontWeight:"600",fontSize:"13px",cursor:"pointer"}}>Accept</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{marginBottom:"20px"}}>
                    <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>FIND PLAYERS</div>
                    <input placeholder="Search by name..." value={searchQ} onChange={e=>{setSearchQ(e.target.value);searchUsers(e.target.value);}} style={{...S.input,marginBottom:"10px"}}/>
                    {searchRes.map(u=>(
                      <div key={u.id} style={{...S.card,display:"flex",alignItems:"center",gap:"12px",marginBottom:"8px"}}>
                        <Avatar name={u.full_name} size={44} photoUrl={u.avatar_url}/>
                        <div style={{flex:1}}><div style={{fontWeight:"600",color:D.white,fontSize:"15px"}}>{u.full_name}</div><div style={{fontSize:"12px",color:D.muted}}>HCP {u.handicap_index||"—"} · {u.handicap_category||"golfer"}</div></div>
                        <button onClick={()=>sendFriendReq(u.id)} style={{background:D.accentDim,border:`1px solid ${D.accent}44`,borderRadius:"10px",padding:"8px 14px",color:D.accent,fontWeight:"600",fontSize:"13px",cursor:"pointer"}}>+ Add</button>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>MY FRIENDS ({friends.length})</div>
                  {friends.length===0?<div style={{textAlign:"center",padding:"24px",color:D.muted,fontSize:"14px"}}>Search above to add your first friend</div>:friends.map(f=>(
                    <div key={f.id} style={{...S.card,display:"flex",alignItems:"center",gap:"12px",marginBottom:"8px"}}>
                      <Avatar name={f.full_name} size={44} photoUrl={f.avatar_url} onClick={()=>f.avatar_url&&setShowAvatarZoom(f.avatar_url)}/>
                      <div style={{flex:1}}><div style={{fontWeight:"600",color:D.white,fontSize:"15px"}}>{f.full_name}</div><div style={{fontSize:"12px",color:D.muted}}>HCP {f.handicap_index||"—"} · {f.handicap_category||"golfer"}</div></div>
                      <div style={{fontSize:"22px"}}>⛳</div>
                    </div>
                  ))}
                </>
              )}
              {socialTab==="rounds"&&(
                <>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"22px",fontWeight:"700",letterSpacing:"-0.3px",color:D.white,marginBottom:"16px"}}>My Rounds</div>
                  {roundHistory.length===0?<div style={{textAlign:"center",padding:"48px 20px"}}><div style={{fontSize:"52px",marginBottom:"14px"}}>📋</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",color:D.white,marginBottom:"8px"}}>No rounds saved yet</div><div style={{color:D.muted,fontSize:"14px"}}>Save a round from the Scorecard tab</div></div>:roundHistory.map((r,i)=>{
                    const diff=r.total_score-r.total_par;
                    return(
                      <div key={i} style={{...S.card,marginBottom:"12px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
                          <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:"700",color:D.white,fontSize:"16px"}}>{r.course_name||"Unknown Course"}</div><div style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>{fmtDate(r.played_at)} · {r.holes_played} holes</div></div>
                          <div style={{textAlign:"right"}}><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"32px",fontWeight:"800",color:diff<0?D.green:diff===0?D.blue:D.red,lineHeight:1}}>{r.total_score}</div><div style={{fontSize:"11px",color:D.muted}}>{diff>0?`+${diff}`:diff===0?"even par":`${diff}`}</div></div>
                        </div>
                        <div style={{display:"flex",gap:"8px"}}>
                          <button onClick={()=>setShowCard(r)} style={{...S.pill,flex:1,textAlign:"center"}}>📊 Summary Card</button>
                          <button onClick={()=>shareRound(r)} style={{background:D.accentDim,border:`1px solid ${D.accent}44`,borderRadius:"99px",padding:"5px 14px",color:D.accent,fontSize:"12px",cursor:"pointer",fontFamily:"'Inter',sans-serif",flex:1,textAlign:"center"}}>📤 Share</button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {tab==="profile"&&(
          <div style={{padding:"20px 16px"}}>
            <div style={{background:D.card,border:`1px solid ${D.border}`,borderRadius:"20px",padding:"24px",marginBottom:"20px",textAlign:"center"}}>
              {/* Avatar with upload */}
              <div style={{position:"relative",display:"inline-block",marginBottom:"4px"}}>
                <Avatar name={userProfile?.full_name||user?.email} size={80} highlight photoUrl={avatarUrl} onClick={()=>avatarUrl&&setShowAvatarZoom(avatarUrl)}/>
                <button onClick={()=>avatarInputRef.current?.click()} style={{position:"absolute",bottom:0,right:0,width:"28px",height:"28px",borderRadius:"50%",background:D.accent,border:"2px solid "+D.dark,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"14px"}}>
                  {uploadingAvatar?"⏳":"📷"}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={e=>uploadAvatar(e.target.files[0])} style={{display:"none"}}/>
              </div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"22px",fontWeight:"700",letterSpacing:"-0.3px",color:D.white,marginTop:"10px"}}>{userProfile?.full_name||"Golfer"}</div>
              <div style={{fontSize:"13px",color:D.muted,marginTop:"4px"}}>{user?.email}</div>
              <div style={{display:"flex",justifyContent:"center",gap:"28px",marginTop:"20px"}}>
                {[["Rounds",roundHistory.length,"📋"],["Friends",friends.length,"👥"],["HCP",userProfile?.handicap_index||"—","⛳"]].map(([l,v,icon])=>(
                  <div key={l} style={{textAlign:"center"}}><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"24px",fontWeight:"700",letterSpacing:"-0.3px",color:D.accent}}>{v}</div><div style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>{icon} {l}</div></div>
                ))}
              </div>
            </div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"17px",fontWeight:"600",letterSpacing:"-0.2px",color:D.white,marginBottom:"14px"}}>Settings</div>

            {/* Name */}
            <div style={{marginBottom:"18px"}}>
              <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>Your Name</div>
              <input
                placeholder="Enter your full name"
                defaultValue={userProfile?.full_name||""}
                id="profile-name-input"
                style={{...S.input}}
              />
            </div>

            {/* Dark / Light mode toggle */}
            <div style={{marginBottom:"18px"}}>
              <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>Display</div>
              <button onClick={()=>setDarkMode(d=>!d)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:D.surface,border:`1.5px solid ${D.border}`,borderRadius:"14px",padding:"14px 16px",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                <span style={{color:D.text,fontSize:"15px",fontWeight:"500"}}>{darkMode?"🌙 Dark Mode":"☀️ Light Mode"}</span>
                <div style={{width:"48px",height:"26px",borderRadius:"13px",background:darkMode?D.accentDim:D.border,border:`1.5px solid ${darkMode?D.green:D.border}`,position:"relative",transition:"all 0.2s"}}>
                  <div style={{position:"absolute",top:"3px",left:darkMode?"24px":"3px",width:"18px",height:"18px",borderRadius:"50%",background:darkMode?D.green:D.muted,transition:"all 0.2s"}}/>
                </div>
              </button>
            </div>
            <div style={{marginBottom:"18px"}}>
              <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>Caddie Style</div>
              {PERSONAS.map(p=>(
                <button key={p.id} onClick={()=>setProfile(prev=>({...prev,persona:p.id}))} style={{display:"flex",alignItems:"center",gap:"14px",width:"100%",background:profile.persona===p.id?D.accentDim:D.surface,border:`1.5px solid ${profile.persona===p.id?D.green:D.border}`,borderRadius:"14px",padding:"14px",marginBottom:"8px",cursor:"pointer"}}>
                  <span style={{fontSize:"22px"}}>{p.icon}</span>
                  <div style={{flex:1,textAlign:"left"}}><div style={{fontWeight:"600",color:D.white,fontSize:"15px"}}>{p.label}</div><div style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>{p.desc}</div></div>
                  {profile.persona===p.id&&<div style={{width:"22px",height:"22px",borderRadius:"50%",background:D.accent,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"12px"}}>✓</div>}
                </button>
              ))}
            </div>
            <div style={{marginBottom:"18px"}}>
              <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>Handicap</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                {HANDICAPS.map(h=>(
                  <button key={h.value} onClick={()=>setProfile(p=>({...p,handicap:h.value,hcp:h.hcp}))} style={{background:profile.handicap===h.value?D.accentDim:D.surface,border:`1.5px solid ${profile.handicap===h.value?D.green:D.border}`,borderRadius:"14px",padding:"14px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center"}}>
                    <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:"700",fontSize:"16px",color:profile.handicap===h.value?D.accent:D.text}}>{h.label}</span>
                    <span style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>HCP {h.sub}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:"18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase"}}>My Bag</div>
                <button onClick={()=>setEditingBag(!editingBag)} style={{background:editingBag?D.accentDim:D.surface,border:`1px solid ${editingBag?D.green:D.border}`,borderRadius:"99px",padding:"5px 14px",color:editingBag?D.green:D.muted,fontSize:"12px",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>{editingBag?"✓ Done":"Edit Distances"}</button>
              </div>
              {profile.bag.map((item,idx)=>(
                <div key={idx} style={{display:"flex",alignItems:"center",gap:"12px",padding:"9px 14px",background:D.surface,borderRadius:"10px",border:`1px solid ${D.border}`,marginBottom:"4px"}}>
                  <span style={{color:D.muted,fontSize:"13px",minWidth:"72px"}}>{item.club}</span>
                  {editingBag?<input type="number" value={item.carry} onChange={e=>{const nb=[...profile.bag];nb[idx]={...nb[idx],carry:parseInt(e.target.value)||0};setProfile(p=>({...p,bag:nb}));}} style={{...S.input,width:"70px",padding:"4px 10px",fontSize:"14px"}}/>:<div style={{flex:1,height:"4px",background:D.border,borderRadius:"2px"}}><div style={{height:"100%",width:`${(item.carry/260)*100}%`,background:`linear-gradient(90deg,${D.green},${D.accent})`,borderRadius:"2px",opacity:0.8}}/></div>}
                  <span style={{color:D.text,fontSize:"14px",fontWeight:"600",minWidth:"44px",textAlign:"right"}}>{item.carry}y</span>
                </div>
              ))}
            </div>
            {/* Dexterity */}
            <div style={{marginBottom:"18px"}}>
              <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>Dexterity</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                {[{v:"right",label:"Right Handed",icon:"🏌️"},{v:"left",label:"Left Handed",icon:"🏌️‍♂️"}].map(dx=>(
                  <button key={dx.v} onClick={()=>setProfile(p=>({...p,dexterity:dx.v}))} style={{background:profile.dexterity===dx.v?D.accentDim:D.surface,border:`1.5px solid ${profile.dexterity===dx.v?D.green:D.border}`,borderRadius:"14px",padding:"14px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"6px"}}>
                    <span style={{fontSize:"24px"}}>{dx.icon}</span>
                    <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:"700",fontSize:"13px",color:profile.dexterity===dx.v?D.accent:D.text}}>{dx.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Home Course */}
            <div style={{marginBottom:"18px"}}>
              <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>Home Course</div>
              <input placeholder="e.g. Pebble Beach, Augusta National..." value={profile.homeCourse||""} onChange={e=>setProfile(p=>({...p,homeCourse:e.target.value}))} style={{...S.input}}/>
              <div style={{fontSize:"11px",color:D.muted,marginTop:"6px"}}>Obi will use this to give you course-specific tips</div>
            </div>

            <div style={{marginBottom:"18px"}}>
              <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>Typical Miss</div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                {["straight","fade","slice","draw","hook","pull","push"].map(m=>(
                  <button key={m} onClick={()=>setProfile(p=>({...p,missTend:m}))} style={{background:profile.missTend===m?D.accentDim:D.surface,border:`1.5px solid ${profile.missTend===m?D.green:D.border}`,color:profile.missTend===m?D.green:D.muted,borderRadius:"99px",padding:"7px 14px",fontSize:"13px",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:profile.missTend===m?"600":"400"}}>{m}</button>
                ))}
              </div>
            </div>
            <button onClick={saveProfile} style={{...S.btnPrimary,marginBottom:"10px"}}>💾 Save Changes</button>
            <button onClick={fetchWeather} style={{...S.btnSecondary,marginBottom:"10px"}}>{wxLoading?"Refreshing...":"🔄 Refresh Weather"}</button>
            <button onClick={handleLogout} style={{background:"transparent",border:`1.5px solid ${D.red}44`,borderRadius:"14px",color:D.red,fontSize:"15px",padding:"13px",cursor:"pointer",fontFamily:"'Inter',sans-serif",width:"100%",marginBottom:"20px"}}>Sign Out</button>
          </div>
        )}
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS=`
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
  @keyframes popIn    {from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}
  @keyframes fadeUp   {from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  @keyframes slideIn  {from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
  @keyframes pulse    {0%,100%{opacity:1}50%{opacity:0.35}}
  @keyframes bounce   {0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes shimmer  {0%{background-position:-200px 0}100%{background-position:200px 0}}
  input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
  select option{background:#1e1e27;color:#e2e8f0}
  ::-webkit-scrollbar{width:3px;height:3px}
  ::-webkit-scrollbar-thumb{background:#2a2a38;border-radius:2px}
  *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
  input:focus,textarea:focus,select:focus{border-color:#34d399 !important;outline:none}
  button:active{transform:scale(0.97)}
`;
