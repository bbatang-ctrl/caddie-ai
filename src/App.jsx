// OBI-GOLF-LOVABLE-v2
import React,{useState,useEffect,useRef,useCallback} from "react";
import {supabase} from "./supabase.js";
import {DARK_THEME,LIGHT_THEME,DEFAULT_BAG,Ball,ScoreBadge,Avatar,
  fmtDate,fmtDateShort,windDir,wxIcon,playingYards,firstName,randJab,
  JABS,QUICK_PROMPTS,analyzeSwing,analyzeSwingVideo,
  ErrorBoundary,ShotShapeDiagram,OnboardingFlow} from "./AppPart1.jsx";
import { Home, MessageCircle, Target, Users, User, Sun, Moon, Settings, Cloud, ChevronRight, ChevronDown, MapPin, Zap, ArrowUp, Video, Sparkles, Activity, Play, LogOut, Briefcase, BarChart3, Bell, X, TrendingDown, TrendingUp, Trophy } from "lucide-react";
function cn(...c){return c.filter(Boolean).join(" ");}
const NAV=[{id:"home",label:"Home",Icon:Home},{id:"practice",label:"Practice",Icon:Target},{id:"caddie",label:"Caddie",Icon:MessageCircle},{id:"social",label:"Social",Icon:Users}];
const LOGO="data:image/png;base64,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";

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
  const name = firstName(userProfile?.full_name) || "Golfer";

  // ── LOADING ───────────────────────────────────────────────────

  const name = firstName(userProfile?.full_name) || "Golfer";
  const avgScore = rounds.length > 0 ? Math.round(rounds.slice(0,10).reduce((a,r)=>a+(r.total_score||0),0)/Math.min(rounds.length,10)) : null;
  const bestScore = rounds.length > 0 ? Math.min(...rounds.map(r=>r.total_score||99)) : null;

  if(authLoading)return(
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5">
      <img src={LOGO} alt="Obi" className="h-16 w-16 object-contain animate-pop-in"/>
      <p className="display text-3xl text-foreground">Obi Golf</p>
      <div className="flex gap-1.5">
        {[0,1,2].map(i=>(
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary"
            style={{animation:"pulse-dot 1.2s "+(i*0.2)+"s infinite"}}/>
        ))}
      </div>
    </div>
  );
  if(!user||authScreen==="onboard")return(
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-6 py-10 flex flex-col min-h-screen">
        {authScreen!=="onboard"&&(
          <React.Fragment>
            <div className="text-center mb-10 animate-fade-up">
              <img src={LOGO} alt="Obi" className="h-14 w-14 object-contain mx-auto"/>
              <h1 className="display text-[28px] text-foreground mt-3.5">Obi Golf</h1>
              <p className="text-[13px] text-muted-foreground mt-1.5">Your AI caddie. Always in the bag.</p>
            </div>
            <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-7">
              {["login","signup"].map(s=>(
                <button key={s} onClick={()=>setAuthScreen(s)}
                  className={cn("flex-1 py-2.5 rounded-[10px] display text-[12px] uppercase tracking-wider transition-all",authScreen===s?"nav-pill-active":"text-muted-foreground hover:text-foreground")}>
                  {s==="login"?"Sign In":"Sign Up"}
                </button>
              ))}
            </div>
            <button onClick={handleGoogleAuth} className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-border bg-card py-3.5 display text-[13px] font-bold uppercase tracking-wider text-foreground hover:bg-secondary transition mb-4">
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
              Continue with Google
            </button>
            <div className="flex items-center gap-3 mb-4"><div className="flex-1 h-px bg-border"/><span className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">or</span><div className="flex-1 h-px bg-border"/></div>
            {authScreen==="signup"&&(<input className="w-full bg-input border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition mb-2.5" placeholder="Full name" value={authName} onChange={e=>setAuthName(e.target.value)}/>)}
            <input className="w-full bg-input border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition mb-2.5" placeholder="Email" type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)}/>
            <input className="w-full bg-input border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition mb-4" placeholder="Password" type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(authScreen==="login"?handleLogin():handleSignup())}/>
            {authError&&<p className="text-destructive text-[13px] text-center mb-3">{authError}</p>}
            <button onClick={authScreen==="login"?handleLogin:handleSignup} className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 display text-[13px] font-bold uppercase tracking-wider hover:opacity-90 transition">{authScreen==="login"?"Sign In":"Create Account"}</button>
          </React.Fragment>
        )}
        {authScreen==="onboard"&&(
          <OnboardingFlow D={isDark?DARK_THEME:LIGHT_THEME} S={{btnPrimary:{},btnGhost:{}}} authName={authName} setAuthName={setAuthName} step={onboardStep} setStep={setOnboardStep} profile={profile} setProfile={setProfile} onComplete={async()=>{await saveProfile();setAuthScreen("app");}}/>
        )}
      </div>
    </div>
  );
  return(
    <div className="flex flex-col h-screen max-w-md mx-auto bg-background text-foreground overflow-hidden">
      {showCard&&(
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-5" onClick={()=>setShowCard(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto p-5" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><span className="display text-[17px] font-bold text-foreground">Round Summary</span><button onClick={()=>setShowCard(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5"/></button></div>
            <p className="display text-[15px] font-bold text-foreground">{showCard.course_name}</p>
            <p className="text-[11px] text-muted-foreground mb-4">{fmtDate(showCard.played_at)}</p>
            <div className="grid grid-cols-3 gap-2.5">
              {[["SCORE",showCard.total_score,"text-foreground"],["vs PAR",(showCard.score_vs_par>0?"+":"")+showCard.score_vs_par,showCard.score_vs_par<=0?"text-primary":"text-destructive"],["HOLES",(showCard.holes_played||18)+"/18","text-foreground"]].map(([l,v,c])=>(
                <div key={l} className="bg-secondary rounded-xl p-3 text-center">
                  <p className="display text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">{l}</p>
                  <p className={"stat text-[26px] leading-none "+c}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {tab==="profile_panel"&&(
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="px-4 pt-12 pb-8">
            <button onClick={()=>setTab("home")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 display text-[12px] font-bold uppercase tracking-wider"><ChevronRight className="h-4 w-4 rotate-180" strokeWidth={2.5}/> Back</button>
            <div className="flex items-center gap-3.5 mb-5">
              <div className="relative shrink-0">
                <Avatar url={avatarUrl} name={userProfile?.full_name||name} size={56}/>
                <button onClick={()=>avatarInputRef.current?.click()} className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold border-2 border-background">{uploadingAvatar?"...":"+"}</button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload}/>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="display text-[20px] font-bold tracking-tight">{userProfile?.full_name||name}</h1>
                <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5 mt-0.5"><span className="inline-block h-1.5 w-1.5 rounded-full bg-primary"/>HCP {profile.hcp} · {profile.homeCourse||"No home course"}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[["Rounds",rounds.length],["Avg",avgScore||"--"],["Best",bestScore||"--"]].map(([l,v])=>(
                <div key={l} className="rounded-xl border border-border bg-card p-3 text-center"><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">{l}</p><p className="stat text-2xl leading-none">{v}</p></div>
              ))}
            </div>
            <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">Your game</p>
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border mb-4">
              {[{Icon:Briefcase,label:"My Bag",sub:profile.bag.length+" clubs",id:"bag",tone:"bg-primary/15 text-primary"},{Icon:Sparkles,label:"Caddie Style",sub:profile.persona,id:"style",tone:"bg-accent/20 text-accent"},{Icon:BarChart3,label:"Handicap",sub:"HCP "+profile.hcp,id:"hcp",tone:"bg-secondary text-secondary-foreground"}].map(({Icon,label,sub,id,tone})=>(
                <React.Fragment key={id}>
                  <button onClick={()=>setProfileSection(profileSection===id?null:id)} className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/40 transition text-left">
                    <div className={"h-9 w-9 rounded-lg flex items-center justify-center shrink-0 "+tone}><Icon className="h-4 w-4" strokeWidth={2.5}/></div>
                    <div className="min-w-0 flex-1"><p className="display text-[13px] font-bold tracking-tight">{label}</p><p className="text-[11px] text-muted-foreground truncate">{sub}</p></div>
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform",profileSection===id&&"rotate-90")} strokeWidth={2.5}/>
                  </button>
                  {profileSection===id&&id==="bag"&&(
                    <div className="divide-y divide-border">
                      {profile.bag.map((b,i)=>(
                        <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
                          <span className="display text-[13px] font-bold flex-1">{b.club}</span>
                          <input type="number" value={b.carry} onChange={e=>{const v=parseInt(e.target.value)||0;setProfile(p=>{const bag=[...p.bag];bag[i]={...bag[i],carry:v};return{...p,bag};});}} className="w-16 bg-input border border-border rounded-lg px-2.5 py-1.5 text-center display text-[13px] font-bold text-foreground outline-none"/>
                          <span className="display text-[11px] font-bold text-muted-foreground">yds</span>
                        </div>
                      ))}
                      <div className="p-3.5"><button onClick={saveProfile} className="w-full bg-primary text-primary-foreground rounded-xl py-3 display text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition">Save Bag</button></div>
                    </div>
                  )}
                  {profileSection===id&&id==="style"&&(
                    <div className="p-3.5 space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {[{v:"hype",l:"Hype"},{v:"pro",l:"Tour Pro"},{v:"coach",l:"Coach"},{v:"savage",l:"Savage"},{v:"oldschool",l:"Old School"}].map(o=>(
                          <button key={o.v} onClick={()=>setProfile(p=>({...p,persona:o.v}))} className={cn("display text-[11px] font-bold rounded-lg border px-3 py-1.5 transition",profile.persona===o.v?"bg-primary text-primary-foreground border-primary":"border-border text-muted-foreground hover:border-foreground/40")}>{o.l}</button>
                        ))}
                      </div>
                      <button onClick={saveProfile} className="w-full bg-primary text-primary-foreground rounded-xl py-3 display text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition">Save</button>
                    </div>
                  )}
                  {profileSection===id&&id==="hcp"&&(
                    <div className="p-3.5 space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {[{v:"plus",l:"+HCP"},{v:"scratch",l:"Scratch"},{v:"low",l:"Low"},{v:"mid",l:"Mid"},{v:"high",l:"High"}].map(o=>(
                          <button key={o.v} onClick={()=>setProfile(p=>({...p,handicap:o.v}))} className={cn("display text-[10px] font-bold uppercase tracking-wider rounded-lg border px-2.5 py-1.5 transition",profile.handicap===o.v?"bg-primary text-primary-foreground border-primary":"border-border text-muted-foreground hover:border-foreground/40")}>{o.l}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-3"><p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">Index</p><input type="number" step="0.1" value={profile.hcp} onChange={e=>setProfile(p=>({...p,hcp:parseFloat(e.target.value)||0}))} className="w-20 bg-input border border-border rounded-xl px-3 py-2 text-center display text-[15px] font-bold text-foreground outline-none"/></div>
                      <div>
                        <p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Miss tendency</p>
                        <div className="flex flex-wrap gap-1.5">
                          {["straight","slight fade","fade","slice","slight draw","draw","hook"].map(m=>(
                            <button key={m} onClick={()=>setProfile(p=>({...p,missTend:m}))} className={cn("display text-[10px] font-bold uppercase tracking-wider rounded-lg border px-2.5 py-1.5 transition",profile.missTend===m?"bg-primary text-primary-foreground border-primary":"border-border text-muted-foreground hover:border-foreground/40")}>{m}</button>
                          ))}
                        </div>
                      </div>
                      <input placeholder="Home course..." value={profile.homeCourse} onChange={e=>setProfile(p=>({...p,homeCourse:e.target.value}))} className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition"/>
                      <button onClick={saveProfile} className="w-full bg-primary text-primary-foreground rounded-xl py-3 display text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition">Save Profile</button>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border mb-4">
              <div className="flex items-center gap-3 px-3.5 py-3">
                <div className="h-9 w-9 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">{isDark?<Sun className="h-4 w-4" strokeWidth={2.5}/>:<Moon className="h-4 w-4" strokeWidth={2.5}/>}</div>
                <div className="flex-1"><p className="display text-[13px] font-bold tracking-tight">{isDark?"Light Mode":"Dark Mode"}</p><p className="text-[11px] text-muted-foreground">Currently {isDark?"dark":"light"}</p></div>
                <button onClick={()=>setIsDark(d=>!d)} className={cn("w-12 h-6 rounded-full transition-colors relative",isDark?"bg-primary":"bg-muted")}><span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all",isDark?"left-[26px]":"left-0.5")}/></button>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3.5 py-3 display text-[12px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive hover:border-destructive/40 transition">
              <LogOut className="h-3.5 w-3.5" strokeWidth={2.5}/> Sign out
            </button>
          </div>
        </div>
      )}
      <header className="shrink-0 sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border pt-safe">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <img src={LOGO} alt="Obi" className="h-9 w-9 object-contain shrink-0 rounded-lg"/>
            <span className="display font-semibold tracking-tight text-[15px]">Obi Golf</span>
          </div>
          <div className="flex items-center gap-1.5">
            {tab==="caddie"&&weather&&(
              <div className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 tabular text-[11px] text-secondary-foreground">
                <Cloud className="h-3 w-3"/><span className="font-medium">{weather.temp}°</span><span className="text-muted-foreground">·</span><span className="text-muted-foreground">{weather.wind}mph {windDir(weather.windDeg)}</span>
              </div>
            )}
            <button onClick={()=>setIsDark(d=>!d)} className="h-8 w-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-muted transition">{isDark?<Sun className="h-3.5 w-3.5"/>:<Moon className="h-3.5 w-3.5"/>}</button>
            <button onClick={()=>setTab("profile_panel")} className="h-8 w-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-muted transition"><Settings className="h-3.5 w-3.5"/></button>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto" style={{WebkitOverflowScrolling:"touch"}}>
        {tab==="home"&&(
          <div className="pb-8">
            <section className="px-4 pt-5"><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Good morning</p><h1 className="display text-[26px] font-bold tracking-tight leading-tight mt-0.5">Your game, by the numbers.</h1></section>
            <section className="px-4 pt-4">
              <div className="rounded-xl bg-foreground text-background p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="display text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">Handicap index</p>
                    <div className="flex items-end gap-2 mt-1">
                      <p className="stat text-[44px] leading-none">{profile.hcp}</p>
                      <span className="display text-[11px] font-bold uppercase tracking-wider text-primary inline-flex items-center gap-0.5 pb-2"><TrendingDown className="h-3 w-3" strokeWidth={3}/>{profile.handicap}</span>
                    </div>
                    <p className="text-[11px] opacity-60 mt-1.5 font-medium">{rounds.length>0?"Updated after "+fmtDateShort(rounds[0]?.played_at)+" · "+(rounds[0]?.course_name||""):"No rounds yet. Start playing!"}</p>
                  </div>
                  <button onClick={()=>{setSocialView("rounds");setTab("social");}} className="display text-[10px] font-bold uppercase tracking-wider text-primary inline-flex items-center gap-0.5">History <ChevronRight className="h-3 w-3" strokeWidth={3}/></button>
                </div>
              </div>
            </section>
            <section className="px-4 pt-3">
              <div className="grid grid-cols-2 gap-2.5">
                {[{label:"Avg Score",value:avgScore||"--",trend:"down"},{label:"Rounds",value:rounds.length,trend:"up"},{label:"Best Score",value:bestScore||"--",trend:"down"},{label:"HCP Index",value:profile.hcp,trend:"down"}].map(s=>(
                  <div key={s.label} className="rounded-xl border border-border bg-card p-3.5">
                    <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{s.label}</p>
                    <div className="flex items-end gap-1 mt-1.5"><p className="stat text-[30px] leading-none">{s.value}</p></div>
                    <div className="mt-2 inline-flex items-center gap-0.5 text-primary">{s.trend==="down"?<TrendingDown className="h-3 w-3" strokeWidth={3}/>:<TrendingUp className="h-3 w-3" strokeWidth={3}/>}<span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">vs last 5</span></div>
                  </div>
                ))}
              </div>
            </section>
            <section className="px-4 pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Recent rounds</p>
                <button onClick={()=>{setSocialView("rounds");setTab("social");}} className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">All stats <ChevronRight className="h-3 w-3" strokeWidth={3}/></button>
              </div>
              {rounds.length===0?(
                <div className="rounded-xl border border-border bg-card p-6 text-center"><p className="text-2xl mb-2">⛳</p><p className="display text-[13px] font-bold text-foreground">No rounds yet</p><p className="text-[12px] text-muted-foreground mt-1">Save a round from the Caddie tab</p></div>
              ):(
                <div className="space-y-2">
                  {rounds.slice(0,3).map((r,i)=>{
                    const diff=r.score_vs_par||0;
                    return(
                      <button key={r.id||i} onClick={()=>setShowCard(r)} className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 hover:bg-secondary/40 transition text-left">
                        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0"><MapPin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5}/></div>
                        <div className="min-w-0 flex-1"><p className="display text-[13px] font-bold tracking-tight truncate">{r.course_name||"Unknown"}</p><p className="text-[11px] text-muted-foreground">{fmtDateShort(r.played_at)} · {diff===0?"E":diff>0?"+"+diff:""+diff}</p></div>
                        <div className="text-right"><p className={cn("stat text-lg leading-none",diff<=0?"text-primary":"text-foreground")}>{r.total_score}</p>{i===0&&bestScore===r.total_score&&<p className="display text-[9px] font-bold uppercase tracking-wider text-primary mt-1">Best</p>}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
        {tab==="practice"&&(
          <div className="px-4 pt-5 pb-8 space-y-5">
            <div><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Practice</p><h1 className="display text-[26px] font-bold tracking-tight leading-tight mt-0.5">Sharpen your game.</h1></div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><div className="h-5 w-5 rounded-md bg-foreground text-primary flex items-center justify-center"><Video className="h-3 w-3" strokeWidth={3}/></div><p className="display text-[11px] font-bold uppercase tracking-[0.18em]">Swing Lab</p></div>
                <span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Video analysis</span>
              </div>
              <button onClick={()=>swingInputRef.current?.click()} className="w-full rounded-xl bg-foreground text-background p-4 flex items-center gap-3 hover:opacity-95 transition mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Video className="h-4 w-4" strokeWidth={2.75}/></div>
                <div className="text-left flex-1"><p className="display text-[15px] font-bold tracking-tight">Record a swing</p><p className="text-[11px] opacity-70 font-medium">AI breakdown · plane, tempo, face</p></div>
                <ChevronRight className="h-4 w-4" strokeWidth={3}/>
              </button>
              <input ref={swingInputRef} type="file" accept="video/*,image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)setSwingFile(f);}}/>
              {swingFile&&!swingAnalysis&&!swingLoading&&(
                <div className="rounded-xl border border-border bg-card p-4 space-y-3 mb-2">
                  <p className="text-[13px] text-muted-foreground">File: <span className="text-foreground font-semibold">{swingFile.name}</span></p>
                  <textarea placeholder="Notes (optional)..." value={swingNotes} onChange={e=>setSwingNotes(e.target.value)} rows={2} className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-foreground/40 transition"/>
                  <button onClick={handleSwingAnalyze} className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 display text-[13px] font-bold uppercase tracking-wider hover:opacity-90 transition">Analyze with Obi</button>
                </div>
              )}
              {swingLoading&&(<div className="rounded-xl border border-border bg-card p-8 text-center mb-2"><div className="text-3xl mb-3" style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⚙️</div><p className="display text-[15px] font-bold text-foreground">Analyzing your swing...</p></div>)}
              {swingAnalysis&&(
                <div className="mb-2">
                  <div className="rounded-xl border border-border bg-card p-4 mb-2">
                    <div className="flex items-center justify-between mb-3"><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Last swing · {swingNotes||"Unknown"}</p><span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Just now</span></div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{swingAnalysis.slice(0,150)}...</p>
                    <button onClick={()=>speak(swingAnalysis)} className="display text-[10px] font-bold uppercase tracking-wider border-b-2 border-foreground pb-0.5">See full breakdown</button>
                  </div>
                  <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
                    <div className="flex items-center gap-1.5 mb-1"><Sparkles className="h-3 w-3" strokeWidth={2.5}/><p className="display text-[10px] font-bold uppercase tracking-[0.18em]">Obi&apos;s read</p></div>
                    <p className="display text-[15px] font-bold tracking-tight leading-snug">{swingAnalysis.split(".").slice(0,2).join(".")+"."}</p>
                    <button onClick={()=>{setSwingAnalysis("");setSwingFile(null);setSwingNotes("");}} className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground pb-0.5 mt-2">New analysis</button>
                  </div>
                </div>
              )}
              {swingHistory.length>0&&!swingAnalysis&&(
                <div className="rounded-xl border border-border bg-card p-4 mb-2">
                  <div className="flex items-center justify-between mb-2"><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Last swing · {swingHistory[0].club_used||"Unknown"}</p><span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{fmtDateShort(swingHistory[0].created_at)}</span></div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{swingHistory[0].analysis?.slice(0,120)}...</p>
                  <button onClick={()=>speak(swingHistory[0].analysis||"")} className="display text-[10px] font-bold uppercase tracking-wider border-b-2 border-foreground pb-0.5 mt-2">See full breakdown</button>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><div className="h-5 w-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center"><Target className="h-3 w-3" strokeWidth={3}/></div><p className="display text-[11px] font-bold uppercase tracking-[0.18em]">Range Mode</p></div>
                <span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Live shot tracking</span>
              </div>
              {!cameraActive&&!rangeLoading&&!rangeShotResult&&(
                <button onClick={startCamera} className="w-full rounded-xl bg-primary text-primary-foreground p-4 flex items-center gap-3 hover:opacity-95 transition mb-2">
                  <div className="h-10 w-10 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0"><Play className="h-4 w-4" strokeWidth={3} fill="currentColor"/></div>
                  <div className="text-left flex-1"><p className="display text-[15px] font-bold tracking-tight">Start range session</p><p className="text-[11px] opacity-70 font-medium">Track every shot · Obi coaches live</p></div>
                  <ChevronRight className="h-4 w-4" strokeWidth={3}/>
                </button>
              )}
              {cameraActive&&(
                <div className="rounded-xl border border-border bg-card overflow-hidden mb-2">
                  <video ref={videoRef} muted playsInline className="w-full aspect-video object-cover bg-black"/>
                  <div className="p-3.5 flex gap-2">
                    {!recording?(<button onClick={startRecording} className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 display text-[12px] font-bold uppercase tracking-wider">Record</button>):(<button onClick={()=>mediaRecorderRef.current?.stop()} className="flex-1 flex items-center justify-center gap-2 bg-destructive/20 text-destructive rounded-xl py-3 display text-[12px] font-bold uppercase tracking-wider border border-destructive/30">Stop</button>)}
                    <button onClick={stopCamera} className="rounded-xl border border-border bg-secondary px-4 py-3 display text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cancel</button>
                  </div>
                </div>
              )}
              {rangeLoading&&(<div className="rounded-xl border border-border bg-card p-6 text-center mb-2"><p className="display text-[15px] font-bold text-foreground">Analyzing shot...</p></div>)}
              {rangeShotResult&&!rangeShotResult.error&&(
                <div className="mb-2">
                  <ShotShapeDiagram result={rangeShotResult} club={rangeClub} dexterity={profile.dexterity}/>
                  <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 mt-2">
                    <div className="grid grid-cols-3 gap-3 mb-3">{[["Shape",rangeShotResult.shape||"straight"],["Carry",(rangeShotResult.carry||0)+"y"],["Dir",rangeShotResult.direction||"center"]].map(([l,v])=>(<div key={l} className="text-center"><p className="display text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">{l}</p><p className="stat text-xl leading-none text-primary">{v}</p></div>))}</div>
                    {rangeShotResult.coaching&&<p className="text-sm text-foreground leading-relaxed pt-3 border-t border-border/50">{rangeShotResult.coaching}</p>}
                    <button onClick={()=>setRangeShotResult(null)} className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground pb-0.5 mt-2">Next shot</button>
                  </div>
                </div>
              )}
              {rangeHistory.length>0&&(
                <div className="rounded-xl border border-border bg-card p-4 mb-2">
                  <div className="flex items-center justify-between mb-3"><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Last session</p><span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{fmtDateShort(rangeHistory[0]?.created_at)}</span></div>
                  <div className="grid grid-cols-3 gap-3">{[["Shots",rangeHistory.length],["Shape",clubStats[rangeClub]?.typicalShape||"--"],["Stars","⭐".repeat(Math.min(3,clubStats[rangeClub]?.consistencyStars||3))]].map(([l,v])=>(<div key={l}><div className="flex items-center gap-1 text-muted-foreground mb-1"><Target className="h-3 w-3" strokeWidth={2.5}/><p className="display text-[10px] font-bold uppercase tracking-wider">{l}</p></div><p className="stat text-[26px] leading-none">{v}</p></div>))}</div>
                </div>
              )}
              <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mt-3 mb-2">Recommended drills</p>
              <div className="space-y-2">
                {[{Icon:Activity,label:"100yd ladder",reps:"10 shots",color:"bg-primary/15 text-primary"},{Icon:Target,label:"Center strike",reps:"20 shots",color:"bg-accent/30 text-accent-foreground"},{Icon:Activity,label:"Tempo drill",reps:"15 shots",color:"bg-secondary text-secondary-foreground"}].map(d=>(
                  <button key={d.label} className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 hover:border-foreground/40 transition text-left">
                    <div className={"h-9 w-9 rounded-lg flex items-center justify-center shrink-0 "+d.color}><d.Icon className="h-4 w-4" strokeWidth={2.5}/></div>
                    <div className="min-w-0 flex-1"><p className="display text-[13px] font-bold tracking-tight">{d.label}</p><p className="text-[11px] text-muted-foreground">{d.reps}</p></div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={2.5}/>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {tab==="caddie"&&(
          <div className="flex flex-col min-h-full">
            <div className="px-4 pt-3">
              <button onClick={()=>setHoleOpen(o=>!o)} className="w-full rounded-xl bg-foreground text-background p-3.5 hover:opacity-95 transition block text-left">
                <div className="flex items-center gap-3"><MapPin className="h-4 w-4 shrink-0" strokeWidth={2.5}/><div className="min-w-0 flex-1"><p className="display text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">Live round</p><p className="display text-[15px] font-bold tracking-tight truncate">{course?course.toUpperCase():"TAP TO SET COURSE"}</p></div><span className="display text-xs font-bold tracking-wider text-primary">{course?"ON":"--"}</span></div>
              </button>
            </div>
            <div className="px-4 pt-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Current hole</p>
                  <div className="relative"><select value={hole} onChange={e=>setHole(Number(e.target.value))} className="appearance-none display text-[13px] font-bold uppercase tracking-wider rounded-lg border border-border bg-background pl-3 pr-8 py-1.5 cursor-pointer hover:border-foreground/40 focus:outline-none focus:border-foreground transition text-foreground">{Array.from({length:18},(_,i)=>i+1).map(n=><option key={n} value={n}>Hole {n}</option>)}</select><ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" strokeWidth={2.5}/></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">Hole</p><div className="flex items-end gap-1"><span className="stat text-[30px] leading-none text-foreground">{hole}</span><span className="text-xs text-muted-foreground pb-1 font-bold">/18</span></div></div>
                  <div><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">Par</p><span className="stat text-[30px] leading-none text-foreground">{holePars[hole-1]}</span></div>
                  <div><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">To pin</p><div className="flex items-end gap-1"><input type="number" placeholder="0" value={yardage} onChange={e=>setYardage(e.target.value)} className="stat text-[30px] leading-none text-primary bg-transparent border-b border-border w-16 outline-none"/><span className="text-xs text-muted-foreground pb-1 font-bold">YDS</span></div></div>
                </div>
                {holeOpen&&(
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <input placeholder="Course name..." value={courseInput} onChange={e=>setCourseInput(e.target.value)} onBlur={()=>{if(courseInput)setCourse(courseInput);}} onKeyDown={e=>{if(e.key==="Enter"&&courseInput)setCourse(courseInput);}} className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition"/>
                    <div><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">Lie</p><div className="flex flex-wrap gap-1.5">{["tee","fairway","rough","deep rough","bunker","fringe","green"].map(l=>(<button key={l} onClick={()=>setLie(l)} className={cn("display text-[10px] font-bold uppercase tracking-wider rounded-lg border px-2.5 py-1.5 transition",lie===l?"bg-foreground text-background border-foreground":"border-border text-muted-foreground hover:border-foreground/40")}>{l}</button>))}</div></div>
                    <div className="flex items-center gap-3"><p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">Elev</p><input type="range" min="-100" max="100" value={elevation} onChange={e=>setElevation(Number(e.target.value))} className="flex-1"/><span className="display text-[12px] font-bold text-foreground w-12 text-right">{elevation>0?"+":""}{elevation}ft</span></div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">Score H{hole}:</p>
                      {[holePars[hole-1]-1,holePars[hole-1],holePars[hole-1]+1,holePars[hole-1]+2].map(v=>(<button key={v} onClick={()=>setScorecard(s=>{const n=[...s];n[hole-1]=v;return n;})} className={cn("display text-[11px] font-bold rounded-lg border px-2.5 py-1.5 transition",scorecard[hole-1]===v?"bg-primary text-primary-foreground border-primary":"border-border text-muted-foreground hover:border-foreground/40")}>{v}</button>))}
                      {scorecard.some(Boolean)&&(<button onClick={saveRound} className="display text-[10px] font-bold uppercase tracking-wider bg-foreground text-background rounded-lg px-2.5 py-1.5">Save Round</button>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {messages.length>0&&messages[messages.length-1].role==="assistant"&&(
              <div className="px-4 pt-3">
                <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
                  <div className="flex items-center gap-2 mb-2"><div className="h-6 w-6 rounded-md bg-foreground text-primary flex items-center justify-center"><Zap className="h-3.5 w-3.5" strokeWidth={2.75}/></div><p className="display text-[11px] font-bold uppercase tracking-[0.18em]">Obi&apos;s call</p><span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-auto">{profile.persona==="pro"?"Tour pro":profile.persona}</span></div>
                  <p className="display text-2xl font-bold tracking-tight leading-tight mb-1">{messages[messages.length-1].content.split(".")[0]}.</p>
                  <p className="text-sm text-muted-foreground leading-snug">{messages[messages.length-1].content.split(".").slice(1).join(".").trim()}</p>
                  <div className="flex gap-3 mt-3">
                    <button onClick={()=>sendMessage("Why do you recommend that?")} className="display text-[10px] font-bold uppercase tracking-wider text-foreground border-b-2 border-foreground pb-0.5">Why?</button>
                    <button onClick={()=>sendMessage("What are my alternatives?")} className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition pb-0.5">Alternatives</button>
                  </div>
                </div>
              </div>
            )}
            <div className="px-4 pt-4">
              {messages.length===0&&(<div className="text-center py-6"><img src={LOGO} alt="Obi" className="h-12 w-12 object-contain mx-auto mb-3 opacity-60"/><p className="display text-lg text-foreground mb-1">Ready to caddie</p><p className="text-sm text-muted-foreground">Set your yardage and ask anything</p></div>)}
              <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">Quick ask</p>
              <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-2" style={{scrollbarWidth:"none"}}>
                {QUICK_PROMPTS.map(a=>(<button key={a.label} onClick={()=>sendMessage(a.prompt)} className="shrink-0 inline-flex items-center gap-1.5 display rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground hover:border-foreground/40 transition">{a.label}</button>))}
              </div>
            </div>
            <div className="flex-1"/>
            {messages.length>1&&(
              <div className="px-4 pt-2 space-y-2 max-h-48 overflow-y-auto" style={{scrollbarWidth:"none"}}>
                {messages.slice(0,-1).map((m,i)=>(<div key={i} className={cn("flex",m.role==="user"?"justify-end":"justify-start gap-2 items-end")}>{m.role==="assistant"&&<img src={LOGO} alt="" className="h-5 w-5 object-contain rounded shrink-0"/>}<div className={m.role==="user"?"bubble-user text-[13px]":"bubble-ai text-[13px]"}>{m.content}</div></div>))}
                <div ref={chatEndRef}/>
              </div>
            )}
            <div className="px-4 pb-3 pt-2 shrink-0" style={{paddingBottom:"calc(0.75rem + env(safe-area-inset-bottom))"}}>
              {loading&&(<div className="flex items-end gap-2 mb-2"><img src={LOGO} alt="" className="h-5 w-5 object-contain rounded shrink-0"/><div className="bubble-ai flex gap-1.5 items-center py-3">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground" style={{animation:"pulse-dot 1.2s "+(i*0.15)+"s infinite"}}/>)}</div></div>)}
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-1.5 pl-2 shadow-sm">
                <button aria-label="Voice" className="h-9 w-9 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-secondary transition shrink-0"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></button>
                <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="ASK OBI ANYTHING..." className="flex-1 bg-transparent text-sm font-medium tracking-wide placeholder:text-muted-foreground placeholder:uppercase placeholder:tracking-wider placeholder:text-[11px] placeholder:font-bold outline-none px-1"/>
                <button onClick={()=>sendMessage()} disabled={!input.trim()||loading} className={cn("h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center transition",(!input.trim()||loading)?"opacity-40":"hover:opacity-90")}><ArrowUp className="h-4 w-4" strokeWidth={3}/></button>
              </div>
            </div>
          </div>
        )}
        {tab==="social"&&(
          <div className="pb-8">
            <section className="px-4 pt-5"><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Social</p><h1 className="display text-[26px] font-bold tracking-tight leading-tight mt-0.5">Your crew.</h1></section>
            {friends.length>0&&(
              <section className="px-4 pt-4">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/50"><Trophy className="h-3.5 w-3.5 text-primary" strokeWidth={2.5}/><p className="display text-[11px] font-bold uppercase tracking-[0.18em]">This week&apos;s leaderboard</p></div>
                  <div className="divide-y divide-border">
                    {[{rank:1,name:name,score:bestScore||"--",you:true,initials:name.slice(0,2).toUpperCase()},...friends.slice(0,2).map((f,idx)=>{const other=f.requester_id===user?.id?f.addressee:f.requester;return{rank:idx+2,name:other?.full_name||"Friend",score:"--",you:false,initials:(other?.full_name||"??").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()};})].sort((a,b)=>a.rank-b.rank).map(p=>(
                      <div key={p.rank} className={cn("flex items-center gap-3 px-4 py-3",p.you&&"bg-primary/10")}>
                        <span className={cn("stat text-lg w-6",p.rank===1?"text-primary":"text-muted-foreground")}>{p.rank}</span>
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center display text-[11px] font-bold shrink-0">{p.initials}</div>
                        <p className="display text-[13px] font-bold tracking-tight flex-1">{p.name}{p.you&&<span className="ml-1.5 text-[9px] uppercase tracking-wider text-primary"> you</span>}</p>
                        <span className="stat text-lg">{p.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
            <section className="px-4 pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Friend activity</p>
                <button onClick={()=>setSocialView("friends")} className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Users className="h-3 w-3" strokeWidth={2.5}/> Find friends</button>
              </div>
              {feed.length===0&&(<div className="rounded-xl border border-border bg-card p-10 text-center"><p className="text-2xl mb-2">👥</p><p className="display text-[15px] font-bold text-foreground">No activity yet</p><p className="text-[13px] text-muted-foreground mt-1">Add friends to see their rounds</p></div>)}
              <div className="space-y-2.5">
                {(showAllFeed?feed:feed.slice(0,5)).map((r,i)=>{
                  const isYou=r.user_id===user?.id;
                  const pname=isYou?name:(r.profiles?.full_name||"Golfer");
                  const initials=pname.split(" ").map(x=>x[0]).join("").toUpperCase().slice(0,2);
                  const diff=r.score_vs_par||0;
                  return(
                    <article key={r.id||i} className="rounded-xl border border-border bg-card p-3.5">
                      <div className="flex items-center gap-2.5 mb-2.5"><div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center display text-[11px] font-bold shrink-0">{initials}</div><div className="min-w-0 flex-1"><p className="display text-[13px] font-bold tracking-tight">{pname}{isYou&&<span className="ml-1.5 text-[9px] uppercase tracking-wider text-primary"> you</span>}</p><p className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" strokeWidth={2.5}/>{r.course_name||"Unknown"} · {fmtDateShort(r.played_at)}</p></div><div className="text-right"><p className={cn("stat text-xl leading-none",diff<=0?"text-primary":"text-foreground")}>{r.total_score}</p><p className="display text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Score</p></div></div>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                        <button onClick={()=>setShowCard(r)} className="inline-flex items-center gap-1.5 display text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition">View round</button>
                      </div>
                    </article>
                  );
                })}
                {feed.length>5&&(<button onClick={()=>setShowAllFeed(s=>!s)} className="w-full text-center py-2.5 display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">{showAllFeed?"Show less":"View more"}</button>)}
              </div>
            </section>
            {socialView==="friends"&&(
              <section className="px-4 pt-4 space-y-3">
                <div className="flex gap-2"><input placeholder="Search players..." value={friendSearch} onChange={e=>setFriendSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchFriends()} className="flex-1 bg-input border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition"/><button onClick={searchFriends} className="bg-foreground text-background rounded-xl px-4 display text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition">Find</button></div>
                {friendResults.length>0&&(<div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">{friendResults.map(u=>(<div key={u.id} className="flex items-center gap-3 px-3.5 py-3"><Avatar url={u.avatar_url} name={u.full_name} size={34}/><div className="flex-1 min-w-0"><p className="display text-[13px] font-bold">{u.full_name}</p><p className="text-[11px] text-muted-foreground">HCP {u.handicap_index||"--"}</p></div><button onClick={()=>sendFriendReq(u.id)} className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 display text-[11px] font-bold uppercase tracking-wider">Add</button></div>))}</div>)}
                {friendReqs.length>0&&(<div><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">Requests</p><div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">{friendReqs.map(f=>{const other=f.requester_id===user?.id?f.addressee:f.requester;return(<div key={f.id} className="flex items-center gap-3 px-3.5 py-3"><Avatar url={other?.avatar_url} name={other?.full_name} size={34}/><div className="flex-1"><p className="display text-[13px] font-bold">{other?.full_name||"Player"}</p></div><button onClick={()=>acceptFriend(f.id)} className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 display text-[11px] font-bold uppercase tracking-wider">Accept</button></div>);})}</div></div>)}
              </section>
            )}
          </div>
        )}
      </div>
      <nav className="shrink-0 sticky bottom-0 z-30 bg-background/90 backdrop-blur-xl border-t border-border pb-safe">
        <div className="grid grid-cols-4 px-2 pt-1.5 pb-1.5 max-w-md mx-auto">
          {NAV.map(({id,label,Icon})=>{
            const isActive=tab===id;
            return(
              <button key={id} onClick={()=>changeTab(id)} className={cn("flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg transition",isActive?"text-foreground":"text-muted-foreground hover:text-foreground")}>
                <div className={cn("h-7 w-12 flex items-center justify-center rounded-lg transition",isActive&&"bg-primary text-primary-foreground")}><Icon className="h-[18px] w-[18px]" strokeWidth={isActive?2.25:1.75}/></div>
                <span className="display text-[10px] font-bold uppercase tracking-wider">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
export default function ObiGolf(){ return <ErrorBoundary><ObiGolfApp/></ErrorBoundary>; }
