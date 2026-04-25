/** @jsxRuntime classic */
/** @jsx React.createElement */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";

// Fonts
const fontLink = document.createElement("link");
fontLink.rel  = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap";
if(!document.querySelector('link[href*="Space+Grotesk"]')) document.head.appendChild(fontLink);

// -- Design System ------------------------------------------------─
// Accent: clean golf-flag green used sparingly as an action color only
// Base: near-black / near-white with warm neutral cards
const DARK_THEME = {
  bg:       "#0c0c0f",      // near black with cool tint
  dark:     "#111116",      // top bar / nav
  surface:  "#18181f",      // inputs, secondary surfaces
  card:     "#1e1e27",      // cards
  cardHov:  "#232330",      // card hover
  border:   "#2a2a38",      // subtle borders
  accent:   "#34d399",      // emerald - used SPARINGLY for CTAs only
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
  const borderColor = highlight ? "#34d399" : (T ? T.border : "#2a2a38");
  const shadowColor = highlight ? "#064e3b" : "none";
  return (
    <div onClick={onClick} style={{ width:size,height:size,borderRadius:"50%",overflow:"hidden",border:`2px solid ${borderColor}`,flexShrink:0,cursor:onClick?"pointer":"default",background:grad,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:highlight?`0 0 0 3px ${shadowColor}`:"none" }}>
      {photoUrl && photoUrl.length > 0
        ? <img src={photoUrl} alt={name||"avatar"} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={(e)=>{ e.target.style.display="none"; }}/>
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
  const D = DARK_THEME; // fallback theme for this standalone function
  const apiKey = await fetch("/api/gemini-key").then(r=>r.json()).then(d=>d.key).catch(()=>null);
  if (!apiKey) throw new Error("Could not get API key");

  const promptText = "You are an expert PGA teaching professional analyzing a full golf swing video. Player HCP: "+hcp+". Notes: "+(notes||"none")+".\nWatch the FULL swing motion and analyze: Setup, Backswing, Downswing, Impact, Follow Through.\nGive: PRIMARY FAULT (most important thing to fix), DRILL (specific drill to fix it), POSITIVES (1-2 things they do well).\nBe specific about timing, sequencing, speed. Write like a great teaching pro.";

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


// -- Shot Shape Diagram Component --------------------------------─
function ShotShapeDiagram({ result, club, dexterity, T }) {
  const [progress, setProgress] = useState(0);
  T = T || DARK_THEME;
  dexterity = dexterity || "right";

  useEffect(() => {
    setProgress(0);
    const delay = setTimeout(() => {
      let p = 0;
      const iv = setInterval(() => {
        p += 1.5;
        setProgress(Math.min(p, 100));
        if (p >= 100) clearInterval(iv);
      }, 16);
      return () => clearInterval(iv);
    }, 300);
    return () => clearTimeout(delay);
  }, [result]);

  if (!result || result.error) return null;

  const shape   = result.shot_shape      || "straight";
  const launch  = result.launch_angle    || "mid";
  const carry   = result.estimated_carry || 150;
  const contact = result.contact_quality || "flush";
  const tip     = result.tip             || "";
  const path    = result.swing_path      || "neutral";
  const isLeft  = dexterity === "left";

  const shapeConfig = {
    "straight":    { curve: 0,                    color: "#94a3b8", label: "Straight",    dir: "→" },
    "slight draw": { curve: isLeft?-0.12:0.12,    color: "#34d399", label: "Slight Draw", dir: isLeft?"↙":"↘" },
    "draw":        { curve: isLeft?-0.25:0.25,    color: "#10b981", label: "Draw",        dir: isLeft?"↙":"↘" },
    "strong draw": { curve: isLeft?-0.40:0.40,    color: "#059669", label: "Strong Draw", dir: isLeft?"↙":"↘" },
    "hook":        { curve: isLeft?-0.55:0.55,    color: "#f59e0b", label: "Hook",        dir: isLeft?"↙":"↘" },
    "slight fade": { curve: isLeft?0.12:-0.12,    color: "#818cf8", label: "Slight Fade", dir: isLeft?"↘":"↙" },
    "fade":        { curve: isLeft?0.25:-0.25,    color: "#6366f1", label: "Fade",        dir: isLeft?"↘":"↙" },
    "strong fade": { curve: isLeft?0.40:-0.40,    color: "#ef4444", label: "Strong Fade", dir: isLeft?"↘":"↙" },
    "slice":       { curve: isLeft?0.60:-0.60,    color: "#f87171", label: "Slice",       dir: isLeft?"↘":"↙" },
  };
  const cfg    = shapeConfig[shape] || shapeConfig["straight"];
  const peakPct = { "low":0.18,"mid-low":0.28,"mid":0.38,"mid-high":0.48,"high":0.58 }[launch] || 0.38;
  const contactColor = contact==="flush" ? "#34d399"
    : (contact.includes("thin")||contact.includes("fat")) ? "#f87171" : "#f59e0b";

  // -- Overhead view (top-down) --------------------------
  const OW=320, OH=200;
  const oSx=OW*0.5, oSy=OH*0.88;   // tee at bottom-center
  const oEx=OW*0.5 + OW*cfg.curve*0.55, oEy=OH*0.08;  // carry point at top
  const oMx=(oSx+oEx)/2 + (oEx-oSx)*0.3, oMy=OH*0.48;

  function overheadPath(pct) {
    const t2=pct/100, steps=Math.max(2,Math.floor(t2*50)), pts=[];
    for(let i=0;i<=steps;i++){
      const s=(t2*i)/steps;
      const x=(1-s)*(1-s)*oSx+2*(1-s)*s*oMx+s*s*oEx;
      const y=(1-s)*(1-s)*oSy+2*(1-s)*s*oMy+s*s*oEy;
      pts.push((i===0?"M ":"L ")+x.toFixed(1)+" "+y.toFixed(1));
    }
    return pts.join(" ");
  }

  const ot=progress/100;
  const oBx=(1-ot)*(1-ot)*oSx+2*(1-ot)*ot*oMx+ot*ot*oEx;
  const oBy=(1-ot)*(1-ot)*oSy+2*(1-ot)*ot*oMy+ot*ot*oEy;

  // -- Side view (height profile) ------------------------
  const SW=320, SH=120;
  const sSx=30, sSy=SH*0.88;
  const sEx=SW-20, sEy=SH*0.88;
  const sMx=(sSx+sEx)/2, sMy=SH*(1-peakPct)*0.9;

  function sidePath(pct) {
    const t2=pct/100, steps=Math.max(2,Math.floor(t2*50)), pts=[];
    for(let i=0;i<=steps;i++){
      const s=(t2*i)/steps;
      const x=(1-s)*(1-s)*sSx+2*(1-s)*s*sMx+s*s*sEx;
      const y=(1-s)*(1-s)*sSy+2*(1-s)*s*sMy+s*s*sEy;
      pts.push((i===0?"M ":"L ")+x.toFixed(1)+" "+y.toFixed(1));
    }
    return pts.join(" ");
  }

  const st=progress/100;
  const sBx=(1-st)*(1-st)*sSx+2*(1-st)*st*sMx+st*st*sEx;
  const sBy=(1-st)*(1-st)*sSy+2*(1-st)*st*sMy+st*st*sEy;

  // Peak ball position
  const peakT=0.5;
  const peakX=(1-peakT)*(1-peakT)*sSx+2*(1-peakT)*peakT*sMx+peakT*peakT*sEx;
  const peakY=sMy;

  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:"18px",overflow:"hidden",marginBottom:"16px"}}>

      {/* Header */}
      <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"15px",fontWeight:"700",color:T.white}}>Shot Tracer</div>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{width:"8px",height:"8px",borderRadius:"50%",background:cfg.color,boxShadow:`0 0 6px ${cfg.color}`}}/>
          <span style={{fontSize:"13px",fontWeight:"700",color:cfg.color,fontFamily:"'Space Grotesk',sans-serif"}}>{cfg.label}</span>
        </div>
      </div>

      {/* -- TOP DOWN VIEW -- */}
      <div style={{padding:"10px 16px 0",borderBottom:`1px solid ${T.border}40`}}>
        <div style={{fontSize:"9px",color:T.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"4px"}}>TOP-DOWN SHAPE</div>
        <svg width="100%" viewBox={`0 0 ${OW} ${OH}`} style={{display:"block"}}>
          <defs>
            <linearGradient id="trailGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={cfg.color} stopOpacity="0.1"/>
              <stop offset="100%" stopColor={cfg.color} stopOpacity="0.8"/>
            </linearGradient>
          </defs>

          {/* Fairway guide */}
          <rect x={OW*0.35} y={OH*0.04} width={OW*0.3} height={OH*0.8} rx="4" fill={T.surface} opacity="0.3"/>

          {/* Target line */}
          <line x1={oSx} y1={oSy} x2={oSx} y2={OH*0.05} stroke={T.border} strokeWidth="1" strokeDasharray="5,6" opacity="0.5"/>

          {/* Glow under path */}
          {progress>5&&<path d={overheadPath(progress)} stroke={cfg.color} strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.08"/>}

          {/* Main tracer line */}
          {progress>0&&<path d={overheadPath(progress)} stroke="url(#trailGrad)" strokeWidth="3" strokeLinecap="round" fill="none"/>}

          {/* Trail dots */}
          {[15,30,45,60,75,90].map(pct=>{
            if(progress<pct)return null;
            const tp=pct/100;
            const dx=(1-tp)*(1-tp)*oSx+2*(1-tp)*tp*oMx+tp*tp*oEx;
            const dy=(1-tp)*(1-tp)*oSy+2*(1-tp)*tp*oMy+tp*tp*oEy;
            const sz=pct>60?4:3;
            return <circle key={pct} cx={dx} cy={dy} r={sz} fill={cfg.color} opacity={pct/120}/>;
          })}

          {/* Ball */}
          {progress>0&&progress<100&&(
            <g>
              <circle cx={oBx} cy={oBy} r="9" fill={cfg.color} opacity="0.15"/>
              <circle cx={oBx} cy={oBy} r="5.5" fill="#f59e0b"/>
              <circle cx={oBx-1.5} cy={oBy-1.5} r="1.5" fill="#fff" opacity="0.7"/>
            </g>
          )}

          {/* Landing marker */}
          {progress>=98&&(
            <g>
              <circle cx={oEx} cy={oEy} r="14" fill={cfg.color} opacity="0.1"/>
              <circle cx={oEx} cy={oEy} r="8"  fill={cfg.color} opacity="0.25"/>
              <circle cx={oEx} cy={oEy} r="5"  fill={cfg.color}/>
              <circle cx={oEx} cy={oEy} r="2"  fill="#fff"/>
            </g>
          )}

          {/* Carry label */}
          {progress>=85&&(
            <g opacity={Math.min(1,(progress-85)/15)}>
              <rect x={oEx-22} y={oEy-24} width="44" height="18" rx="6" fill={T.surface}/>
              <text x={oEx} y={oEy-12} textAnchor="middle" fontSize="11" fontFamily="Space Grotesk,sans-serif" fontWeight="700" fill={cfg.color}>{carry}y</text>
            </g>
          )}

          {/* Tee */}
          <circle cx={oSx} cy={oSy} r="6" fill={T.surface} stroke={T.muted} strokeWidth="1.5"/>
          <circle cx={oSx} cy={oSy} r="3" fill={T.muted}/>
          <text x={oSx} y={oSy+14} textAnchor="middle" fontSize="8" fill={T.muted} fontFamily="Inter,sans-serif" letterSpacing="1">TEE</text>
        </svg>
      </div>

      {/* -- SIDE PROFILE VIEW -- */}
      <div style={{padding:"10px 16px 6px",borderBottom:`1px solid ${T.border}40`}}>
        <div style={{fontSize:"9px",color:T.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"4px"}}>SIDE PROFILE - HEIGHT</div>
        <svg width="100%" viewBox={`0 0 ${SW} ${SH}`} style={{display:"block"}}>
          <defs>
            <linearGradient id="heightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={cfg.color} stopOpacity="0.6"/>
              <stop offset="50%" stopColor={cfg.color} stopOpacity="1"/>
              <stop offset="100%" stopColor={cfg.color} stopOpacity="0.4"/>
            </linearGradient>
          </defs>

          {/* Ground */}
          <line x1={sSx-5} y1={sSy} x2={sEx+5} y2={sEy} stroke={T.border} strokeWidth="1.5"/>
          {/* Distance markers */}
          {[25,50,75].map(pct=>{
            const gx=sSx+(sEx-sSx)*pct/100;
            return <line key={pct} x1={gx} y1={sSy} x2={gx} y2={sSy+4} stroke={T.border} strokeWidth="1" opacity="0.5"/>;
          })}

          {/* Fill under curve */}
          {progress>10&&(
            <path d={sidePath(progress)+" L "+Math.min(sSx+(sEx-sSx)*progress/100,sEx).toFixed(1)+" "+sSy+" L "+sSx+" "+sSy+" Z"} fill={cfg.color} opacity="0.07"/>
          )}

          {/* Glow */}
          {progress>5&&<path d={sidePath(progress)} stroke={cfg.color} strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.1"/>}

          {/* Main curve */}
          {progress>0&&<path d={sidePath(progress)} stroke="url(#heightGrad)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>}

          {/* Apex marker */}
          {progress>=50&&(
            <g opacity={Math.min(1,(progress-50)/25)}>
              <line x1={peakX} y1={peakY} x2={peakX} y2={sSy} stroke={cfg.color} strokeWidth="1" strokeDasharray="3,4" opacity="0.4"/>
              <circle cx={peakX} cy={peakY} r="4" fill={cfg.color} opacity="0.9"/>
            </g>
          )}

          {/* Ball */}
          {progress>0&&progress<100&&(
            <g>
              <circle cx={sBx} cy={sBy} r="7" fill={cfg.color} opacity="0.1"/>
              <circle cx={sBx} cy={sBy} r="4.5" fill="#f59e0b"/>
              <circle cx={sBx-1} cy={sBy-1} r="1.2" fill="#fff" opacity="0.7"/>
            </g>
          )}

          {/* Labels */}
          {progress>=60&&(
            <text x={peakX} y={peakY-8} textAnchor="middle" fontSize="9" fill={T.muted} fontFamily="Inter,sans-serif">{launch}</text>
          )}
          <text x={sSx} y={sSy+12} textAnchor="middle" fontSize="8" fill={T.muted} fontFamily="Inter,sans-serif">TEE</text>
          <text x={sEx} y={sEy+12} textAnchor="middle" fontSize="8" fill={T.muted} fontFamily="Inter,sans-serif">{carry}y</text>
        </svg>
      </div>

      {/* -- Stats grid -- */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1px",background:T.border}}>
        {[
          ["Carry",   `${carry}y`,      cfg.color],
          ["Shape",   cfg.label,        cfg.color],
          ["Launch",  launch,           T.text],
          ["Strike",  contact,          contactColor],
          ["Path",    path,             T.muted],
          ["Flight",  result.ball_flight||"mid", T.muted],
        ].map(([label,value,color])=>(
          <div key={label} style={{background:T.card,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:"9px",color:T.muted,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"3px"}}>{label}</div>
            <div style={{fontSize:"11px",fontWeight:"600",color,fontFamily:"'Space Grotesk',sans-serif",textTransform:"capitalize",lineHeight:"1.3"}}>{value}</div>
          </div>
        ))}
      </div>

      {/* -- Tip -- */}
      {tip&&(
        <div style={{padding:"12px 16px",display:"flex",gap:"10px",alignItems:"flex-start"}}>
          <div style={{fontSize:"16px",flexShrink:0}}>💡</div>
          <div style={{fontSize:"13px",color:T.text,lineHeight:"1.5"}}>{tip}</div>
        </div>
      )}
    </div>
  );
}

// -- Error Boundary ----------------------------------------------─
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state={hasError:false,error:null}; }
  static getDerivedStateFromError(e){ return {hasError:true,error:e}; }
  componentDidCatch(e,i){ console.error("Caught:",e,i); }
  render(){
    if(this.state.hasError) return (
      <div style={{minHeight:"100vh",background:"#0c0c0f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif",padding:"24px",textAlign:"center"}}>
        <div style={{fontSize:"48px",marginBottom:"16px"}}>⛳</div>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:"700",color:"#f1f5f9",marginBottom:"8px"}}>Something went wrong</div>
        <div style={{fontSize:"13px",color:"#64748b",marginBottom:"8px"}}>{this.state.error?.message||"Unknown error"}</div>
        <div style={{fontSize:"13px",color:"#64748b",marginBottom:"24px"}}>Your data is safe.</div>
        <button onClick={()=>window.location.reload()} style={{background:"#34d399",border:"none",borderRadius:"12px",color:"#fff",fontSize:"15px",padding:"12px 28px",cursor:"pointer",fontWeight:"600"}}>Reload App</button>
      </div>
    );
    return this.props.children;
  }
}

// -- Multi-Step Onboarding Component ------------------------------
function OnboardingFlow({ D, S, profile, setProfile, authName, setAuthName, onComplete }) {
  const [step, setStep] = useState(0);
  const [localName, setLocalName] = useState(authName || "");
  const [homeCourse, setHomeCourse] = useState("");
  const [ageRange, setAgeRange] = useState("");

  const steps = [
    { id: "name",      title: "What's your name?",           sub: "Obi will use this every time you play" },
    { id: "dexterity", title: "How do you swing?",           sub: "Obi tailors all advice to your swing side" },
    { id: "handicap",  title: "What's your level?",          sub: "Helps Obi calibrate strategy and advice" },
    { id: "age",       title: "What's your age range?",      sub: "Optional - helps personalize coaching style" },
    { id: "course",    title: "Do you have a home course?",  sub: "Optional - Obi will know it well" },
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
      // Final step - save everything and complete
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
        <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${D.accent}, ${D.accent})`, borderRadius: "2px", transition: "width 0.4s ease" }}/>
      </div>

      {/* Step indicator */}
      <div style={{ fontSize: "11px", color: D.muted, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px", textAlign: "center" }}>
        Step {step + 1} of {steps.length}
      </div>

      <div style={{ ...S.card, marginBottom: "16px" }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "22px", fontWeight: "700", color: D.white, marginBottom: "6px" }}>{current.title}</div>
        <div style={{ color: D.muted, fontSize: "14px", marginBottom: "20px" }}>{current.sub}</div>

        {/* STEP 0 - Name */}
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

        {/* STEP 1 - Dexterity */}
        {current.id === "dexterity" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { v: "right", label: "Right Handed", icon: "🏌️", desc: "Standard swing" },
              { v: "left",  label: "Left Handed",  icon: "🏌️‍♂️", desc: "Mirror swing" },
            ].map(dx => (
              <button key={dx.v} onClick={() => { setProfile(p => ({ ...p, dexterity: dx.v })); }}
                style={{ background: profile.dexterity === dx.v ? D.accentDim : D.surface, border: `2px solid ${profile.dexterity === dx.v ? D.accent : D.border}`, borderRadius: "14px", padding: "20px 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", transition: "all 0.2s" }}>
                <span style={{ fontSize: "36px" }}>{dx.icon}</span>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: "700", fontSize: "14px", color: profile.dexterity === dx.v ? D.accent : D.text }}>{dx.label}</span>
                <span style={{ fontSize: "11px", color: D.muted }}>{dx.desc}</span>
                {profile.dexterity === dx.v && <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: D.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px" }}>✓</div>}
              </button>
            ))}
          </div>
        )}

        {/* STEP 2 - Handicap */}
        {current.id === "handicap" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { label: "Beginner", sub: "30+",   value: "beginner", hcp: 36, icon: "🌱", desc: "Just starting out" },
              { label: "High",     sub: "18–29", value: "high",     hcp: 24, icon: "📈", desc: "Building consistency" },
              { label: "Mid",      sub: "9–17",  value: "mid",      hcp: 13, icon: "⛳", desc: "Breaking 90" },
              { label: "Low",      sub: "0–8",   value: "low",      hcp: 4,  icon: "🏆", desc: "Scratch territory" },
            ].map(h => (
              <button key={h.value} onClick={() => setProfile(p => ({ ...p, handicap: h.value, hcp: h.hcp }))}
                style={{ background: profile.handicap === h.value ? D.accentDim : D.surface, border: `2px solid ${profile.handicap === h.value ? D.accent : D.border}`, borderRadius: "14px", padding: "16px 10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", transition: "all 0.2s" }}>
                <span style={{ fontSize: "28px" }}>{h.icon}</span>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: "700", fontSize: "15px", color: profile.handicap === h.value ? D.accent : D.text }}>{h.label}</span>
                <span style={{ fontSize: "11px", color: D.muted }}>HCP {h.sub}</span>
                <span style={{ fontSize: "11px", color: D.subtle }}>{h.desc}</span>
                {profile.handicap === h.value && <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: D.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", marginTop: "4px" }}>✓</div>}
              </button>
            ))}
          </div>
        )}

        {/* STEP 3 - Age range */}
        {current.id === "age" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { v: "under25", label: "Under 25", icon: "🔥" },
              { v: "25-40",   label: "25 – 40",  icon: "💪" },
              { v: "40-55",   label: "40 – 55",  icon: "⛳" },
              { v: "55plus",  label: "55+",       icon: "🏆" },
            ].map(a => (
              <button key={a.v} onClick={() => setAgeRange(a.v)}
                style={{ background: ageRange === a.v ? D.accentDim : D.surface, border: `2px solid ${ageRange === a.v ? D.accent : D.border}`, borderRadius: "14px", padding: "16px 10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", transition: "all 0.2s" }}>
                <span style={{ fontSize: "28px" }}>{a.icon}</span>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: "700", fontSize: "14px", color: ageRange === a.v ? D.accent : D.text }}>{a.label}</span>
                {ageRange === a.v && <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: D.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px" }}>✓</div>}
              </button>
            ))}
          </div>
        )}

        {/* STEP 4 - Home course */}
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

        {/* STEP 5 - Persona */}
        {current.id === "persona" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { id: "pro",       icon: "🏆", label: "Tour Pro",   desc: "Calm, clinical, Tour-level precision. Speaks with quiet authority." },
              { id: "coach",     icon: "🎯", label: "The Coach",  desc: "Encouraging, warm, confidence-building. Keeps you positive." },
              { id: "oldschool", icon: "🚬", label: "Old School", desc: "Gritty, direct, zero fluff. Old-school caddie energy." },
            ].map(p => (
              <button key={p.id} onClick={() => setProfile(prev => ({ ...prev, persona: p.id }))}
                style={{ display: "flex", alignItems: "center", gap: "14px", width: "100%", background: profile.persona === p.id ? D.accentDim : D.surface, border: `2px solid ${profile.persona === p.id ? D.accent : D.border}`, borderRadius: "14px", padding: "16px", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                <span style={{ fontSize: "28px" }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", color: D.white, fontSize: "16px" }}>{p.label}</div>
                  <div style={{ fontSize: "12px", color: D.muted, marginTop: "3px", lineHeight: 1.4 }}>{p.desc}</div>
                </div>
                {profile.persona === p.id && <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: D.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", flexShrink: 0 }}>✓</div>}
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
        <button onClick={() => setStep(s => s - 1)} style={{ ...S.btnGhost, marginTop: "2px" }}>Back</button>
      )}
    </div>
  );
}

export { DARK_THEME, LIGHT_THEME, DEFAULT_BAG };
export { Ball, ScoreBadge, Avatar };
export { fmtDate, fmtDateShort, windDir, wxIcon, playingYards, firstName, randJab };
export { JABS, QUICK_PROMPTS };
export { analyzeSwing, analyzeSwingVideo };
export { ErrorBoundary, ShotShapeDiagram, OnboardingFlow };
