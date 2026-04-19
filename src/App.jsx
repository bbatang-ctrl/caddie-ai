import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";

// Fonts
const fontLink = document.createElement("link");
fontLink.rel  = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap";
document.head.appendChild(fontLink);

// Design tokens
const D = {
  black:"#080a08", dark:"#0e150e", surface:"#141f14", card:"#1a2a1a",
  border:"#243524", green:"#22c55e", greenLt:"#4ade80", greenDim:"#14532d",
  gold:"#f5c518", goldLt:"#fde68a", white:"#f8fafc", text:"#e8f5e9",
  muted:"#4a7a55", subtle:"#2d4a35", red:"#f87171", blue:"#60a5fa",
};

function Ball({ size=32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="46" fill={D.gold}/>
      <circle cx="50" cy="50" r="46" fill="url(#bg)"/>
      <ellipse cx="38" cy="34" rx="12" ry="7" fill={D.goldLt} opacity="0.8" transform="rotate(-35 38 34)"/>
      <circle cx="36" cy="54" r="4" fill="#1a1a1a" opacity="0.18"/>
      <circle cx="50" cy="47" r="4" fill="#1a1a1a" opacity="0.18"/>
      <circle cx="64" cy="54" r="4" fill="#1a1a1a" opacity="0.18"/>
      <circle cx="43" cy="64" r="4" fill="#1a1a1a" opacity="0.18"/>
      <circle cx="57" cy="64" r="4" fill="#1a1a1a" opacity="0.18"/>
      <circle cx="50" cy="74" r="4" fill="#1a1a1a" opacity="0.18"/>
      <defs><radialGradient id="bg" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#fffbe6" stopOpacity="0.3"/><stop offset="100%" stopColor="#92400e" stopOpacity="0.2"/></radialGradient></defs>
    </svg>
  );
}

function Avatar({ name, size=40, highlight=false }) {
  const ini = (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${D.greenDim},${D.surface})`,border:`2px solid ${highlight?D.green:D.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Syne',sans-serif",fontSize:size*0.36,color:D.greenLt,fontWeight:"700",flexShrink:0 }}>{ini}</div>
  );
}

function ScorePill({ score, par, large=false }) {
  if (!score||!par) return null;
  const d = score-par;
  const m = {"-2":["Eagle","#f59e0b","#78350f"],"-1":["Birdie",D.green,D.greenDim],"0":["Par",D.blue,"#1e3a5f"],"1":["Bogey",D.red,"#450a0a"]};
  const [label,color,bg] = m[String(Math.max(-2,Math.min(1,d)))]||[`+${d}`,D.red,"#450a0a"];
  return (
    <div style={{ display:"inline-flex",alignItems:"center",gap:"5px",background:bg,borderRadius:"20px",padding:large?"5px 14px":"3px 10px",border:`1px solid ${color}44` }}>
      <span style={{ color,fontSize:large?"13px":"11px",fontWeight:"600",fontFamily:"'DM Sans',sans-serif" }}>{label}</span>
      <span style={{ color,fontSize:large?"15px":"13px",fontFamily:"'Syne',sans-serif",fontWeight:"800" }}>{d>0?`+${d}`:d===0?"E":d}</span>
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
  const contents=[{role:"user",parts:[{inline_data:{mime_type:mime,data:b64}},{text:`You are an expert PGA teaching professional. Player HCP: ${hcp}. Notes: ${notes||"none"}.\nAnalyze this golf swing covering: Setup & Address, Backswing, Downswing & Transition, Impact, Follow Through.\nThen give: PRIMARY FAULT (the one thing to fix), DRILL (specific step-by-step drill), POSITIVES (what they do well).\nBe encouraging, specific, and visual. Write like a great teaching pro.`}]}];
  const res=await fetch("/api/swing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents})});
  const data=await res.json();
  if(data.error)throw new Error(typeof data.error==="string"?data.error:data.error.message||"Analysis failed");
  return data.candidates?.[0]?.content?.parts?.[0]?.text||"Could not analyze swing.";
}

const S={
  input:{background:D.surface,border:`1.5px solid ${D.border}`,borderRadius:"12px",color:D.text,fontSize:"15px",padding:"13px 16px",outline:"none",fontFamily:"'DM Sans',sans-serif",width:"100%",boxSizing:"border-box"},
  btnPrimary:{background:`linear-gradient(135deg,${D.green},#16a34a)`,border:"none",borderRadius:"14px",color:"#fff",fontSize:"16px",padding:"15px",cursor:"pointer",fontWeight:"600",fontFamily:"'DM Sans',sans-serif",width:"100%",boxShadow:`0 4px 20px ${D.green}44`},
  btnSecondary:{background:D.surface,border:`1.5px solid ${D.border}`,borderRadius:"14px",color:D.text,fontSize:"15px",padding:"13px",cursor:"pointer",fontWeight:"500",fontFamily:"'DM Sans',sans-serif",width:"100%"},
  btnGhost:{background:"transparent",border:"none",color:D.muted,fontSize:"14px",padding:"10px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",width:"100%"},
  card:{background:D.card,border:`1px solid ${D.border}`,borderRadius:"18px",padding:"18px",boxShadow:"0 2px 20px rgba(0,0,0,0.3)"},
  pill:{background:D.surface,border:`1px solid ${D.border}`,borderRadius:"99px",padding:"5px 12px",fontSize:"12px",color:D.muted,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",whiteSpace:"nowrap"},
};

export default function ObiGolf(){
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
  const [profile,setProfile]=useState({handicap:"mid",hcp:13,persona:"pro",missTend:"straight",bag:DEFAULT_BAG});
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

  async function loadProfile(uid){
    const {data}=await supabase.from("profiles").select("*").eq("id",uid).single();
    if(data){
      setUserProfile(data);
      setProfile(p=>({...p,handicap:data.handicap_category||"mid",hcp:data.handicap_index||13,persona:data.caddie_persona||"pro",missTend:data.miss_tendency||"straight",bag:data.bag_distances||DEFAULT_BAG}));
      loadSocial(uid);loadRounds(uid);loadSwings(uid);
    } else setAuthScreen("onboard");
  }

  async function saveProfile(){
    if(!user)return;
    await supabase.from("profiles").upsert({id:user.id,email:user.email,full_name:authName||userProfile?.full_name,handicap_category:profile.handicap,handicap_index:profile.hcp,caddie_persona:profile.persona,miss_tendency:profile.missTend,bag_distances:profile.bag,updated_at:new Date().toISOString()});
    loadProfile(user.id);setTab("caddie");
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
    return `${pm[profile.persona]}\nPLAYER: HCP ${profile.hcp} (${profile.handicap}). Miss: ${profile.missTend}. Name: ${userProfile?.full_name||"golfer"}.\nBAG: ${bagStr}\nHOLE: ${course||"unknown"}, Hole ${hole}, Par ${holePars[hole-1]}\nYARDAGE: ${yardage?`${yardage}y actual, ~${py}y playing`:"not set"}. Lie: ${lie}. Elevation: ${elevation}ft.\nCONDITIONS: ${wx}\nRECENT: ${shotHistory.slice(-3).map(s=>`H${s.hole}: ${s.outcome}`).join(". ")||"none"}\nRULES: Only clubs from bag. Be specific. No markdown. No bullet points. Always finish sentences completely.`;
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
  async function searchUsers(q){if(!q.trim()){setSearchRes([]);return;}const{data}=await supabase.from("profiles").select("*").ilike("full_name",`%${q}%`).neq("id",user?.id).limit(8);if(data)setSearchRes(data);}
  async function sendFriendReq(fid){await supabase.from("friendships").insert({user_id:user.id,friend_id:fid,status:"pending"});setSearchRes(prev=>prev.filter(u=>u.id!==fid));}
  async function acceptFriendReq(reqId,requesterId){await supabase.from("friendships").update({status:"accepted"}).eq("id",reqId);await supabase.from("friendships").insert({user_id:user.id,friend_id:requesterId,status:"accepted"});loadSocial(user.id);}

  // Extract a frame from video at impact position
  function extractVideoFrame(videoFile){
    return new Promise((resolve,reject)=>{
      const video=document.createElement("video");
      const canvas=document.createElement("canvas");
      const url=URL.createObjectURL(videoFile);
      video.src=url; video.crossOrigin="anonymous";
      video.muted=true; video.playsInline=true;
      video.onloadedmetadata=()=>{ video.currentTime=video.duration*0.5; };
      video.onseeked=()=>{
        canvas.width=video.videoWidth; canvas.height=video.videoHeight;
        canvas.getContext("2d").drawImage(video,0,0);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob)=>{
          resolve(new File([blob],"swing_frame.jpg",{type:"image/jpeg"}));
        },"image/jpeg",0.85);
      };
      video.onerror=()=>reject(new Error("Could not read video file"));
      video.load();
    });
  }

  async function runSwingAnalysis(){
    if(!swingFile)return;
    setSwingLoading(true);setSwingAnalysis("");
    try{
      // Extract frame from video to send as image
      let fileToSend=swingFile;
      let mimeType=swingFile.type;
      if(swingFile.type.startsWith("video/")){
        setSwingAnalysis("Extracting best frame from video...");
        fileToSend=await extractVideoFrame(swingFile);
        mimeType="image/jpeg";
        setSwingAnalysis("");
      }
      const reader=new FileReader();
      reader.onload=async(e)=>{
        try{
          const b64=e.target.result.split(",")[1];
          const analysis=await analyzeSwing(b64,mimeType,swingNotes,profile.bag,profile.hcp);
          setSwingAnalysis(analysis);
          if(user){await supabase.from("swing_analyses").insert({user_id:user.id,notes:swingNotes,analysis,analyzed_at:new Date().toISOString()});loadSwings(user.id);}
        }catch(err){setSwingAnalysis("Analysis failed: "+err.message);}
        setSwingLoading(false);
      };
      reader.readAsDataURL(fileToSend);
    }catch(err){
      setSwingAnalysis("Analysis failed: "+err.message);
      setSwingLoading(false);
    }
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
    <div style={{minHeight:"100vh",background:D.black,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"20px"}}>
      <div style={{animation:"popIn 0.6s cubic-bezier(.34,1.56,.64,1) both"}}><Ball size={80}/></div>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:"38px",fontWeight:"800",color:D.white,letterSpacing:"2px",animation:"fadeUp 0.6s 0.2s both"}}>OBI GOLF</div>
      <div style={{display:"flex",gap:"8px",animation:"fadeUp 0.6s 0.4s both"}}>{[0,1,2].map(i=><div key={i} style={{width:"7px",height:"7px",borderRadius:"50%",background:D.green,animation:`pulse 1.2s infinite ${i*0.2}s`}}/>)}</div>
      <style>{CSS}</style>
    </div>
  );

  // AUTH
  if(!user||authScreen==="onboard")return(
    <div style={{minHeight:"100vh",background:D.black,fontFamily:"'DM Sans',sans-serif",backgroundImage:`radial-gradient(ellipse at 20% 10%,${D.greenDim}66 0%,transparent 50%),radial-gradient(ellipse at 80% 90%,${D.greenDim}33 0%,transparent 50%)`}}>
      <div style={{maxWidth:"420px",margin:"0 auto",padding:"40px 24px",display:"flex",flexDirection:"column",minHeight:"100vh",justifyContent:"center"}}>
        <div style={{textAlign:"center",marginBottom:"36px",animation:"fadeUp 0.5s both"}}>
          <Ball size={56}/>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:"36px",fontWeight:"800",color:D.white,letterSpacing:"2px",marginTop:"12px"}}>OBI GOLF</div>
          <div style={{color:D.muted,fontSize:"14px",marginTop:"4px",letterSpacing:"1px"}}>AI CADDIE · COACH · COMMUNITY</div>
        </div>

        {authScreen==="onboard"&&(
          <div style={{animation:"fadeUp 0.4s both"}}>
            <div style={{...S.card,marginBottom:"20px"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:"20px",fontWeight:"700",color:D.white,marginBottom:"4px"}}>Welcome to Obi Golf</div>
              <div style={{color:D.muted,fontSize:"14px",marginBottom:"20px"}}>Set up your profile so Obi can caddie for you</div>
              <input placeholder="Your name" value={authName} onChange={e=>setAuthName(e.target.value)} style={{...S.input,marginBottom:"14px"}}/>
              <div style={{fontSize:"11px",color:D.muted,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:"10px"}}>Handicap Level</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"20px"}}>
                {HANDICAPS.map(h=>(
                  <button key={h.value} onClick={()=>setProfile(p=>({...p,handicap:h.value,hcp:h.hcp}))} style={{background:profile.handicap===h.value?D.greenDim:D.surface,border:`1.5px solid ${profile.handicap===h.value?D.green:D.border}`,borderRadius:"12px",padding:"14px 10px",cursor:"pointer"}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"700",color:profile.handicap===h.value?D.greenLt:D.text,fontSize:"15px"}}>{h.label}</div>
                    <div style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>HCP {h.sub}</div>
                  </button>
                ))}
              </div>
              <div style={{fontSize:"11px",color:D.muted,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:"10px"}}>Your Caddie Style</div>
              {PERSONAS.map(p=>(
                <button key={p.id} onClick={()=>setProfile(prev=>({...prev,persona:p.id}))} style={{display:"flex",alignItems:"center",gap:"14px",width:"100%",background:profile.persona===p.id?D.greenDim:D.surface,border:`1.5px solid ${profile.persona===p.id?D.green:D.border}`,borderRadius:"12px",padding:"14px",marginBottom:"8px",cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontSize:"24px"}}>{p.icon}</span>
                  <div style={{flex:1}}><div style={{fontWeight:"600",color:D.white,fontSize:"15px"}}>{p.label}</div><div style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>{p.desc}</div></div>
                  {profile.persona===p.id&&<div style={{width:"20px",height:"20px",borderRadius:"50%",background:D.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",color:"#fff"}}>✓</div>}
                </button>
              ))}
            </div>
            <button onClick={saveProfile} style={S.btnPrimary}>{"Let's Play Golf 🏌️"}</button>
          </div>
        )}

        {authScreen==="login"&&!user&&(
          <div style={{animation:"fadeUp 0.4s both"}}>
            <div style={{...S.card,marginBottom:"16px"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:"22px",fontWeight:"700",color:D.white,marginBottom:"20px"}}>Sign In</div>
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
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:"22px",fontWeight:"700",color:D.white,marginBottom:"20px"}}>Create Account</div>
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
          <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"24px"}}>
            <Ball size={40}/>
            <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:"22px",fontWeight:"800",color:D.white,letterSpacing:"1px"}}>OBI GOLF</div><div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px"}}>ROUND SUMMARY</div></div>
          </div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:"18px",fontWeight:"700",color:D.greenLt,marginBottom:"2px"}}>{round.course_name||"Unknown Course"}</div>
          <div style={{fontSize:"13px",color:D.muted,marginBottom:"24px"}}>{fmtDate(round.played_at)}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"24px"}}>
            {[["SCORE",round.total_score,D.white],["vs PAR",diffStr,diffColor],["HOLES",`${round.holes_played}/18`,D.text]].map(([l,v,c])=>(
              <div key={l} style={{background:D.surface,borderRadius:"14px",padding:"14px 8px",textAlign:"center",border:`1px solid ${D.border}`}}>
                <div style={{fontSize:"9px",color:D.muted,letterSpacing:"1.5px",marginBottom:"6px"}}>{l}</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:"26px",fontWeight:"800",color:c,lineHeight:1}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{background:D.surface,borderRadius:"14px",padding:"14px 16px",marginBottom:"20px",borderLeft:`3px solid ${D.green}`}}>
            <div style={{fontSize:"11px",color:D.green,letterSpacing:"1.5px",marginBottom:"6px"}}>OBI SAYS</div>
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
    <div style={{minHeight:"100vh",maxWidth:"480px",margin:"0 auto",background:D.black,fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",position:"relative"}}>
      {showCard&&<SummaryModal round={showCard}/>}
      {jabPost&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={()=>setJabPost(null)}>
          <div onClick={e=>e.stopPropagation()} style={{...S.card,maxWidth:"320px",width:"100%",textAlign:"center",animation:"popIn 0.3s both"}}>
            <div style={{fontSize:"40px",marginBottom:"12px"}}>😂</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:"18px",color:D.white,marginBottom:"8px"}}>Jab Sent!</div>
            <div style={{fontSize:"14px",color:D.muted,marginBottom:"20px",fontStyle:"italic"}}>"{jabPost}"</div>
            <button onClick={()=>setJabPost(null)} style={S.btnPrimary}>👍 Nice</button>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{padding:"14px 18px 12px",background:D.dark,borderBottom:`1px solid ${D.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <Ball size={30}/>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:"18px",fontWeight:"800",color:D.white,lineHeight:1,letterSpacing:"1px"}}>OBI GOLF</div>
            <div style={{fontSize:"9px",color:D.muted,letterSpacing:"1.5px"}}>AI CADDIE</div>
          </div>
          {speaking&&<div style={{width:"8px",height:"8px",borderRadius:"50%",background:D.green,animation:"pulse 1s infinite",marginLeft:"4px"}}/>}
        </div>
        {weather&&(
          <div style={{background:D.surface,border:`1px solid ${D.border}`,borderRadius:"99px",padding:"5px 12px",display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",color:D.muted}}>
            <span>{wxIcon(weather.code)}</span>
            <span style={{color:D.text}}>{weather.temp}°</span>
            <span style={{color:D.border}}>·</span>
            <span>{weather.wind}mph {windDir(weather.windDeg)}</span>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"480px",background:D.dark,borderTop:`1px solid ${D.border}`,display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {[{id:"caddie",icon:"⛳",label:"Caddie"},{id:"practice",icon:"🎬",label:"Practice"},{id:"social",icon:"👥",label:"Social",badge:friendReqs.length},{id:"profile",icon:"👤",label:"Profile"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 4px 8px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",position:"relative"}}>
            <span style={{fontSize:"20px",filter:tab===t.id?"none":"grayscale(0.5)",opacity:tab===t.id?1:0.5,transition:"all 0.2s"}}>{t.icon}</span>
            <span style={{fontSize:"10px",color:tab===t.id?D.green:D.muted,fontFamily:"'DM Sans',sans-serif",fontWeight:tab===t.id?"600":"400",transition:"color 0.2s"}}>{t.label}</span>
            {t.badge>0&&<div style={{position:"absolute",top:"8px",right:"18px",width:"8px",height:"8px",borderRadius:"50%",background:D.red}}/>}
            {tab===t.id&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:"24px",height:"2px",background:D.green,borderRadius:"0 0 2px 2px"}}/>}
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
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:"26px",fontWeight:"800",color:D.white,lineHeight:1}}>{hole}</div>
                  </div>
                  <button onClick={()=>setHole(h=>Math.min(18,h+1))} style={{background:D.surface,border:`1px solid ${D.border}`,borderRadius:"8px",color:D.muted,padding:"4px 10px",cursor:"pointer",fontSize:"16px"}}>›</button>
                </div>
                <div style={{display:"flex",gap:"3px"}}>
                  {[3,4,5].map(p=>(
                    <button key={p} onClick={()=>{const n=[...holePars];n[hole-1]=p;setHolePars(n);}} style={{background:par===p?D.greenDim:D.surface,border:`1px solid ${par===p?D.green:D.border}`,borderRadius:"8px",color:par===p?D.greenLt:D.muted,padding:"4px 10px",fontSize:"12px",cursor:"pointer",fontWeight:"600"}}>P{p}</button>
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
                <button key={t.id} onClick={()=>setSubView(t.id)} style={{flex:1,padding:"10px",background:"transparent",border:"none",borderBottom:`2px solid ${subView===t.id?D.green:"transparent"}`,color:subView===t.id?D.green:D.muted,fontSize:"12px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:subView===t.id?"600":"400",transition:"all 0.15s"}}>{t.label}</button>
              ))}
            </div>

            {/* CHAT */}
            {subView==="chat"&&(
              <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 230px)"}}>
                {py&&yardage&&(
                  <div style={{margin:"10px 16px 0",background:`linear-gradient(135deg,${D.greenDim},${D.surface})`,border:`1px solid ${D.green}44`,borderRadius:"14px",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{textAlign:"center"}}><div style={{fontSize:"9px",color:D.muted,letterSpacing:"1.5px",textTransform:"uppercase"}}>ACTUAL</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:"28px",fontWeight:"800",color:D.text,lineHeight:1}}>{yardage}<span style={{fontSize:"14px",fontWeight:"400"}}>y</span></div></div>
                    <div style={{color:D.border,fontSize:"20px"}}>→</div>
                    <div style={{textAlign:"center"}}><div style={{fontSize:"9px",color:D.green,letterSpacing:"1.5px",textTransform:"uppercase"}}>PLAYING</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:"28px",fontWeight:"800",color:D.green,lineHeight:1}}>{py}<span style={{fontSize:"14px",fontWeight:"400"}}>y</span></div></div>
                    {recClub&&(<><div style={{color:D.border,fontSize:"20px"}}>→</div><div style={{textAlign:"center"}}><div style={{fontSize:"9px",color:D.gold,letterSpacing:"1.5px",textTransform:"uppercase"}}>CLUB</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:"22px",fontWeight:"800",color:D.gold,lineHeight:1}}>{recClub.club}</div></div></>)}
                  </div>
                )}
                <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:"12px"}}>
                  {messages.length===0&&(
                    <div style={{textAlign:"center",padding:"40px 20px",animation:"fadeUp 0.5s both"}}>
                      <Ball size={56}/>
                      <div style={{fontFamily:"'Syne',sans-serif",fontSize:"20px",fontWeight:"700",color:D.white,marginTop:"14px"}}>Obi is ready.</div>
                      <div style={{color:D.muted,fontSize:"14px",marginTop:"6px",lineHeight:1.6}}>Enter the course name above<br/>or ask anything about your shot</div>
                    </div>
                  )}
                  {messages.map((m,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",animation:"fadeUp 0.3s both"}}>
                      {m.role==="assistant"&&<div style={{marginRight:"10px",marginTop:"4px",flexShrink:0}}><Ball size={28}/></div>}
                      <div style={{maxWidth:"78%",background:m.role==="user"?`linear-gradient(135deg,${D.greenDim},#0f3320)`:D.card,border:`1px solid ${m.role==="user"?D.green+"44":D.border}`,borderRadius:m.role==="user"?"20px 20px 4px 20px":"20px 20px 20px 4px",padding:"12px 16px",boxShadow:"0 2px 12px rgba(0,0,0,0.2)"}}>
                        <div style={{fontSize:"15px",lineHeight:1.65,color:D.text}}>{m.content}</div>
                        {m.role==="assistant"&&<button onClick={()=>speak(m.content)} style={{background:"none",border:"none",color:D.muted,fontSize:"11px",cursor:"pointer",padding:"4px 0 0",fontFamily:"'DM Sans',sans-serif"}}>🔊 Replay</button>}
                      </div>
                    </div>
                  ))}
                  {loading&&(
                    <div style={{display:"flex",gap:"6px",alignItems:"center",paddingLeft:"4px"}}>
                      <Ball size={28}/>
                      <div style={{display:"flex",gap:"4px",marginLeft:"10px"}}>{[0,1,2].map(i=><div key={i} style={{width:"8px",height:"8px",borderRadius:"50%",background:D.green,animation:`bounce 1s infinite ${i*0.15}s`}}/>)}</div>
                    </div>
                  )}
                </div>
                <div style={{padding:"8px 16px",display:"flex",gap:"8px",overflowX:"auto",scrollbarWidth:"none"}}>
                  {QUICK_PROMPTS.map(q=><button key={q.label} onClick={()=>sendMessage(q.prompt)} style={{...S.pill,flexShrink:0}}>{q.label}</button>)}
                </div>
                <div style={{padding:"10px 16px 16px",display:"flex",gap:"10px",alignItems:"center",background:D.dark,borderTop:`1px solid ${D.border}`}}>
                  <button onClick={startListening} style={{width:"46px",height:"46px",borderRadius:"50%",background:listening?D.green:D.surface,border:`1.5px solid ${listening?D.green:D.border}`,fontSize:"18px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,animation:listening?"pulse 1s infinite":"none",boxShadow:listening?`0 0 0 4px ${D.greenDim}`:"none"}}>
                    {listening?"🔴":"🎙"}
                  </button>
                  <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="Ask Obi anything..." style={{...S.input,flex:1,padding:"12px 16px"}}/>
                  <button onClick={()=>sendMessage()} disabled={loading||!input.trim()} style={{width:"46px",height:"46px",borderRadius:"50%",background:input.trim()?`linear-gradient(135deg,${D.green},#16a34a)`:D.surface,border:`1.5px solid ${input.trim()?D.green:D.border}`,color:"#fff",fontSize:"18px",cursor:input.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:input.trim()?`0 4px 16px ${D.green}44`:"none"}}>➤</button>
                </div>
              </div>
            )}

            {/* SITUATIONS */}
            {subView==="situations"&&(
              <div style={{padding:"16px"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:"22px",fontWeight:"800",color:D.white,marginBottom:"4px"}}>Shot Situations</div>
                <div style={{color:D.muted,fontSize:"14px",marginBottom:"16px"}}>Tap any situation for instant advice from Obi</div>
                {[{icon:"🌿",title:"In the Rough",prompt:`I'm in ${lie} with ${yardage||"unknown"} yards to pin. Ball sitting down. What club and technique?`},{icon:"🏖",title:"Greenside Bunker",prompt:"I'm in a greenside bunker. Walk me through club, setup, and technique."},{icon:"⛰",title:"Uneven Lie",prompt:"I have an uneven lie. How does this affect my shot and what adjustments do I make?"},{icon:"🍃",title:"Punch Out",prompt:"I need to punch out from under trees. What club and where do I aim?"},{icon:"💦",title:"Carry the Water",prompt:`Need to carry water. ${yardage?`${yardage} yards.`:""}Risk/reward and recommended play?`},{icon:"🎯",title:"Tight Pin",prompt:"Pin is tucked tight. Attack it or play center? Smart play for my handicap?"},{icon:"🌬",title:"Into the Wind",prompt:`Wind is ${weather?.wind||"strong"}mph from ${weather?windDir(weather.windDeg):"the front"}. Club and shape?`},{icon:"🔄",title:"Reset After Mishit",prompt:"I just mishit badly. Help me identify what went wrong and reset mentally."}].map(s=>(
                  <button key={s.title} onClick={()=>{setSubView("chat");sendMessage(s.prompt);}} style={{display:"flex",alignItems:"center",gap:"14px",width:"100%",background:D.card,border:`1px solid ${D.border}`,borderRadius:"16px",padding:"16px",marginBottom:"10px",cursor:"pointer",textAlign:"left"}}>
                    <div style={{width:"48px",height:"48px",borderRadius:"14px",background:D.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",flexShrink:0}}>{s.icon}</div>
                    <div style={{flex:1}}><div style={{fontWeight:"600",color:D.white,fontSize:"15px"}}>{s.title}</div><div style={{color:D.muted,fontSize:"12px",marginTop:"3px",lineHeight:1.4}}>{s.prompt.slice(0,58)}…</div></div>
                    <div style={{color:D.muted,fontSize:"18px"}}>›</div>
                  </button>
                ))}
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:"16px",fontWeight:"700",color:D.text,margin:"20px 0 10px"}}>Log Shot Outcome</div>
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
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:"22px",fontWeight:"800",color:D.white}}>Scorecard</div>
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
                              style={{background:hole===h?D.greenDim:D.surface,border:`1.5px solid ${sc_color}`,borderRadius:"8px",color:d!==null?sc_color:D.text,textAlign:"center",fontSize:"15px",fontWeight:"700",padding:"6px 2px",outline:"none",fontFamily:"'Syne',sans-serif",width:"100%",boxSizing:"border-box"}}/>
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
                      <span style={{fontFamily:"'Syne',sans-serif",fontSize:"20px",fontWeight:"700",color:c}}>{v}</span>
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
          <div style={{padding:"20px 16px"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:"26px",fontWeight:"800",color:D.white,marginBottom:"4px"}}>Swing Lab</div>
            <div style={{color:D.muted,fontSize:"14px",marginBottom:"20px",lineHeight:1.6}}>Upload a swing video and Obi analyzes it like a PGA teaching pro — finding your primary fault and giving you a specific drill to fix it.</div>
            <div onClick={()=>fileRef.current?.click()} style={{background:swingFile?D.greenDim:D.surface,border:`2px dashed ${swingFile?D.green:D.border}`,borderRadius:"18px",padding:"28px",textAlign:"center",cursor:"pointer",marginBottom:"14px"}}>
              <input ref={fileRef} type="file" accept="video/*,image/*" onChange={e=>setSwingFile(e.target.files[0])} style={{display:"none"}}/>
              {swingFile?(
                <div><div style={{fontSize:"40px",marginBottom:"8px"}}>🎬</div><div style={{color:D.green,fontWeight:"600",fontSize:"15px"}}>{swingFile.name}</div><div style={{color:D.muted,fontSize:"12px",marginTop:"4px"}}>Tap to change</div></div>
              ):(
                <div><div style={{fontSize:"48px",marginBottom:"10px"}}>📹</div><div style={{color:D.white,fontWeight:"600",fontSize:"16px"}}>Upload Swing Video</div><div style={{color:D.muted,fontSize:"13px",marginTop:"6px",lineHeight:1.5}}>Face-on or down-the-line · Video or photo</div></div>
              )}
            </div>
            <input placeholder="Any notes? e.g. 'struggling with slice' or 'driver swing'" value={swingNotes} onChange={e=>setSwingNotes(e.target.value)} style={{...S.input,marginBottom:"14px"}}/>
            <button onClick={runSwingAnalysis} disabled={!swingFile||swingLoading} style={{...S.btnPrimary,opacity:swingFile&&!swingLoading?1:0.4,marginBottom:"20px"}}>{swingLoading?"🔍 Analyzing your swing...":"🎯 Analyze My Swing"}</button>
            {swingLoading&&(
              <div style={{...S.card,textAlign:"center",padding:"28px"}}>
                <div style={{display:"flex",gap:"6px",justifyContent:"center",marginBottom:"14px"}}>{[0,1,2].map(i=><div key={i} style={{width:"10px",height:"10px",borderRadius:"50%",background:D.green,animation:`bounce 1s infinite ${i*0.15}s`}}/>)}</div>
                <div style={{color:D.text,fontWeight:"600",marginBottom:"4px"}}>Obi is watching your swing</div>
                <div style={{color:D.muted,fontSize:"13px"}}>This takes 15-20 seconds</div>
              </div>
            )}
            {swingAnalysis&&!swingLoading&&(
              <div style={{...S.card,marginBottom:"20px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"}}><Ball size={32}/><div style={{fontFamily:"'Syne',sans-serif",fontSize:"17px",fontWeight:"700",color:D.white}}>{"Obi's Analysis"}</div></div>
                <div style={{fontSize:"14px",color:D.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{swingAnalysis}</div>
                <button onClick={()=>speak(swingAnalysis)} style={{marginTop:"12px",background:"none",border:"none",color:D.muted,fontSize:"12px",cursor:"pointer",padding:0,fontFamily:"'DM Sans',sans-serif"}}>🔊 Read aloud</button>
              </div>
            )}
            {swingHistory.length>0&&(
              <div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:"18px",fontWeight:"700",color:D.white,margin:"0 0 12px"}}>Previous Analyses</div>
                {swingHistory.map((s,i)=>(
                  <div key={i} style={{...S.card,marginBottom:"10px",cursor:"pointer"}} onClick={()=>setSelectedSwing(selectedSwing?.id===s.id?null:s)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{color:D.muted,fontSize:"13px"}}>{fmtDate(s.analyzed_at)}</div>
                      {s.notes&&<div style={{fontSize:"12px",color:D.subtle,fontStyle:"italic",maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.notes}</div>}
                    </div>
                    {selectedSwing?.id===s.id?<div style={{fontSize:"13px",color:D.text,lineHeight:1.6,marginTop:"10px",whiteSpace:"pre-wrap"}}>{s.analysis}</div>:<div style={{fontSize:"13px",color:D.muted,marginTop:"6px"}}>{s.analysis.slice(0,100)}… <span style={{color:D.green}}>Read more</span></div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SOCIAL TAB */}
        {tab==="social"&&(
          <div style={{display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",background:D.dark,borderBottom:`1px solid ${D.border}`,position:"sticky",top:"64px",zIndex:10}}>
              {[{id:"feed",label:"Feed"},{id:"leaderboard",label:"🏆 Board"},{id:"friends",label:"Friends"},{id:"rounds",label:"My Rounds"}].map(t=>(
                <button key={t.id} onClick={()=>setSocialTab(t.id)} style={{flex:1,padding:"10px 4px",background:"transparent",border:"none",borderBottom:`2px solid ${socialTab===t.id?D.green:"transparent"}`,color:socialTab===t.id?D.green:D.muted,fontSize:"11px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:socialTab===t.id?"600":"400"}}>{t.label}</button>
              ))}
            </div>
            <div style={{padding:"16px"}}>
              {socialTab==="feed"&&(
                <>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:"24px",fontWeight:"800",color:D.white,marginBottom:"16px"}}>Activity Feed</div>
                  {feed.length===0?(
                    <div style={{textAlign:"center",padding:"48px 20px"}}>
                      <div style={{fontSize:"52px",marginBottom:"14px"}}>👥</div>
                      <div style={{fontFamily:"'Syne',sans-serif",fontSize:"20px",fontWeight:"700",color:D.white,marginBottom:"8px"}}>Find Your Crew</div>
                      <div style={{color:D.muted,fontSize:"14px",lineHeight:1.6}}>Add friends to see their rounds, trash talk them, and compete on the leaderboard</div>
                      <button onClick={()=>setSocialTab("friends")} style={{...S.btnPrimary,marginTop:"20px",maxWidth:"200px",margin:"20px auto 0"}}>Find Friends</button>
                    </div>
                  ):feed.map((r,i)=>{
                    const diff=r.total_score-r.total_par;
                    const isMe=r.user_id===user?.id;
                    return(
                      <div key={i} style={{...S.card,marginBottom:"14px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
                          <Avatar name={r.profile?.full_name} size={44} highlight={isMe}/>
                          <div style={{flex:1}}><div style={{fontWeight:"600",color:D.white,fontSize:"15px"}}>{r.profile?.full_name||"Golfer"}{isMe?" (You)":""}</div><div style={{fontSize:"12px",color:D.muted}}>{fmtDateShort(r.played_at)}</div></div>
                          <ScorePill score={r.total_score} par={r.total_par}/>
                        </div>
                        <div style={{background:D.surface,borderRadius:"10px",padding:"10px 14px",marginBottom:"12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:"700",color:D.text,fontSize:"15px"}}>{r.course_name||"Unknown Course"}</div><div style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>{r.holes_played} holes · par {r.total_par}</div></div>
                          <div style={{textAlign:"right"}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:"30px",fontWeight:"800",color:diff<0?D.green:diff===0?D.blue:D.red,lineHeight:1}}>{r.total_score}</div><div style={{fontSize:"11px",color:D.muted}}>strokes</div></div>
                        </div>
                        <div style={{display:"flex",gap:"8px"}}>
                          <button onClick={()=>{const j=randJab();setJabPost(j);}} style={{...S.pill,flex:1,textAlign:"center"}}>😂 Jab</button>
                          <button onClick={()=>speak(`${r.profile?.full_name||"Your buddy"} shot ${r.total_score} at ${r.course_name||"the course"}. ${diff<0?"Birdie machine!":diff===0?"Solid par golf.":"Keep grinding!"}`)} style={{...S.pill,flex:1,textAlign:"center"}}>👏 React</button>
                          {isMe&&<button onClick={()=>shareRound(r)} style={{background:D.greenDim,border:`1px solid ${D.green}44`,borderRadius:"99px",padding:"5px 14px",color:D.green,fontSize:"12px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",flex:1,textAlign:"center"}}>📤 Share</button>}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {socialTab==="leaderboard"&&(
                <>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:"24px",fontWeight:"800",color:D.white,marginBottom:"4px"}}>Monthly Board</div>
                  <div style={{color:D.muted,fontSize:"13px",marginBottom:"16px"}}>Best rounds among you and your friends this month</div>
                  {leaderboard.length===0?(
                    <div style={{textAlign:"center",padding:"48px 20px"}}><div style={{fontSize:"52px",marginBottom:"14px"}}>🏆</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:"20px",color:D.white,marginBottom:"8px"}}>No rounds yet</div><div style={{color:D.muted,fontSize:"14px"}}>Save a round to appear here</div></div>
                  ):leaderboard.map((r,i)=>{
                    const diff=r.total_score-r.total_par;
                    const isMe=r.user_id===user?.id;
                    const medals=["🥇","🥈","🥉"];
                    return(
                      <div key={i} style={{background:i===0?`linear-gradient(135deg,${D.greenDim},${D.surface})`:D.card,border:`1px solid ${i===0?D.green:D.border}`,borderRadius:"16px",padding:"14px 16px",marginBottom:"10px",display:"flex",alignItems:"center",gap:"12px"}}>
                        <div style={{fontSize:"28px",minWidth:"36px",textAlign:"center"}}>{medals[i]||`${i+1}`}</div>
                        <Avatar name={r.profile?.full_name} size={40} highlight={isMe}/>
                        <div style={{flex:1}}><div style={{fontWeight:"600",color:D.white,fontSize:"14px"}}>{r.profile?.full_name||"Golfer"}{isMe?" 👈":""}</div><div style={{fontSize:"12px",color:D.muted}}>{r.course_name||"Unknown"} · {fmtDateShort(r.played_at)}</div></div>
                        <div style={{textAlign:"right"}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:"26px",fontWeight:"800",color:diff<0?D.green:diff===0?D.blue:D.red,lineHeight:1}}>{diff>0?`+${diff}`:diff===0?"E":diff}</div><div style={{fontSize:"11px",color:D.muted}}>{r.total_score}</div></div>
                      </div>
                    );
                  })}
                </>
              )}
              {socialTab==="friends"&&(
                <>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:"24px",fontWeight:"800",color:D.white,marginBottom:"16px"}}>Friends</div>
                  {friendReqs.length>0&&(
                    <div style={{marginBottom:"20px"}}>
                      <div style={{fontSize:"11px",color:D.gold,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>FRIEND REQUESTS ({friendReqs.length})</div>
                      {friendReqs.map(req=>(
                        <div key={req.id} style={{...S.card,display:"flex",alignItems:"center",gap:"12px",marginBottom:"8px"}}>
                          <Avatar name={req.requester?.full_name} size={44}/>
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
                        <Avatar name={u.full_name} size={44}/>
                        <div style={{flex:1}}><div style={{fontWeight:"600",color:D.white,fontSize:"15px"}}>{u.full_name}</div><div style={{fontSize:"12px",color:D.muted}}>HCP {u.handicap_index||"—"} · {u.handicap_category||"golfer"}</div></div>
                        <button onClick={()=>sendFriendReq(u.id)} style={{background:D.greenDim,border:`1px solid ${D.green}44`,borderRadius:"10px",padding:"8px 14px",color:D.green,fontWeight:"600",fontSize:"13px",cursor:"pointer"}}>+ Add</button>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>MY FRIENDS ({friends.length})</div>
                  {friends.length===0?<div style={{textAlign:"center",padding:"24px",color:D.muted,fontSize:"14px"}}>Search above to add your first friend</div>:friends.map(f=>(
                    <div key={f.id} style={{...S.card,display:"flex",alignItems:"center",gap:"12px",marginBottom:"8px"}}>
                      <Avatar name={f.full_name} size={44}/>
                      <div style={{flex:1}}><div style={{fontWeight:"600",color:D.white,fontSize:"15px"}}>{f.full_name}</div><div style={{fontSize:"12px",color:D.muted}}>HCP {f.handicap_index||"—"} · {f.handicap_category||"golfer"}</div></div>
                      <div style={{fontSize:"22px"}}>⛳</div>
                    </div>
                  ))}
                </>
              )}
              {socialTab==="rounds"&&(
                <>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:"24px",fontWeight:"800",color:D.white,marginBottom:"16px"}}>My Rounds</div>
                  {roundHistory.length===0?<div style={{textAlign:"center",padding:"48px 20px"}}><div style={{fontSize:"52px",marginBottom:"14px"}}>📋</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:"20px",color:D.white,marginBottom:"8px"}}>No rounds saved yet</div><div style={{color:D.muted,fontSize:"14px"}}>Save a round from the Scorecard tab</div></div>:roundHistory.map((r,i)=>{
                    const diff=r.total_score-r.total_par;
                    return(
                      <div key={i} style={{...S.card,marginBottom:"12px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
                          <div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:"700",color:D.white,fontSize:"16px"}}>{r.course_name||"Unknown Course"}</div><div style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>{fmtDate(r.played_at)} · {r.holes_played} holes</div></div>
                          <div style={{textAlign:"right"}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:"32px",fontWeight:"800",color:diff<0?D.green:diff===0?D.blue:D.red,lineHeight:1}}>{r.total_score}</div><div style={{fontSize:"11px",color:D.muted}}>{diff>0?`+${diff}`:diff===0?"even par":`${diff}`}</div></div>
                        </div>
                        <div style={{display:"flex",gap:"8px"}}>
                          <button onClick={()=>setShowCard(r)} style={{...S.pill,flex:1,textAlign:"center"}}>📊 Summary Card</button>
                          <button onClick={()=>shareRound(r)} style={{background:D.greenDim,border:`1px solid ${D.green}44`,borderRadius:"99px",padding:"5px 14px",color:D.green,fontSize:"12px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",flex:1,textAlign:"center"}}>📤 Share</button>
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
            <div style={{background:`linear-gradient(160deg,${D.card} 0%,${D.dark} 100%)`,border:`1px solid ${D.border}`,borderRadius:"20px",padding:"24px",marginBottom:"20px",textAlign:"center"}}>
              <Avatar name={userProfile?.full_name||user?.email} size={72} highlight/>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:"24px",fontWeight:"800",color:D.white,marginTop:"14px"}}>{userProfile?.full_name||"Golfer"}</div>
              <div style={{fontSize:"13px",color:D.muted,marginTop:"4px"}}>{user?.email}</div>
              <div style={{display:"flex",justifyContent:"center",gap:"28px",marginTop:"20px"}}>
                {[["Rounds",roundHistory.length,"📋"],["Friends",friends.length,"👥"],["HCP",userProfile?.handicap_index||"—","⛳"]].map(([l,v,icon])=>(
                  <div key={l} style={{textAlign:"center"}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:"26px",fontWeight:"800",color:D.green}}>{v}</div><div style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>{icon} {l}</div></div>
                ))}
              </div>
            </div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:"18px",fontWeight:"700",color:D.white,marginBottom:"14px"}}>Settings</div>
            <div style={{marginBottom:"18px"}}>
              <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>Caddie Style</div>
              {PERSONAS.map(p=>(
                <button key={p.id} onClick={()=>setProfile(prev=>({...prev,persona:p.id}))} style={{display:"flex",alignItems:"center",gap:"14px",width:"100%",background:profile.persona===p.id?D.greenDim:D.surface,border:`1.5px solid ${profile.persona===p.id?D.green:D.border}`,borderRadius:"14px",padding:"14px",marginBottom:"8px",cursor:"pointer"}}>
                  <span style={{fontSize:"22px"}}>{p.icon}</span>
                  <div style={{flex:1,textAlign:"left"}}><div style={{fontWeight:"600",color:D.white,fontSize:"15px"}}>{p.label}</div><div style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>{p.desc}</div></div>
                  {profile.persona===p.id&&<div style={{width:"22px",height:"22px",borderRadius:"50%",background:D.green,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"12px"}}>✓</div>}
                </button>
              ))}
            </div>
            <div style={{marginBottom:"18px"}}>
              <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>Handicap</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                {HANDICAPS.map(h=>(
                  <button key={h.value} onClick={()=>setProfile(p=>({...p,handicap:h.value,hcp:h.hcp}))} style={{background:profile.handicap===h.value?D.greenDim:D.surface,border:`1.5px solid ${profile.handicap===h.value?D.green:D.border}`,borderRadius:"14px",padding:"14px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center"}}>
                    <span style={{fontFamily:"'Syne',sans-serif",fontWeight:"700",fontSize:"16px",color:profile.handicap===h.value?D.greenLt:D.text}}>{h.label}</span>
                    <span style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>HCP {h.sub}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:"18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase"}}>My Bag</div>
                <button onClick={()=>setEditingBag(!editingBag)} style={{background:editingBag?D.greenDim:D.surface,border:`1px solid ${editingBag?D.green:D.border}`,borderRadius:"99px",padding:"5px 14px",color:editingBag?D.green:D.muted,fontSize:"12px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{editingBag?"✓ Done":"Edit Distances"}</button>
              </div>
              {profile.bag.map((item,idx)=>(
                <div key={idx} style={{display:"flex",alignItems:"center",gap:"12px",padding:"9px 14px",background:D.surface,borderRadius:"10px",border:`1px solid ${D.border}`,marginBottom:"4px"}}>
                  <span style={{color:D.muted,fontSize:"13px",minWidth:"72px"}}>{item.club}</span>
                  {editingBag?<input type="number" value={item.carry} onChange={e=>{const nb=[...profile.bag];nb[idx]={...nb[idx],carry:parseInt(e.target.value)||0};setProfile(p=>({...p,bag:nb}));}} style={{...S.input,width:"70px",padding:"4px 10px",fontSize:"14px"}}/>:<div style={{flex:1,height:"4px",background:D.border,borderRadius:"2px"}}><div style={{height:"100%",width:`${(item.carry/260)*100}%`,background:`linear-gradient(90deg,${D.green},${D.greenLt})`,borderRadius:"2px",opacity:0.8}}/></div>}
                  <span style={{color:D.text,fontSize:"14px",fontWeight:"600",minWidth:"44px",textAlign:"right"}}>{item.carry}y</span>
                </div>
              ))}
            </div>
            <div style={{marginBottom:"18px"}}>
              <div style={{fontSize:"11px",color:D.muted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>Typical Miss</div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                {["straight","fade","slice","draw","hook","pull","push"].map(m=>(
                  <button key={m} onClick={()=>setProfile(p=>({...p,missTend:m}))} style={{background:profile.missTend===m?D.greenDim:D.surface,border:`1.5px solid ${profile.missTend===m?D.green:D.border}`,color:profile.missTend===m?D.green:D.muted,borderRadius:"99px",padding:"7px 14px",fontSize:"13px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:profile.missTend===m?"600":"400"}}>{m}</button>
                ))}
              </div>
            </div>
            <button onClick={saveProfile} style={{...S.btnPrimary,marginBottom:"10px"}}>💾 Save Changes</button>
            <button onClick={fetchWeather} style={{...S.btnSecondary,marginBottom:"10px"}}>{wxLoading?"Refreshing...":"🔄 Refresh Weather"}</button>
            <button onClick={handleLogout} style={{background:"transparent",border:`1.5px solid ${D.red}44`,borderRadius:"14px",color:D.red,fontSize:"15px",padding:"13px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",width:"100%",marginBottom:"20px"}}>Sign Out</button>
          </div>
        )}
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS=`
  @keyframes popIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.85)}}
  @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
  select option{background:#1a2a1a;color:#e8f5e9}
  ::-webkit-scrollbar{width:3px;height:3px}
  ::-webkit-scrollbar-thumb{background:#243524;border-radius:2px}
  *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
  input:focus{border-color:#22c55e !important}
`;
