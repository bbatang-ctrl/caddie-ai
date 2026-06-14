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
const DEFAULT_BAG=[{club:"Driver",carry:230},{club:"3-Wood",carry:210},{club:"5-Wood",carry:195},{club:"Hybrid",carry:190},{club:"4-Iron",carry:180},{club:"5-Iron",carry:170},{club:"6-Iron",carry:160},{club:"7-Iron",carry:150},{club:"8-Iron",carry:140},{club:"9-Iron",carry:130},{club:"PW",carry:120},{club:"GW",carry:105},{club:"SW",carry:90},{club:"LW",carry:70}];
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

async function analyzeSwing(file,notes,profile){
  const hcp=typeof profile==="object"?profile?.hcp:profile;
  const clubUsed=notes||"not specified";
  // Convert to base64 and POST to server — API key stays server-side
  const imageBase64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(",")[1]);r.onerror=reject;r.readAsDataURL(file);});
  const res=await fetch("/api/analyze-swing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageBase64,mimeType:file.type,notes,hcp:hcp||"unknown",club:clubUsed})});
  const data=await res.json();
  if(data.error)throw new Error(typeof data.error==="string"?data.error:data.error.message||"Analysis failed");
  return data.candidates?.[0]?.content?.parts?.[0]?.text||"Could not analyze swing.";
}

async function analyzeSwingVideo(videoFile,notes,bag,hcp){
  const resolvedHcp=typeof bag==="object"?bag?.hcp:(hcp||bag||"unknown");
  const clubUsed=notes||"not specified";
  const mimeType=videoFile.type||"video/mp4";

  // Step 1: Server opens a Google resumable-upload session (API key stays server-side).
  // The session URL returned here has no API key — it IS the short-lived auth token.
  let uploadUrl;
  try{
    const r=await fetch("/api/analyze-swing?action=start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mimeType,fileSize:videoFile.size})});
    const d=await r.json();
    if(d.error)throw new Error(d.error);
    uploadUrl=d.uploadUrl;
    if(!uploadUrl)throw new Error("No upload URL returned");
  }catch(e){throw new Error("Could not start upload: "+e.message);}

  // Step 2: Upload the ENTIRE file directly from the browser to Google — no Vercel proxy.
  //
  // Key insight: the "8 MB granularity" rule only applies to INTERMEDIATE chunks in a
  // multi-request resumable upload. A single "upload, finalize" command sends the whole
  // file in one shot and has NO minimum-size requirement. This also completely bypasses
  // Vercel's 4.5 MB body-size cap because the file never passes through Vercel.
  //
  // The session URL is safe to use from the browser — it contains no API key.
  let fileUri,fileName;
  try{
    const r=await fetch(uploadUrl,{
      method:"POST",
      headers:{
        "X-Goog-Upload-Command":"upload, finalize",
        "X-Goog-Upload-Offset":"0",
        "Content-Type":mimeType,
      },
      body:videoFile,
    });
    if(!r.ok){
      const t=await r.text().catch(()=>"");
      throw new Error("HTTP "+r.status+(t?": "+t.slice(0,150):""));
    }
    const d=await r.json();
    fileUri=d?.file?.uri;
    fileName=d?.file?.name;
    if(!fileUri)throw new Error("No file URI from Google");
  }catch(e){throw new Error("Video upload failed: "+e.message);}

  // Step 3: Server checks once if Google has finished processing; returns 202 if not.
  // We retry here on the client to avoid Vercel's per-invocation timeout.
  let data;
  for(let attempt=0;attempt<20;attempt++){
    if(attempt>0)await new Promise(r=>setTimeout(r,3000));
    try{
      const r=await fetch("/api/analyze-swing?action=complete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fileUri,fileName,mimeType,hcp:String(resolvedHcp),club:clubUsed,notes:notes||""})});
      data=await r.json();
    }catch(e){throw new Error("Analysis request failed: "+e.message);}
    if(!data.notReady)break;
  }
  if(data?.notReady)throw new Error("Video still processing — please try again in a moment");
  if(data?.error)throw new Error(typeof data.error==="string"?data.error:data.error.message||"Analysis failed");
  return data?.candidates?.[0]?.content?.parts?.[0]?.text||"Could not analyze swing.";
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
function OnboardingFlow({ profile, setProfile, authName, setAuthName, onComplete }) {
  const [step, setStep] = React.useState(0);
  const [localName, setLocalName] = React.useState(authName || "");
  const [homeCourse, setHomeCourse] = React.useState(profile.homeCourse || "");
  const [obiPreview, setObiPreview] = React.useState("");
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  function cn(...c){ return c.filter(Boolean).join(" "); }

  const steps = [
    { id: "name" },
    { id: "dexterity" },
    { id: "handicap" },
    { id: "persona" },
    { id: "preview" },
  ];
  const current = steps[step];
  const progressPct = Math.round((step / (steps.length - 1)) * 100);

  // Obi's contextual line per step — feels like he's already talking to you
  const obiLines = {
    name:      "Before we tee off — what do I call you?",
    dexterity: "Good to meet you. How do you swing?",
    handicap:  "Got it. Where's your game right now?",
    persona:   "Last one. How do you want me to talk to you on the course?",
    preview:   null,
  };

  const fetchPreview = async (personaId, name, handicap) => {
    setPreviewLoading(true);
    setObiPreview("");
    const personas = {
      pro:       "You are a calm, precise Tour-level golf caddie named Obi. Quiet authority.",
      coach:     "You are an encouraging golf coach-caddie named Obi. Warm and confidence-building.",
      hype:      "You are an energetic hype-man caddie named Obi. Enthusiastic and motivating.",
      savage:    "You are a savage trash-talking caddie named Obi. Brutal honesty with dark humor.",
      oldschool: "You are a gritty old-school caddie named Obi. Straight talk, no fluff.",
    };
    const hcpLabels = { beginner:"beginner", high:"high-handicap", mid:"mid-handicap", low:"low-handicap" };
    try {
      const r = await fetch("/api/chat", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          messages:[{ role:"user", content:`Say one short welcome message (2 sentences max) to ${name||"this player"}, a ${hcpLabels[handicap]||"mid-handicap"} golfer who just joined Obi Golf. Make it feel personal and exciting. Sign off as their caddie. No markdown.` }],
          system: personas[personaId] || personas.pro,
        })
      });
      const d = await r.json();
      const text = d?.content?.[0]?.text || d?.candidates?.[0]?.content?.parts?.[0]?.text || d?.text || "";
      setObiPreview(text || "Let's go play some great golf.");
    } catch(e) {
      setObiPreview("Let's go play some great golf. I've got everything you need.");
    }
    setPreviewLoading(false);
  };

  const next = () => {
    if (current.id === "name") { setAuthName(localName.trim()); }
    if (current.id === "course") { setProfile(p => ({ ...p, homeCourse })); }
    if (step < steps.length - 1) {
      const nextStep = steps[step + 1];
      if (nextStep.id === "preview") {
        setProfile(p => ({ ...p, homeCourse }));
        fetchPreview(profile.persona, localName.trim() || authName, profile.handicap);
      }
      setStep(s => s + 1);
    } else {
      setAuthName(localName.trim());
      setProfile(p => ({ ...p, homeCourse }));
      setDone(true);
      setTimeout(() => onComplete(), 400);
    }
  };

  const skip = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else onComplete();
  };

  const canNext =
    current.id !== "name" ||
    localName.trim().length > 1;

  const selBtn = (selected, onClick, children) => (
    <button onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all w-full",
        selected
          ? "border-[#CFFF04] bg-[#CFFF04]/10"
          : "border-[#2a2a3a] bg-[#17171f] hover:border-[#CFFF04]/40"
      )}>
      {children}
      {selected && (
        <div className="h-5 w-5 rounded-full bg-[#CFFF04] flex items-center justify-center mt-1">
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none"><path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      )}
    </button>
  );

  const rowBtn = (selected, onClick, children) => (
    <button onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all",
        selected
          ? "border-[#CFFF04] bg-[#CFFF04]/10"
          : "border-[#2a2a3a] bg-[#17171f] hover:border-[#CFFF04]/40"
      )}>
      {children}
      {selected && (
        <div className="ml-auto h-5 w-5 rounded-full bg-[#CFFF04] shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none"><path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      )}
    </button>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{opacity: done ? 0 : 1, transition:"opacity 0.3s"}}>

      {/* Progress bar — minimal, no step counter */}
      <div className="h-0.5 bg-[#2a2a3a] rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-[#CFFF04] rounded-full transition-all duration-500"
          style={{width: progressPct + "%"}}/>
      </div>

      {/* Obi's line — conversational header */}
      {obiLines[current.id] && (
        <div className="flex items-start gap-3 mb-6">
          <div className="h-8 w-8 rounded-full bg-[#CFFF04] flex items-center justify-center shrink-0 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
              <line x1="13" y1="10" x2="13" y2="31" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M13 10 L26 14.5 L13 19 Z" fill="#000"/>
              <ellipse cx="16" cy="31" rx="5" ry="1.5" fill="rgba(0,0,0,0.3)"/>
            </svg>
          </div>
          <div className="bg-[#1e1e27] rounded-2xl rounded-tl-sm px-4 py-3 flex-1">
            <p className="text-[15px] text-white leading-snug">{obiLines[current.id]}</p>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-4">

        {/* NAME */}
        {current.id === "name" && (
          <input autoFocus placeholder="First name"
            value={localName} onChange={e => setLocalName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && canNext && next()}
            className="w-full rounded-2xl border-2 border-[#2a2a3a] bg-[#17171f] px-5 py-4 text-[20px] font-bold text-white outline-none focus:border-[#CFFF04] transition placeholder:text-white/25"
          />
        )}

        {/* DEXTERITY */}
        {current.id === "dexterity" && (
          <div className="grid grid-cols-2 gap-3">
            {[{v:"right",icon:"🏌️",label:"Right Handed"},{v:"left",icon:"🏌️‍♂️",label:"Left Handed"}].map(dx=>(
              selBtn(profile.dexterity===dx.v, ()=>setProfile(p=>({...p,dexterity:dx.v})),
                <React.Fragment key={dx.v}>
                  <span className="text-3xl">{dx.icon}</span>
                  <span className="text-[14px] font-bold text-white">{dx.label}</span>
                </React.Fragment>
              )
            ))}
          </div>
        )}

        {/* HANDICAP */}
        {current.id === "handicap" && (
          <div className="grid grid-cols-2 gap-3">
            {[
              {label:"Just Starting",sub:"Brand new",value:"beginner",hcp:36,icon:"🌱"},
              {label:"Still Learning",sub:"HCP 18–29",value:"high",hcp:24,icon:"📈"},
              {label:"Getting Good",sub:"HCP 9–17",value:"mid",hcp:13,icon:"⛳"},
              {label:"Scratch Territory",sub:"HCP 0–8",value:"low",hcp:4,icon:"🏆"},
            ].map(h=>(
              selBtn(profile.handicap===h.value, ()=>setProfile(p=>({...p,handicap:h.value,hcp:h.hcp})),
                <React.Fragment key={h.value}>
                  <span className="text-3xl">{h.icon}</span>
                  <span className="text-[13px] font-bold text-white leading-tight">{h.label}</span>
                  <span className="text-[11px] text-white/40">{h.sub}</span>
                </React.Fragment>
              )
            ))}
          </div>
        )}

        {/* PERSONA */}
        {current.id === "persona" && (
          <div className="space-y-2">
            {[
              {id:"pro",     icon:"🎯", label:"Tour Caddie",   desc:"Precise, calm, data-driven. Every shot is calculated."},
              {id:"coach",   icon:"📚", label:"The Coach",     desc:"Warm and encouraging. Builds your confidence hole by hole."},
              {id:"hype",    icon:"⚡", label:"Hype Man",      desc:"Fired up, loud, relentless. You're going to crush it."},
              {id:"savage",  icon:"💀", label:"Savage",        desc:"Brutal honesty. Hilarious. Absolutely no filter."},
              {id:"oldschool",icon:"🪨",label:"Old School",    desc:"Gritty and direct. Seen it all. Short on words."},
            ].map(p=>(
              rowBtn(profile.persona===p.id, ()=>setProfile(prev=>({...prev,persona:p.id})),
                <React.Fragment key={p.id}>
                  <span className="text-2xl shrink-0">{p.icon}</span>
                  <div>
                    <p className="text-[14px] font-bold text-white">{p.label}</p>
                    <p className="text-[11px] text-white/40 mt-0.5">{p.desc}</p>
                  </div>
                </React.Fragment>
              )
            ))}
          </div>
        )}

        {/* PREVIEW — Obi speaks live in their chosen persona */}
        {current.id === "preview" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-[#CFFF04] flex items-center justify-center shrink-0 mt-0.5">
                <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
                  <line x1="13" y1="10" x2="13" y2="31" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M13 10 L26 14.5 L13 19 Z" fill="#000"/>
                  <ellipse cx="16" cy="31" rx="5" ry="1.5" fill="rgba(0,0,0,0.3)"/>
                </svg>
              </div>
              <div className="flex-1">
                {previewLoading ? (
                  <div className="bg-[#1e1e27] rounded-2xl rounded-tl-sm px-4 py-4 flex gap-1.5 items-center">
                    {[0,1,2].map(i=>(
                      <div key={i} className="w-2 h-2 rounded-full bg-white/40"
                        style={{animation:`typing-dot 1.2s ${i*0.2}s infinite ease-in-out`}}/>
                    ))}
                  </div>
                ) : obiPreview ? (
                  <div className="bg-[#1e1e27] rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-[15px] text-white leading-relaxed">{obiPreview}</p>
                  </div>
                ) : null}
              </div>
            </div>
            {!previewLoading && obiPreview && (
              <div className="rounded-2xl bg-[#CFFF04]/10 border border-[#CFFF04]/30 p-4 text-center">
                <p className="text-[13px] text-white/70 leading-relaxed">
                  That's your caddie. You can change the style any time in settings.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-4 space-y-2 shrink-0">
        <button onClick={next}
          disabled={!canNext || (current.id === "preview" && previewLoading)}
          className="w-full rounded-2xl py-4 text-[14px] font-bold uppercase tracking-wider transition"
          style={{
            background: (canNext && !(current.id==="preview"&&previewLoading)) ? "#CFFF04" : "#2a2a3a",
            color:      (canNext && !(current.id==="preview"&&previewLoading)) ? "#000" : "#555",
            cursor:     (canNext && !(current.id==="preview"&&previewLoading)) ? "pointer" : "default",
          }}>
          {current.id === "preview" ? (previewLoading ? "Obi is getting ready..." : "Let's Play Golf 🏌️") : "Continue →"}
        </button>
        {current.id !== "name" && current.id !== "preview" && (
          <button onClick={skip}
            className="w-full py-2.5 text-[12px] font-bold uppercase tracking-wider text-white/25 hover:text-white/50 transition">
            Skip for now
          </button>
        )}
        {step > 0 && current.id !== "preview" && (
          <button onClick={()=>setStep(s=>s-1)}
            className="w-full py-2 text-[11px] font-bold uppercase tracking-wider text-white/20 hover:text-white/40 transition">
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}


// ── Helpers added for new App.jsx ──────────────────────────────
function firstName(fullName){
  if(!fullName)return"";
  return fullName.trim().split(" ")[0];
}

// ScoreBadge alias for ScorePill
const ScoreBadge = ScorePill;
export { DARK_THEME, LIGHT_THEME, DEFAULT_BAG };
export { Ball, ScoreBadge, Avatar };
export { fmtDate, fmtDateShort, windDir, wxIcon, playingYards, firstName, randJab };
export { JABS, QUICK_PROMPTS };
export { analyzeSwing, analyzeSwingVideo };
export { ErrorBoundary, ShotShapeDiagram, OnboardingFlow };
