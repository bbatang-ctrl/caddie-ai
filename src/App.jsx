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
function ObiLogo({size=32}){
  return(
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Circle background */}
      <circle cx="20" cy="20" r="19" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5"/>
      {/* Flag pole */}
      <line x1="13" y1="10" x2="13" y2="31" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      {/* Flag */}
      <path d="M13 10 L25 14.5 L13 19 Z" fill="var(--primary)"/>
      {/* Ground / hole */}
      <ellipse cx="16" cy="31" rx="5" ry="1.5" fill="currentColor" fillOpacity="0.15"/>
      <ellipse cx="16" cy="31" rx="3" ry="1" fill="currentColor" fillOpacity="0.3"/>
    </svg>
  );
}


// ── Accurate hole data for famous courses ──────────────────────────
const COURSE_DB={
  "pebble beach":{name:"Pebble Beach Golf Links",
    holes:[{par:4,yards:381,si:11},{par:5,yards:502,si:7},{par:4,yards:390,si:9},{par:4,yards:331,si:17},{par:3,yards:188,si:13},{par:5,yards:513,si:3},{par:3,yards:106,si:15},{par:4,yards:418,si:5},{par:4,yards:466,si:1},{par:4,yards:495,si:2},{par:4,yards:380,si:14},{par:3,yards:202,si:16},{par:4,yards:392,si:10},{par:5,yards:573,si:4},{par:4,yards:397,si:8},{par:4,yards:402,si:12},{par:3,yards:178,si:18},{par:5,yards:543,si:6}]},
  "augusta national":{name:"Augusta National Golf Club",
    holes:[{par:4,yards:445,si:4},{par:5,yards:575,si:14},{par:4,yards:350,si:16},{par:3,yards:240,si:10},{par:4,yards:455,si:6},{par:3,yards:180,si:18},{par:4,yards:450,si:2},{par:5,yards:570,si:8},{par:4,yards:460,si:12},{par:4,yards:495,si:1},{par:4,yards:520,si:3},{par:3,yards:155,si:17},{par:5,yards:510,si:9},{par:4,yards:440,si:5},{par:5,yards:530,si:11},{par:3,yards:170,si:15},{par:4,yards:440,si:7},{par:4,yards:465,si:13}]},
  "tpc sawgrass":{name:"TPC Sawgrass (Stadium)",
    holes:[{par:4,yards:423,si:7},{par:5,yards:532,si:13},{par:3,yards:177,si:15},{par:4,yards:384,si:11},{par:4,yards:466,si:3},{par:4,yards:393,si:9},{par:5,yards:442,si:17},{par:3,yards:237,si:5},{par:5,yards:583,si:1},{par:4,yards:424,si:6},{par:5,yards:558,si:12},{par:4,yards:358,si:16},{par:3,yards:181,si:18},{par:4,yards:467,si:2},{par:4,yards:449,si:4},{par:5,yards:523,si:10},{par:3,yards:137,si:14},{par:4,yards:447,si:8}]},
  "st andrews":{name:"St Andrews (Old Course)",
    holes:[{par:4,yards:376,si:15},{par:4,yards:453,si:9},{par:4,yards:397,si:11},{par:4,yards:480,si:3},{par:5,yards:568,si:7},{par:4,yards:416,si:13},{par:4,yards:372,si:17},{par:3,yards:175,si:5},{par:4,yards:356,si:1},{par:4,yards:380,si:16},{par:3,yards:174,si:18},{par:4,yards:348,si:12},{par:4,yards:465,si:4},{par:5,yards:618,si:2},{par:4,yards:456,si:6},{par:4,yards:424,si:10},{par:4,yards:495,si:8},{par:4,yards:357,si:14}]},
  "torrey pines south":{name:"Torrey Pines (South)",
    holes:[{par:4,yards:452,si:9},{par:4,yards:389,si:15},{par:3,yards:199,si:13},{par:4,yards:490,si:1},{par:4,yards:454,si:5},{par:5,yards:524,si:11},{par:4,yards:453,si:3},{par:3,yards:171,si:17},{par:5,yards:568,si:7},{par:4,yards:408,si:12},{par:4,yards:225,si:18},{par:4,yards:504,si:2},{par:3,yards:216,si:14},{par:4,yards:450,si:4},{par:4,yards:446,si:6},{par:5,yards:570,si:8},{par:3,yards:223,si:16},{par:5,yards:570,si:10}]},
  "pinehurst no 2":{name:"Pinehurst No. 2",
    holes:[{par:4,yards:414,si:11},{par:4,yards:459,si:5},{par:4,yards:335,si:17},{par:4,yards:549,si:1},{par:4,yards:482,si:3},{par:3,yards:216,si:13},{par:4,yards:406,si:9},{par:4,yards:484,si:7},{par:3,yards:165,si:15},{par:5,yards:609,si:6},{par:4,yards:453,si:2},{par:4,yards:442,si:8},{par:4,yards:380,si:4},{par:4,yards:447,si:10},{par:3,yards:207,si:16},{par:4,yards:531,si:14},{par:3,yards:197,si:18},{par:4,yards:445,si:12}]},
  "bethpage black":{name:"Bethpage (Black Course)",
    holes:[{par:4,yards:430,si:7},{par:4,yards:389,si:13},{par:3,yards:230,si:5},{par:5,yards:517,si:11},{par:4,yards:451,si:3},{par:4,yards:408,si:9},{par:5,yards:537,si:15},{par:3,yards:210,si:17},{par:4,yards:430,si:1},{par:4,yards:492,si:2},{par:4,yards:435,si:8},{par:4,yards:499,si:4},{par:3,yards:207,si:16},{par:4,yards:161,si:18},{par:4,yards:449,si:10},{par:4,yards:478,si:6},{par:3,yards:207,si:14},{par:4,yards:411,si:12}]},
  "kiawah island ocean":{name:"Kiawah Island (Ocean Course)",
    holes:[{par:4,yards:395,si:14},{par:5,yards:543,si:8},{par:4,yards:390,si:10},{par:4,yards:453,si:4},{par:3,yards:207,si:16},{par:5,yards:455,si:6},{par:5,yards:527,si:12},{par:3,yards:197,si:18},{par:4,yards:464,si:2},{par:4,yards:439,si:1},{par:4,yards:562,si:3},{par:4,yards:466,si:5},{par:4,yards:404,si:11},{par:3,yards:194,si:17},{par:4,yards:421,si:9},{par:5,yards:579,si:7},{par:3,yards:221,si:15},{par:4,yards:431,si:13}]},
  "erin hills":{name:"Erin Hills Golf Course",
    holes:[{par:4,yards:449,si:5},{par:5,yards:624,si:3},{par:4,yards:438,si:9},{par:4,yards:490,si:1},{par:3,yards:243,si:7},{par:4,yards:488,si:11},{par:5,yards:586,si:15},{par:3,yards:218,si:17},{par:4,yards:509,si:13},{par:4,yards:472,si:2},{par:4,yards:396,si:14},{par:4,yards:456,si:8},{par:3,yards:171,si:18},{par:4,yards:475,si:6},{par:4,yards:428,si:10},{par:5,yards:640,si:4},{par:3,yards:237,si:16},{par:4,yards:427,si:12}]},
};

function matchCourse(input){
  if(!input)return null;
  const k=input.toLowerCase().trim();
  for(const key of Object.keys(COURSE_DB)){
    if(k.includes(key)||key.includes(k))return COURSE_DB[key];
  }
  // Partial match
  for(const key of Object.keys(COURSE_DB)){
    const words=key.split(" ");
    if(words.some(w=>w.length>3&&k.includes(w)))return COURSE_DB[key];
  }
  return null;
}


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
  const [autoSpeak,setAutoSpeak]=useState(()=>{try{return localStorage.getItem("obi_autospeak")!=="false";}catch{return true;}});
  const [micActive,setMicActive]=useState(false);
  const [micSupported]=useState(()=>!!( window.SpeechRecognition||window.webkitSpeechRecognition));
  const recognizerRef=useRef(null);
  const [shotHistory,setShotHistory]=useState([]);
  const [scorecard,setScorecard]=useState(Array(18).fill(null));
  const [fairways,setFairways]=useState(Array(18).fill(null));   // true/false/null
  const [gir,setGir]=useState(Array(18).fill(null));             // true/false/null
  const [putts,setPutts]=useState(Array(18).fill(null));         // number
  const [scorecardOpen,setScorecardOpen]=useState(false);

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
      if(data.onboarded||(data.full_name&&data.handicap_category)){
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

  const saveProfile=async(overrideName)=>{
    if(!user)return;
    const fullName=overrideName||authName||userProfile?.full_name||"";
    const{error}=await supabase.from("profiles").upsert({
      id:user.id,full_name:fullName,
      handicap_category:profile.handicap,handicap_index:profile.hcp,
      caddie_persona:profile.persona,miss_tendency:profile.missTend,
      bag:profile.bag,dexterity:profile.dexterity,
      home_course:profile.homeCourse,practice_goal:profile.practiceGoal,
      onboarded:true,updated_at:new Date().toISOString(),
    });
    if(!error&&fullName)setUserProfile(p=>({...(p||{}),full_name:fullName,onboarded:true}));
    return !error;
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
    const name=firstName(userProfile?.full_name)||"Golfer";
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

  // ── GPS ──────────────────────────────────────────────────────────
  const [gpsPos,setGpsPos]=useState(null);
  const [gpsWatcher,setGpsWatcher]=useState(null);

  const startGPS=useCallback(()=>{
    if(!navigator.geolocation)return;
    const id=navigator.geolocation.watchPosition(
      p=>setGpsPos({lat:p.coords.latitude,lng:p.coords.longitude,acc:Math.round(p.coords.accuracy)}),
      err=>console.warn("GPS",err),
      {enableHighAccuracy:true,maximumAge:2000,timeout:10000}
    );
    setGpsWatcher(id);
  },[]);

  const stopGPS=useCallback(()=>{
    if(gpsWatcher!=null)navigator.geolocation.clearWatch(gpsWatcher);
    setGpsWatcher(null);setGpsPos(null);
  },[gpsWatcher]);

  const haversineYards=(lat1,lng1,lat2,lng2)=>{
    const R=6371000,toRad=x=>x*Math.PI/180;
    const dLat=toRad(lat2-lat1),dLng=toRad(lng2-lng1);
    const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return Math.round(2*R*Math.asin(Math.sqrt(a))*1.09361);
  };

  // ── Hole map ──────────────────────────────────────────────────────
  const [holeMap,setHoleMap]=useState(null);
  const [holeMapLoading,setHoleMapLoading]=useState(false);
  const [showHoleMap,setShowHoleMap]=useState(false);
  const [osmError,setOsmError]=useState(false);
  // manualPin: player can tap "Drop pin here" to set the green coords from their current GPS
  // stored per hole: { [holeNum]: {lat,lng} }
  const [manualPins,setManualPins]=useState({});
  const [pinDropMode,setPinDropMode]=useState(false);

  const fetchHoleMap=useCallback(async(courseName,holeNum)=>{
    if(!courseName||holeMapLoading)return;
    setHoleMapLoading(true);setHoleMap(null);setOsmError(false);

    // ── STEP 0: Check local DB for accurate par/yardage ─────────────
    const dbCourse=matchCourse(courseName);
    const dbHole=dbCourse?.holes?.[holeNum-1];
    if(dbHole){
      setYardage(String(dbHole.yards));
      setHolePars(prev=>{const n=[...prev];n[holeNum-1]=dbHole.par;return n;});
    }

    // ── STEP 1: Try OpenStreetMap Overpass API for real course data ──
    let osmData=null;
    try{
      // Build Overpass query - search by course name first
      const q=
        "[out:json][timeout:25];"
        +"area[\"name\"~\""+courseName.replace(/"/g,"")+"\"\",i][\"leisure\"=\"golf_course\"]->.c;"
        +"(way[\"golf\"](area.c);node[\"golf\"](area.c););"
        +"out body;>;out skel qt;";
      const resp=await fetch("https://overpass-api.de/api/interpreter",{
        method:"POST",body:"data="+encodeURIComponent(q),
        headers:{"Content-Type":"application/x-www-form-urlencoded"}
      });
      if(resp.ok){
        const d=await resp.json();
        osmData=parseOSMHole(d,holeNum);
      }
    }catch(e){console.warn("Overpass failed",e);}

    // ── STEP 2: Always get authoritative data from Gemini ────────────
    try{
      const knownYards=dbHole?dbHole.yards:null;
      const knownPar=dbHole?dbHole.par:null;
      const p="Return ONLY valid JSON, no markdown. "+
        "Golf course: "+courseName+". Hole number: "+holeNum+". "+
        (knownPar?"Par is "+knownPar+". ":"")+(knownYards?"Yardage is "+knownYards+" yards. ":"")+
        "Return: {"+
        '"par":'+( knownPar||"integer")+
        ',"yards":'+(knownYards||"integer")+
        ',"strokeIndex":integer 1-18'+
        ',"description":"one sentence about this specific hole layout and main challenge"'+
        ',"shape":"straight OR dogleg-left OR dogleg-right OR double-dogleg"'+
        ',"tee_lat":decimal GPS lat,"tee_lng":decimal GPS lng'+
        ',"green_lat":decimal GPS lat,"green_lng":decimal GPS lng'+
        ',"hazards":["short string per hazard e.g. water left, bunker front right"]'+
        ',"tips":"one actionable strategic sentence for this specific hole"'+
        '}. Use your knowledge of the real course layout. GPS coords must be accurate.';
      const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:[{role:"user",content:p}],
          system:"Golf course data API. Return only valid JSON. Be accurate with real course data."})});
      const d=await r.json();
      const t=(d?.content?.[0]?.text||"").replace(/```json/g,"").replace(/```/g,"").trim();
      const s=t.indexOf("{"),e=t.lastIndexOf("}");
      if(s>=0&&e>s){
        const gd=JSON.parse(t.slice(s,e+1));
        // DB data is more reliable than Gemini for par/yardage
        const finalPar=dbHole?.par||gd.par||4;
        const finalYards=dbHole?.yards||gd.yards||400;
        const finalSI=dbHole?.si||gd.strokeIndex||holeNum;
        setHoleMap({...gd,par:finalPar,yards:finalYards,strokeIndex:finalSI,osmFeatures:osmData});
        setYardage(String(finalYards));
        setHolePars(prev=>{const n=[...prev];n[holeNum-1]=finalPar;return n;});
      }
    }catch(e){
      // If Gemini fails but we have OSM, still show map
      if(osmData||dbHole){
        const fallPar=dbHole?.par||osmData?.estimatedPar||4;
        const fallYards=dbHole?.yards||osmData?.estimatedYards||400;
        setHoleMap({par:fallPar,yards:fallYards,strokeIndex:dbHole?.si||holeNum,
          description:courseName+" hole "+holeNum,shape:"straight",hazards:[],tips:"",osmFeatures:osmData});
        setYardage(String(fallYards));
        setHolePars(prev=>{const n=[...prev];n[holeNum-1]=fallPar;return n;});
      }else{
        // Pure fallback when we have nothing
        setHoleMap({par:4,yards:400,description:courseName+" hole "+holeNum,
          shape:"straight",hazards:[],tips:"Play to the center.",osmFeatures:null});
      }
    }
    setHoleMapLoading(false);
  },[holeMapLoading,holePars,yardage]);

  // When course changes, clear manual pins and pre-populate pars
  // When course is set, pre-populate all 18 pars from DB
  useEffect(()=>{
    const db=matchCourse(course);
    if(db?.holes){
      setHolePars(db.holes.map(h=>h.par));
    }
    setManualPins({});  // clear manual pins when course changes
    setHoleMap(null);
    setShowHoleMap(false);
  },[course]);

  useEffect(()=>{if(course&&showHoleMap)fetchHoleMap(course,hole);},[hole,course]);

  // Auto-brief: when hole changes mid-round, ask Obi for a quick read
  const prevHoleRef=useRef(1);
  useEffect(()=>{
    if(prevHoleRef.current!==hole&&course&&messages.length>0){
      prevHoleRef.current=hole;
      const par=holePars[hole-1]||4;
      const autoMsg="Hole "+hole+", par "+par+(yardage?", "+yardage+"y":"")+". Quick read.";
      sendMessage(autoMsg);
    }
    prevHoleRef.current=hole;
  },[hole]);



  // ── Parse OSM data into renderable features ───────────────────────
  const parseOSMHole=(osmData,holeNum)=>{
    const nodes={};
    osmData.elements.filter(e=>e.type==="node").forEach(n=>{nodes[n.id]={lat:n.lat,lng:n.lon};});
    const ways=osmData.elements.filter(e=>e.type==="way");

    const getCoords=way=>(way.nodes||[]).map(id=>nodes[id]).filter(Boolean);

    // Find features for this specific hole first, then fall back to any
    const tagged=(golf,ref)=>ways.filter(w=>w.tags?.golf===golf&&(ref?w.tags?.ref===String(ref):true));

    const features=[];
    const addFeature=(type,ways_)=>{
      ways_.forEach(w=>{
        const coords=getCoords(w);
        if(coords.length>0)features.push({type,coords,ref:w.tags?.ref});
      });
    };

    // Try hole-specific first
    let fairways=tagged("fairway",holeNum);
    let greens=tagged("green",holeNum);
    let tees=tagged("tee",holeNum);
    let bunkers=tagged("bunker",holeNum);
    let water=tagged("water_hazard",holeNum);

    // If no hole-specific data, we just have all features (less ideal)
    if(!fairways.length)fairways=tagged("fairway");
    if(!greens.length)greens=tagged("green");
    if(!tees.length)tees=tagged("tee");
    if(!bunkers.length)bunkers=tagged("bunker");
    if(!water.length)water=tagged("water_hazard");

    addFeature("fairway",fairways.slice(0,3));
    addFeature("green",greens.slice(0,1));
    addFeature("tee",tees.slice(0,2));
    addFeature("bunker",bunkers.slice(0,8));
    addFeature("water",water.slice(0,3));

    if(!features.length)return null;

    // Calculate bounding box for normalization
    const allCoords=features.flatMap(f=>f.coords);
    const lats=allCoords.map(c=>c.lat),lngs=allCoords.map(c=>c.lng);
    const minLat=Math.min(...lats),maxLat=Math.max(...lats);
    const minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
    const latSpan=maxLat-minLat||0.001,lngSpan=maxLng-minLng||0.001;

    // Normalize coords to 0-1 range (flip lat so north=top)
    const norm=coord=>({
      x:(coord.lng-minLng)/lngSpan,
      y:1-(coord.lat-minLat)/latSpan
    });

    const normFeatures=features.map(f=>({...f,pts:f.coords.map(norm)}));

    // Estimate par and yards from fairway geometry
    const fw=features.find(f=>f.type==="fairway");
    const green=features.find(f=>f.type==="green");
    const tee=features.find(f=>f.type==="tee");
    let estimatedYards=400;
    if(fw&&tee&&green){
      const teeC={lat:(Math.min(...tee.coords.map(c=>c.lat))+Math.max(...tee.coords.map(c=>c.lat)))/2,
                  lng:(Math.min(...tee.coords.map(c=>c.lng))+Math.max(...tee.coords.map(c=>c.lng)))/2};
      const greenC={lat:(Math.min(...green.coords.map(c=>c.lat))+Math.max(...green.coords.map(c=>c.lat)))/2,
                    lng:(Math.min(...green.coords.map(c=>c.lng))+Math.max(...green.coords.map(c=>c.lng)))/2};
      const R=6371000,toRad=x=>x*Math.PI/180;
      const dLat=toRad(greenC.lat-teeC.lat),dLng=toRad(greenC.lng-teeC.lng);
      const a=Math.sin(dLat/2)**2+Math.cos(toRad(teeC.lat))*Math.cos(toRad(greenC.lat))*Math.sin(dLng/2)**2;
      estimatedYards=Math.round(2*R*Math.asin(Math.sqrt(a))*1.09361);
    }

    return{features:normFeatures,bounds:{minLat,maxLat,minLng,maxLng},
      estimatedYards,estimatedPar:estimatedYards<175?3:estimatedYards<430?4:5};
  };

  // ── Canvas renderer ───────────────────────────────────────────────
  const HoleMapCanvas=({map,gps,W=280,H=440})=>{
    const cvRef=useRef(null);
    useEffect(()=>{
      const cv=cvRef.current;if(!cv||!map)return;
      const ctx=cv.getContext("2d");
      ctx.clearRect(0,0,W,H);

      // Rough background
      ctx.fillStyle="#86efac";
      ctx.fillRect(0,0,W,H);

      const px=(x,y)=>[x*W,y*H];

      const osmF=map.osmFeatures;
      if(osmF&&osmF.features&&osmF.features.length>0){
        // ── RENDER REAL OSM POLYGONS ──────────────────────────────
        const colors={fairway:"#4ade80",green:"#16a34a",tee:"#15803d",
                      bunker:"#fde68a",water:"#3b82f6"};
        const strokes={fairway:"#22c55e",green:"#14532d",tee:"#14532d",
                       bunker:"#b45309",water:"#1d4ed8"};

        // Draw order: fairway first, then water, bunker, green, tee on top
        ["fairway","water","bunker","green","tee"].forEach(type=>{
          osmF.features.filter(f=>f.type===type).forEach(f=>{
            if(!f.pts||f.pts.length<2)return;
            ctx.beginPath();
            ctx.moveTo(...px(f.pts[0].x,f.pts[0].y));
            f.pts.slice(1).forEach(p=>ctx.lineTo(...px(p.x,p.y)));
            ctx.closePath();
            ctx.fillStyle=colors[type]||"#ccc";
            ctx.fill();
            ctx.strokeStyle=strokes[type]||"#999";
            ctx.lineWidth=type==="fairway"?2:1.5;
            ctx.stroke();
          });
        });

        // Flag pin on green centroid
        const greenF=osmF.features.find(f=>f.type==="green");
        if(greenF&&greenF.pts.length>0){
          const cx=greenF.pts.reduce((s,p)=>s+p.x,0)/greenF.pts.length;
          const cy=greenF.pts.reduce((s,p)=>s+p.y,0)/greenF.pts.length;
          ctx.strokeStyle="#111";ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(cx*W,cy*H+2);ctx.lineTo(cx*W,cy*H-18);ctx.stroke();
          ctx.beginPath();ctx.moveTo(cx*W,cy*H-18);ctx.lineTo(cx*W+12,cy*H-12);
          ctx.lineTo(cx*W,cy*H-6);ctx.closePath();
          ctx.fillStyle="#ef4444";ctx.fill();
        }

      }else{
        // ── FALLBACK: Gemini-guided synthetic map ─────────────────
        const shape=map.shape||"straight";

        // Fairway path based on shape
        ctx.lineWidth=W*0.18;ctx.lineCap="round";ctx.lineJoin="round";
        ctx.strokeStyle="#4ade80";
        ctx.beginPath();
        if(shape==="dogleg-left"){
          ctx.moveTo(W*0.5,H*0.9);ctx.lineTo(W*0.52,H*0.55);
          ctx.lineTo(W*0.3,H*0.2);ctx.lineTo(W*0.3,H*0.1);
        }else if(shape==="dogleg-right"){
          ctx.moveTo(W*0.5,H*0.9);ctx.lineTo(W*0.48,H*0.55);
          ctx.lineTo(W*0.7,H*0.2);ctx.lineTo(W*0.7,H*0.1);
        }else{
          ctx.moveTo(W*0.5,H*0.9);ctx.lineTo(W*0.48,H*0.55);
          ctx.lineTo(W*0.5,H*0.2);ctx.lineTo(W*0.5,H*0.1);
        }
        ctx.stroke();
        // Lighter center
        ctx.lineWidth=W*0.07;ctx.strokeStyle="#86efac";
        ctx.beginPath();
        if(shape==="dogleg-left"){
          ctx.moveTo(W*0.5,H*0.9);ctx.lineTo(W*0.52,H*0.55);
          ctx.lineTo(W*0.3,H*0.2);ctx.lineTo(W*0.3,H*0.1);
        }else if(shape==="dogleg-right"){
          ctx.moveTo(W*0.5,H*0.9);ctx.lineTo(W*0.48,H*0.55);
          ctx.lineTo(W*0.7,H*0.2);ctx.lineTo(W*0.7,H*0.1);
        }else{
          ctx.moveTo(W*0.5,H*0.9);ctx.lineTo(W*0.48,H*0.55);
          ctx.lineTo(W*0.5,H*0.2);ctx.lineTo(W*0.5,H*0.1);
        }
        ctx.stroke();

        // Green
        const gx=shape==="dogleg-left"?W*0.3:shape==="dogleg-right"?W*0.7:W*0.5;
        const gy=H*0.1;
        ctx.beginPath();ctx.ellipse(gx,gy,W*0.12,H*0.055,0,0,Math.PI*2);
        ctx.fillStyle="#16a34a";ctx.fill();
        ctx.strokeStyle="#14532d";ctx.lineWidth=2;ctx.stroke();

        // Bunkers from hazards
        const hazards=map.hazards||[];
        hazards.forEach((h,i)=>{
          const isLeft=h.toLowerCase().includes("left");
          const isRight=h.toLowerCase().includes("right");
          const isFront=h.toLowerCase().includes("front");
          const isBunker=h.toLowerCase().includes("bunker");
          const isWater=h.toLowerCase().includes("water")||h.toLowerCase().includes("lake")||h.toLowerCase().includes("pond");
          if(!isBunker&&!isWater)return;
          const bx=isLeft?gx-W*0.15:isRight?gx+W*0.15:gx+(i%2===0?-1:1)*W*0.13;
          const by=isFront?gy+H*0.07:gy+(i*H*0.06);
          if(isWater){
            ctx.beginPath();ctx.ellipse(bx,by,W*0.1,H*0.04,0,0,Math.PI*2);
            ctx.fillStyle="rgba(59,130,246,0.7)";ctx.fill();
            ctx.strokeStyle="#2563eb";ctx.lineWidth=1.5;ctx.stroke();
          }else{
            ctx.beginPath();ctx.ellipse(bx,by,W*0.07,H*0.03,0,0,Math.PI*2);
            ctx.fillStyle="#fde68a";ctx.fill();
            ctx.strokeStyle="#b45309";ctx.lineWidth=1.5;ctx.stroke();
          }
        });

        // Flag
        ctx.strokeStyle="#111";ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(gx,gy+2);ctx.lineTo(gx,gy-18);ctx.stroke();
        ctx.beginPath();ctx.moveTo(gx,gy-18);ctx.lineTo(gx+12,gy-12);
        ctx.lineTo(gx,gy-6);ctx.closePath();
        ctx.fillStyle="#ef4444";ctx.fill();

        // Tee box
        ctx.fillStyle="#15803d";ctx.strokeStyle="#14532d";ctx.lineWidth=1.5;
        ctx.beginPath();ctx.roundRect(W*0.5-11,H*0.87,22,12,3);ctx.fill();ctx.stroke();
      }

      // ── Distance markers ──────────────────────────────────────────
      const yards=map.yards||400;
      const osmFw=map.osmFeatures?.features?.find(f=>f.type==="fairway");
      const osmTee=map.osmFeatures?.features?.find(f=>f.type==="tee");
      const osmGreen=map.osmFeatures?.features?.find(f=>f.type==="green");

      [100,150,200].forEach(dist=>{
        const t=dist/yards;
        let mx=W*0.5, my=0;
        if(osmFw&&osmFw.pts.length>1){
          const idx=Math.min(Math.floor(t*osmFw.pts.length),osmFw.pts.length-1);
          mx=osmFw.pts[idx].x*W;my=osmFw.pts[idx].y*H;
        }else{
          const shape=map.shape||"straight";
          const gx=shape==="dogleg-left"?W*0.3:shape==="dogleg-right"?W*0.7:W*0.5;
          my=H*(0.9-t*0.8);
          mx=t<0.5?W*0.5+(gx-W*0.5)*t*2:gx;
        }
        ctx.beginPath();ctx.arc(mx,my,5,0,Math.PI*2);
        ctx.fillStyle="rgba(255,255,255,0.9)";ctx.fill();
        ctx.strokeStyle="#374151";ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle="#111";ctx.font="bold 8px Inter,sans-serif";
        ctx.textAlign="center";ctx.fillText(dist+"y",mx,my-8);
      });

      // ── GPS player dot ────────────────────────────────────────────
      if(gps&&map.tee_lat&&map.green_lat){
        const b=map.osmFeatures?.bounds;
        let px_,py_;
        if(b){
          px_=((gps.lng-b.minLng)/(b.maxLng-b.minLng))*W;
          py_=(1-(gps.lat-b.minLat)/(b.maxLat-b.minLat))*H;
        }else{
          const latSpan=map.tee_lat-map.green_lat||0.001;
          const lngSpan=map.green_lng-map.tee_lng||0.001;
          const osmFwRef=map.osmFeatures?.features?.find(f=>f.type==="fairway");
          const shape=map.shape||"straight";
          const gx=shape==="dogleg-left"?W*0.3:shape==="dogleg-right"?W*0.7:W*0.5;
          const relY=(map.tee_lat-gps.lat)/latSpan;
          const relX=(gps.lng-map.tee_lng)/lngSpan;
          px_=W*0.5+relX*W*0.4;
          py_=H*(0.9-relY*0.8);
        }
        if(px_>0&&px_<W&&py_>0&&py_<H){
          // Accuracy circle
          ctx.beginPath();ctx.arc(px_,py_,16,0,Math.PI*2);
          ctx.fillStyle="rgba(59,130,246,0.12)";ctx.fill();
          // Dot
          ctx.beginPath();ctx.arc(px_,py_,8,0,Math.PI*2);
          ctx.fillStyle="#2563eb";ctx.fill();
          ctx.strokeStyle="#fff";ctx.lineWidth=2.5;ctx.stroke();
          // Pulse ring
          ctx.beginPath();ctx.arc(px_,py_,13,0,Math.PI*2);
          ctx.strokeStyle="rgba(59,130,246,0.5)";ctx.lineWidth=2;ctx.stroke();
        }
      }

    },[map,gps,W,H]);
    return(
      <canvas ref={cvRef} width={W} height={H}
        style={{width:"100%",height:"auto",display:"block",borderRadius:"8px"}}/>
    );
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
      // Auto-speak if enabled
      if(autoSpeak){
        setTimeout(()=>speakText(reply),400);
      }
    }catch(e){
      setMessages(m=>[...m,{role:"assistant",content:"Sorry, having trouble connecting. Try again."}]);
    }
    setLoading(false);
  };

  // ── Voice output ──────────────────────────────────────────────────
  const speakText=(text)=>{
    if(!window.speechSynthesis||!text)return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    const clean=text.replace(/[*_#`]/g,"").replace(/\n/g," ").replace(/\s+/g," ").trim();
    if(!clean)return;
    const doSpeak=()=>{
      const utt=new SpeechSynthesisUtterance(clean);
      utt.rate=0.9;utt.pitch=1;utt.volume=1;
      // Pick a good English voice — getVoices() is populated by now
      const voices=window.speechSynthesis.getVoices();
      const pick=voices.find(v=>/samantha|karen|daniel|alex|moira/i.test(v.name)&&v.lang.startsWith("en"))
        ||voices.find(v=>v.lang==="en-US"&&!v.name.includes("Google"))
        ||voices.find(v=>v.lang.startsWith("en"))
        ||voices[0];
      if(pick)utt.voice=pick;
      utt.onstart=()=>setSpeaking(true);
      utt.onend=()=>setSpeaking(false);
      utt.onerror=()=>setSpeaking(false);
      window.speechSynthesis.speak(utt);
    };
    // Voices may not be loaded yet on first call
    const voices=window.speechSynthesis.getVoices();
    if(voices.length>0){
      doSpeak();
    }else{
      window.speechSynthesis.onvoiceschanged=()=>{
        window.speechSynthesis.onvoiceschanged=null;
        doSpeak();
      };
      // Fallback: just speak after short delay even if voices never fire
      setTimeout(()=>{
        if(!speaking)doSpeak();
      },300);
    }
  };

  const stopSpeak=()=>{
    if(window.speechSynthesis)window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  // ── Voice input (mic) ─────────────────────────────────────────────
  const startMic=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR)return;
    if(micActive){
      recognizerRef.current?.stop();
      setMicActive(false);return;
    }
    const r=new SR();
    r.lang="en-US";r.continuous=false;r.interimResults=true;
    r.onstart=()=>setMicActive(true);
    r.onend=()=>setMicActive(false);
    r.onerror=()=>setMicActive(false);
    r.onresult=e=>{
      const transcript=Array.from(e.results).map(r=>r[0].transcript).join("");
      setInput(transcript);
      if(e.results[e.results.length-1].isFinal){
        setMicActive(false);
        setTimeout(()=>sendMessage(transcript),100);
      }
    };
    recognizerRef.current=r;
    r.start();
  };

  const speak=(text)=>{
    if(!window.speechSynthesis)return;
    if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return;}
    const utt=new SpeechSynthesisUtterance(text.replace(/[*_#]/g,""));
    utt.rate=0.93;utt.pitch=0.95;
    utt.onend=()=>setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speakText(utt);
  };

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  // ── Scorecard ────────────────────────────────────────────────────
  const saveRound=async()=>{
    if(!user)return;
    const filled=scorecard.filter(Boolean);
    if(filled.length===0)return;
    const total=filled.reduce((a,b)=>a+b,0);
    const par=holePars.slice(0,filled.length).reduce((a,b)=>a+b,0);
    const diff=total-par;
    const {data,error}=await supabase.from("rounds").insert({
      user_id:user.id,course_name:course||"Unknown Course",
      total_score:total,holes_played:filled.length,
      score_vs_par:diff,played_at:new Date().toISOString(),
      scorecard,hole_pars:holePars,
      fairways,gir,putts,
    }).select().single();
    if(!error&&data){
      setRounds(r=>[data,...r]);
      const diffStr=diff===0?"Even":diff>0?"+"+diff:""+diff;
      const fwyCount=fairways.filter(f=>f===true).length;
      const fwyTotal=fairways.filter(f=>f!==null).length;
      const girCount=gir.filter(g=>g===true).length;
      const girTotal=gir.filter(g=>g!==null).length;
      const puttTotal=putts.filter(p=>p!==null).reduce((a,b)=>a+b,0);
      let msg="Round saved! "+total+" ("+diffStr+")";
      if(fwyTotal>0)msg+=" · FWY "+fwyCount+"/"+fwyTotal;
      if(girTotal>0)msg+=" · GIR "+girCount+"/"+girTotal;
      if(puttTotal>0)msg+=" · "+puttTotal+" putts";
      alert(msg);
      // Reset scorecard for next round
      setScorecard(Array(18).fill(null));
      setFairways(Array(18).fill(null));
      setGir(Array(18).fill(null));
      setPutts(Array(18).fill(null));
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

  // ── LOADING ───────────────────────────────────────────────────

  const avgScore = rounds.length > 0 ? Math.round(rounds.slice(0,10).reduce((a,r)=>a+(r.total_score||0),0)/Math.min(rounds.length,10)) : null;
  const bestScore = rounds.length > 0 ? Math.min(...rounds.map(r=>r.total_score||99)) : null;

  if(authLoading)return(
    <div className="bg-background flex flex-col items-center justify-center gap-5" style={{minHeight:"100dvh"}}>
      <ObiLogo size={56}/>
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
    <div className="bg-background" style={{minHeight:"100dvh"}}>
      <div className="px-5 py-10 flex flex-col mx-auto" style={{maxWidth:"480px",minHeight:"100dvh"}}>
        {authScreen!=="onboard"&&(
          <React.Fragment>
            <div className="text-center mb-10 animate-fade-up">
              <ObiLogo size={52}/>
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
          <OnboardingFlow
            authName={authName} setAuthName={setAuthName}
            profile={profile} setProfile={setProfile}
            onComplete={async()=>{
              const ok=await saveProfile(authName);
              if(ok!==false)setAuthScreen("app");
            }}/>
        )}
      </div>
    </div>
  );
  return(
    <div className="flex flex-col bg-background text-foreground overflow-hidden" style={{height:"100dvh",maxWidth:"480px",margin:"0 auto",position:"relative"}}>
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
        <div className="fixed inset-0 z-50 flex justify-center bg-black/40" onClick={()=>setTab("home")}>
          <div className="bg-background w-full overflow-y-auto relative" style={{maxWidth:"480px"}} onClick={e=>e.stopPropagation()}>
          <div className="px-4 pt-safe pt-10 pb-8">
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
              {[{Icon:Briefcase,label:"My Bag",sub:profile.bag.length+" clubs",id:"bag",tone:"bg-primary/15 text-primary"},{Icon:Sparkles,label:"Caddie Style",sub:["pro","coach","oldschool"].includes(profile.persona)?{pro:"Tour Pro",coach:"The Coach",oldschool:"Old School"}[profile.persona]:profile.persona,id:"style",tone:"bg-accent/20 text-accent"}].map(({Icon,label,sub,id,tone})=>(
                <React.Fragment key={id}>
                  <button onClick={()=>setProfileSection(profileSection===id?null:id)} className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/40 transition text-left">
                    <div className={"h-9 w-9 rounded-lg flex items-center justify-center shrink-0 "+tone}><Icon className="h-4 w-4" strokeWidth={2.5}/></div>
                    <div className="min-w-0 flex-1"><p className="display text-[13px] font-bold tracking-tight">{label}</p><p className="text-[11px] text-muted-foreground truncate">{sub}</p></div>
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform",profileSection===id&&"rotate-90")} strokeWidth={2.5}/>
                  </button>
                  {profileSection===id&&id==="bag"&&(
                    <div>
                      {/* Current clubs */}
                      <div className="divide-y divide-border">
                        {profile.bag.map((b,i)=>(
                          <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5">
                            <span className="display text-[13px] font-bold flex-1 min-w-0 truncate">{b.club}</span>
                            <input type="number" placeholder="0" value={b.carry||""} onChange={e=>{
                              const v=e.target.value===""?0:parseInt(e.target.value)||0;
                              setProfile(p=>{const bag=[...p.bag];bag[i]={...bag[i],carry:v};return{...p,bag};});
                            }}
                              className="w-16 bg-input border border-border rounded-lg px-2 py-1.5 text-center display text-[13px] font-bold text-foreground outline-none focus:border-primary transition"
                              style={{MozAppearance:"textfield"}}
                            />
                            <span className="display text-[10px] font-bold text-muted-foreground w-5">y</span>
                            <button onClick={()=>setProfile(p=>({...p,bag:p.bag.filter((_,j)=>j!==i)}))}
                              className="h-6 w-6 rounded-md bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition shrink-0">
                              <X className="h-3 w-3" strokeWidth={3}/>
                            </button>
                          </div>
                        ))}
                      </div>
                      {/* Add club */}
                      <div className="px-3.5 py-3 border-t border-border">
                        <p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Add a club</p>
                        <div className="flex flex-wrap gap-1.5">
                          {["Driver","3-wood","5-wood","7-wood","Hybrid","2-iron","3-iron","4-iron","5-iron","6-iron","7-iron","8-iron","9-iron","PW","GW","SW","LW","Putter"].filter(c=>!profile.bag.some(b=>b.club===c)).map(c=>(
                            <button key={c} onClick={()=>setProfile(p=>({...p,bag:[...p.bag,{club:c,carry:0}]}))}
                              className="display text-[10px] font-bold uppercase tracking-wider rounded-lg border border-dashed border-border px-2.5 py-1.5 text-muted-foreground hover:border-primary hover:text-primary transition">
                              + {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="px-3.5 pb-3.5">
                        <button onClick={saveProfile} className="w-full bg-primary text-primary-foreground rounded-xl py-3 display text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition">
                          Save Bag
                        </button>
                      </div>
                    </div>
                  )}
                  {profileSection===id&&id==="style"&&(
                    <div className="p-3.5 space-y-2.5">
                      {[
                        {v:"pro",    icon:"🎯", label:"Tour Pro",   desc:"Calm, clinical precision. Minimal words, maximum clarity."},
                        {v:"coach",  icon:"📚", label:"The Coach",  desc:"Warm and encouraging. Builds confidence every hole."},
                        {v:"oldschool",icon:"🪨",label:"Old School", desc:"Gritty, direct, no-nonsense caddie. Old-fashioned and real."},
                      ].map(o=>(
                        <button key={o.v} onClick={()=>setProfile(p=>({...p,persona:o.v}))}
                          className={cn("w-full flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-all",
                            profile.persona===o.v?"border-primary bg-primary/10":"border-border hover:border-foreground/30")}>
                          <span className="text-2xl shrink-0">{o.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="display text-[14px] font-bold tracking-tight">{o.label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{o.desc}</p>
                          </div>
                          {profile.persona===o.v&&(
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            </div>
                          )}
                        </button>
                      ))}
                      <button onClick={saveProfile} className="w-full bg-primary text-primary-foreground rounded-xl py-3 display text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition mt-1">
                        Save style
                      </button>
                    </div>
                  )}

                </React.Fragment>
              ))}
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
            <ObiLogo size={36}/>
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
          <div className="overflow-y-auto pb-8">
            <section className="px-4 pt-5">
              <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Dashboard</p>
              <h1 className="display text-[24px] font-bold tracking-tight leading-tight mt-0.5">Your game, by the numbers.</h1>
            </section>

            {/* Handicap hero */}
            <section className="px-4 pt-4">
              <div className="rounded-xl bg-foreground text-background p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="display text-[10px] font-bold uppercase tracking-[0.18em] opacity-50 mb-1">Handicap index</p>
                    <div className="flex items-end gap-2">
                      <p className="stat text-[48px] leading-none">{profile.hcp}</p>
                      <span className="display text-[11px] font-bold uppercase tracking-wider text-primary inline-flex items-center gap-0.5 pb-2">
                        <TrendingDown className="h-3 w-3" strokeWidth={3}/>{profile.handicap}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-50 mt-1.5 font-medium">
                      {rounds.length>0?"Updated after "+fmtDateShort(rounds[0]?.played_at)+" · "+(rounds[0]?.course_name||""):"No rounds yet — start playing!"}
                    </p>
                  </div>
                  <button onClick={()=>{setSocialView("rounds");setTab("social");}}
                    className="display text-[10px] font-bold uppercase tracking-wider text-primary inline-flex items-center gap-0.5 mt-1">
                    History <ChevronRight className="h-3 w-3" strokeWidth={3}/>
                  </button>
                </div>
              </div>
            </section>

            {/* Stat grid — derived from saved scorecard data */}
            {(()=>{
              // Compute stats from rounds that have scorecard+fairway+GIR+putt data
              const roundsWithData=rounds.filter(r=>r.scorecard&&Array.isArray(r.scorecard));
              const n=Math.min(roundsWithData.length,10);
              const avgScoreVal=n>0?Math.round(roundsWithData.slice(0,n).reduce((a,r)=>a+(r.total_score||0),0)/n):null;
              const bestScoreVal=rounds.length>0?Math.min(...rounds.map(r=>r.total_score||999)):null;

              // Fairways hit % from stored fairways arrays
              let fwyHit=0,fwyTotal=0;
              roundsWithData.slice(0,n).forEach(r=>{
                if(r.fairways&&Array.isArray(r.fairways)){
                  r.fairways.forEach(f=>{if(f!==null){fwyTotal++;if(f===true)fwyHit++;}});
                }
              });
              const fwyPct=fwyTotal>0?Math.round(fwyHit/fwyTotal*100):null;

              // GIR % from stored gir arrays
              let girHit=0,girTotal=0;
              roundsWithData.slice(0,n).forEach(r=>{
                if(r.gir&&Array.isArray(r.gir)){
                  r.gir.forEach(g=>{if(g!==null){girTotal++;if(g===true)girHit++;}});
                }
              });
              const girPct=girTotal>0?Math.round(girHit/girTotal*100):null;

              // Avg putts per round from stored putts arrays
              let puttTotal=0,puttRounds=0;
              roundsWithData.slice(0,n).forEach(r=>{
                if(r.putts&&Array.isArray(r.putts)){
                  const rPutts=r.putts.filter(p=>p!==null).reduce((a,b)=>a+b,0);
                  if(rPutts>0){puttTotal+=rPutts;puttRounds++;}
                }
              });
              const avgPutts=puttRounds>0?Math.round(puttTotal/puttRounds):null;

              const stats=[
                {label:"Avg Score",  value:avgScoreVal||"--",  sub:n>0?"last "+n+" rounds":"no rounds yet", color:"text-foreground"},
                {label:"Best Score", value:bestScoreVal||"--", sub:rounds.length>0?"all time":"--",          color:"text-primary"},
                {label:"Rounds",     value:rounds.length,      sub:"total played",                           color:"text-foreground"},
                {label:"Fairways",   value:fwyPct!==null?fwyPct+"%":"--", sub:fwyTotal>0?fwyTotal+" tracked":"no data yet", color:fwyPct!==null?(fwyPct>=60?"text-primary":"text-foreground"):"text-muted-foreground"},
                {label:"GIR",        value:girPct!==null?girPct+"%":"--", sub:girTotal>0?girTotal+" tracked":"no data yet", color:girPct!==null?(girPct>=50?"text-primary":"text-foreground"):"text-muted-foreground"},
                {label:"Putts/Rnd",  value:avgPutts||"--",     sub:puttRounds>0?puttRounds+" rounds":"no data yet", color:avgPutts!==null?(avgPutts<=32?"text-primary":avgPutts>=36?"text-destructive":"text-foreground"):"text-muted-foreground"},
              ];

              return(
                <section className="px-4 pt-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    {stats.map(s=>(
                      <div key={s.label} className="rounded-xl border border-border bg-card p-3.5">
                        <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{s.label}</p>
                        <p className={"stat text-[32px] leading-none mt-1.5 "+s.color}>{s.value}</p>
                        <p className="display text-[10px] font-bold text-muted-foreground mt-1.5">{s.sub}</p>
                      </div>
                    ))}
                  </div>
                  {rounds.length>0&&fwyTotal===0&&(
                    <p className="text-[11px] text-muted-foreground mt-2 text-center">
                      Track Fairways, GIR &amp; Putts in the Caddie scorecard to see detailed stats here
                    </p>
                  )}
                </section>
              );
            })()}

            {/* Recent rounds */}
            <section className="px-4 pt-4">
              <div className="flex items-center justify-between mb-2.5">
                <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Recent rounds</p>
                <button onClick={()=>{setSocialView("rounds");setTab("social");}}
                  className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
                  All <ChevronRight className="h-3 w-3" strokeWidth={3}/>
                </button>
              </div>
              {rounds.length===0?(
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-3xl mb-2">⛳</p>
                  <p className="display text-[14px] font-bold text-foreground">No rounds saved yet</p>
                  <p className="text-[12px] text-muted-foreground mt-1">Save a round from the Caddie tab to see stats here</p>
                </div>
              ):(
                <div className="space-y-2">
                  {rounds.slice(0,5).map((r,i)=>{
                    const diff=r.score_vs_par||0;
                    const fwyPct=r.fairways?Math.round(r.fairways.filter(f=>f===true).length/Math.max(1,r.fairways.filter(f=>f!==null).length)*100):null;
                    const girPct=r.gir?Math.round(r.gir.filter(g=>g===true).length/Math.max(1,r.gir.filter(g=>g!==null).length)*100):null;
                    const totalPutts=r.putts?r.putts.filter(p=>p!==null).reduce((a,b)=>a+b,0):null;
                    return(
                      <button key={r.id||i} onClick={()=>setShowCard(r)}
                        className="w-full rounded-xl border border-border bg-card p-3.5 hover:bg-secondary/30 transition text-left">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <MapPin className="h-4 w-4 text-muted-foreground" strokeWidth={2.5}/>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="display text-[14px] font-bold tracking-tight truncate">{r.course_name||"Unknown"}</p>
                            <p className="text-[11px] text-muted-foreground">{fmtDateShort(r.played_at)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn("stat text-[22px] leading-none",diff<=0?"text-primary":"text-foreground")}>{r.total_score}</p>
                            <p className="display text-[10px] font-bold text-muted-foreground">{diff===0?"E":diff>0?"+"+diff:""+diff}</p>
                          </div>
                        </div>
                        {(fwyPct!==null||girPct!==null||totalPutts!==null)&&(
                          <div className="flex gap-3 mt-2.5 pt-2.5 border-t border-border">
                            {fwyPct!==null&&<span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">FWY <span className="text-foreground">{fwyPct}%</span></span>}
                            {girPct!==null&&<span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GIR <span className="text-foreground">{girPct}%</span></span>}
                            {totalPutts!==null&&<span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Putts <span className="text-foreground">{totalPutts}</span></span>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {tab==="practice"&&(
          <div className="flex flex-col h-full min-h-0">
            {/* Practice header + sub-tab switcher */}
            <div className="px-4 pt-5 pb-3 shrink-0">
              <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Practice</p>
              <h1 className="display text-[24px] font-bold tracking-tight leading-tight mt-0.5 mb-4">Sharpen your game.</h1>
              <div className="flex gap-1 bg-secondary rounded-xl p-1">
                {[["swing","🎬 Swing Lab"],["range","🎯 Range Mode"]].map(([id,label])=>(
                  <button key={id} onClick={()=>setPracticeSubTab(id)}
                    className={cn("flex-1 py-2.5 rounded-[10px] display text-[12px] font-bold uppercase tracking-wider transition-all",
                      practiceSubTab===id?"nav-pill-active":"text-muted-foreground hover:text-foreground")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">

              {/* ══ SWING LAB ══════════════════════════════════════ */}
              {practiceSubTab==="swing"&&(
                <React.Fragment>
                  {/* Upload CTA */}
                  <button onClick={()=>swingInputRef.current?.click()}
                    className="w-full rounded-xl bg-foreground text-background p-4 flex items-center gap-3 hover:opacity-95 transition">
                    <div className="h-11 w-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Video className="h-5 w-5" strokeWidth={2.5}/>
                    </div>
                    <div className="text-left flex-1">
                      <p className="display text-[16px] font-bold tracking-tight">Record or upload a swing</p>
                      <p className="text-[12px] opacity-60 font-medium mt-0.5">Video or photo · AI breakdown · plane, tempo, face angle</p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 opacity-60" strokeWidth={2.5}/>
                  </button>
                  <input ref={swingInputRef} type="file" accept="video/*,image/*" className="hidden"
                    onChange={e=>{const f=e.target.files?.[0];if(f)setSwingFile(f);}}/>

                  {/* File selected — notes + analyze */}
                  {swingFile&&!swingAnalysis&&!swingLoading&&(
                    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Video className="h-4 w-4" strokeWidth={2.5}/>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="display text-[13px] font-bold truncate">{swingFile.name}</p>
                          <p className="text-[11px] text-muted-foreground">{swingFile.type.startsWith("video")?"Video":"Photo"} · {Math.round(swingFile.size/1024)}KB</p>
                        </div>
                        <button onClick={()=>setSwingFile(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-4 w-4" strokeWidth={2.5}/>
                        </button>
                      </div>
                      <textarea placeholder="Notes (optional) — club, what to improve, feel..." value={swingNotes}
                        onChange={e=>setSwingNotes(e.target.value)} rows={2}
                        className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-foreground/40 transition"/>
                      <button onClick={handleSwingAnalyze}
                        className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 display text-[13px] font-bold uppercase tracking-wider hover:opacity-90 transition">
                        Analyze with Obi
                      </button>
                    </div>
                  )}

                  {/* Analyzing */}
                  {swingLoading&&(
                    <div className="rounded-xl border border-border bg-card p-8 text-center">
                      <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"
                        style={{animation:"spin 0.8s linear infinite"}}/>
                      <p className="display text-[15px] font-bold">Analyzing your swing...</p>
                      <p className="text-[12px] text-muted-foreground mt-1">Obi is reviewing your footage</p>
                    </div>
                  )}

                  {/* Analysis result */}
                  {swingAnalysis&&(
                    <React.Fragment>
                      <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-6 w-6 rounded-md bg-foreground text-primary flex items-center justify-center">
                            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5}/>
                          </div>
                          <p className="display text-[11px] font-bold uppercase tracking-[0.18em]">Obi&apos;s analysis</p>
                          <span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-auto">{swingNotes||"Swing"}</span>
                        </div>
                        <p className="display text-[16px] font-bold tracking-tight leading-snug mb-2">{swingAnalysis.split(".")[0]}.</p>
                        <p className="text-[13px] text-foreground/80 leading-relaxed">{swingAnalysis.split(".").slice(1).join(".").trim()}</p>
                        <div className="flex gap-3 mt-3 pt-3 border-t border-primary/20">
                          <button onClick={()=>speakText(swingAnalysis)}
                            className={cn("display text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border transition",
                              speaking?"bg-primary/20 border-primary/40 text-primary":"border-border text-muted-foreground hover:text-foreground")}>
                            {speaking?"⏹ Stop":"🔊 Read aloud"}
                          </button>
                          <button onClick={()=>{setSwingAnalysis("");setSwingFile(null);setSwingNotes("");}}
                            className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition ml-auto">
                            New analysis →
                          </button>
                        </div>
                      </div>
                    </React.Fragment>
                  )}

                  {/* Past analyses */}
                  {swingHistory.length>0&&(
                    <div>
                      <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">Past analyses</p>
                      <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                        {swingHistory.slice(0,5).map((s,i)=>(
                          <div key={i} className="p-3.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="display text-[13px] font-bold">{s.club_used||"Swing"}</p>
                              <span className="display text-[10px] font-bold text-muted-foreground">{fmtDateShort(s.created_at)}</span>
                            </div>
                            <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">{s.analysis?.slice(0,140)}...</p>
                            <button onClick={()=>speakText(s.analysis||"")}
                              className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground mt-2">
                              🔊 Read
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              )}

              {/* ══ RANGE MODE ═════════════════════════════════════ */}
              {practiceSubTab==="range"&&(
                <React.Fragment>
                  {/* Club selector */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2.5">Select club</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.bag.map(b=>(
                        <button key={b.club} onClick={()=>setRangeClub(b.club)}
                          className={cn("display text-[11px] font-bold uppercase tracking-wider rounded-lg border px-2.5 py-1.5 transition",
                            rangeClub===b.club?"bg-primary text-primary-foreground border-primary":"border-border text-muted-foreground hover:border-foreground/40")}>
                          {b.club}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Record CTA */}
                  {!cameraActive&&!rangeLoading&&!rangeShotResult&&(
                    <button onClick={startCamera}
                      className="w-full rounded-xl bg-primary text-primary-foreground p-4 flex items-center gap-3 hover:opacity-95 transition">
                      <div className="h-11 w-11 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
                        <Play className="h-5 w-5" strokeWidth={2.5} fill="currentColor"/>
                      </div>
                      <div className="text-left flex-1">
                        <p className="display text-[16px] font-bold tracking-tight">Record a range shot</p>
                        <p className="text-[12px] opacity-70 font-medium mt-0.5">4 sec clip · shape, carry, coaching</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 opacity-70" strokeWidth={2.5}/>
                    </button>
                  )}

                  {/* Camera view */}
                  {cameraActive&&(
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="relative">
                        <video ref={videoRef} muted playsInline className="w-full aspect-video object-cover bg-black"/>
                        {recording&&(
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 rounded-lg px-2.5 py-1.5">
                            <span className="h-2 w-2 rounded-full bg-red-500" style={{animation:"pulse-dot 0.8s infinite"}}/>
                            <span className="display text-[10px] font-bold text-white uppercase tracking-wider">REC</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3.5 flex gap-2">
                        {!recording?(
                          <button onClick={startRecording}
                            className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 display text-[13px] font-bold uppercase tracking-wider">
                            Start recording
                          </button>
                        ):(
                          <button onClick={()=>mediaRecorderRef.current?.stop()}
                            className="flex-1 bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl py-3 display text-[13px] font-bold uppercase tracking-wider">
                            Stop
                          </button>
                        )}
                        <button onClick={stopCamera}
                          className="rounded-xl border border-border bg-secondary px-4 py-3 display text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Analyzing */}
                  {rangeLoading&&(
                    <div className="rounded-xl border border-border bg-card p-8 text-center">
                      <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"
                        style={{animation:"spin 0.8s linear infinite"}}/>
                      <p className="display text-[15px] font-bold">Analyzing shot...</p>
                    </div>
                  )}

                  {/* Shot result */}
                  {rangeShotResult&&!rangeShotResult.error&&(
                    <React.Fragment>
                      <ShotShapeDiagram result={rangeShotResult} club={rangeClub} dexterity={profile.dexterity}/>
                      <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          {[["Shape",rangeShotResult.shape||"straight"],["Carry",(rangeShotResult.carry||0)+"y"],["Direction",rangeShotResult.direction||"center"]].map(([l,v])=>(
                            <div key={l} className="text-center">
                              <p className="display text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">{l}</p>
                              <p className="stat text-[20px] leading-none text-primary">{v}</p>
                            </div>
                          ))}
                        </div>
                        {rangeShotResult.coaching&&(
                          <p className="text-[13px] text-foreground leading-relaxed pt-3 border-t border-primary/20">{rangeShotResult.coaching}</p>
                        )}
                        <div className="flex gap-3 mt-3">
                          <button onClick={()=>speakText(rangeShotResult.coaching||"")}
                            className="display text-[10px] font-bold uppercase tracking-wider border border-border rounded-lg px-2.5 py-1.5 text-muted-foreground hover:text-foreground transition">🔊 Read</button>
                          <button onClick={()=>setRangeShotResult(null)}
                            className="display text-[10px] font-bold uppercase tracking-wider ml-auto text-muted-foreground hover:text-foreground transition">Next shot →</button>
                        </div>
                      </div>
                    </React.Fragment>
                  )}

                  {/* Club stats */}
                  {clubStats[rangeClub]?.count>0&&(
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">{rangeClub} · session stats</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[["Shots",clubStats[rangeClub].count],["Typical",clubStats[rangeClub].typicalShape||"--"],["Streak","⭐".repeat(Math.min(3,clubStats[rangeClub].consistencyStars||3))]].map(([l,v])=>(
                          <div key={l} className="text-center">
                            <p className="display text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">{l}</p>
                            <p className="stat text-[22px] leading-none">{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended drills */}
                  <div>
                    <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">Recommended drills</p>
                    <div className="space-y-2">
                      {[{Icon:Activity,label:"100yd ladder",reps:"10 shots",desc:"Build distance control from 100y",color:"bg-primary/15 text-primary"},
                        {Icon:Target,label:"Center strike",reps:"20 shots",desc:"Focus on pure contact every time",color:"bg-amber-500/20 text-amber-600 dark:text-amber-400"},
                        {Icon:Activity,label:"Tempo drill",reps:"15 shots",desc:"Metronome rhythm for consistency",color:"bg-secondary text-secondary-foreground"}].map(d=>(
                        <button key={d.label}
                          className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 hover:border-foreground/30 hover:bg-secondary/30 transition text-left">
                          <div className={"h-10 w-10 rounded-lg flex items-center justify-center shrink-0 "+d.color}>
                            <d.Icon className="h-5 w-5" strokeWidth={2.5}/>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="display text-[14px] font-bold tracking-tight">{d.label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{d.desc} · {d.reps}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={2.5}/>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shot history */}
                  {rangeHistory.length>0&&(
                    <div>
                      <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">Shot history</p>
                      <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                        {(showAllShots?rangeHistory:rangeHistory.slice(0,5)).map((s,i)=>(
                          <div key={i} className="flex items-center gap-3 px-3.5 py-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 display text-[11px] font-bold">
                              {s.club?.split("-")[0]||"?"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="display text-[13px] font-bold">{s.club||"Shot"}</p>
                              <p className="text-[11px] text-muted-foreground">{s.shape||"straight"} · {s.carry||0}y</p>
                            </div>
                            <span className="text-[11px] text-muted-foreground">{fmtDateShort(s.created_at)}</span>
                          </div>
                        ))}
                      </div>
                      {rangeHistory.length>5&&(
                        <button onClick={()=>setShowAllShots(s=>!s)}
                          className="w-full text-center py-2.5 display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                          {showAllShots?"Show less":"View all "+rangeHistory.length+" shots"}
                        </button>
                      )}
                    </div>
                  )}
                </React.Fragment>
              )}

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
