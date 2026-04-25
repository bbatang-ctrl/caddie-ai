// OBI-GOLF-REDESIGN-v1 - Lovable design system
import React,{useState,useEffect,useRef,useCallback} from "react";
import {supabase} from "./supabase.js";
import {DARK_THEME,LIGHT_THEME,DEFAULT_BAG,Ball,ScoreBadge,Avatar,
  fmtDate,fmtDateShort,windDir,wxIcon,playingYards,firstName,randJab,
  JABS,QUICK_PROMPTS,analyzeSwing,analyzeSwingVideo,
  ErrorBoundary,ShotShapeDiagram,OnboardingFlow} from "./AppPart1.jsx";

// ── CSS injected into <head> ───────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;background:var(--bg);}
body{font-family:var(--font-sans);-webkit-font-smoothing:antialiased;overflow-x:hidden;}
:root{
  --font-sans:'Inter',ui-sans-serif,system-ui,sans-serif;
  --font-display:'Space Grotesk','Inter',ui-sans-serif,sans-serif;
  --radius:0.75rem;
  --bg:#0f0f14;
  --fg:#f0f0f5;
  --card:#17171f;
  --card-border:#2a2a38;
  --surface:#1f1f2a;
  --muted:#5a5a72;
  --muted-fg:#8888a4;
  --primary:#4ade80;
  --primary-dim:rgba(74,222,128,0.12);
  --accent:#fbbf24;
  --destructive:#f87171;
  --ring:#4ade80;
}
.light{
  --bg:#f8f8fc;
  --fg:#1a1a28;
  --card:#ffffff;
  --card-border:#e4e4ef;
  --surface:#f0f0f8;
  --muted:#d0d0e0;
  --muted-fg:#7070a0;
  --primary:#16a34a;
  --primary-dim:rgba(22,163,74,0.1);
  --accent:#d97706;
  --destructive:#dc2626;
}
.display{font-family:var(--font-display);font-weight:700;letter-spacing:-0.02em;}
.stat{font-family:var(--font-display);font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-0.04em;}
.tabular{font-variant-numeric:tabular-nums;}
.pt-safe{padding-top:env(safe-area-inset-top);}
.pb-safe{padding-bottom:env(safe-area-inset-bottom);}
input,textarea,select{font-family:var(--font-sans);}
input::placeholder,textarea::placeholder{color:var(--muted-fg);}
button{cursor:pointer;font-family:inherit;}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes popIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-up{animation:fadeUp 0.4s cubic-bezier(.2,.8,.4,1) both;}
.pop-in{animation:popIn 0.4s cubic-bezier(.34,1.56,.64,1) both;}
/* Scrollable areas */
.scroll-y{overflow-y:auto;-webkit-overflow-scrolling:touch;}
.scroll-x{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.scroll-x::-webkit-scrollbar{display:none;}
/* Tab pill */
.tab-pill{display:flex;gap:4px;background:var(--surface);border-radius:12px;padding:4px;}
.tab-pill button{flex:1;padding:7px 10px;border-radius:9px;border:none;background:transparent;color:var(--muted-fg);font-family:var(--font-display);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;transition:all 0.15s;}
.tab-pill button.active{background:var(--card);color:var(--fg);box-shadow:0 1px 4px rgba(0,0,0,0.3);}
/* Chat bubble */
.bubble-user{background:var(--primary);color:#000;border-radius:18px 18px 4px 18px;padding:10px 14px;max-width:82%;font-size:14px;line-height:1.5;}
.bubble-ai{background:var(--surface);color:var(--fg);border-radius:18px 18px 18px 4px;padding:10px 14px;max-width:88%;font-size:14px;line-height:1.6;border:1px solid var(--card-border);}
/* Chip */
.chip{display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--card-border);border-radius:99px;padding:5px 12px;font-size:11px;font-family:var(--font-display);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg);white-space:nowrap;}
/* Stat card */
.stat-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:14px;}
/* Row list */
.row-list{background:var(--card);border:1px solid var(--card-border);border-radius:16px;overflow:hidden;}
.row-list>*+*{border-top:1px solid var(--card-border);}
/* Nav active indicator */
.nav-pip{width:4px;height:4px;border-radius:99px;background:var(--primary);margin:0 auto 2px;}
`;

function ObiGolfApp(){
  const [isDark,setIsDark]=useState(()=>{
    try{const s=localStorage.getItem("obi_dark");return s===null?true:s==="true";}catch{return true;}
  });

  // Inject design system CSS once
  useEffect(()=>{
    const id="obi-css";
    if(!document.getElementById(id)){
      const el=document.createElement("style");
      el.id=id;el.textContent=CSS;
      document.head.appendChild(el);
    }
  },[]);

  useEffect(()=>{
    const el=document.documentElement;
    el.classList.toggle("light",!isDark);
    document.body.style.background="var(--bg)";
    try{localStorage.setItem("obi_dark",String(isDark));}catch{}
  },[isDark]);

  // ── Shared style tokens ──────────────────────────────────────────
  const T={
    bg:"var(--bg)", fg:"var(--fg)", card:"var(--card)", border:"var(--card-border)",
    surface:"var(--surface)", muted:"var(--muted)", mutedFg:"var(--muted-fg)",
    primary:"var(--primary)", primaryDim:"var(--primary-dim)",
    accent:"var(--accent)", red:"var(--destructive)",
  };

  // ── Reusable style helpers ───────────────────────────────────────
  const S={
    input:{background:T.surface,border:"1px solid "+T.border,borderRadius:"12px",color:T.fg,
      fontSize:"14px",padding:"11px 14px",outline:"none",width:"100%",fontFamily:"var(--font-sans)"},
    btnPrimary:{background:T.primary,border:"none",borderRadius:"12px",color:"#000",
      fontSize:"14px",fontFamily:"var(--font-display)",fontWeight:"700",padding:"12px 20px",
      textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer",display:"inline-flex",
      alignItems:"center",justifyContent:"center",gap:"8px"},
    btnSecondary:{background:T.surface,border:"1px solid "+T.border,borderRadius:"12px",color:T.fg,
      fontSize:"13px",fontFamily:"var(--font-display)",fontWeight:"700",padding:"10px 16px",
      textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer",display:"inline-flex",
      alignItems:"center",justifyContent:"center",gap:"6px"},
    btnGhost:{background:"transparent",border:"none",color:T.mutedFg,fontSize:"13px",
      fontFamily:"var(--font-display)",fontWeight:"700",padding:"8px",cursor:"pointer",
      textTransform:"uppercase",letterSpacing:"0.06em"},
    card:{background:T.card,border:"1px solid "+T.border,borderRadius:"16px",padding:"16px"},
    pill:{background:T.surface,border:"1px solid "+T.border,borderRadius:"99px",
      padding:"5px 12px",fontSize:"11px",fontFamily:"var(--font-display)",fontWeight:"700",
      textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer",color:T.fg,
      display:"inline-flex",alignItems:"center",gap:"6px"},
  };

  // ── Auth state ───────────────────────────────────────────────────
  const [user,setUser]=useState(null);
  const [userProfile,setUserProfile]=useState(null);
  const [authScreen,setAuthScreen]=useState("login");
  const [authLoading,setAuthLoading]=useState(true);
  const [authEmail,setAuthEmail]=useState("");
  const [authPass,setAuthPass]=useState("");
  const [authName,setAuthName]=useState("");
  const [authError,setAuthError]=useState("");

  // ── Navigation ───────────────────────────────────────────────────
  const [tab,setTab]=useState("caddie");
  const changeTab=(newTab)=>{
    if(window.speechSynthesis)window.speechSynthesis.cancel();
    setSpeaking(false);
    setTab(newTab);
  };
  const [subView,setSubView]=useState("chat");
  const [socialView,setSocialView]=useState("feed");
  const [profileSection,setProfileSection]=useState(null);

  // ── Profile & onboarding ─────────────────────────────────────────
  const [avatarUrl,setAvatarUrl]=useState(null);
  const [uploadingAvatar,setUploadingAvatar]=useState(false);
  const [showAvatarZoom,setShowAvatarZoom]=useState(null);
  const avatarInputRef=useRef(null);
  const [profile,setProfile]=useState({handicap:"mid",hcp:13,persona:"pro",missTend:"straight",bag:DEFAULT_BAG,dexterity:"right",homeCourse:"",practiceGoal:""});
  const [onboardStep,setOnboardStep]=useState(0);
  const [editingBag,setEditingBag]=useState(false);

  // ── Round / caddie ───────────────────────────────────────────────
  const [course,setCourse]=useState("");
  const [courseInput,setCourseInput]=useState("");
  const [hole,setHole]=useState(1);
  const [holePars,setHolePars]=useState(Array(18).fill(4));
  const [yardage,setYardage]=useState("");
  const [lie,setLie]=useState("fairway");
  const [elevation,setElevation]=useState(0);
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [speaking,setSpeaking]=useState(false);
  const [shotHistory,setShotHistory]=useState([]);
  const [scorecard,setScorecard]=useState(Array(18).fill(null));
  const [holeOpen,setHoleOpen]=useState(false);

  // ── Weather ──────────────────────────────────────────────────────
  const [weather,setWeather]=useState(null);

  // ── Practice ─────────────────────────────────────────────────────
  const [practiceSubTab,setPracticeSubTab]=useState("swing");
  const [swingFile,setSwingFile]=useState(null);
  const [swingNotes,setSwingNotes]=useState("");
  const [swingAnalysis,setSwingAnalysis]=useState("");
  const [swingLoading,setSwingLoading]=useState(false);
  const [swingHistory,setSwingHistory]=useState([]);
  const [rangeClub,setRangeClub]=useState("7-iron");
  const [rangeResult,setRangeResult]=useState(null);
  const [rangeShotResult,setRangeShotResult]=useState(null);
  const [rangeHistory,setRangeHistory]=useState([]);
  const [rangeLoading,setRangeLoading]=useState(false);
  const [cameraActive,setCameraActive]=useState(false);
  const [recording,setRecording]=useState(false);
  const [clubStats,setClubStats]=useState({});
  const [showAllShots,setShowAllShots]=useState(false);
  const videoRef=useRef(null);
  const mediaRecorderRef=useRef(null);
  const chunksRef=useRef([]);

  // ── Social ───────────────────────────────────────────────────────
  const [rounds,setRounds]=useState([]);
  const [friends,setFriends]=useState([]);
  const [friendReqs,setFriendReqs]=useState([]);
  const [friendSearch,setFriendSearch]=useState("");
  const [friendResults,setFriendResults]=useState([]);
  const [feed,setFeed]=useState([]);
  const [showAllFeed,setShowAllFeed]=useState(false);
  const [jabPost,setJabPost]=useState(null);
  const [showCard,setShowCard]=useState(null);

  // ── Refs ─────────────────────────────────────────────────────────
  const chatEndRef=useRef(null);
  const swingInputRef=useRef(null);

  // ── Auth effect ──────────────────────────────────────────────────
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user||null);
      setAuthLoading(false);
      if(session?.user)loadProfile(session.user);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      setUser(session?.user||null);
      if(session?.user){loadProfile(session.user);setAuthScreen("app");}
      else setAuthScreen("login");
    });
    return()=>subscription.unsubscribe();
  },[]);

  const loadProfile=async(u)=>{
    const {data}=await supabase.from("profiles").select("*").eq("id",u.id).single();
    if(data){
      setUserProfile(data);
      setAvatarUrl(data.avatar_url||null);
      if(data.onboarded){
        setAuthScreen("app");
        if(data.bag&&data.bag.length>0){
          setProfile(p=>({...p,
            handicap:data.handicap_category||p.handicap,
            hcp:data.handicap_index||p.hcp,
            persona:data.caddie_persona||p.persona,
            missTend:data.miss_tendency||p.missTend,
            bag:data.bag,
            dexterity:data.dexterity||p.dexterity,
            homeCourse:data.home_course||p.homeCourse,
            practiceGoal:data.practice_goal||p.practiceGoal,
          }));
        }
      } else {
        setAuthScreen("onboard");
      }
      loadRounds(u.id);
      loadFriends(u.id);
      loadFeed();
    } else {
      setAuthScreen("onboard");
    }
  };

  const saveProfile=async()=>{
    if(!user)return;
    await supabase.from("profiles").upsert({
      id:user.id,full_name:userProfile?.full_name||authName,
      handicap_category:profile.handicap,handicap_index:profile.hcp,
      caddie_persona:profile.persona,miss_tendency:profile.missTend,
      bag:profile.bag,dexterity:profile.dexterity,
      home_course:profile.homeCourse,practice_goal:profile.practiceGoal,
      onboarded:true,updated_at:new Date().toISOString(),
    });
  };

  const loadRounds=async(uid)=>{
    const {data}=await supabase.from("rounds").select("*").eq("user_id",uid).order("played_at",{ascending:false}).limit(20);
    if(data)setRounds(data);
  };

  const loadFriends=async(uid)=>{
    const {data}=await supabase.from("friendships").select("*,requester:profiles!friendships_requester_id_fkey(id,full_name,handicap_index,avatar_url),addressee:profiles!friendships_addressee_id_fkey(id,full_name,handicap_index,avatar_url)").or("requester_id.eq."+uid+",addressee_id.eq."+uid);
    if(data){
      setFriends(data.filter(f=>f.status==="accepted"));
      setFriendReqs(data.filter(f=>f.status==="pending"&&f.addressee_id===uid));
    }
  };

  const loadFeed=async()=>{
    const {data}=await supabase.from("rounds").select("*,profiles(full_name,avatar_url,handicap_index)").order("played_at",{ascending:false}).limit(20);
    if(data)setFeed(data);
  };

  // ── Auth handlers ────────────────────────────────────────────────
  const handleLogin=async(e)=>{
    e&&e.preventDefault();
    setAuthError("");
    const{error}=await supabase.auth.signInWithPassword({email:authEmail,password:authPass});
    if(error)setAuthError(error.message);
  };

  const handleSignup=async(e)=>{
    e&&e.preventDefault();
    setAuthError("");
    const{error}=await supabase.auth.signUp({email:authEmail,password:authPass,options:{data:{full_name:authName}}});
    if(error)setAuthError(error.message);
    else setAuthScreen("onboard");
  };

  const handleLogout=async()=>{
    await supabase.auth.signOut();
    setUser(null);setMessages([]);setRounds([]);
  };

  const handleGoogleAuth=async()=>{
    await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});
  };

  // ── Weather ──────────────────────────────────────────────────────
  const fetchWeather=useCallback(()=>{
    if(!navigator.geolocation)return;
    navigator.geolocation.getCurrentPosition(async({coords:{latitude:lat,longitude:lng}})=>{
      try{
        const r=await fetch("https://api.open-meteo.com/v1/forecast?latitude="+lat+"&longitude="+lng+"&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph");
        const d=await r.json();
        setWeather({temp:Math.round(d.current.temperature_2m),wind:Math.round(d.current.wind_speed_10m),windDeg:d.current.wind_direction_10m,code:d.current.weather_code});
      }catch{}
    });
  },[]);

  useEffect(()=>{fetchWeather();},[fetchWeather]);

  // ── Caddie chat ──────────────────────────────────────────────────
  const buildSystem=()=>{
    const personas={
      pro:"You are a calm precise Tour-level golf caddie named Obi. Quiet authority. 2-3 sentences.",
      coach:"You are an encouraging golf coach-caddie named Obi. Warm and confidence-building. 2-3 sentences.",
      hype:"You are an energetic hype-man caddie named Obi. Enthusiastic and motivating. 2-3 sentences.",
      savage:"You are a savage trash-talking caddie named Obi. Brutal honesty with humor. 2-3 sentences.",
      oldschool:"You are a gritty old-school caddie named Obi. Straight talk. Short and real."
    };
    const persona=personas[profile.persona]||personas.pro;
    const bagStr=profile.bag.map(b=>b.club+":"+b.carry+"y").join(", ");
    const wx=weather?"Wind "+weather.wind+"mph "+windDir(weather.windDeg)+". "+weather.temp+"F.":"No weather.";
    const py=yardage?playingYards(parseInt(yardage),elevation,weather?.wind||0,weather?.windDeg||0):null;
    const name=firstName(userProfile?.full_name);
    const handed=profile.dexterity==="left"?"left-handed":"right-handed";
    const yardStr=yardage?(yardage+"y actual, ~"+py+"y playing"):"not set";
    const recentStr=shotHistory.slice(-3).map(s=>"H"+s.hole+": "+s.outcome).join(". ")||"none";
    return persona
      +"\nPLAYER: "+name+". Always use first name. "+handed+" golfer. HCP "+profile.hcp+" ("+profile.handicap+"). Miss: "+profile.missTend+". Home: "+(profile.homeCourse||"unknown")+"."
      +"\nBAG: "+bagStr
      +"\nHOLE: "+(course||"unknown")+", Hole "+hole+", Par "+holePars[hole-1]
      +"\nYARDAGE: "+yardStr+". Lie: "+lie+". Elevation: "+elevation+"ft."
      +"\nCONDITIONS: "+wx
      +"\nRECENT: "+recentStr
      +"\nRULES: Only clubs from bag. No markdown. No bullets. Always finish sentences. Tailor to "+handed+" player.";
  };

  const sendMessage=async(text)=>{
    const msg=text||input;
    if(!msg.trim()||loading)return;
    setInput("");
    const userMsg={role:"user",content:msg};
    const newMessages=[...messages,userMsg];
    setMessages(newMessages);
    setLoading(true);
    try{
      const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:newMessages,system:buildSystem()})});
      const d=await r.json();
      const reply=d.content[0].text;
      setMessages(m=>[...m,{role:"assistant",content:reply}]);
    }catch(e){
      setMessages(m=>[...m,{role:"assistant",content:"Sorry, having trouble connecting. Try again."}]);
    }
    setLoading(false);
  };

  const speak=(text)=>{
    if(!window.speechSynthesis)return;
    if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return;}
    const utt=new SpeechSynthesisUtterance(text.replace(/[*_#]/g,""));
    utt.rate=0.93;utt.pitch=0.95;
    utt.onend=()=>setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utt);
  };

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  // ── Scorecard ────────────────────────────────────────────────────
  const saveRound=async()=>{
    if(!user)return;
    const filled=scorecard.filter(Boolean);
    if(filled.length===0)return;
    const total=filled.reduce((a,b)=>a+b,0);
    const par=holePars.slice(0,filled.length).reduce((a,b)=>a+b,0);
    const {data,error}=await supabase.from("rounds").insert({
      user_id:user.id,course_name:course||"Unknown Course",
      total_score:total,holes_played:filled.length,
      score_vs_par:total-par,played_at:new Date().toISOString(),
      scorecard:scorecard,hole_pars:holePars,
    }).select().single();
    if(!error&&data){
      setRounds(r=>[data,...r]);
      alert("Round saved! Score: "+total+" ("+( total-par>0?"+":"")+( total-par)+")");
    }
  };

  // ── Avatar upload ────────────────────────────────────────────────
  const handleAvatarUpload=async(e)=>{
    const file=e.target.files?.[0];
    if(!file||!user)return;
    setUploadingAvatar(true);
    try{
      const canvas=document.createElement("canvas");
      const img=new Image();
      img.onload=async()=>{
        const maxSize=400;
        let{width:w,height:h}={width:img.width,height:img.height};
        if(w>h){if(w>maxSize){h=h*(maxSize/w);w=maxSize;}}
        else{if(h>maxSize){w=w*(maxSize/h);h=maxSize;}}
        canvas.width=w;canvas.height=h;
        canvas.getContext("2d").drawImage(img,0,0,w,h);
        canvas.toBlob(async(blob)=>{
          if(!blob)return;
          const ext=file.name.split(".").pop()||"jpg";
          const path=user.id+"."+ext;
          const{error:upErr}=await supabase.storage.from("avatars").upload(path,blob,{upsert:true,contentType:"image/jpeg"});
          if(!upErr){
            const{data:{publicUrl}}=supabase.storage.from("avatars").getPublicUrl(path);
            const url=publicUrl+"?t="+Date.now();
            setAvatarUrl(url);
            await supabase.from("profiles").update({avatar_url:url}).eq("id",user.id);
          }
          setUploadingAvatar(false);
        },"image/jpeg",0.85);
      };
      img.src=URL.createObjectURL(file);
    }catch{setUploadingAvatar(false);}
  };

  // ── Friend search ────────────────────────────────────────────────
  const searchFriends=async()=>{
    if(!friendSearch.trim())return;
    const{data}=await supabase.from("profiles").select("id,full_name,handicap_index,avatar_url").ilike("full_name","%"+friendSearch+"%").neq("id",user?.id).limit(10);
    setFriendResults(data||[]);
  };

  const sendFriendReq=async(toId)=>{
    if(!user)return;
    await supabase.from("friendships").insert({requester_id:user.id,addressee_id:toId,status:"pending"});
    setFriendResults(r=>r.filter(x=>x.id!==toId));
  };

  const acceptFriend=async(fid)=>{
    await supabase.from("friendships").update({status:"accepted"}).eq("id",fid);
    if(user)loadFriends(user.id);
  };

  // ── Swing analysis ───────────────────────────────────────────────
  const handleSwingAnalyze=async()=>{
    if(!swingFile||swingLoading)return;
    setSwingLoading(true);setSwingAnalysis("");
    try{
      const isVideo=swingFile.type.startsWith("video/");
      let result;
      if(isVideo){result=await analyzeSwingVideo(swingFile,swingNotes,profile);}
      else{result=await analyzeSwing(swingFile,swingNotes,profile);}
      setSwingAnalysis(result);
      if(user){
        const{data}=await supabase.from("swing_analyses").insert({
          user_id:user.id,notes:swingNotes,analysis:result,
          club_used:swingNotes||"unknown",created_at:new Date().toISOString(),
        }).select().single();
        if(data)setSwingHistory(h=>[data,...h]);
      }
    }catch(e){setSwingAnalysis("Analysis failed. Please try again.");}
    setSwingLoading(false);
  };

  useEffect(()=>{
    if(!user)return;
    supabase.from("swing_analyses").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10).then(({data})=>{if(data)setSwingHistory(data);});
    supabase.from("range_shots").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50).then(({data})=>{if(data){setRangeHistory(data);const stats={};data.forEach(s=>{if(!stats[s.club])stats[s.club]={count:0,shapes:{},totalCarry:0,shapeCount:0,typicalShape:"straight",consistencyStars:3};stats[s.club].count++;if(s.shape)stats[s.club].shapes[s.shape]=(stats[s.club].shapes[s.shape]||0)+1;});Object.keys(stats).forEach(club=>{const sh=stats[club].shapes;const top=Object.entries(sh).sort((a,b)=>b[1]-a[1])[0];if(top){stats[club].typicalShape=top[0];stats[club].shapeCount=top[1];}});setClubStats(stats);}});
  },[user]);

  // ── Range shot ───────────────────────────────────────────────────
  const analyzeRangeShot=async(videoBlob)=>{
    setRangeLoading(true);setRangeShotResult(null);
    try{
      const frames=[];
      const video=document.createElement("video");
      video.src=URL.createObjectURL(videoBlob);
      await new Promise(res=>{video.onloadedmetadata=res;});
      const duration=Math.min(video.duration,5);
      const numFrames=4;
      for(let i=0;i<numFrames;i++){
        video.currentTime=(duration/(numFrames+1))*(i+1);
        await new Promise(res=>{video.onseeked=res;});
        const canvas=document.createElement("canvas");
        canvas.width=320;canvas.height=240;
        canvas.getContext("2d").drawImage(video,0,0,320,240);
        frames.push(canvas.toDataURL("image/jpeg",0.7).split(",")[1]);
      }
      const r=await fetch("/api/swing",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({frames,club:rangeClub,mode:"range",playerProfile:{handicap:profile.hcp,persona:profile.persona,missTend:profile.missTend,dexterity:profile.dexterity}})});
      const d=await r.json();
      const jsonStart=d.analysis.indexOf("{");
      const jsonEnd=d.analysis.lastIndexOf("}");
      const match=jsonStart>=0&&jsonEnd>jsonStart?[d.analysis.slice(jsonStart,jsonEnd+1)]:null;
      if(match){
        const parsed=JSON.parse(match[0]);
        setRangeShotResult(parsed);
        const shotData={user_id:user?.id,club:rangeClub,shape:parsed.shape||"straight",carry:parsed.carry||0,notes:parsed.coaching||"",created_at:new Date().toISOString()};
        setRangeHistory(h=>[shotData,...h]);
        setClubStats(prev=>{
          const s={...prev};
          if(!s[rangeClub])s[rangeClub]={count:0,shapes:{},shapeCount:0,typicalShape:"straight",consistencyStars:3};
          s[rangeClub].count++;
          if(parsed.shape){s[rangeClub].shapes[parsed.shape]=(s[rangeClub].shapes[parsed.shape]||0)+1;const top=Object.entries(s[rangeClub].shapes).sort((a,b)=>b[1]-a[1])[0];s[rangeClub].typicalShape=top[0];s[rangeClub].shapeCount=top[1];}
          return s;
        });
        if(user)await supabase.from("range_shots").insert(shotData);
      }
    }catch(e){setRangeShotResult({error:"Analysis failed"});}
    setRangeLoading(false);
  };

  // ── Camera ───────────────────────────────────────────────────────
  const startCamera=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});
      if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play();}
      setCameraActive(true);
    }catch(e){alert("Camera access denied.");}
  };

  const stopCamera=()=>{
    if(videoRef.current?.srcObject){
      videoRef.current.srcObject.getTracks().forEach(t=>t.stop());
      videoRef.current.srcObject=null;
    }
    setCameraActive(false);setRecording(false);
  };

  const startRecording=()=>{
    if(!videoRef.current?.srcObject)return;
    chunksRef.current=[];
    const mr=new MediaRecorder(videoRef.current.srcObject,{mimeType:"video/webm;codecs=vp8"});
    mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
    mr.onstop=()=>{
      const blob=new Blob(chunksRef.current,{type:"video/webm"});
      stopCamera();
      analyzeRangeShot(blob);
    };
    mediaRecorderRef.current=mr;
    mr.start();setRecording(true);
    setTimeout(()=>{if(mr.state==="recording")mr.stop();},4000);
  };

  const stopRecording=()=>{
    if(mediaRecorderRef.current?.state==="recording")mediaRecorderRef.current.stop();
    setRecording(false);
  };

  // ── Summary modal ────────────────────────────────────────────────
  const SummaryModal=({round})=>{
    const diff=round.score_vs_par||0;
    const diffStr=diff===0?"E":diff>0?"+"+diff:""+diff;
    const diffColor=diff>0?T.red:diff<0?T.primary:"var(--fg)";
    return(
      <div onClick={()=>setShowCard(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
        <div onClick={e=>e.stopPropagation()} style={{...S.card,maxWidth:"380px",width:"100%",maxHeight:"80vh",overflowY:"auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <Ball size={32}/>
              <div style={{fontFamily:"var(--font-display)",fontSize:"18px",fontWeight:"700",color:T.fg}}>Round Summary</div>
            </div>
            <button onClick={()=>setShowCard(null)} style={{...S.btnGhost,fontSize:"20px",lineHeight:1}}>x</button>
          </div>
          <div style={{fontFamily:"var(--font-display)",fontSize:"15px",fontWeight:"600",color:T.fg,marginBottom:"4px"}}>{round.course_name}</div>
          <div style={{fontSize:"12px",color:T.mutedFg,marginBottom:"20px"}}>{fmtDate(round.played_at)}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"20px"}}>
            {[["SCORE",round.total_score,T.fg],["vs PAR",diffStr,diffColor],["HOLES",(round.holes_played||18)+"/18",T.fg]].map(([l,v,c])=>(
              <div key={l} style={{background:T.surface,borderRadius:"12px",padding:"12px 8px",textAlign:"center"}}>
                <div style={{fontSize:"9px",color:T.mutedFg,letterSpacing:"1.5px",marginBottom:"6px",fontFamily:"var(--font-display)",textTransform:"uppercase"}}>{l}</div>
                <div style={{fontFamily:"var(--font-display)",fontSize:"26px",fontWeight:"700",color:c}}>{v}</div>
              </div>
            ))}
          </div>
          {round.scorecard&&(
            <div style={{overflowX:"auto"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(18,1fr)",gap:"3px",minWidth:"540px"}}>
                {round.scorecard.map((s,i)=>(
                  <div key={i} style={{textAlign:"center"}}>
                    <div style={{fontSize:"9px",color:T.mutedFg,marginBottom:"3px",fontFamily:"var(--font-display)"}}>{i+1}</div>
                    <div style={{borderRadius:"6px",padding:"4px 2px",background:s===null?T.surface:s<(round.hole_pars?.[i]||4)?T.primaryDim:s>(round.hole_pars?.[i]||4)?"rgba(248,113,113,0.15)":T.surface,fontFamily:"var(--font-display)",fontSize:"12px",fontWeight:"700",color:s===null?T.mutedFg:s<(round.hole_pars?.[i]||4)?T.primary:s>(round.hole_pars?.[i]||4)?T.red:T.fg}}>{s||"-"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Loading screen ───────────────────────────────────────────────
  if(authLoading)return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"20px"}}>
      <div className="pop-in"><Ball size={64}/></div>
      <div style={{fontFamily:"var(--font-display)",fontSize:"28px",fontWeight:"700",color:T.fg,letterSpacing:"-0.02em"}}>Obi Golf</div>
      <div style={{display:"flex",gap:"6px"}}>
        {[0,1,2].map(i=>(
          <div key={i} style={{width:"6px",height:"6px",borderRadius:"99px",background:T.primary,animation:"pulse 1.2s "+(i*0.2)+"s infinite"}}/>
        ))}
      </div>
    </div>
  );

  // ── Auth / Onboarding ────────────────────────────────────────────
  if(!user||authScreen==="onboard")return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"var(--font-sans)"}}>
      <div style={{maxWidth:"420px",margin:"0 auto",padding:"40px 24px",display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        {authScreen!=="onboard"&&(
          <React.Fragment>
            <div style={{textAlign:"center",marginBottom:"40px"}} className="fade-up">
              <Ball size={52}/>
              <div style={{fontFamily:"var(--font-display)",fontSize:"28px",fontWeight:"700",color:T.fg,marginTop:"14px",letterSpacing:"-0.02em"}}>Obi Golf</div>
              <div style={{fontSize:"13px",color:T.mutedFg,marginTop:"6px"}}>Your AI caddie. Always in the bag.</div>
            </div>
            <div style={{display:"flex",gap:"4px",background:T.surface,borderRadius:"12px",padding:"4px",marginBottom:"28px"}} className="fade-up">
              {["login","signup"].map(s=>(
                <button key={s} onClick={()=>setAuthScreen(s)} style={{flex:1,padding:"10px",borderRadius:"9px",border:"none",background:authScreen===s?T.card:"transparent",color:authScreen===s?T.fg:T.mutedFg,fontFamily:"var(--font-display)",fontSize:"13px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em",transition:"all 0.15s",boxShadow:authScreen===s?"0 1px 4px rgba(0,0,0,0.3)":"none"}}>
                  {s==="login"?"Sign In":"Sign Up"}
                </button>
              ))}
            </div>
            <div className="fade-up" style={{animationDelay:"0.05s"}}>
              <button onClick={handleGoogleAuth} style={{...S.btnSecondary,width:"100%",marginBottom:"16px",padding:"13px"}}>
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
                Continue with Google
              </button>
              <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
                <div style={{flex:1,height:"1px",background:T.border}}/>
                <span style={{fontSize:"11px",color:T.mutedFg,fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.08em"}}>or</span>
                <div style={{flex:1,height:"1px",background:T.border}}/>
              </div>
              {authScreen==="signup"&&(
                <input style={{...S.input,marginBottom:"10px"}} placeholder="Full name" value={authName} onChange={e=>setAuthName(e.target.value)}/>
              )}
              <input style={{...S.input,marginBottom:"10px"}} placeholder="Email" type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)}/>
              <input style={{...S.input,marginBottom:"16px"}} placeholder="Password" type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&(authScreen==="login"?handleLogin():handleSignup())}/>
              {authError&&<div style={{color:T.red,fontSize:"13px",marginBottom:"12px",textAlign:"center"}}>{authError}</div>}
              <button onClick={authScreen==="login"?handleLogin:handleSignup} style={{...S.btnPrimary,width:"100%",padding:"14px"}}>
                {authScreen==="login"?"Sign In":"Create Account"}
              </button>
            </div>
          </React.Fragment>
        )}
        {authScreen==="onboard"&&(
          <OnboardingFlow
            step={onboardStep}
            setStep={setOnboardStep}
            profile={profile}
            setProfile={setProfile}
            onComplete={async()=>{
              await saveProfile();
              setAuthScreen("app");
            }}
          />
        )}
      </div>
    </div>
  );

  // ── MAIN APP ─────────────────────────────────────────────────────
  const name=firstName(userProfile?.full_name)||"Golfer";

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",maxWidth:"480px",margin:"0 auto",background:T.bg,color:T.fg,fontFamily:"var(--font-sans)",position:"relative",overflow:"hidden"}}>

      {/* Modals */}
      {showCard&&<SummaryModal round={showCard}/>}

      {showAvatarZoom&&(
        <div onClick={()=>setShowAvatarZoom(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
          <div onClick={e=>e.stopPropagation()} style={{textAlign:"center"}}>
            <img src={showAvatarZoom} alt="Profile" style={{width:"280px",height:"280px",borderRadius:"50%",objectFit:"cover"}}/>
            <div style={{marginTop:"16px",color:T.mutedFg,fontSize:"13px"}}>Tap anywhere to close</div>
          </div>
        </div>
      )}

      {jabPost&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
          <div onClick={e=>e.stopPropagation()} style={{...S.card,maxWidth:"320px",width:"100%",textAlign:"center"}}>
            <div style={{fontSize:"40px",marginBottom:"12px"}}>😂</div>
            <div style={{fontFamily:"var(--font-display)",fontSize:"17px",color:T.fg,marginBottom:"8px",fontWeight:"700"}}>Send a jab?</div>
            <div style={{fontSize:"14px",color:T.mutedFg,marginBottom:"20px",fontStyle:"italic"}}>"{jabPost}"</div>
            <div style={{display:"flex",gap:"10px"}}>
              <button onClick={()=>setJabPost(null)} style={{...S.btnGhost,flex:1}}>Cancel</button>
              <button onClick={()=>setJabPost(null)} style={{...S.btnPrimary,flex:1}}>Send 🏌️</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <header style={{flexShrink:0,padding:"12px 16px",background:T.bg,borderBottom:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"space-between",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",zIndex:20,paddingTop:"calc(12px + env(safe-area-inset-top))"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <Ball size={28}/>
          <span style={{fontFamily:"var(--font-display)",fontSize:"16px",fontWeight:"700",color:T.fg,letterSpacing:"-0.01em"}}>
            Obi Golf
            {speaking&&<span style={{display:"inline-block",width:"5px",height:"5px",borderRadius:"99px",background:T.primary,marginLeft:"8px",animation:"pulse 1s infinite"}}/>}
          </span>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          {tab==="caddie"&&weather&&(
            <div className="chip">
              <span>{wxIcon(weather.code)}</span>
              <span>{weather.temp}°</span>
              <span style={{color:T.mutedFg}}>·</span>
              <span>{weather.wind}mph {windDir(weather.windDeg)}</span>
            </div>
          )}
          <button onClick={()=>setIsDark(d=>!d)} style={{...S.btnGhost,padding:"7px",borderRadius:"10px",border:"1px solid "+T.border,background:T.surface}}>
            {isDark?"☀️":"🌙"}
          </button>
        </div>
      </header>

      {/* ── CONTENT ──────────────────────────────────────────────── */}
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

        {/* ══ CADDIE TAB ══════════════════════════════════════════ */}
        {tab==="caddie"&&(
          <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:"calc(100vh - 130px)"}}>

            {/* Hole setup bar */}
            <div style={{padding:"10px 16px",background:T.card,borderBottom:"1px solid "+T.border,position:"sticky",top:0,zIndex:10}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                {/* Hole stepper */}
                <div style={{display:"flex",alignItems:"center",gap:"4px",flexShrink:0}}>
                  <button onClick={()=>setHole(h=>Math.max(1,h-1))} style={{background:T.surface,border:"1px solid "+T.border,borderRadius:"8px",color:T.mutedFg,padding:"4px 8px",cursor:"pointer",fontSize:"14px",lineHeight:1}}>-</button>
                  <div style={{textAlign:"center",minWidth:"40px"}}>
                    <div style={{fontSize:"8px",color:T.mutedFg,letterSpacing:"1.5px",textTransform:"uppercase",fontFamily:"var(--font-display)"}}>HOLE</div>
                    <div style={{fontFamily:"var(--font-display)",fontSize:"20px",fontWeight:"700",color:T.fg,lineHeight:1}}>{hole}</div>
                  </div>
                  <button onClick={()=>setHole(h=>Math.min(18,h+1))} style={{background:T.surface,border:"1px solid "+T.border,borderRadius:"8px",color:T.mutedFg,padding:"4px 8px",cursor:"pointer",fontSize:"14px",lineHeight:1}}>+</button>
                </div>
                {/* Par */}
                <div style={{textAlign:"center",minWidth:"32px"}}>
                  <div style={{fontSize:"8px",color:T.mutedFg,letterSpacing:"1.5px",textTransform:"uppercase",fontFamily:"var(--font-display)"}}>PAR</div>
                  <div style={{fontFamily:"var(--font-display)",fontSize:"18px",fontWeight:"700",color:T.fg,lineHeight:1}}>{holePars[hole-1]}</div>
                </div>
                {/* Yardage */}
                <input
                  type="number"
                  placeholder="Yds"
                  value={yardage}
                  onChange={e=>setYardage(e.target.value)}
                  style={{...S.input,width:"70px",padding:"7px 10px",fontSize:"14px",textAlign:"center",fontFamily:"var(--font-display)",fontWeight:"700"}}
                />
                {/* Lie selector */}
                <select value={lie} onChange={e=>setLie(e.target.value)} style={{...S.input,padding:"7px 10px",fontSize:"12px",flex:1,minWidth:"0",fontFamily:"var(--font-display)"}}>
                  {["tee","fairway","rough","deep rough","bunker","fringe","green"].map(l=>(
                    <option key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>
                  ))}
                </select>
                {/* Expand */}
                <button onClick={()=>setHoleOpen(o=>!o)} style={{...S.btnGhost,padding:"6px",flexShrink:0}}>
                  {holeOpen?"▲":"▼"}
                </button>
              </div>

              {/* Expanded: course + elevation + score input */}
              {holeOpen&&(
                <div style={{marginTop:"10px",display:"flex",flexDirection:"column",gap:"8px"}}>
                  <input
                    placeholder="Course name"
                    value={courseInput}
                    onChange={e=>setCourseInput(e.target.value)}
                    onBlur={()=>{if(courseInput&&courseInput!==course){setCourse(courseInput);}}}
                    onKeyDown={e=>{if(e.key==="Enter"&&courseInput&&courseInput!==course){setCourse(courseInput);}}}
                    style={{...S.input,fontSize:"13px"}}
                  />
                  <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                    <label style={{fontSize:"11px",color:T.mutedFg,fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em",flexShrink:0}}>Elevation</label>
                    <input type="range" min="-100" max="100" value={elevation} onChange={e=>setElevation(Number(e.target.value))} style={{flex:1}}/>
                    <span style={{fontSize:"13px",fontFamily:"var(--font-display)",fontWeight:"700",color:T.fg,minWidth:"50px",textAlign:"right"}}>{elevation>0?"+":""}{elevation}ft</span>
                  </div>
                  {/* Scorecard entry */}
                  <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                    <span style={{fontSize:"11px",color:T.mutedFg,fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em",flexShrink:0,alignSelf:"center"}}>Score H{hole}:</span>
                    {[holePars[hole-1]-1,holePars[hole-1],holePars[hole-1]+1,holePars[hole-1]+2,holePars[hole-1]+3].map(v=>(
                      <button key={v} onClick={()=>setScorecard(s=>{const n=[...s];n[hole-1]=v;return n;})}
                        style={{...S.pill,padding:"5px 10px",background:scorecard[hole-1]===v?T.primary:T.surface,color:scorecard[hole-1]===v?"#000":T.mutedFg,fontFamily:"var(--font-display)",fontWeight:"700",fontSize:"12px"}}>
                        {v}
                      </button>
                    ))}
                    {scorecard.some(Boolean)&&(
                      <button onClick={saveRound} style={{...S.btnPrimary,padding:"5px 12px",fontSize:"11px"}}>Save Round</button>
                    )}
                  </div>
                </div>
              )}

              {/* Scorecard strip */}
              {scorecard.some(Boolean)&&!holeOpen&&(
                <div style={{display:"flex",gap:"3px",marginTop:"8px",overflowX:"auto",paddingBottom:"2px"}}>
                  {scorecard.map((s,i)=>(
                    <div key={i} style={{textAlign:"center",flexShrink:0,width:"24px"}}>
                      <div style={{fontSize:"8px",color:i===hole-1?T.primary:T.mutedFg,fontFamily:"var(--font-display)",fontWeight:"700"}}>{i+1}</div>
                      <div style={{borderRadius:"5px",padding:"2px",background:s===null?"transparent":s<holePars[i]?T.primaryDim:s>holePars[i]?"rgba(248,113,113,0.15)":T.surface,fontFamily:"var(--font-display)",fontSize:"11px",fontWeight:"700",color:s===null?T.muted:s<holePars[i]?T.primary:s>holePars[i]?T.red:T.fg}}>{s||"·"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat messages */}
            <div style={{flex:1,padding:"16px",display:"flex",flexDirection:"column",gap:"10px",overflowY:"auto"}}>
              {messages.length===0&&(
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,gap:"16px",padding:"40px 0"}}>
                  <Ball size={52}/>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontFamily:"var(--font-display)",fontSize:"20px",fontWeight:"700",color:T.fg,letterSpacing:"-0.02em"}}>Ready to caddie</div>
                    <div style={{fontSize:"13px",color:T.mutedFg,marginTop:"6px"}}>Set your yardage and ask anything</div>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"6px",justifyContent:"center",maxWidth:"340px"}}>
                    {QUICK_PROMPTS.map(p=>(
                      <button key={p.label} onClick={()=>sendMessage(p.prompt)} className="chip" style={{cursor:"pointer"}}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:"8px",alignItems:"flex-end"}}>
                  {m.role==="assistant"&&<Ball size={22}/>}
                  <div className={m.role==="user"?"bubble-user":"bubble-ai"}>
                    {m.content}
                    {m.role==="assistant"&&(
                      <button onClick={()=>speak(m.content)} style={{display:"block",marginTop:"6px",background:"none",border:"none",color:T.mutedFg,fontSize:"11px",cursor:"pointer",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em"}}>
                        {speaking?"⏹ Stop":"🔊 Read"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {loading&&(
                <div style={{display:"flex",justifyContent:"flex-start",gap:"8px",alignItems:"flex-end"}}>
                  <Ball size={22}/>
                  <div className="bubble-ai" style={{display:"flex",gap:"4px",alignItems:"center"}}>
                    {[0,1,2].map(i=>(
                      <div key={i} style={{width:"5px",height:"5px",borderRadius:"99px",background:T.mutedFg,animation:"pulse 1.2s "+(i*0.15)+"s infinite"}}/>
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef}/>
            </div>

            {/* Input bar */}
            <div style={{padding:"10px 16px",background:T.card,borderTop:"1px solid "+T.border,paddingBottom:"calc(10px + env(safe-area-inset-bottom))",flexShrink:0}}>
              <div style={{display:"flex",gap:"8px",alignItems:"center",background:T.surface,border:"1px solid "+T.border,borderRadius:"14px",padding:"6px 6px 6px 12px"}}>
                <input
                  value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&sendMessage()}
                  placeholder="Ask Obi anything..."
                  style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:"14px",color:T.fg,fontFamily:"var(--font-sans)"}}
                />
                <button onClick={()=>sendMessage()} disabled={!input.trim()||loading}
                  style={{...S.btnPrimary,padding:"9px",borderRadius:"10px",flexShrink:0,opacity:input.trim()&&!loading?1:0.4}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ PRACTICE TAB ════════════════════════════════════════ */}
        {tab==="practice"&&(
          <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:"16px",paddingBottom:"24px"}}>

            {/* Header */}
            <div>
              <div style={{fontSize:"10px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.18em",color:T.mutedFg}}>Practice</div>
              <div style={{fontFamily:"var(--font-display)",fontSize:"26px",fontWeight:"700",color:T.fg,letterSpacing:"-0.02em",marginTop:"2px"}}>Sharpen your game.</div>
            </div>

            {/* Sub-tabs */}
            <div className="tab-pill">
              <button className={practiceSubTab==="swing"?"active":""} onClick={()=>setPracticeSubTab("swing")}>Swing Lab</button>
              <button className={practiceSubTab==="range"?"active":""} onClick={()=>setPracticeSubTab("range")}>Range Mode</button>
            </div>

            {/* ── Swing Lab ─────────────────────────────────────── */}
            {practiceSubTab==="swing"&&(
              <React.Fragment>
                {/* Upload / record */}
                {!swingAnalysis&&!swingLoading&&(
                  <div style={{...S.card,background:"var(--fg)",color:T.bg}}>
                    <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                      <div style={{width:"44px",height:"44px",borderRadius:"12px",background:T.primary,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontSize:"22px"}}>🎬</span>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"var(--font-display)",fontSize:"15px",fontWeight:"700",letterSpacing:"-0.01em"}}>Analyze a swing</div>
                        <div style={{fontSize:"11px",opacity:0.6,fontWeight:"500",marginTop:"2px"}}>Video or photo · AI breakdown</div>
                      </div>
                      <button onClick={()=>swingInputRef.current?.click()}
                        style={{...S.btnPrimary,background:T.primary,padding:"9px 14px",fontSize:"12px",flexShrink:0}}>
                        Upload
                      </button>
                    </div>
                    <input ref={swingInputRef} type="file" accept="video/*,image/*" style={{display:"none"}}
                      onChange={e=>{const f=e.target.files?.[0];if(f)setSwingFile(f);}}/>
                  </div>
                )}

                {swingFile&&!swingAnalysis&&(
                  <div style={S.card}>
                    <div style={{fontSize:"13px",color:T.mutedFg,marginBottom:"10px"}}>
                      Selected: <span style={{color:T.fg,fontWeight:"600"}}>{swingFile.name}</span>
                    </div>
                    <textarea
                      placeholder="Notes (optional) - club, feel, what to improve..."
                      value={swingNotes}
                      onChange={e=>setSwingNotes(e.target.value)}
                      rows={2}
                      style={{...S.input,resize:"none",marginBottom:"10px"}}
                    />
                    <button onClick={handleSwingAnalyze} disabled={swingLoading}
                      style={{...S.btnPrimary,width:"100%",padding:"13px",opacity:swingLoading?0.5:1}}>
                      {swingLoading?"Analyzing...":"Analyze with Obi"}
                    </button>
                  </div>
                )}

                {swingLoading&&(
                  <div style={{...S.card,textAlign:"center",padding:"32px"}}>
                    <div style={{fontSize:"32px",marginBottom:"12px",animation:"spin 1s linear infinite",display:"inline-block"}}>⚙️</div>
                    <div style={{fontFamily:"var(--font-display)",fontSize:"15px",fontWeight:"700",color:T.fg}}>Analyzing your swing...</div>
                    <div style={{fontSize:"12px",color:T.mutedFg,marginTop:"6px"}}>Obi is reviewing your footage</div>
                  </div>
                )}

                {swingAnalysis&&(
                  <div>
                    <div style={{...S.card,borderColor:T.primary+"66",background:T.primaryDim}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>
                        <div style={{width:"26px",height:"26px",borderRadius:"8px",background:T.fg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <span style={{color:T.primary,fontSize:"13px"}}>✦</span>
                        </div>
                        <span style={{fontFamily:"var(--font-display)",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.18em",color:T.fg}}>Obi&apos;s Analysis</span>
                      </div>
                      <div style={{fontSize:"14px",color:T.fg,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{swingAnalysis}</div>
                      <div style={{display:"flex",gap:"8px",marginTop:"14px"}}>
                        <button onClick={()=>speak(swingAnalysis)} style={S.pill}>🔊 Read aloud</button>
                        <button onClick={()=>{setSwingAnalysis("");setSwingFile(null);setSwingNotes("");}} style={S.pill}>🔄 New</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Swing history */}
                {swingHistory.length>0&&(
                  <div>
                    <div style={{fontSize:"10px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.18em",color:T.mutedFg,marginBottom:"10px"}}>Recent analyses</div>
                    <div className="row-list">
                      {swingHistory.slice(0,5).map((s,i)=>(
                        <div key={i} style={{padding:"12px 14px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                            <span style={{fontFamily:"var(--font-display)",fontSize:"13px",fontWeight:"700",color:T.fg}}>{s.club_used||"Swing"}</span>
                            <span style={{fontSize:"11px",color:T.mutedFg}}>{fmtDateShort(s.created_at)}</span>
                          </div>
                          <div style={{fontSize:"13px",color:T.mutedFg,lineHeight:1.5}}>{s.analysis?.slice(0,120)}...</div>
                          <div style={{display:"flex",gap:"6px",marginTop:"8px"}}>
                            <button onClick={()=>speak(s.analysis)} style={S.pill}>🔊 Read</button>
                            <button onClick={async()=>{await supabase.from("swing_analyses").delete().eq("id",s.id);setSwingHistory(h=>h.filter(x=>x.id!==s.id));}} style={{...S.pill,color:T.red}}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            )}

            {/* ── Range Mode ────────────────────────────────────── */}
            {practiceSubTab==="range"&&(
              <React.Fragment>
                {/* Club select */}
                <div style={S.card}>
                  <div style={{fontSize:"10px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.18em",color:T.mutedFg,marginBottom:"10px"}}>Select club</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                    {profile.bag.map(b=>(
                      <button key={b.club} onClick={()=>setRangeClub(b.club)}
                        style={{...S.pill,background:rangeClub===b.club?T.primary:T.surface,color:rangeClub===b.club?"#000":T.mutedFg,borderColor:rangeClub===b.club?T.primary:T.border}}>
                        {b.club}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Camera / record */}
                {!cameraActive&&!rangeLoading&&!rangeShotResult&&(
                  <button onClick={startCamera}
                    style={{...S.card,background:T.primary,color:"#000",display:"flex",alignItems:"center",gap:"12px",width:"100%",textAlign:"left",border:"none",cursor:"pointer",padding:"16px"}}>
                    <div style={{width:"44px",height:"44px",borderRadius:"12px",background:"rgba(0,0,0,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:"22px"}}>📹</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"var(--font-display)",fontSize:"15px",fontWeight:"700",letterSpacing:"-0.01em"}}>Record a shot</div>
                      <div style={{fontSize:"11px",opacity:0.7,fontWeight:"500",marginTop:"2px"}}>4-second clip · AI analysis</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                )}

                {cameraActive&&(
                  <div style={S.card}>
                    <video ref={videoRef} muted playsInline style={{width:"100%",borderRadius:"10px",background:"#000",aspectRatio:"4/3",objectFit:"cover"}}/>
                    <div style={{display:"flex",gap:"10px",marginTop:"12px"}}>
                      {!recording?(
                        <button onClick={startRecording} style={{...S.btnPrimary,flex:1,padding:"13px"}}>
                          <span style={{width:"10px",height:"10px",borderRadius:"99px",background:"#fff",display:"inline-block"}}/>
                          Record
                        </button>
                      ):(
                        <button onClick={stopRecording} style={{...S.btnSecondary,flex:1,padding:"13px"}}>
                          <span style={{width:"10px",height:"10px",borderRadius:"3px",background:T.red,display:"inline-block"}}/>
                          Stop ({recording?"●":""})
                        </button>
                      )}
                      <button onClick={stopCamera} style={{...S.btnGhost,padding:"13px 16px",border:"1px solid "+T.border,borderRadius:"12px"}}>Cancel</button>
                    </div>
                  </div>
                )}

                {rangeLoading&&(
                  <div style={{...S.card,textAlign:"center",padding:"32px"}}>
                    <div style={{fontSize:"32px",marginBottom:"12px",animation:"spin 1s linear infinite",display:"inline-block"}}>⚙️</div>
                    <div style={{fontFamily:"var(--font-display)",fontSize:"15px",fontWeight:"700",color:T.fg}}>Analyzing shot...</div>
                  </div>
                )}

                {rangeShotResult&&!rangeShotResult.error&&(
                  <div>
                    <ShotShapeDiagram shape={rangeShotResult.shape||"straight"} isLeft={profile.dexterity==="left"}/>
                    <div style={{...S.card,marginTop:"10px",borderColor:T.primary+"66",background:T.primaryDim}}>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"14px"}}>
                        {[["Shape",rangeShotResult.shape||"straight"],["Carry",(rangeShotResult.carry||0)+"y"],["Direction",rangeShotResult.direction||"center"]].map(([l,v])=>(
                          <div key={l} style={{textAlign:"center"}}>
                            <div style={{fontSize:"9px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.5px",color:T.mutedFg,marginBottom:"4px"}}>{l}</div>
                            <div style={{fontFamily:"var(--font-display)",fontSize:"18px",fontWeight:"700",color:T.primary,lineHeight:1}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {rangeShotResult.coaching&&(
                        <div style={{fontSize:"14px",color:T.fg,lineHeight:1.6,paddingTop:"12px",borderTop:"1px solid "+T.border+"44"}}>{rangeShotResult.coaching}</div>
                      )}
                      <div style={{display:"flex",gap:"8px",marginTop:"12px"}}>
                        <button onClick={()=>speak(rangeShotResult.coaching||"")} style={S.pill}>🔊 Read</button>
                        <button onClick={()=>setRangeShotResult(null)} style={S.pill}>🔄 Next shot</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Club stats */}
                {clubStats[rangeClub]?.count>=3&&(
                  <div style={S.card}>
                    <div style={{fontSize:"10px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.18em",color:T.mutedFg,marginBottom:"12px"}}>{rangeClub} stats</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
                      {[
                        ["Shots",clubStats[rangeClub].count],
                        ["Shape",clubStats[rangeClub].typicalShape],
                        ["Consist",("⭐").repeat(Math.max(0,clubStats[rangeClub].consistencyStars))],
                      ].map(([l,v])=>(
                        <div key={l} style={{textAlign:"center"}}>
                          <div style={{fontSize:"9px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.5px",color:T.mutedFg,marginBottom:"4px"}}>{l}</div>
                          <div style={{fontFamily:"var(--font-display)",fontSize:"18px",fontWeight:"700",color:T.fg,lineHeight:1}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shot history */}
                {rangeHistory.length>0&&(
                  <div>
                    <div style={{fontSize:"10px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.18em",color:T.mutedFg,marginBottom:"10px"}}>Shot history</div>
                    <div className="row-list">
                      {(showAllShots?rangeHistory:rangeHistory.slice(0,5)).map((s,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",padding:"11px 14px"}}>
                          <div style={{width:"36px",height:"36px",borderRadius:"10px",background:T.primaryDim,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <span style={{fontFamily:"var(--font-display)",fontSize:"11px",fontWeight:"700",color:T.primary}}>{s.club?.split("-")[0]||"?"}</span>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontFamily:"var(--font-display)",fontSize:"13px",fontWeight:"700",color:T.fg}}>{s.club||"Shot"}</div>
                            <div style={{fontSize:"11px",color:T.mutedFg,marginTop:"2px"}}>{s.shape||"straight"} · {s.carry||0}y</div>
                          </div>
                          <span style={{fontSize:"11px",color:T.mutedFg,flexShrink:0}}>{fmtDateShort(s.created_at)}</span>
                        </div>
                      ))}
                    </div>
                    {rangeHistory.length>5&&(
                      <button onClick={()=>setShowAllShots(s=>!s)} style={{...S.btnGhost,width:"100%",marginTop:"8px",padding:"10px",border:"1px solid "+T.border,borderRadius:"12px"}}>
                        {showAllShots?"Show less ^":"Show all "+rangeHistory.length+" shots v"}
                      </button>
                    )}
                  </div>
                )}
              </React.Fragment>
            )}
          </div>
        )}

        {/* ══ SOCIAL TAB ══════════════════════════════════════════ */}
        {tab==="social"&&(
          <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:"16px",paddingBottom:"24px"}}>

            {/* Header */}
            <div>
              <div style={{fontSize:"10px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.18em",color:T.mutedFg}}>Social</div>
              <div style={{fontFamily:"var(--font-display)",fontSize:"26px",fontWeight:"700",color:T.fg,letterSpacing:"-0.02em",marginTop:"2px"}}>Your crew.</div>
            </div>

            {/* Sub-tabs */}
            <div className="tab-pill">
              <button className={socialView==="feed"?"active":""} onClick={()=>setSocialView("feed")}>Feed</button>
              <button className={socialView==="rounds"?"active":""} onClick={()=>setSocialView("rounds")}>My Rounds</button>
              <button className={socialView==="friends"?"active":""} onClick={()=>setSocialView("friends")}>
                Friends{friendReqs.length>0&&<span style={{marginLeft:"4px",background:T.red,color:"#fff",borderRadius:"99px",padding:"1px 5px",fontSize:"9px"}}>{friendReqs.length}</span>}
              </button>
            </div>

            {/* Feed */}
            {socialView==="feed"&&(
              <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                {feed.length===0&&(
                  <div style={{...S.card,textAlign:"center",padding:"40px 20px"}}>
                    <div style={{fontSize:"32px",marginBottom:"12px"}}>👥</div>
                    <div style={{fontFamily:"var(--font-display)",fontSize:"15px",fontWeight:"700",color:T.fg}}>No rounds yet</div>
                    <div style={{fontSize:"13px",color:T.mutedFg,marginTop:"6px"}}>Add friends to see their activity</div>
                  </div>
                )}
                {(showAllFeed?feed:feed.slice(0,5)).map((r,i)=>{
                  const isYou=r.user_id===user?.id;
                  const pname=isYou?name:(r.profiles?.full_name||"Golfer");
                  const initials=pname.split(" ").map(x=>x[0]).join("").toUpperCase().slice(0,2);
                  const diff=r.score_vs_par||0;
                  return(
                    <article key={r.id||i} style={S.card}>
                      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}>
                        <Avatar url={isYou?avatarUrl:r.profiles?.avatar_url} name={pname} size={38}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:"var(--font-display)",fontSize:"13px",fontWeight:"700",color:T.fg}}>{pname}{isYou&&<span style={{fontSize:"10px",color:T.primary,marginLeft:"6px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em"}}>you</span>}</div>
                          <div style={{fontSize:"11px",color:T.mutedFg,marginTop:"2px",display:"flex",alignItems:"center",gap:"4px"}}>
                            <span>📍</span>{r.course_name||"Unknown"} · {fmtDateShort(r.played_at)}
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontFamily:"var(--font-display)",fontSize:"22px",fontWeight:"700",color:diff<=0?T.primary:T.red,lineHeight:1}}>{r.total_score}</div>
                          <div style={{fontSize:"10px",color:T.mutedFg,fontFamily:"var(--font-display)",fontWeight:"700",marginTop:"2px"}}>{diff===0?"E":diff>0?"+"+diff:""+diff}</div>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:"8px",paddingTop:"10px",borderTop:"1px solid "+T.border}}>
                        <button onClick={()=>setShowCard(r)} style={S.pill}>📊 View</button>
                        {isYou&&(
                          <button onClick={()=>{const j=randJab();setJabPost(j);}} style={S.pill}>😂 Jab</button>
                        )}
                      </div>
                    </article>
                  );
                })}
                {feed.length>5&&(
                  <button onClick={()=>setShowAllFeed(s=>!s)} style={{...S.btnGhost,width:"100%",padding:"10px",border:"1px solid "+T.border,borderRadius:"12px"}}>
                    {showAllFeed?"Show less ^":"View more v"}
                  </button>
                )}
              </div>
            )}

            {/* My Rounds */}
            {socialView==="rounds"&&(
              <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                {rounds.length===0&&(
                  <div style={{...S.card,textAlign:"center",padding:"40px 20px"}}>
                    <div style={{fontSize:"32px",marginBottom:"12px"}}>⛳</div>
                    <div style={{fontFamily:"var(--font-display)",fontSize:"15px",fontWeight:"700",color:T.fg}}>No rounds saved yet</div>
                    <div style={{fontSize:"13px",color:T.mutedFg,marginTop:"6px"}}>Save a round from the Caddie tab</div>
                  </div>
                )}
                {rounds.map((r,i)=>{
                  const diff=r.score_vs_par||0;
                  return(
                    <button key={r.id||i} onClick={()=>setShowCard(r)}
                      style={{...S.card,display:"flex",alignItems:"center",gap:"12px",width:"100%",textAlign:"left",cursor:"pointer"}}>
                      <div style={{width:"40px",height:"40px",borderRadius:"10px",background:T.surface,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontSize:"18px"}}>⛳</span>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"var(--font-display)",fontSize:"14px",fontWeight:"700",color:T.fg,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.course_name||"Unknown"}</div>
                        <div style={{fontSize:"11px",color:T.mutedFg,marginTop:"2px"}}>{fmtDate(r.played_at)} · {r.holes_played||18} holes</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontFamily:"var(--font-display)",fontSize:"22px",fontWeight:"700",color:diff<=0?T.primary:diff>4?T.red:T.fg,lineHeight:1}}>{r.total_score}</div>
                        <div style={{fontSize:"10px",color:T.mutedFg,fontFamily:"var(--font-display)",fontWeight:"700",marginTop:"2px"}}>{diff===0?"E":diff>0?"+"+diff:""+diff}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Friends */}
            {socialView==="friends"&&(
              <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
                {/* Search */}
                <div style={{display:"flex",gap:"8px"}}>
                  <input placeholder="Search players..." value={friendSearch} onChange={e=>setFriendSearch(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&searchFriends()}
                    style={{...S.input,flex:1}}/>
                  <button onClick={searchFriends} style={{...S.btnPrimary,padding:"11px 16px",flexShrink:0}}>Search</button>
                </div>
                {friendResults.length>0&&(
                  <div className="row-list">
                    {friendResults.map(u=>(
                      <div key={u.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"12px 14px"}}>
                        <Avatar url={u.avatar_url} name={u.full_name} size={36}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:"var(--font-display)",fontSize:"13px",fontWeight:"700",color:T.fg}}>{u.full_name}</div>
                          <div style={{fontSize:"11px",color:T.mutedFg}}>HCP {u.handicap_index||"--"}</div>
                        </div>
                        <button onClick={()=>sendFriendReq(u.id)} style={{...S.btnPrimary,padding:"7px 14px",fontSize:"12px"}}>Add</button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Pending requests */}
                {friendReqs.length>0&&(
                  <div>
                    <div style={{fontSize:"10px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.18em",color:T.mutedFg,marginBottom:"10px"}}>Pending requests</div>
                    <div className="row-list">
                      {friendReqs.map(f=>{
                        const other=f.requester_id===user?.id?f.addressee:f.requester;
                        return(
                          <div key={f.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"12px 14px"}}>
                            <Avatar url={other?.avatar_url} name={other?.full_name} size={36}/>
                            <div style={{flex:1}}>
                              <div style={{fontFamily:"var(--font-display)",fontSize:"13px",fontWeight:"700",color:T.fg}}>{other?.full_name||"Player"}</div>
                            </div>
                            <button onClick={()=>acceptFriend(f.id)} style={{...S.btnPrimary,padding:"7px 14px",fontSize:"12px"}}>Accept</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Friends list */}
                {friends.length>0&&(
                  <div>
                    <div style={{fontSize:"10px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.18em",color:T.mutedFg,marginBottom:"10px"}}>Friends ({friends.length})</div>
                    <div className="row-list">
                      {friends.map(f=>{
                        const other=f.requester_id===user?.id?f.addressee:f.requester;
                        return(
                          <div key={f.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"12px 14px"}}>
                            <Avatar url={other?.avatar_url} name={other?.full_name} size={36}/>
                            <div style={{flex:1}}>
                              <div style={{fontFamily:"var(--font-display)",fontSize:"13px",fontWeight:"700",color:T.fg}}>{other?.full_name||"Player"}</div>
                              <div style={{fontSize:"11px",color:T.mutedFg}}>HCP {other?.handicap_index||"--"}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ PROFILE TAB ═════════════════════════════════════════ */}
        {tab==="profile"&&(
          <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:"16px",paddingBottom:"24px"}}>

            {/* Profile hero */}
            <div style={{...S.card,display:"flex",alignItems:"center",gap:"14px"}}>
              <div style={{position:"relative",flexShrink:0}} onClick={()=>setShowAvatarZoom(avatarUrl)}>
                <Avatar url={avatarUrl} name={userProfile?.full_name||name} size={56}/>
                <button onClick={e=>{e.stopPropagation();avatarInputRef.current?.click();}}
                  style={{position:"absolute",bottom:"-2px",right:"-2px",width:"20px",height:"20px",borderRadius:"99px",background:T.primary,color:"#000",border:"none",fontSize:"10px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontWeight:"700"}}>
                  {uploadingAvatar?"⏳":"+"}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleAvatarUpload}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"var(--font-display)",fontSize:"19px",fontWeight:"700",color:T.fg,letterSpacing:"-0.02em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {userProfile?.full_name||name}
                </div>
                <div style={{fontSize:"12px",color:T.mutedFg,marginTop:"4px",display:"flex",alignItems:"center",gap:"6px"}}>
                  <span style={{width:"6px",height:"6px",borderRadius:"99px",background:T.primary,display:"inline-block",flexShrink:0}}/>
                  HCP {profile.hcp} · {profile.homeCourse||"No home course"}
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
              {[
                ["Rounds",rounds.length],
                ["Avg",rounds.length>0?Math.round(rounds.slice(0,10).reduce((a,r)=>a+(r.total_score||0),0)/Math.min(rounds.length,10)):"--"],
                ["Best",rounds.length>0?Math.min(...rounds.map(r=>r.total_score||99)):"--"],
              ].map(([l,v])=>(
                <div key={l} className="stat-card" style={{textAlign:"center"}}>
                  <div style={{fontSize:"9px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.5px",color:T.mutedFg,marginBottom:"6px"}}>{l}</div>
                  <div style={{fontFamily:"var(--font-display)",fontSize:"24px",fontWeight:"700",color:T.fg,lineHeight:1}}>{v}</div>
                </div>
              ))}
            </div>

            {/* My Game section */}
            <div>
              <button onClick={()=>setProfileSection(profileSection==="game"?null:"game")}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"0 0 10px",background:"none",border:"none",cursor:"pointer"}}>
                <span style={{fontSize:"10px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.18em",color:T.mutedFg}}>My Game</span>
                <span style={{color:T.mutedFg,fontSize:"12px"}}>{profileSection==="game"?"▲":"▼"}</span>
              </button>
              {profileSection==="game"&&(
                <div className="row-list">
                  {/* Handicap */}
                  <div style={{padding:"14px"}}>
                    <div style={{fontSize:"11px",color:T.mutedFg,marginBottom:"8px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em"}}>Handicap</div>
                    <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                      {[{v:"plus",l:"+HCP"},{v:"scratch",l:"Scratch"},{v:"low",l:"Low (1-9)"},{v:"mid",l:"Mid (10-18)"},{v:"high",l:"High (19+)"}].map(o=>(
                        <button key={o.v} onClick={()=>setProfile(p=>({...p,handicap:o.v}))}
                          style={{...S.pill,background:profile.handicap===o.v?T.primary:T.surface,color:profile.handicap===o.v?"#000":T.mutedFg,borderColor:profile.handicap===o.v?T.primary:T.border}}>
                          {o.l}
                        </button>
                      ))}
                    </div>
                    <div style={{marginTop:"12px",display:"flex",alignItems:"center",gap:"12px"}}>
                      <label style={{fontSize:"11px",color:T.mutedFg,fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",flexShrink:0}}>Index</label>
                      <input type="number" step="0.1" value={profile.hcp} onChange={e=>setProfile(p=>({...p,hcp:parseFloat(e.target.value)||0}))}
                        style={{...S.input,width:"80px",textAlign:"center",fontFamily:"var(--font-display)",fontWeight:"700"}}/>
                    </div>
                  </div>
                  {/* Miss tendency */}
                  <div style={{padding:"14px"}}>
                    <div style={{fontSize:"11px",color:T.mutedFg,marginBottom:"8px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em"}}>Miss tendency</div>
                    <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                      {["straight","slight fade","fade","slice","slight draw","draw","hook"].map(m=>(
                        <button key={m} onClick={()=>setProfile(p=>({...p,missTend:m}))}
                          style={{...S.pill,background:profile.missTend===m?T.primary:T.surface,color:profile.missTend===m?"#000":T.mutedFg,borderColor:profile.missTend===m?T.primary:T.border}}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Caddie persona */}
                  <div style={{padding:"14px"}}>
                    <div style={{fontSize:"11px",color:T.mutedFg,marginBottom:"8px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em"}}>Caddie persona</div>
                    <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                      {[{v:"hype",l:"🔥 Hype"},{v:"pro",l:"🎯 Tour Pro"},{v:"coach",l:"📚 Coach"},{v:"savage",l:"💀 Savage"},{v:"oldschool",l:"🪨 Old School"}].map(o=>(
                        <button key={o.v} onClick={()=>setProfile(p=>({...p,persona:o.v}))}
                          style={{...S.pill,background:profile.persona===o.v?T.primary:T.surface,color:profile.persona===o.v?"#000":T.mutedFg,borderColor:profile.persona===o.v?T.primary:T.border}}>
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Dexterity */}
                  <div style={{padding:"14px"}}>
                    <div style={{fontSize:"11px",color:T.mutedFg,marginBottom:"8px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em"}}>Dexterity</div>
                    <div style={{display:"flex",gap:"6px"}}>
                      {["right","left"].map(d=>(
                        <button key={d} onClick={()=>setProfile(p=>({...p,dexterity:d}))}
                          style={{...S.pill,background:profile.dexterity===d?T.primary:T.surface,color:profile.dexterity===d?"#000":T.mutedFg,borderColor:profile.dexterity===d?T.primary:T.border}}>
                          {d.charAt(0).toUpperCase()+d.slice(1)}-handed
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Home course */}
                  <div style={{padding:"14px"}}>
                    <div style={{fontSize:"11px",color:T.mutedFg,marginBottom:"8px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em"}}>Home course</div>
                    <input placeholder="e.g. Pebble Beach Golf Links" value={profile.homeCourse}
                      onChange={e=>setProfile(p=>({...p,homeCourse:e.target.value}))} style={S.input}/>
                  </div>
                  <div style={{padding:"14px"}}>
                    <button onClick={saveProfile} style={{...S.btnPrimary,width:"100%",padding:"13px"}}>Save Game Profile</button>
                  </div>
                </div>
              )}
            </div>

            {/* My Bag section */}
            <div>
              <button onClick={()=>setProfileSection(profileSection==="bag"?null:"bag")}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"0 0 10px",background:"none",border:"none",cursor:"pointer"}}>
                <span style={{fontSize:"10px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.18em",color:T.mutedFg}}>My Bag ({profile.bag.length} clubs)</span>
                <span style={{color:T.mutedFg,fontSize:"12px"}}>{profileSection==="bag"?"▲":"▼"}</span>
              </button>
              {profileSection==="bag"&&(
                <div className="row-list">
                  {profile.bag.map(function(b,i){return(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px"}}>
                      <div style={{flex:1,fontFamily:"var(--font-display)",fontSize:"13px",fontWeight:"700",color:T.fg}}>{b.club}</div>
                      <input type="number" value={b.carry}
                        onChange={e=>{const v=parseInt(e.target.value)||0;setProfile(p=>{const bag=[...p.bag];bag[i]={...bag[i],carry:v};return{...p,bag};});}}
                        style={{...S.input,width:"72px",textAlign:"center",padding:"7px",fontFamily:"var(--font-display)",fontWeight:"700"}}/>
                      <span style={{fontSize:"11px",color:T.mutedFg,fontFamily:"var(--font-display)",fontWeight:"700"}}>yds</span>
                    </div>
                  );})}
                  <div style={{padding:"14px"}}>
                    <button onClick={saveProfile} style={{...S.btnPrimary,width:"100%",padding:"13px"}}>Save Bag</button>
                  </div>
                </div>
              )}
            </div>

            {/* App Settings section */}
            <div>
              <button onClick={()=>setProfileSection(profileSection==="app"?null:"app")}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"0 0 10px",background:"none",border:"none",cursor:"pointer"}}>
                <span style={{fontSize:"10px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.18em",color:T.mutedFg}}>App Settings</span>
                <span style={{color:T.mutedFg,fontSize:"12px"}}>{profileSection==="app"?"▲":"▼"}</span>
              </button>
              {profileSection==="app"&&(
                <div className="row-list">
                  <div style={{padding:"14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontFamily:"var(--font-display)",fontSize:"13px",fontWeight:"700",color:T.fg}}>Dark Mode</div>
                      <div style={{fontSize:"11px",color:T.mutedFg,marginTop:"2px"}}>Currently {isDark?"dark":"light"}</div>
                    </div>
                    <button onClick={()=>setIsDark(d=>!d)}
                      style={{width:"48px",height:"26px",borderRadius:"99px",border:"none",background:isDark?T.primary:T.muted,cursor:"pointer",position:"relative",transition:"background 0.2s"}}>
                      <div style={{position:"absolute",top:"3px",left:isDark?"24px":"3px",width:"20px",height:"20px",borderRadius:"99px",background:"#fff",transition:"left 0.2s"}}/>
                    </button>
                  </div>
                  <div style={{padding:"14px"}}>
                    <div style={{fontSize:"11px",color:T.mutedFg,marginBottom:"8px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em"}}>Practice goal</div>
                    <textarea placeholder="e.g. Reduce over-the-top swing path..." value={profile.practiceGoal}
                      onChange={e=>setProfile(p=>({...p,practiceGoal:e.target.value}))}
                      rows={2} style={{...S.input,resize:"none"}}/>
                  </div>
                  <div style={{padding:"14px"}}>
                    <button onClick={handleLogout}
                      style={{...S.btnSecondary,width:"100%",padding:"13px",color:T.red,borderColor:T.red+"44"}}>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── BOTTOM NAV ───────────────────────────────────────────── */}
      <nav style={{flexShrink:0,background:T.bg,borderTop:"1px solid "+T.border,paddingBottom:"env(safe-area-inset-bottom)",zIndex:20}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",padding:"6px 8px 8px"}}>
          {[
            {id:"caddie",   label:"Caddie",   emoji:"💬"},
            {id:"practice", label:"Practice", emoji:"🎯"},
            {id:"social",   label:"Social",   emoji:"👥", badge:friendReqs.length},
            {id:"profile",  label:"Profile",  emoji:"👤"},
          ].map(t=>{
            const isActive=tab===t.id;
            return(
              <button key={t.id} onClick={()=>changeTab(t.id)}
                style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",padding:"6px 4px",background:"transparent",border:"none",cursor:"pointer",position:"relative"}}>
                <div style={{width:"44px",height:"28px",borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center",background:isActive?T.primaryDim:"transparent",color:isActive?T.primary:T.mutedFg,transition:"all 0.15s"}}>
                  {t.emoji}
                </div>
                {isActive&&<div className="nav-pip"/>}
                <span style={{fontSize:"10px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em",color:isActive?T.fg:T.mutedFg,lineHeight:1}}>
                  {t.label}
                </span>
                {t.badge>0&&(
                  <div style={{position:"absolute",top:"4px",right:"calc(50% - 20px)",width:"7px",height:"7px",borderRadius:"99px",background:T.red}}/>
                )}
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}

export default function ObiGolf(){
  return <ErrorBoundary><ObiGolfApp/></ErrorBoundary>;
}
