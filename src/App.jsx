// OBI-GOLF-LOVABLE-v2
import React,{useState,useEffect,useRef,useCallback} from "react";
import {supabase} from "./supabase.js";
import PracticeTab from './PracticeTab.jsx';
import {DARK_THEME,LIGHT_THEME,DEFAULT_BAG,Ball,ScoreBadge,Avatar,
  fmtDate,fmtDateShort,windDir,wxIcon,playingYards,firstName,randJab,
  JABS,QUICK_PROMPTS,analyzeSwing,analyzeSwingVideo,
  ErrorBoundary,ShotShapeDiagram,OnboardingFlow} from "./AppPart1.jsx";
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Capacitor plugins -- loaded dynamically so web build still works
let CapGeo=null, CapHaptics=null, CapSpeech=null, CapKeyboard=null, CapStatusBar=null, CapSplash=null;
(async()=>{
  try{
    const isNative=window.Capacitor?.isNativePlatform?.();
    if(isNative){
      ({Geolocation:CapGeo}=await import('@capacitor/geolocation'));
      ({Haptics:CapHaptics}=await import('@capacitor/haptics'));
      // Speech recognition: use Web Speech API fallback (add @capacitor-community/speech-recognition locally for native)
      ({Keyboard:CapKeyboard}=await import('@capacitor/keyboard'));
      ({StatusBar:CapStatusBar}=await import('@capacitor/status-bar'));
      ({SplashScreen:CapSplash}=await import('@capacitor/splash-screen'));
      // Hide splash once app is ready
      setTimeout(()=>CapSplash?.hide({fadeOutDuration:500}),500);
      // Status bar style
      CapStatusBar?.setStyle({style:'DARK'});
      CapStatusBar?.setBackgroundColor({color:'#0d0d12'});
    }
  }catch(e){console.log('Capacitor plugins not available (web mode)');}}
)();
import { Home, MessageCircle, Target, Users, User, Sun, Moon, Settings, Cloud, ChevronRight, ChevronDown, MapPin, Zap, ArrowUp, Video, Sparkles, Activity, Play, LogOut, Briefcase, BarChart3, Bell, X, TrendingDown, TrendingUp, Trophy } from "lucide-react";
function cn(...c){return c.filter(Boolean).join(" ");}
const NAV=[{id:"home",label:"Home",Icon:Home},{id:"practice",label:"Practice",Icon:Target},{id:"caddie",label:"Caddie",Icon:MessageCircle},{id:"social",label:"Social",Icon:Users}];
function ObiLogo({size=32}){
  return(
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Flag pole */}
      <line x1="13" y1="10" x2="13" y2="31" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Flag - brand accent */}
      <path d="M13 10 L26 14.5 L13 19 Z" fill="#CFFF04"/>
      {/* Flag highlight */}
      <path d="M13 10 L26 14.5 L19 16 Z" fill="white" fillOpacity="0.25"/>
      {/* Ground */}
      <ellipse cx="16" cy="31" rx="5" ry="1.5" fill="currentColor" fillOpacity="0.12"/>
      <ellipse cx="16" cy="31" rx="3" ry="1" fill="currentColor" fillOpacity="0.25"/>
    </svg>
  );
}


// -- Accurate hole data for famous courses --------------------------
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
  "serrano country club":{name:"Serrano Country Club",
    holes:[
      {par:4,yards:406,si:13},{par:4,yards:416,si:5},{par:4,yards:441,si:1},
      {par:3,yards:165,si:11},{par:4,yards:427,si:9},{par:5,yards:577,si:7},
      {par:3,yards:165,si:15},{par:5,yards:510,si:17},{par:4,yards:409,si:3},
      {par:4,yards:369,si:12},{par:3,yards:183,si:14},{par:4,yards:408,si:4},
      {par:5,yards:505,si:10},{par:5,yards:537,si:16},{par:3,yards:215,si:6},
      {par:5,yards:597,si:2},{par:3,yards:175,si:18},{par:4,yards:455,si:8}
    ]},
  "serrano":{name:"Serrano Country Club",
    holes:[
      {par:4,yards:406,si:13},{par:4,yards:416,si:5},{par:4,yards:441,si:1},
      {par:3,yards:165,si:11},{par:4,yards:427,si:9},{par:5,yards:577,si:7},
      {par:3,yards:165,si:15},{par:5,yards:510,si:17},{par:4,yards:409,si:3},
      {par:4,yards:369,si:12},{par:3,yards:183,si:14},{par:4,yards:408,si:4},
      {par:5,yards:505,si:10},{par:5,yards:537,si:16},{par:3,yards:215,si:6},
      {par:5,yards:597,si:2},{par:3,yards:175,si:18},{par:4,yards:455,si:8}
    ]},

  // Olympic Club - Lake Course (Par 71, 6626y Blue tees - verified 18Birdies)
  "olympic club lake":{name:"Olympic Club - Lake Course",
    holes:[
      {par:5,yards:518,si:13},{par:4,yards:388,si:5},{par:3,yards:211,si:11},
      {par:4,yards:396,si:3},{par:4,yards:434,si:1},{par:4,yards:442,si:7},
      {par:4,yards:307,si:17},{par:3,yards:177,si:15},{par:4,yards:424,si:9},
      {par:4,yards:391,si:10},{par:4,yards:420,si:4},{par:4,yards:406,si:8},
      {par:3,yards:175,si:16},{par:4,yards:412,si:6},{par:3,yards:139,si:18},
      {par:5,yards:576,si:2},{par:5,yards:476,si:14},{par:4,yards:334,si:12}
    ]},
  "olympic lake":{name:"Olympic Club - Lake Course",
    holes:[
      {par:5,yards:518,si:13},{par:4,yards:388,si:5},{par:3,yards:211,si:11},
      {par:4,yards:396,si:3},{par:4,yards:434,si:1},{par:4,yards:442,si:7},
      {par:4,yards:307,si:17},{par:3,yards:177,si:15},{par:4,yards:424,si:9},
      {par:4,yards:391,si:10},{par:4,yards:420,si:4},{par:4,yards:406,si:8},
      {par:3,yards:175,si:16},{par:4,yards:412,si:6},{par:3,yards:139,si:18},
      {par:5,yards:576,si:2},{par:5,yards:476,si:14},{par:4,yards:334,si:12}
    ]},

  // Olympic Club - Ocean Course (Par 71, 6496y Blue tees - verified)
  "olympic club ocean":{name:"Olympic Club - Ocean Course",
    holes:[
      {par:5,yards:487,si:7},{par:4,yards:390,si:3},{par:4,yards:372,si:11},
      {par:3,yards:195,si:15},{par:4,yards:435,si:1},{par:4,yards:415,si:5},
      {par:4,yards:375,si:9},{par:3,yards:165,si:17},{par:5,yards:515,si:13},
      {par:4,yards:360,si:10},{par:4,yards:405,si:4},{par:4,yards:395,si:8},
      {par:3,yards:185,si:14},{par:4,yards:430,si:2},{par:4,yards:395,si:16},
      {par:3,yards:175,si:18},{par:5,yards:490,si:6},{par:4,yards:408,si:12}
    ]},
  "olympic ocean":{name:"Olympic Club - Ocean Course",
    holes:[
      {par:5,yards:487,si:7},{par:4,yards:390,si:3},{par:4,yards:372,si:11},
      {par:3,yards:195,si:15},{par:4,yards:435,si:1},{par:4,yards:415,si:5},
      {par:4,yards:375,si:9},{par:3,yards:165,si:17},{par:5,yards:515,si:13},
      {par:4,yards:360,si:10},{par:4,yards:405,si:4},{par:4,yards:395,si:8},
      {par:3,yards:185,si:14},{par:4,yards:430,si:2},{par:4,yards:395,si:16},
      {par:3,yards:175,si:18},{par:5,yards:490,si:6},{par:4,yards:408,si:12}
    ]},

  // Olympic Club - Cliffs Course (9-hole Par 27, 1432y - verified GolfLink)
  "olympic club cliffs":{name:"Olympic Club - Cliffs Course",
    holes:[
      {par:3,yards:155,si:1},{par:3,yards:170,si:5},{par:3,yards:145,si:9},
      {par:3,yards:160,si:3},{par:3,yards:175,si:7},{par:3,yards:150,si:2},
      {par:3,yards:165,si:6},{par:3,yards:140,si:8},{par:3,yards:172,si:4}
    ]},
  "olympic cliffs":{name:"Olympic Club - Cliffs Course",
    holes:[
      {par:3,yards:155,si:1},{par:3,yards:170,si:5},{par:3,yards:145,si:9},
      {par:3,yards:160,si:3},{par:3,yards:175,si:7},{par:3,yards:150,si:2},
      {par:3,yards:165,si:6},{par:3,yards:140,si:8},{par:3,yards:172,si:4}
    ]},

  // Empire Ranch Golf Club, Folsom CA (Par 71, 6668y Blue tees - verified 18Birdies)
  "empire ranch":{name:"Empire Ranch Golf Club",
    holes:[
      {par:4,yards:384,si:7},{par:3,yards:176,si:9},{par:5,yards:504,si:17},
      {par:4,yards:404,si:11},{par:4,yards:333,si:15},{par:4,yards:402,si:1},
      {par:5,yards:582,si:3},{par:3,yards:171,si:13},{par:4,yards:386,si:5},
      {par:4,yards:357,si:8},{par:5,yards:553,si:10},{par:3,yards:163,si:18},
      {par:4,yards:469,si:4},{par:4,yards:396,si:12},{par:5,yards:547,si:14},
      {par:3,yards:186,si:16},{par:4,yards:444,si:6},{par:3,yards:211,si:2}
    ]},
  "empire ranch golf":{name:"Empire Ranch Golf Club",
    holes:[
      {par:4,yards:384,si:7},{par:3,yards:176,si:9},{par:5,yards:504,si:17},
      {par:4,yards:404,si:11},{par:4,yards:333,si:15},{par:4,yards:402,si:1},
      {par:5,yards:582,si:3},{par:3,yards:171,si:13},{par:4,yards:386,si:5},
      {par:4,yards:357,si:8},{par:5,yards:553,si:10},{par:3,yards:163,si:18},
      {par:4,yards:469,si:4},{par:4,yards:396,si:12},{par:5,yards:547,si:14},
      {par:3,yards:186,si:16},{par:4,yards:444,si:6},{par:3,yards:211,si:2}
    ]},

  // TPC Harding Park, San Francisco (Par 72, 7169y Championship - verified 18Birdies)
  "harding park":{name:"TPC Harding Park",
    holes:[
      {par:4,yards:395,si:13},{par:4,yards:449,si:3},{par:3,yards:183,si:9},
      {par:5,yards:606,si:1},{par:4,yards:429,si:15},{par:4,yards:473,si:5},
      {par:4,yards:344,si:11},{par:3,yards:230,si:7},{par:5,yards:525,si:17},
      {par:5,yards:562,si:4},{par:3,yards:200,si:12},{par:5,yards:494,si:16},
      {par:4,yards:428,si:14},{par:4,yards:467,si:6},{par:4,yards:405,si:10},
      {par:4,yards:336,si:8},{par:3,yards:175,si:18},{par:4,yards:468,si:2}
    ]},
  "tpc harding":{name:"TPC Harding Park",
    holes:[
      {par:4,yards:395,si:13},{par:4,yards:449,si:3},{par:3,yards:183,si:9},
      {par:5,yards:606,si:1},{par:4,yards:429,si:15},{par:4,yards:473,si:5},
      {par:4,yards:344,si:11},{par:3,yards:230,si:7},{par:5,yards:525,si:17},
      {par:5,yards:562,si:4},{par:3,yards:200,si:12},{par:5,yards:494,si:16},
      {par:4,yards:428,si:14},{par:4,yards:467,si:6},{par:4,yards:405,si:10},
      {par:4,yards:336,si:8},{par:3,yards:175,si:18},{par:4,yards:468,si:2}
    ]},

  // Poplar Creek Golf Course, San Mateo CA (Par 70, 6014y Black tees - verified 18Birdies)
  "poplar creek":{name:"Poplar Creek Golf Course",
    holes:[
      {par:5,yards:519,si:11},{par:4,yards:421,si:1},{par:3,yards:188,si:3},
      {par:4,yards:403,si:5},{par:3,yards:172,si:9},{par:4,yards:286,si:17},
      {par:3,yards:202,si:7},{par:4,yards:292,si:13},{par:5,yards:471,si:15},
      {par:4,yards:455,si:2},{par:4,yards:321,si:12},{par:3,yards:210,si:8},
      {par:4,yards:407,si:6},{par:5,yards:537,si:10},{par:3,yards:158,si:14},
      {par:5,yards:475,si:16},{par:3,yards:136,si:18},{par:4,yards:361,si:4}
    ]},
  "erin hills":{name:"Erin Hills Golf Course",
    holes:[{par:4,yards:449,si:5},{par:5,yards:624,si:3},{par:4,yards:438,si:9},{par:4,yards:490,si:1},{par:3,yards:243,si:7},{par:4,yards:488,si:11},{par:5,yards:586,si:15},{par:3,yards:218,si:17},{par:4,yards:509,si:13},{par:4,yards:472,si:2},{par:4,yards:396,si:14},{par:4,yards:456,si:8},{par:3,yards:171,si:18},{par:4,yards:475,si:6},{par:4,yards:428,si:10},{par:5,yards:640,si:4},{par:3,yards:237,si:16},{par:4,yards:427,si:12}]},
};

function matchCourse(input){
  if(!input)return null;
  const k=input.toLowerCase().trim().replace(/[^a-z0-9 ]/g,"");
  for(const key of Object.keys(COURSE_DB)){
    if(k.includes(key)||key.includes(k))return COURSE_DB[key];
  }
  // Word-based partial match (2+ chars)
  for(const key of Object.keys(COURSE_DB)){
    const words=key.split(" ").filter(w=>w.length>2);
    const matches=words.filter(w=>k.includes(w));
    if(matches.length>=2||(matches.length===1&&words.length===1))return COURSE_DB[key];
  }
  // Single distinctive word match (4+ chars)
  for(const key of Object.keys(COURSE_DB)){
    const words=key.split(" ");
    if(words.some(w=>w.length>4&&k.includes(w)))return COURSE_DB[key];
  }
  return null;
}


// -- CSS injected into <head> ---------------------------------------
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
    el.classList.toggle("dark", isDark);
    el.classList.toggle("light", !isDark);
    document.body.style.backgroundColor = isDark ? "#0d0d12" : "#ffffff";
    try{localStorage.setItem("obi_dark",String(isDark));}catch{}
  },[isDark]);

  // -- Shared style tokens ------------------------------------------
  const T={
    bg:"var(--bg)", fg:"var(--fg)", card:"var(--card)", border:"var(--card-border)",
    surface:"var(--surface)", muted:"var(--muted)", mutedFg:"var(--muted-fg)",
    primary:"var(--primary)", primaryDim:"var(--primary-dim)",
    accent:"var(--accent)", red:"var(--destructive)",
  };

  // -- Reusable style helpers ---------------------------------------
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

  // -- Auth state ---------------------------------------------------
  const [user,setUser]=useState(null);
  const [userProfile,setUserProfile]=useState(null);
  const [authScreen,setAuthScreen]=useState("login");
  const [authLoading,setAuthLoading]=useState(true);
  const [authEmail,setAuthEmail]=useState("");
  const [authPass,setAuthPass]=useState("");
  const [authName,setAuthName]=useState("");
  const [authError,setAuthError]=useState("");

  // -- Navigation ---------------------------------------------------
  const [tab,setTab]=useState("home");
  const changeTab=(newTab)=>{
    if(window.speechSynthesis)window.speechSynthesis.cancel();
    setSpeaking(false);
    setTab(newTab);
  };
  const [subView,setSubView]=useState("chat");
  const [socialView,setSocialView]=useState("feed");
  const [profileSection,setProfileSection]=useState(null);

  // -- Profile & onboarding -----------------------------------------
  const [avatarUrl,setAvatarUrl]=useState(null);
  const [uploadingAvatar,setUploadingAvatar]=useState(false);
  const [showAvatarZoom,setShowAvatarZoom]=useState(null);
  const avatarInputRef=useRef(null);
  const [profile,setProfile]=useState({handicap:"mid",hcp:13,persona:"pro",missTend:"straight",bag:DEFAULT_BAG,dexterity:"right",homeCourse:"",practiceGoal:""});
  const [onboardStep,setOnboardStep]=useState(0);
  const [editingBag,setEditingBag]=useState(false);

  // -- Round / caddie -----------------------------------------------
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

  // -- Weather ------------------------------------------------------
  const [weather,setWeather]=useState(null);

  // -- Practice -----------------------------------------------------
  const [practiceSubTab,setPracticeSubTab]=useState("swing");
  const [swingFile,setSwingFile]=useState(null);
  const [swingNotes,setSwingNotes]=useState("");
  const [swingAnalysis,setSwingAnalysis]=useState("");
  const [swingThumb,setSwingThumb]=useState(null);      // thumbnail of current swing
  const [expandedSwing,setExpandedSwing]=useState(null); // id of expanded history item
  const [analysisExpanded,setAnalysisExpanded]=useState(true);
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

  // -- Social -------------------------------------------------------
  const [rounds,setRounds]=useState([]);
  const [friends,setFriends]=useState([]);
  const [friendReqs,setFriendReqs]=useState([]);
  const [friendSearch,setFriendSearch]=useState("");
  const [friendResults,setFriendResults]=useState([]);
  const [feed,setFeed]=useState([]);
  const [showAllFeed,setShowAllFeed]=useState(false);
  const [jabPost,setJabPost]=useState(null);
  const [showCard,setShowCard]=useState(null);

  // -- Refs ---------------------------------------------------------
  const chatEndRef=useRef(null);
  const swingInputRef=useRef(null);

  // -- Auth effect --------------------------------------------------
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user||null);
      setAuthLoading(false);
      if(session?.user)loadProfile(session.user);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      setUser(session?.user||null);
      if(session?.user){
        // Don't reset authScreen if user just completed onboarding
        setUser(session.user);
        loadProfile(session.user);
      } else {
        setAuthScreen("login");
      }
    });
    return()=>subscription.unsubscribe();
  },[]);

  // -- iOS audio unlock -- must happen on first user gesture ----------
  useEffect(()=>{
    const unlock=()=>{
      if(window._audioUnlocked)return;
      window._audioUnlocked=true;
      // Create and immediately stop a silent audio context to unlock iOS
      try{
        const ctx=new(window.AudioContext||window.webkitAudioContext)();
        const buf=ctx.createBuffer(1,1,22050);
        const src2=ctx.createBufferSource();
        src2.buffer=buf;src2.connect(ctx.destination);
        src2.start(0);ctx.resume();
      }catch{}
      document.removeEventListener('touchstart',unlock);
      document.removeEventListener('touchend',unlock);
    };
    document.addEventListener('touchstart',unlock,{passive:true});
    document.addEventListener('touchend',unlock,{passive:true});
    return()=>{
      document.removeEventListener('touchstart',unlock);
      document.removeEventListener('touchend',unlock);
    };
  },[]);

  // -- Keyboard height adjustment for iOS ----------------------------
  useEffect(()=>{
    if(!window.Capacitor?.isNativePlatform?.())return;
    const onShow=e=>{document.documentElement.style.setProperty('--kb-height',(e.keyboardHeight||300)+'px');};
    const onHide=()=>{document.documentElement.style.setProperty('--kb-height','0px');};
    window.addEventListener('keyboardWillShow',onShow);
    window.addEventListener('keyboardWillHide',onHide);
    return()=>{window.removeEventListener('keyboardWillShow',onShow);window.removeEventListener('keyboardWillHide',onHide);};
  },[]);

  const loadProfile=async(u)=>{
    const {data}=await supabase.from("profiles").select("*").eq("id",u.id).single();
    if(data){
      setUserProfile(data);
      setAvatarUrl(data.avatar_url||null);
      if(data.onboarded||(data.full_name&&data.handicap_category)){
        setAuthScreen(s=>s==="onboard"?"app":s==="app"?"app":"app");
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

  // -- Auth handlers ------------------------------------------------
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

  // -- Weather ------------------------------------------------------
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

  // -- Caddie chat --------------------------------------------------
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

  // -- GPS ----------------------------------------------------------
  const [gpsPos,setGpsPos]=useState(null);
  const [gpsWatcher,setGpsWatcher]=useState(null);

  const startGPS=useCallback(async()=>{
    // Use native Capacitor GPS if available (more accurate, works in background)
    if(window.Capacitor?.isNativePlatform?.()&&CapGeo){
      try{
        await CapGeo.requestPermissions();
        const id=await CapGeo.watchPosition(
          {enableHighAccuracy:true,maximumAge:2000,timeout:10000},
          pos=>{
            if(pos)setGpsPos({lat:pos.coords.latitude,lng:pos.coords.longitude,acc:Math.round(pos.coords.accuracy)});
          }
        );
        setGpsWatcher(id);
      }catch(e){console.warn("Native GPS error",e);}
    }else{
      // Web fallback
      if(!navigator.geolocation)return;
      const id=navigator.geolocation.watchPosition(
        p=>setGpsPos({lat:p.coords.latitude,lng:p.coords.longitude,acc:Math.round(p.coords.accuracy)}),
        err=>console.warn("GPS",err),
        {enableHighAccuracy:true,maximumAge:2000,timeout:10000}
      );
      setGpsWatcher(id);
    }
  },[]);

  const stopGPS=useCallback(async()=>{
    if(gpsWatcher!=null){
      if(window.Capacitor?.isNativePlatform?.()&&CapGeo){
        await CapGeo.clearWatch({id:gpsWatcher});
      }else{
        navigator.geolocation.clearWatch(gpsWatcher);
      }
    }
    setGpsWatcher(null);setGpsPos(null);
  },[gpsWatcher]);

  const haversineYards=(lat1,lng1,lat2,lng2)=>{
    const R=6371000,toRad=x=>x*Math.PI/180;
    const dLat=toRad(lat2-lat1),dLng=toRad(lng2-lng1);
    const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return Math.round(2*R*Math.asin(Math.sqrt(a))*1.09361);
  };

  // -- Hole map ------------------------------------------------------
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

    // -- STEP 0: Check local DB for accurate par/yardage -------------
    const dbCourse=matchCourse(courseName);
    const dbHole=dbCourse?.holes?.[holeNum-1];
    if(dbHole){
      setYardage(String(dbHole.yards));
      setHolePars(prev=>{const n=[...prev];n[holeNum-1]=dbHole.par;return n;});
    }

    // -- STEP 1: Try OpenStreetMap Overpass API for real course data --
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

    // -- STEP 2: Always get authoritative data from Gemini ------------
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
      const raw=d?.content?.[0]?.text||""; const t=raw.split("```json").join("").split("```").join("").trim();
      const s=t.indexOf("{"),e=t.lastIndexOf("}");
      if(s>=0&&e>s){
        const gd=JSON.parse(t.slice(s,e+1));
        // DB data is more reliable than Gemini for par/yardage
        const finalPar=dbHole?.par||gd.par||4;
        const finalYards=dbHole?.yards||gd.yards||400;
        const finalSI=dbHole?.si||gd.strokeIndex||holeNum;
        // Validate Gemini GPS coords -- null out if wrong
        let validatedGd={...gd,par:finalPar,yards:finalYards,strokeIndex:finalSI,osmFeatures:osmData};
        if(validatedGd.green_lat&&validatedGd.tee_lat){
          const R=6371000,toRad=x=>x*Math.PI/180;
          const dLat1=toRad(validatedGd.green_lat-validatedGd.tee_lat);
          const dLng1=toRad(validatedGd.green_lng-validatedGd.tee_lng);
          const a1=Math.sin(dLat1/2)**2+Math.cos(toRad(validatedGd.tee_lat))*Math.cos(toRad(validatedGd.green_lat))*Math.sin(dLng1/2)**2;
          const holeLen=2*R*Math.asin(Math.sqrt(a1))*1.09361;
          let bad=holeLen<30||holeLen>800;
          // Also check coords are near player GPS if available
          if(!bad&&gpsPos?.lat){
            const midLat=(validatedGd.tee_lat+validatedGd.green_lat)/2;
            const midLng=(validatedGd.tee_lng+validatedGd.green_lng)/2;
            const dLat2=toRad(midLat-gpsPos.lat),dLng2=toRad(midLng-gpsPos.lng);
            const a2=Math.sin(dLat2/2)**2+Math.cos(toRad(gpsPos.lat))*Math.cos(toRad(midLat))*Math.sin(dLng2/2)**2;
            const distToPlayer=2*R*Math.asin(Math.sqrt(a2))*1.09361;
            if(distToPlayer>5280){console.warn("Gemini "+Math.round(distToPlayer)+"y from player");bad=true;}
          }
          if(bad)validatedGd={...validatedGd,tee_lat:null,tee_lng:null,green_lat:null,green_lng:null};
        }
        setHoleMap(validatedGd);
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



  // -- Parse OSM data into renderable features -----------------------
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

  // -- MapLibre satellite hole map ---------------------------------
  const HoleMapCanvas=({map:holeData,gps,W=280,H=380})=>{
    const containerRef=useRef(null);
    const mapRef=useRef(null);
    const playerSourceRef=useRef(null);
    const lineSourceRef=useRef(null);
    const gpsRef=useRef(gps); // always latest GPS without triggering re-render
    useEffect(()=>{gpsRef.current=gps;},[gps]);

    // Helper: haversine yards
    const hYards=(lat1,lng1,lat2,lng2)=>{
      const R=6371000,r=x=>x*Math.PI/180;
      const dLat=r(lat2-lat1),dLng=r(lng2-lng1);
      const a=Math.sin(dLat/2)**2+Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(dLng/2)**2;
      return Math.round(2*R*Math.asin(Math.sqrt(a))*1.09361);
    };

    // Build GeoJSON from OSM features
    const buildGeoJSON=(features,type)=>({
      type:"FeatureCollection",
      features:(features||[]).filter(f=>f.type===type).map(f=>({
        type:"Feature",properties:{},
        geometry:{type:"Polygon",coordinates:[f.pts.map(p=>[
          holeData.osmFeatures.bounds.minLng+p.x*(holeData.osmFeatures.bounds.maxLng-holeData.osmFeatures.bounds.minLng),
          holeData.osmFeatures.bounds.minLat+p.y*(holeData.osmFeatures.bounds.maxLat-holeData.osmFeatures.bounds.minLat)
        ])]}
      }))
    });

    // Compute map center + bounds
    const getCenter=()=>{
      // OSM bounds are always reliable -- use them if available
      if(holeData?.osmFeatures?.bounds){
        const{minLat,maxLat,minLng,maxLng}=holeData.osmFeatures.bounds;
        return{center:[(minLng+maxLng)/2,(minLat+maxLat)/2],
               bbox:[[minLng-0.0003,minLat-0.0003],[maxLng+0.0003,maxLat+0.0003]],reliable:true};
      }
      // Validate AI coords vs player GPS -- reject if >2000y away
      if(holeData?.tee_lat&&holeData?.green_lat){
        const cLat=(holeData.tee_lat+holeData.green_lat)/2;
        const cLng=(holeData.tee_lng+holeData.green_lng)/2;
        // If we have GPS, check AI coords are in the right ballpark
        if(gps?.lat){
          const R=6371000,toRad=x=>x*Math.PI/180;
          const dLat=toRad(cLat-gps.lat),dLng=toRad(cLng-gps.lng);
          const a=Math.sin(dLat/2)**2+Math.cos(toRad(gps.lat))*Math.cos(toRad(cLat))*Math.sin(dLng/2)**2;
          const distYards=2*R*Math.asin(Math.sqrt(a))*1.09361;
          if(distYards>3000){
            // AI coords are wrong -- center on player GPS instead
            return{center:[gps.lng,gps.lat],bbox:null,reliable:false,gpsOnly:true};
          }
        }
        return{center:[cLng,cLat],bbox:null,reliable:true};
      }
      // Fallback to player GPS if nothing else
      if(gps?.lat)return{center:[gps.lng,gps.lat],bbox:null,reliable:false,gpsOnly:true};
      return{center:[0,0],bbox:null,reliable:false};
    };

    useEffect(()=>{
      if(!containerRef.current||!holeData)return;

      const{center,bbox,reliable,gpsOnly}=getCenter();

      // Don't render map if we have no valid center
      // If center is 0,0 but gps is available, use gps
      let finalCenter=center;
      if(center[0]===0&&center[1]===0){
        if(gpsRef.current?.lat){finalCenter=[gpsRef.current.lng,gpsRef.current.lat];}
        else return;
      }

      const m=new maplibregl.Map({
        container:containerRef.current,
        style:{
          version:8,
          glyphs:"https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
          sources:{
            satellite:{
              type:"raster",
              tiles:["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg"],
              tileSize:256,
            maxzoom:17,
            attribution:"  EOX IT Services GmbH"
            }
          },
          layers:[{id:"satellite",type:"raster",source:"satellite",paint:{"raster-brightness-min":0.05}}]
        },
        center:finalCenter,
        zoom: (gpsOnly||(center[0]===0&&gps?.lat)) ? 16.5 : 17,
        bearing:0,
        pitch:0,
        interactive:true,
        attributionControl:false,
      });

      mapRef.current=m;

      m.on("load",()=>{
        // Fit to bounds if we have them
        if(bbox){
          m.fitBounds(bbox,{padding:40,duration:0,maxZoom:18});
        }else if(gpsOnly&&gpsRef.current){
          // Center tightly on player GPS position
          m.setCenter([gpsRef.current.lng,gpsRef.current.lat]);
          m.setZoom(16.5);
        }

        const osm=holeData?.osmFeatures;

        if(osm?.features?.length>0){
          // -- REAL OSM POLYGONS -----------------------------------
          const types=[
            {type:"fairway", fillColor:"#4ade80", fillOpacity:0.3, lineColor:"#22c55e", lineWidth:2},
            {type:"green",   fillColor:"#16a34a", fillOpacity:0.75,lineColor:"#4ade80", lineWidth:2.5},
            {type:"tee",     fillColor:"#15803d", fillOpacity:0.8, lineColor:"#14532d", lineWidth:1.5},
            {type:"bunker",  fillColor:"#fde68a", fillOpacity:0.8, lineColor:"#b45309", lineWidth:1.5},
            {type:"water",   fillColor:"#3b82f6", fillOpacity:0.65,lineColor:"#1d4ed8", lineWidth:1.5},
          ];

          types.forEach(({type,fillColor,fillOpacity,lineColor,lineWidth})=>{
            const gj=buildGeoJSON(osm.features,type);
            if(!gj.features.length)return;
            m.addSource(type,{type:"geojson",data:gj});
            m.addLayer({id:type+"-fill",type:"fill",source:type,
              paint:{"fill-color":fillColor,"fill-opacity":fillOpacity}});
            m.addLayer({id:type+"-line",type:"line",source:type,
              paint:{"line-color":lineColor,"line-width":lineWidth,"line-opacity":0.9}});
          });

          // Distance markers along the fairway midline
          const fw=osm.features.filter(f=>f.type==="fairway")[0];
          if(fw&&fw.pts.length>2&&holeData.yards){
            const yards=holeData.yards;
            const markerFeats=[75,100,125,150,175,200].filter(y=>y<yards).map(y=>{
              const t=y/yards;
              const idx=Math.min(Math.floor(t*(fw.pts.length-1)),fw.pts.length-2);
              const frac=t*(fw.pts.length-1)-idx;
              const p1=fw.pts[idx],p2=fw.pts[Math.min(idx+1,fw.pts.length-1)];
              const px=p1.x+(p2.x-p1.x)*frac;
              const py=p1.y+(p2.y-p1.y)*frac;
              const lng=osm.bounds.minLng+px*(osm.bounds.maxLng-osm.bounds.minLng);
              const lat=osm.bounds.minLat+py*(osm.bounds.maxLat-osm.bounds.minLat);
              return{type:"Feature",properties:{label:y+"y"},
                geometry:{type:"Point",coordinates:[lng,lat]}};
            });

            if(markerFeats.length>0){
              m.addSource("dist-markers",{type:"geojson",data:{type:"FeatureCollection",features:markerFeats}});
              m.addLayer({id:"dist-dots",type:"circle",source:"dist-markers",
                paint:{"circle-radius":5,"circle-color":"rgba(255,255,255,0.85)",
                       "circle-stroke-color":"#374151","circle-stroke-width":1.5}});
              m.addLayer({id:"dist-labels",type:"symbol",source:"dist-markers",
                layout:{"text-field":["get","label"],"text-font":["Open Sans Bold"],
                        "text-size":10,"text-offset":[0,-1.2],"text-anchor":"bottom"},
                paint:{"text-color":"#ffffff","text-halo-color":"rgba(0,0,0,0.8)","text-halo-width":1.5}});
            }
          }
        }else{
          // -- SYNTHETIC FALLBACK (no OSM data) ---------------------
          const shape=holeData?.shape||"straight";
          const tee=holeData?.tee_lat?[holeData.tee_lng,holeData.tee_lat]:null;
          const green=holeData?.green_lat?[holeData.green_lng,holeData.green_lat]:null;

          if(tee&&green){
            // Draw approximate fairway line
            const mid=[
              tee[0]+(green[0]-tee[0])*(shape==="dogleg-left"?0.5:0.5),
              tee[1]+(green[1]-tee[1])*(shape==="dogleg-left"?0.5:0.5)
            ];
            const offset=0.00015;
            const dogOff=shape==="dogleg-left"?-offset*2:shape==="dogleg-right"?offset*2:0;

            const fwLine={type:"Feature",geometry:{type:"LineString",
              coordinates:[tee,[mid[0]+dogOff,mid[1]],green]}};

            m.addSource("fw-line",{type:"geojson",data:fwLine});
            m.addLayer({id:"fw-stroke",type:"line",source:"fw-line",
              paint:{"line-color":"#4ade80","line-width":22,"line-opacity":0.3,
                     "line-cap":"round","line-join":"round"}});
            m.addLayer({id:"fw-center",type:"line",source:"fw-line",
              paint:{"line-color":"#86efac","line-width":8,"line-opacity":0.5,
                     "line-cap":"round","line-join":"round"}});

            // Green circle
            const greenGJ={type:"FeatureCollection",features:[{type:"Feature",
              geometry:{type:"Point",coordinates:green},properties:{}}]};
            m.addSource("green-pt",{type:"geojson",data:greenGJ});
            m.addLayer({id:"green-circle",type:"circle",source:"green-pt",
              paint:{"circle-radius":20,"circle-color":"#16a34a","circle-opacity":0.8,
                     "circle-stroke-color":"#4ade80","circle-stroke-width":2.5}});

            // Tee marker
            const teeGJ={type:"FeatureCollection",features:[{type:"Feature",
              geometry:{type:"Point",coordinates:tee},properties:{}}]};
            m.addSource("tee-pt",{type:"geojson",data:teeGJ});
            m.addLayer({id:"tee-circle",type:"circle",source:"tee-pt",
              paint:{"circle-radius":8,"circle-color":"#1f2937","circle-opacity":0.9,
                     "circle-stroke-color":"#eeeef5","circle-stroke-width":2}});

            // Hazard labels
            (holeData.hazards||[]).slice(0,3).forEach((hz,i)=>{
              const t=0.3+i*0.2;
              const hPos=[
                tee[0]+(green[0]-tee[0])*t + (i%2===0?offset:-offset)*3,
                tee[1]+(green[1]-tee[1])*t
              ];
              const isWater=new RegExp("water|lake|pond|ocean|creek","i").test(hz);
              const hGJ={type:"FeatureCollection",features:[{type:"Feature",
                geometry:{type:"Point",coordinates:hPos},properties:{}}]};
              m.addSource("haz-"+i,{type:"geojson",data:hGJ});
              m.addLayer({id:"haz-c-"+i,type:"circle",source:"haz-"+i,
                paint:{"circle-radius":14,"circle-color":isWater?"rgba(59,130,246,0.6)":"rgba(253,230,138,0.7)",
                       "circle-stroke-color":isWater?"#2563eb":"#b45309","circle-stroke-width":1.5}});
            });

            // Distance markers
            const yards=holeData.yards||400;
            const distFeats=[100,150,200].filter(y=>y<yards).map(y=>{
              const t=y/yards;
              const dogX=shape==="dogleg-left"?dogOff*(t<0.5?t*2:1):shape==="dogleg-right"?dogOff*(t<0.5?t*2:1):0;
              return{type:"Feature",properties:{label:y+"y"},
                geometry:{type:"Point",coordinates:[
                  tee[0]+(green[0]-tee[0])*t+dogX,
                  tee[1]+(green[1]-tee[1])*t
                ]}};
            });
            if(distFeats.length>0){
              m.addSource("dist-m",{type:"geojson",data:{type:"FeatureCollection",features:distFeats}});
              m.addLayer({id:"dist-d",type:"circle",source:"dist-m",
                paint:{"circle-radius":5,"circle-color":"rgba(255,255,255,0.85)",
                       "circle-stroke-color":"#374151","circle-stroke-width":1.5}});
            }
          }
        }

        // -- Flag marker ---------------------------------------------
        const{gpsOnly:go}=getCenter();const pinCoord=(go||!holeData?.green_lat)?null:[holeData.green_lng,holeData.green_lat];
        if(pinCoord){
          const flagEl=document.createElement("div");
          flagEl.innerHTML=" ";
          flagEl.style.cssText="font-size:20px;cursor:default;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6))";
          new maplibregl.Marker({element:flagEl,anchor:"bottom"}).setLngLat(pinCoord).addTo(m);
        }

        // -- Player GPS dot + distance line --------------------------
        const playerGJ={type:"Feature",geometry:{type:"Point",coordinates:[0,0]},properties:{}};
        const lineGJ={type:"Feature",geometry:{type:"LineString",coordinates:[[0,0],[0,0]]},properties:{}};

        m.addSource("player",{type:"geojson",data:playerGJ});
        m.addSource("dist-line",{type:"geojson",data:lineGJ});

        // Dashed distance line
        m.addLayer({id:"dist-line",type:"line",source:"dist-line",
          paint:{"line-color":"#ffffff","line-width":2,"line-opacity":0.7,
                 "line-dasharray":[4,3]}});

        // Accuracy ring
        m.addLayer({id:"player-ring",type:"circle",source:"player",
          paint:{"circle-radius":18,"circle-color":"rgba(59,130,246,0.12)",
                 "circle-stroke-color":"rgba(59,130,246,0.35)","circle-stroke-width":2}});
        // Player dot
        m.addLayer({id:"player-dot",type:"circle",source:"player",
          paint:{"circle-radius":9,"circle-color":"#3b82f6",
                 "circle-stroke-color":"#ffffff","circle-stroke-width":2.5}});

        playerSourceRef.current=m.getSource("player");
        lineSourceRef.current=m.getSource("dist-line");

        // Set initial GPS position if available
        if(gps?.lat){
          playerSourceRef.current.setData({type:"Feature",
            geometry:{type:"Point",coordinates:[gps.lng,gps.lat]},properties:{}});
          if(pinCoord){
            lineSourceRef.current.setData({type:"Feature",
              geometry:{type:"LineString",coordinates:[[gps.lng,gps.lat],pinCoord]},properties:{}});
          }
        }
      });

      return()=>{
        m.remove();
        mapRef.current=null;
        playerSourceRef.current=null;
        lineSourceRef.current=null;
      };
    },[holeData?.osmFeatures,holeData?.tee_lat,holeData?.green_lat]);

    // When GPS first arrives, re-center if map is in gpsOnly mode
    useEffect(()=>{
      if(!mapRef.current||!gps?.lat)return;
      const{gpsOnly:go}=getCenter();
      if(go){
        // Only re-center if we're not already near the player
        const curr=mapRef.current.getCenter();
        const dist=Math.abs(curr.lat-gps.lat)+Math.abs(curr.lng-gps.lng);
        if(dist>0.0005)mapRef.current.easeTo({center:[gps.lng,gps.lat],zoom:18,duration:800});
      }
    },[gps?.lat,gps?.lng]);

    // Update GPS dot without re-rendering map
    useEffect(()=>{
      if(!playerSourceRef.current||!gps?.lat)return;
      const coord=[gps.lng,gps.lat];
      playerSourceRef.current.setData({type:"Feature",
        geometry:{type:"Point",coordinates:coord},properties:{}});
      // Re-center map on player when gpsOnly
      const{gpsOnly:go2}=getCenter();
      if(go2&&mapRef.current){
        mapRef.current.easeTo({center:coord,zoom:16.5,duration:800});
      }
      const pinCoord=(go2||!holeData?.green_lat)?null:[holeData.green_lng,holeData.green_lat];
      if(pinCoord&&lineSourceRef.current){
        lineSourceRef.current.setData({type:"Feature",
          geometry:{type:"LineString",coordinates:[coord,pinCoord]},properties:{}});
      }
    },[gps]);

    return(
      <div style={{position:"relative",width:"100%",height:H+"px"}}>
        <div ref={containerRef} style={{width:"100%",height:"100%"}} className="bg-emerald-950/20"/>
        {(()=>{const{gpsOnly:go3}=getCenter();return go3;})()&&(
          <div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",
            background:"rgba(0,0,0,0.75)",borderRadius:"8px",padding:"6px 12px",
            color:"#fff",fontSize:"11px",fontWeight:"700",whiteSpace:"nowrap",pointerEvents:"none"}}>
            ~{holeMap?.yards||"?"}y to pin -- tap to drop pin
          </div>
        )}
      </div>
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

  // -- Voice output --------------------------------------------------
  const speakText=(text)=>{
    if(!window.speechSynthesis||!text)return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    const clean=text.replace(new RegExp("[*_#]","g"),"").replace(new RegExp("\n","g")," ").trim();
    if(!clean)return;
    const doSpeak=()=>{
      const utt=new SpeechSynthesisUtterance(clean);
      utt.rate=0.9;utt.pitch=1;utt.volume=1;
      // Pick a good English voice -- getVoices() is populated by now
      const voices=window.speechSynthesis.getVoices();
      const pick=voices.find(v=>new RegExp("samantha|karen|daniel|alex|moira","i").test(v.name)&&v.lang.startsWith("en"))
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

  // -- Voice input (mic) ---------------------------------------------
  const startMic=async()=>{
    if(micActive){
      if(window.Capacitor?.isNativePlatform?.()&&CapSpeech){
        await CapSpeech.stop().catch(()=>{});
      }else{
        recognizerRef.current?.stop();
      }
      setMicActive(false);return;
    }
    // Native Capacitor speech recognition (more reliable on iOS)
    if(window.Capacitor?.isNativePlatform?.()&&CapSpeech){
      try{
        await CapSpeech.requestPermissions();
        const avail=await CapSpeech.available();
        if(!avail.available)return;
        setMicActive(true);
        CapSpeech.start({
          language:"en-US",maxResults:1,prompt:"Ask Obi anything...",
          partialResults:true,popup:false
        });
        CapSpeech.addListener('partialResults',data=>{
          if(data.matches?.[0])setInput(data.matches[0]);
        });
        CapSpeech.addListener('listeningState',state=>{
          if(state.status==="stopped"){
            setMicActive(false);
            if(input.trim())setTimeout(()=>sendMessage(input),100);
          }
        });
      }catch{setMicActive(false);}
    }else{
      // Web fallback
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!SR)return;
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
    }
  };

  const speak=(text)=>{
    if(!window.speechSynthesis)return;
    if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return;}
    const utt=new SpeechSynthesisUtterance(text.replace(new RegExp("[*_#]","g"),""));
    utt.rate=0.93;utt.pitch=0.95;
    utt.onend=()=>setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speakText(utt);
  };

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  // -- Scorecard ----------------------------------------------------
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
      if(fwyTotal>0)msg+="   FWY "+fwyCount+"/"+fwyTotal;
      if(girTotal>0)msg+="   GIR "+girCount+"/"+girTotal;
      if(puttTotal>0)msg+="   "+puttTotal+" putts";
      alert(msg);
      // Reset scorecard for next round
      setScorecard(Array(18).fill(null));
      setFairways(Array(18).fill(null));
      setGir(Array(18).fill(null));
      setPutts(Array(18).fill(null));
    }
  };

  // -- Avatar upload ------------------------------------------------
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

  // -- Friend search ------------------------------------------------
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

  // -- Swing analysis -----------------------------------------------
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
          club_used:swingNotes||"unknown",thumbnail:swingThumb||null,created_at:new Date().toISOString(),
        }).select().single();
        if(data)setSwingHistory(h=>[{...data,thumbnail:swingThumb||null},...h]);
      }
    }catch(e){setSwingAnalysis("Analysis failed. Please try again.");}
    setSwingLoading(false);
  };

  useEffect(()=>{
    if(!user)return;
    supabase.from("swing_analyses").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10).then(({data})=>{if(data)setSwingHistory(data);});
    supabase.from("range_shots").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50).then(({data})=>{if(data){setRangeHistory(data);const stats={};data.forEach(s=>{if(!stats[s.club])stats[s.club]={count:0,shapes:{},totalCarry:0,shapeCount:0,typicalShape:"straight",consistencyStars:3};stats[s.club].count++;if(s.shape)stats[s.club].shapes[s.shape]=(stats[s.club].shapes[s.shape]||0)+1;});Object.keys(stats).forEach(club=>{const sh=stats[club].shapes;const top=Object.entries(sh).sort((a,b)=>b[1]-a[1])[0];if(top){stats[club].typicalShape=top[0];stats[club].shapeCount=top[1];}});setClubStats(stats);}});
  },[user]);

  // -- Range shot ---------------------------------------------------
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

  // -- Camera -------------------------------------------------------
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

  const renderSwingAnalysis=(text,thumb,noteLabel,isCollapsible,expandedKey,expandedState,setExpandedState)=>{
    if(!text)return null;
    const sentences=(text.match(new RegExp("[^.!?]+[.!?]+","g"))||[text]).map(s2=>s2.trim()).filter(Boolean);
    const g={summary:[],strengths:[],fixes:[],drills:[],other:[]};
    sentences.forEach(s2=>{
      if(new RegExp("overall|summary|assessment|your swing|shows|demonstrates","i").test(s2))g.summary.push(s2);
      else if(new RegExp("good|well done|strength|positive|excellent|nice|solid|great job","i").test(s2))g.strengths.push(s2);
      else if(new RegExp("drill|practice|try|work on|focus on|exercise|repeat","i").test(s2))g.drills.push(s2);
      else if(new RegExp("need|should|must|improve|fix|adjust|lack|issue|problem|fault|tend to|too much|too little","i").test(s2))g.fixes.push(s2);
      else g.other.push(s2);
    });
    if(!g.summary.length)g.summary=g.other.splice(0,2);
    const secs=[
      {label:"Overview",icon:"Golf",items:g.summary,color:"border-primary/30 bg-primary/5"},
      {label:"Strengths",items:g.strengths,color:"border-green-500/30 bg-green-500/5"},
      {label:"Fix These",items:g.fixes,color:"border-amber-500/30 bg-amber-500/5"},
      {label:"Drills",items:g.drills,color:"border-blue-500/30 bg-blue-500/5"},
      {label:"Notes",items:g.other,color:"border-border bg-secondary/20"},
    ].filter(s2=>s2.items.length>0);
    const icons={"Overview":"golf","Strengths":"check","Fix These":"wrench","Drills":"target","Notes":"note"};
    const emojis={"Overview":"Golf","Strengths":"OK","Fix These":"Fix","Drills":"Target","Notes":"Notes"};
    return(
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isCollapsible?(
          <button onClick={()=>setExpandedState(e=>!e)}
            className="w-full flex items-center gap-2 px-4 py-3 border-b border-border bg-foreground text-background hover:opacity-90 transition">
            {thumb&&<img src={thumb} alt="" className="h-8 w-12 object-cover rounded shrink-0"/>}
            <p className="display text-[13px] font-bold flex-1 text-left">Obi Analysis</p>
            <span className="display text-[10px] font-bold opacity-50 mr-1">{noteLabel||"Swing"}</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform shrink-0",expandedState&&"rotate-180")} strokeWidth={2.5}/>
          </button>
        ):(
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-foreground text-background">
            <p className="display text-[13px] font-bold flex-1">Obi Analysis</p>
            <span className="display text-[10px] font-bold opacity-50">{noteLabel||"Swing"}</span>
          </div>
        )}
        {(!isCollapsible||expandedState)&&(
          <React.Fragment>
            <div className="p-3 space-y-2">
              {secs.map(sec=>(
                <div key={sec.label} className={"rounded-xl border p-3 "+sec.color}>
                  <p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{sec.label}</p>
                  <ul className="space-y-1.5">
                    {sec.items.map((item,idx)=>(
                      <li key={idx} className="flex gap-2 text-[13px] text-foreground leading-snug">
                        <span className="text-muted-foreground shrink-0 mt-0.5">*</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-3 pb-3">
              <button onClick={()=>speakText(text)}
                className={cn("display text-[10px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 border transition",speaking?"bg-primary/20 border-primary/40 text-primary":"border-border text-muted-foreground hover:text-foreground")}>
                {speaking?"Stop":"Read"}
              </button>
              {isCollapsible&&(
                <button onClick={()=>{setSwingAnalysis("");setSwingFile(null);setSwingNotes("");setSwingThumb(null);}}
                  className="display text-[10px] font-bold uppercase tracking-wider border border-border rounded-lg px-2.5 py-1.5 text-muted-foreground hover:text-foreground ml-auto">
                  + New swing
                </button>
              )}
            </div>
          </React.Fragment>
        )}
      </div>
    );
  };

  // -- Loading screen -----------------------------------------------

  // -- LOADING ---------------------------------------------------

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
              try {
                await saveProfile(authName);
              } catch(e) { console.warn("saveProfile error",e); }
              // Always go to app -- even if save had an issue
              setAuthScreen("app");
              setTab("home");
            }}/>
        )}
      </div>
    </div>
  );
  return(
    <div className="flex flex-col bg-background text-foreground overflow-hidden" style={{height:"100dvh",maxWidth:"480px",margin:"0 auto",position:"relative"}}>
      {showCard&&(
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={()=>setShowCard(null)}>
          <div className="bg-card border border-border rounded-2xl w-full overflow-y-auto" style={{maxWidth:"460px",maxHeight:"88vh"}} onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="display text-[15px] font-bold text-foreground">{showCard.course_name||"Unknown Course"}</p>
                <p className="text-[11px] text-muted-foreground">{fmtDate(showCard.played_at)}</p>
              </div>
              <button onClick={()=>setShowCard(null)} className="text-muted-foreground hover:text-foreground ml-3 shrink-0"><X className="h-5 w-5"/></button>
            </div>
            {/* Score summary */}
            <div className="grid grid-cols-4 gap-px bg-border border-b border-border">
              {(()=>{
                const diff=showCard.score_vs_par||0;
                const diffStr=diff===0?"E":diff>0?"+"+diff:""+diff;
                const fwyHit=(showCard.fairways||[]).filter(f=>f===true).length;
                const fwyTot=(showCard.fairways||[]).filter(f=>f!==null).length;
                const girHit=(showCard.gir||[]).filter(g=>g===true).length;
                const girTot=(showCard.gir||[]).filter(g=>g!==null).length;
                const puttTot=(showCard.putts||[]).filter(p=>p!==null).reduce((a,b)=>a+b,0);
                return[
                  ["Score",showCard.total_score,"text-foreground"],
                  ["vs Par",diffStr,diff<=0?"text-primary":"text-destructive"],
                  ["FWY",fwyTot>0?fwyHit+"/"+fwyTot:"--","text-foreground"],
                  ["Putts",puttTot||"--","text-foreground"],
                ].map(([l,v,c])=>(
                  <div key={l} className="bg-card px-2 py-3 text-center">
                    <p className="display text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">{l}</p>
                    <p className={"stat text-[22px] leading-none "+c}>{v}</p>
                  </div>
                ));
              })()}
            </div>
            {/* Scorecard grid */}
            {(()=>{
              const sc=showCard.scorecard||[];
              const pars=showCard.hole_pars||Array(18).fill(4);
              const fw=showCard.fairways||Array(18).fill(null);
              const gr=showCard.gir||Array(18).fill(null);
              const pt=showCard.putts||Array(18).fill(null);
              const hasAny=sc.some(Boolean);
              if(!hasAny)return(
                <div className="p-6 text-center">
                  <p className="display text-[13px] font-bold text-muted-foreground">No hole-by-hole data saved</p>
                </div>
              );
              return(
                <div className="overflow-x-auto">
                  <table className="w-full text-center" style={{minWidth:"540px"}}>
                    <thead>
                      <tr className="bg-secondary/50 border-b border-border">
                        <td className="display text-[9px] font-bold uppercase text-muted-foreground px-2 py-1.5 text-left w-8">Hole</td>
                        {Array.from({length:18},(_,i)=>i+1).map(n=>(
                          <td key={n} className="display text-[9px] font-bold uppercase text-muted-foreground py-1.5 px-0.5">{n}</td>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="display text-[9px] font-bold uppercase text-muted-foreground px-2 py-2 text-left">Par</td>
                        {pars.map((p,i)=><td key={i} className="display text-[11px] text-muted-foreground py-2 px-0.5">{p}</td>)}
                      </tr>
                      <tr>
                        <td className="display text-[9px] font-bold uppercase text-muted-foreground px-2 py-2 text-left">Score</td>
                        {sc.map((s,i)=>(
                          <td key={i} className="py-2 px-0.5">
                            <span className={cn("display text-[12px] font-bold",
                              s===null?"text-muted-foreground/30":
                              s<pars[i]?"text-primary":s>pars[i]+1?"text-destructive":"text-foreground")}>
                              {s||" "}
                            </span>
                          </td>
                        ))}
                      </tr>
                      {fw.some(f=>f!==null)&&(
                        <tr>
                          <td className="display text-[9px] font-bold uppercase text-muted-foreground px-2 py-2 text-left">FWY</td>
                          {fw.map((f,i)=>(
                            <td key={i} className="py-2 px-0.5">
                              <span className={cn("display text-[11px] font-bold",f===null?"text-muted-foreground/30":f?"text-primary":"text-destructive")}>{f===null?" ":f?" ":" "}</span>
                            </td>
                          ))}
                        </tr>
                      )}
                      {gr.some(g=>g!==null)&&(
                        <tr>
                          <td className="display text-[9px] font-bold uppercase text-muted-foreground px-2 py-2 text-left">GIR</td>
                          {gr.map((g,i)=>(
                            <td key={i} className="py-2 px-0.5">
                              <span className={cn("display text-[11px] font-bold",g===null?"text-muted-foreground/30":g?"text-primary":"text-destructive")}>{g===null?" ":g?" ":" "}</span>
                            </td>
                          ))}
                        </tr>
                      )}
                      {pt.some(p=>p!==null)&&(
                        <tr>
                          <td className="display text-[9px] font-bold uppercase text-muted-foreground px-2 py-2 text-left">Putts</td>
                          {pt.map((p,i)=>(
                            <td key={i} className="py-2 px-0.5">
                              <span className={cn("display text-[11px] font-bold",p===null?"text-muted-foreground/30":p<=1?"text-primary":p>=3?"text-destructive":"text-foreground")}>{p===null?" ":p}</span>
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })()}
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
                <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5 mt-0.5"><span className="inline-block h-1.5 w-1.5 rounded-full bg-primary"/>HCP {profile.hcp}   {profile.homeCourse||"No home course"}</p>
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
                        <button onClick={async()=>{
                          const ok=await saveProfile();
                          if(ok!==false){
                            setProfileSection(null);
                          }
                        }} className="w-full bg-primary text-primary-foreground rounded-xl py-3 display text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition">
                          Save Bag  
                        </button>
                      </div>
                    </div>
                  )}
                  {profileSection===id&&id==="style"&&(
                    <div className="p-3.5 space-y-2.5">
                      {[
                        {v:"pro",    icon:" ", label:"Tour Pro",   desc:"Calm, clinical precision. Minimal words, maximum clarity."},
                        {v:"coach",  icon:" ", label:"The Coach",  desc:"Warm and encouraging. Builds confidence every hole."},
                        {v:"oldschool",icon:" ",label:"Old School", desc:"Gritty, direct, no-nonsense caddie. Old-fashioned and real."},
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
        </div>
      )}
      <header className="shrink-0 sticky top-0 z-30 pt-safe" style={{background:"#CFFF04"}}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <line x1="13" y1="10" x2="13" y2="31" stroke={isDark?"#0d0d12":"#1a1a00"} strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M13 10 L26 14.5 L13 19 Z" fill={isDark?"#0d0d12":"#1a1a00"}/>
              <ellipse cx="16" cy="31" rx="5" ry="1.5" fill={isDark?"rgba(0,0,0,0.2)":"rgba(0,0,0,0.15)"}/>
            </svg>
            <span className="display font-bold tracking-tight text-[17px]" style={{color:isDark?"#0d0d12":"#1a1a00",letterSpacing:"-0.02em"}}>
              Obi Golf
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {tab==="caddie"&&weather&&(
              <div className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 tabular text-[11px] text-secondary-foreground">
                <Cloud className="h-3 w-3"/><span className="font-medium">{weather.temp} </span><span className="text-muted-foreground"> </span><span className="text-muted-foreground">{weather.wind}mph {windDir(weather.windDeg)}</span>
              </div>
            )}
            <button onClick={()=>setIsDark(d=>!d)} className="h-8 w-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-muted transition">{isDark?<Sun className="h-3.5 w-3.5"/>:<Moon className="h-3.5 w-3.5"/>}</button>
            <button onClick={()=>setTab("profile_panel")}
              className="h-8 w-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-muted transition" title="Settings">
              <Settings className="h-3.5 w-3.5"/>
            </button>
            <button onClick={handleLogout}
              className="h-8 w-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-destructive/20 hover:text-destructive transition" title="Sign out">
              <LogOut className="h-3.5 w-3.5"/>
            </button>
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
                      {rounds.length>0?"Updated after "+fmtDateShort(rounds[0]?.played_at)+"   "+(rounds[0]?.course_name||""):"No rounds yet -- start playing!"}
                    </p>
                  </div>
                  <button onClick={()=>{setSocialView("rounds");setTab("social");}}
                    className="display text-[10px] font-bold uppercase tracking-wider text-primary inline-flex items-center gap-0.5 mt-1">
                    History <ChevronRight className="h-3 w-3" strokeWidth={3}/>
                  </button>
                </div>
              </div>
            </section>

            {/* Stat grid - derived from saved scorecard data */}
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
                  <p className="text-3xl mb-2"> </p>
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

        {tab==="caddie"&&(
          <div className="flex flex-col h-full min-h-0">

            {/* - Course + hole setup - */}
            <div className="px-4 pt-3 shrink-0 space-y-3">
              {/* Course banner */}
              <div className="rounded-xl bg-foreground text-background p-3.5">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 shrink-0 opacity-60" strokeWidth={2.5}/>
                  <div className="min-w-0 flex-1">
                    <p className="display text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">Live round</p>
                    <input value={courseInput} onChange={e=>setCourseInput(e.target.value)}
                      onBlur={()=>{if(courseInput)setCourse(courseInput);}}
                      onKeyDown={e=>{if(e.key==="Enter"&&courseInput)setCourse(courseInput);}}
                      placeholder="Set course name..."
                      className="display text-[15px] font-bold tracking-tight bg-transparent outline-none placeholder:opacity-40 w-full"/>
                  </div>
                  <span className="display text-xs font-bold tracking-wider text-primary shrink-0">{course?"ON":"--"}</span>
                </div>
              </div>

              {/* Hole + yardage + score */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Current hole</p>
                  <div className="relative">
                    <select value={hole} onChange={e=>setHole(Number(e.target.value))}
                      className="appearance-none display text-[13px] font-bold uppercase tracking-wider rounded-lg border border-border bg-background pl-3 pr-8 py-1.5 cursor-pointer focus:outline-none focus:border-foreground transition text-foreground">
                      {Array.from({length:18},(_,i)=>i+1).map(n=><option key={n} value={n}>Hole {n}</option>)}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" strokeWidth={2.5}/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">To pin</p>
                    <div className="flex items-end gap-1">
                      <input type="number" placeholder="---" value={yardage} onChange={e=>setYardage(e.target.value)}
                        className="stat text-[30px] leading-none text-primary bg-transparent border-b-2 border-primary/40 focus:border-primary w-28 outline-none transition-colors"/>
                      <span className="text-xs text-muted-foreground pb-1 font-bold">YDS   Par {holePars[hole-1]}</span>
                    </div>
                  </div>
                  <div>
                    <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">Score</p>
                    <div className="relative">
                      <select
                        value={scorecard[hole-1]||""}
                        onChange={e=>setScorecard(s=>{const n=[...s];n[hole-1]=e.target.value?Number(e.target.value):null;return n;})}
                        className={cn("w-full appearance-none rounded-lg border px-2.5 py-1.5 display text-[13px] font-bold cursor-pointer outline-none transition pr-7",
                          scorecard[hole-1]?"border-primary bg-primary/10 text-primary":"border-border bg-input text-muted-foreground")}>
                        <option value="">--</option>
                        {[1,2,3,4,5,6,7,8,9,10].map(v=>(
                          <option key={v} value={v}>
                            {v} {v===holePars[hole-1]-2?"(Eagle)":v===holePars[hole-1]-1?"(Birdie)":v===holePars[hole-1]?"(Par)":v===holePars[hole-1]+1?"(Bogey)":v===holePars[hole-1]+2?"(Dbl)":""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" strokeWidth={2.5}/>
                    </div>
                  </div>
                </div>
              </div>

              {/* GPS rangefinder strip - validates coords before showing distance */}
              {(()=>{
                const manualPin=manualPins[hole]||null;
                const geminiPin=holeMap?.green_lat?{lat:holeMap.green_lat,lng:holeMap.green_lng}:null;
                // Only trust AI coords if they put the green within 2000y of player
                const geminiValid=gpsPos&&geminiPin&&haversineYards(gpsPos.lat,gpsPos.lng,geminiPin.lat,geminiPin.lng)<=2000;
                const pin=manualPin||(geminiValid?geminiPin:null);
                const coordsBad=gpsPos&&geminiPin&&!manualPin&&!geminiValid;
                // Also validate tee coords
                const teeValid=gpsPos&&holeMap?.tee_lat&&haversineYards(holeMap.tee_lat,holeMap.tee_lng,gpsPos.lat,gpsPos.lng)<=2000;
                return(
                  <React.Fragment>
                    {gpsPos&&pin&&(
                      <div className="rounded-xl border border-border bg-card overflow-hidden mb-2">
                        <div className="grid grid-cols-2 gap-px bg-border">
                          <div className="bg-card px-3 py-2.5 text-center">
                            <p className="display text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-0.5">To pin</p>
                            <p className="stat text-[28px] leading-none text-primary">{(()=>{const d=haversineYards(gpsPos.lat,gpsPos.lng,pin.lat,pin.lng);return d<3?"At pin":d+"y";})()}</p>
                          </div>
                          <div className="bg-card px-3 py-2.5 text-center">
                            <p className="display text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-0.5">From tee</p>
                            <p className="stat text-[28px] leading-none text-foreground">{teeValid?haversineYards(holeMap.tee_lat,holeMap.tee_lng,gpsPos.lat,gpsPos.lng)+"y":"--"}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/30 border-t border-border">
                          <p className="display text-[9px] text-muted-foreground font-bold"> {gpsPos.acc||"?"}m   {manualPin?"Manual pin set":"AI estimate (unreliable)"}</p>
                          <button onClick={()=>setManualPins(p=>({...p,[hole]:{lat:gpsPos.lat,lng:gpsPos.lng}}))}
                            className="display text-[9px] font-bold uppercase tracking-wider text-primary">
                              Drop pin here
                          </button>
                        </div>
                      </div>
                    )}
                    {gpsPos&&coordsBad&&(
                      <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 mb-2">
                        <p className="display text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">GPS on -- using course yardage estimate</p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2">Hole plays {holeMap.yards}y from this tee. Once you reach the green, drop the pin for precise distances next time.</p>
                        <button onClick={()=>setManualPins(p=>({...p,[hole]:{lat:gpsPos.lat,lng:gpsPos.lng}}))}
                          className="w-full display text-[11px] font-bold uppercase tracking-wider bg-amber-600 text-white rounded-lg px-3 py-2 text-center">
                          Drop pin at my location
                        </button>
                      </div>
                    )}
                    {gpsPos&&!pin&&!coordsBad&&(
                      <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2.5 mb-2">
                        <p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">GPS on -- drop pin when near the green</p>
                        <button onClick={()=>setManualPins(p=>({...p,[hole]:{lat:gpsPos.lat,lng:gpsPos.lng}}))}
                          className="w-full display text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-lg px-3 py-2 text-center">
                          Drop pin at my location
                        </button>
                      </div>
                    )}
                    {!gpsPos&&(
                      <button onClick={startGPS}
                        className="w-full rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 mb-2 display text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition inline-flex items-center justify-center gap-2">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                        Enable GPS rangefinder
                      </button>
                    )}
                  </React.Fragment>
                );
              })()}

              {/* Hole map toggle */}
              {course&&(
                <div>
                  <div className="flex items-center justify-between">
                    <button onClick={()=>{if(showHoleMap){setShowHoleMap(false);}else{setShowHoleMap(true);if(!holeMap)fetchHoleMap(course,hole);}}}
                      className={cn("display text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition",showHoleMap?"text-foreground":"text-muted-foreground hover:text-foreground")}>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
                      Hole map {holeMapLoading&&"(loading...)"}
                    </button>
                    {showHoleMap&&(
                      <div className="flex items-center gap-2">
                        {gpsWatcher==null?(
                          <button onClick={startGPS} className="display text-[10px] font-bold uppercase tracking-wider text-primary inline-flex items-center gap-1.5 border border-primary/30 rounded-lg px-2 py-1 bg-primary/10 hover:bg-primary/20 transition">
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                            GPS off
                          </button>
                        ):(
                          <button onClick={stopGPS} className="display text-[10px] font-bold uppercase tracking-wider text-primary inline-flex items-center gap-1.5 border border-primary/30 rounded-lg px-2 py-1 bg-primary/10">
                            <span className="h-2 w-2 rounded-full bg-primary inline-block" style={{animation:"pulse-dot 1s infinite"}}/>
                            GPS live
                          </button>
                        )}
                        <button onClick={()=>fetchHoleMap(course,hole)} className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition"> </button>
                      </div>
                    )}
                  </div>
                  {showHoleMap&&(
                    <div className="rounded-xl border border-border bg-card overflow-hidden mt-2">
                      {holeMapLoading&&(
                        <div className="flex items-center justify-center gap-3 p-8">
                          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent" style={{animation:"spin 0.8s linear infinite"}}/>
                          <p className="display text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Generating hole map...</p>
                        </div>
                      )}
                      {holeMap&&!holeMapLoading&&(
                        <React.Fragment>
                          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-foreground text-background">
                            <div>
                              <p className="display text-[13px] font-bold tracking-tight truncate">{course}</p>
                              <p className="display text-[10px] font-bold opacity-60">Hole {hole}   Par {holeMap.par}   {holeMap.yards}yds{holeMap.strokeIndex?"   Hdcp "+holeMap.strokeIndex:""}</p>
                            </div>
                             <div className="text-right shrink-0 ml-2">
                               <span className="display text-[9px] font-bold uppercase tracking-wider opacity-50 rounded px-1.5 py-0.5 border border-white/20 capitalize">{holeMap.shape||"straight"}</span>
                               {gpsPos&&manualPins[hole]&&haversineYards(gpsPos.lat,gpsPos.lng,manualPins[hole].lat,manualPins[hole].lng)>3&&(
                                 <p className="stat text-[16px] font-bold text-primary mt-0.5">{haversineYards(gpsPos.lat,gpsPos.lng,manualPins[hole].lat,manualPins[hole].lng)}y</p>
                               )}
                             </div>
                           </div>
                          {(holeMap.osmFeatures||holeMap.green_lat||gpsPos)?(
                            <HoleMapCanvas map={holeMap} gps={gpsPos} W={360} H={340}/>
                          ):(
                            <div className="bg-emerald-950/20 flex flex-col items-center justify-center py-10 gap-2">
                              <p className="text-3xl">  </p>
                              <p className="display text-[12px] font-bold text-muted-foreground">No map available for this course</p>
                              <p className="text-[11px] text-muted-foreground px-4 text-center">Walk to the green and tap "Set pin here" to use GPS rangefinder</p>
                            </div>
                          )}
                          {(()=>{
                            const manualP=manualPins[hole]||null;
                            const gemP=holeMap?.green_lat?{lat:holeMap.green_lat,lng:holeMap.green_lng}:null;
                            const gemOk=gpsPos&&gemP&&haversineYards(gpsPos.lat,gpsPos.lng,gemP.lat,gemP.lng)<=2000;
                            const pin=manualP||(gemOk?gemP:null);
                            return(
                              <React.Fragment>
                                {gpsPos&&pin?.lat&&(
                                  <div className="border-t border-border">
                                    <div className="grid grid-cols-3 gap-px bg-border">
                                      {[["To pin",haversineYards(gpsPos.lat,gpsPos.lng,pin.lat,pin.lng)+"y"],["From tee",holeMap.tee_lat&&haversineYards(holeMap.tee_lat,holeMap.tee_lng,gpsPos.lat,gpsPos.lng)<=2000?haversineYards(holeMap.tee_lat,holeMap.tee_lng,gpsPos.lat,gpsPos.lng)+"y":"--"],["Accuracy",gpsPos.acc?" "+gpsPos.acc+"m":"--"]].map(([l,v])=>(
                                        <div key={l} className="bg-card px-2 py-2.5 text-center">
                                          <p className="display text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-0.5">{l}</p>
                                          <p className="stat text-[22px] leading-none text-primary">{v}</p>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex items-center justify-between px-3 py-2 bg-secondary/40 border-t border-border">
                                      <p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{manualPins[hole]?"  Manual pin":"  AI coords"}</p>
                                      <button onClick={()=>{if(gpsPos)setManualPins(p=>({...p,[hole]:{lat:gpsPos.lat,lng:gpsPos.lng}}));}}
                                        className="display text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-lg px-2.5 py-1.5 hover:opacity-90 transition">
                                        Drop pin here
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {!gpsPos&&(
                                  <div className="border-t border-border bg-primary/5 px-3 py-2.5">
                                    <p className="display text-[10px] font-bold uppercase tracking-wider text-primary/80">  Enable GPS rangefinder above</p>
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })()}
                          {(holeMap.hazards?.length>0||holeMap.tips)&&(
                            <div className="px-3.5 py-2.5 space-y-2 border-t border-border">
                              {holeMap.hazards?.length>0&&(
                                <div className="flex flex-wrap gap-1">
                                  {holeMap.hazards.map((h,i)=>(
                                    <span key={i} className="display text-[9px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive rounded px-1.5 py-0.5">{h}</span>
                                  ))}
                                </div>
                              )}
                              {holeMap.tips&&(
                                <div className="rounded-lg bg-primary/10 border border-primary/30 px-2.5 py-2">
                                  <p className="display text-[9px] font-bold uppercase tracking-wider text-primary mb-0.5">Obi&apos;s tip</p>
                                  <p className="text-[12px] text-foreground leading-snug">{holeMap.tips}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Scorecard toggle */}
              <div className="flex items-center justify-between">
                <button onClick={()=>setScorecardOpen(o=>!o)}
                  className="display text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition">
                  <BarChart3 className="h-3.5 w-3.5" strokeWidth={2.5}/>
                  Scorecard
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform",scorecardOpen&&"rotate-180")} strokeWidth={2.5}/>
                </button>
                {scorecard.some(Boolean)&&(
                  <button onClick={saveRound} className="display text-[11px] font-bold uppercase tracking-wider bg-foreground text-background rounded-lg px-3 py-1.5 hover:opacity-90 transition">
                    Save Round
                  </button>
                )}
              </div>

              {/* Full scorecard */}
              {scorecardOpen&&(
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="grid text-center bg-secondary/50 border-b border-border" style={{gridTemplateColumns:"2rem repeat(18,1fr)"}}>
                    <div/>
                    {Array.from({length:18},(_,i)=>i+1).map(n=>(
                      <div key={n} className={cn("py-1.5 display text-[9px] font-bold uppercase",n===hole&&"text-primary")}>{n}</div>
                    ))}
                  </div>
                  {[{label:"SCR",data:scorecard,getColor:(s,i)=>s===null?"text-muted-foreground/40":s<holePars[i]?"text-primary":s>holePars[i]+1?"text-destructive":"text-foreground",getDisplay:s=>s||" ",onClick:(i)=>{}},
                    {label:"FWY",data:fairways,getColor:(f)=>f===null?"text-muted-foreground/40":f?"text-primary":"text-destructive",getDisplay:f=>f===null?" ":f?" ":" ",onClick:(i)=>setFairways(prev=>{const n=[...prev];n[i]=prev[i]===null?true:prev[i]===true?false:null;return n;})},
                    {label:"GIR",data:gir,getColor:(g)=>g===null?"text-muted-foreground/40":g?"text-primary":"text-destructive",getDisplay:g=>g===null?" ":g?" ":" ",onClick:(i)=>setGir(prev=>{const n=[...prev];n[i]=prev[i]===null?true:prev[i]===true?false:null;return n;})},
                    {label:"PUT",data:putts,getColor:(p)=>p===null?"text-muted-foreground/40":p<=1?"text-primary":p>=3?"text-destructive":"text-foreground",getDisplay:p=>p===null?" ":p,onClick:(i)=>setPutts(prev=>{const n=[...prev];n[i]=prev[i]===null?1:prev[i]<4?prev[i]+1:null;return n;})},
                  ].map(row=>(
                    <div key={row.label} className="grid items-center border-b border-border last:border-b-0" style={{gridTemplateColumns:"2rem repeat(18,1fr)"}}>
                      <div className="display text-[9px] font-bold uppercase text-muted-foreground text-center py-2">{row.label}</div>
                      {row.data.map((val,i)=>(
                        <button key={i} onClick={()=>{if(row.label==="SCR"){setHole(i+1);}else{row.onClick(i);}}} className="text-center py-2">
                          <span className={cn("display text-[12px] font-bold",row.getColor(val,i))}>{row.getDisplay(val)}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                  {scorecard.some(Boolean)&&(
                    <div className="flex items-center gap-4 px-3 py-2 bg-secondary/50 border-t border-border">
                      <div><span className="display text-[9px] font-bold uppercase text-muted-foreground">Total </span><span className="display text-[13px] font-bold">{scorecard.filter(Boolean).reduce((a,b)=>a+b,0)}</span></div>
                      {(()=>{const t=scorecard.filter(Boolean).reduce((a,b)=>a+b,0);const p=holePars.slice(0,scorecard.filter(Boolean).length).reduce((a,b)=>a+b,0);const d=t-p;return <div><span className="display text-[9px] font-bold uppercase text-muted-foreground">vs Par </span><span className={cn("display text-[13px] font-bold",d<=0?"text-primary":"text-destructive")}>{d===0?"E":d>0?"+"+d:""+d}</span></div>})()}
                      {fairways.some(f=>f!==null)&&<div><span className="display text-[9px] font-bold uppercase text-muted-foreground">FWY </span><span className="display text-[13px] font-bold">{fairways.filter(f=>f===true).length}/{fairways.filter(f=>f!==null).length}</span></div>}
                      {putts.some(p=>p!==null)&&<div><span className="display text-[9px] font-bold uppercase text-muted-foreground">Putts </span><span className="display text-[13px] font-bold">{putts.filter(p=>p!==null).reduce((a,b)=>a+b,0)}</span></div>}
                    </div>
                  )}
                </div>
              )}
            </div>



            {/* Empty state */}
            {messages.length===0&&(
              <div className="px-4 pt-4 pb-2 text-center shrink-0">
                <ObiLogo size={36}/>
                <p className="display text-[13px] font-bold text-muted-foreground mt-2">Ask Obi anything about this hole</p>
              </div>
            )}

            {/* - Chat history - */}
            <div className="flex-1 px-4 pt-2 overflow-y-auto space-y-3 min-h-0 pb-2" style={{scrollbarWidth:"none"}}>
              {messages.map((m,i)=>{
                const isLast=i===messages.length-1;
                const isAI=m.role==="assistant";
                return(
                  <div key={i} className={cn("flex",!isAI?"justify-end":"justify-start gap-2 items-end")}>
                    {isAI&&<ObiLogo size={18}/>}
                    <div className={cn("flex flex-col",isAI?"items-start max-w-[88%]":"items-end max-w-[82%]")}>
                      <div className={isAI?"bubble-ai text-[14px]":"bubble-user text-[14px]"}>
                        {m.content}
                      </div>
                      {/* Action buttons on latest AI message only */}
                      {isAI&&isLast&&(
                        <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                          <button onClick={()=>sendMessage("Why do you recommend that?")}
                            className="display text-[10px] font-bold uppercase tracking-wider bg-foreground text-background rounded-lg px-2.5 py-1.5 hover:opacity-80 transition">
                            Why?
                          </button>
                          <button onClick={()=>sendMessage("What are my alternatives?")}
                            className="display text-[10px] font-bold uppercase tracking-wider border border-border rounded-lg px-2.5 py-1.5 hover:border-foreground/50 transition text-foreground">
                            Alternatives
                          </button>
                          <button onClick={()=>sendMessage("Biggest risk?")}
                            className="display text-[10px] font-bold uppercase tracking-wider border border-border rounded-lg px-2.5 py-1.5 hover:border-foreground/50 transition text-foreground">
                            Risk?
                          </button>
                          <button onClick={()=>{speaking?stopSpeak():speakText(m.content);}}
                            className={cn("display text-[10px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 border transition",
                              speaking?"bg-primary/20 text-primary border-primary/40":"border-border text-muted-foreground hover:text-foreground")}>
                            {speaking?" ":" "}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef}/>
            </div>

            {/* - Input bar - */}
            <div className="px-3 shrink-0 border-t border-border bg-background/95 backdrop-blur-xl"
              style={{paddingBottom:"calc(0.5rem + env(safe-area-inset-bottom))",paddingTop:"8px"}}>
              {speaking&&(
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="flex gap-0.5 items-end h-4">
                    {[0,1,2,3,4].map(i=>(
                      <div key={i} className="w-1 rounded-full bg-primary"
                        style={{height:(4+i%3*4)+"px",animation:"pulse-dot 0.8s "+(i*0.12)+"s infinite"}}/>
                    ))}
                  </div>
                  <span className="display text-[11px] font-bold text-primary uppercase tracking-wider">Obi speaking</span>
                  <button onClick={stopSpeak} className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground ml-auto">Stop  </button>
                </div>
              )}
              {loading&&!speaking&&(
                <div className="flex items-end gap-2 mb-2">
                  <ObiLogo size={18}/>
                  <div className="bubble-ai flex gap-1.5 items-center px-4 py-2.5">
                    {[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground" style={{animation:"pulse-dot 1s "+(i*0.18)+"s infinite"}}/>)}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button onClick={()=>{const next=!autoSpeak;setAutoSpeak(next);try{localStorage.setItem("obi_autospeak",String(next));}catch{}if(!next)stopSpeak();}}
                  title={autoSpeak?"Mute Obi":"Unmute Obi"}
                  className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition border",autoSpeak?"bg-primary/15 border-primary/40 text-primary":"bg-secondary border-border text-muted-foreground hover:text-foreground")}>
                  {autoSpeak?(
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                  ):(
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                  )}
                </button>
                <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-card pl-3 pr-1.5 py-1.5 shadow-sm">
                  <input value={input} onChange={e=>setInput(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage()}
                    placeholder={micActive?"Listening...":"Ask Obi anything..."}
                    className={cn("flex-1 bg-transparent text-[14px] outline-none",micActive?"text-primary font-medium":"text-foreground placeholder:text-muted-foreground")}/>
                  {micSupported&&(
                    <button onClick={startMic}
                      className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition",micActive?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted")}>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>
                    </button>
                  )}
                  <button onClick={()=>sendMessage()} disabled={!input.trim()||loading}
                    className={cn("h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 transition",(!input.trim()||loading)?"opacity-35":"hover:opacity-85 active:scale-95")}>
                    <ArrowUp className="h-4 w-4" strokeWidth={3}/>
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}


        {tab==="practice"&&(
          <PracticeTab
            practiceSubTab={practiceSubTab} setPracticeSubTab={setPracticeSubTab}
            swingFile={swingFile} setSwingFile={setSwingFile}
            swingNotes={swingNotes} setSwingNotes={setSwingNotes}
            swingAnalysis={swingAnalysis} setSwingAnalysis={setSwingAnalysis}
            swingLoading={swingLoading}
            swingHistory={swingHistory} setSwingHistory={setSwingHistory}
            swingThumb={swingThumb} setSwingThumb={setSwingThumb}
            analysisExpanded={analysisExpanded} setAnalysisExpanded={setAnalysisExpanded}
            expandedSwing={expandedSwing} setExpandedSwing={setExpandedSwing}
            swingInputRef={swingInputRef}
            handleSwingAnalyze={handleSwingAnalyze}
            speaking={speaking} speakText={speakText}
            supabase={supabase} fmtDateShort={fmtDateShort}
            renderSwingAnalysis={renderSwingAnalysis}
            profile={profile}
          />
        )}


        {tab==="social"&&(
          <div className="pb-8">
            <section className="px-4 pt-5">
              <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Social</p>
              <h1 className="display text-[26px] font-bold tracking-tight leading-tight mt-0.5">Your crew.</h1>
            </section>
            {/* Sub-tabs */}
            <section className="px-4 pt-3">
              <div className="flex gap-1 bg-secondary rounded-xl p-1">
                {[["feed","Feed"],["rounds","My Rounds"],["friends","Friends"+(friendReqs.length>0?" ("+friendReqs.length+")":"")]].map(([id,label])=>(
                  <button key={id} onClick={()=>setSocialView(id)}
                    className={cn("flex-1 py-2 rounded-[10px] display text-[10px] font-bold uppercase tracking-wider transition-all",
                      socialView===id?"nav-pill-active":"text-muted-foreground hover:text-foreground")}>
                    {label}
                  </button>
                ))}
              </div>
            </section>
            {socialView==="feed"&&friends.length>0&&(
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
            {/* My Rounds */}
            {socialView==="rounds"&&(
              <section className="px-4 pt-4 space-y-2">
                {rounds.length===0&&(
                  <div className="rounded-xl border border-border bg-card p-10 text-center">
                    <p className="text-3xl mb-2"> </p>
                    <p className="display text-[15px] font-bold text-foreground">No rounds saved yet</p>
                    <p className="text-[12px] text-muted-foreground mt-1">Save a round from the Caddie tab</p>
                  </div>
                )}
                {rounds.map((r,i)=>{
                  const diff=r.score_vs_par||0;
                  const fwyHit=(r.fairways||[]).filter(f=>f===true).length;
                  const fwyTot=(r.fairways||[]).filter(f=>f!==null).length;
                  const girHit=(r.gir||[]).filter(g=>g===true).length;
                  const girTot=(r.gir||[]).filter(g=>g!==null).length;
                  const puttTot=(r.putts||[]).filter(p=>p!==null).reduce((a,b)=>a+b,0);
                  return(
                    <div key={r.id||i} className="rounded-xl border border-border bg-card overflow-hidden">
                      <button onClick={()=>setShowCard(r)} className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 transition text-left">
                        <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5}/>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="display text-[13px] font-bold tracking-tight truncate">{r.course_name||"Unknown"}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(r.played_at)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn("stat text-xl leading-none",diff<=0?"text-primary":"text-foreground")}>{r.total_score}</p>
                          <p className="display text-[10px] font-bold text-muted-foreground">{diff===0?"E":diff>0?"+"+diff:""+diff}</p>
                        </div>
                      </button>
                      <div className="flex items-center justify-between px-3.5 py-2 border-t border-border bg-secondary/20">
                        <div className="flex gap-3 min-w-0 flex-1">
                          {fwyTot>0&&<span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">FWY <span className="text-foreground">{fwyHit}/{fwyTot}</span></span>}
                          {girTot>0&&<span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GIR <span className="text-foreground">{girHit}/{girTot}</span></span>}
                          {puttTot>0&&<span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Putts <span className="text-foreground">{puttTot}</span></span>}
                          {!fwyTot&&!girTot&&!puttTot&&<span className="display text-[10px] text-muted-foreground italic">No stats tracked</span>}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={()=>setShowCard(r)}
                            className="display text-[10px] font-bold uppercase tracking-wider border border-border rounded-lg px-2 py-1 text-muted-foreground hover:text-foreground transition">
                            View
                          </button>
                          <button onClick={async()=>{
                            if(!window.confirm("Delete this round from "+( r.course_name||"Unknown")+"?"))return;
                            const{error}=await supabase.from("rounds").delete().eq("id",r.id);
                            if(!error)setRounds(prev=>prev.filter(x=>x.id!==r.id));
                          }}
                            className="display text-[10px] font-bold uppercase tracking-wider border border-destructive/30 rounded-lg px-2 py-1 text-destructive hover:bg-destructive/10 transition">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Feed */}
            {socialView==="feed"&&(
            <section className="px-4 pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Friend activity</p>
                <button onClick={()=>setSocialView("friends")} className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Users className="h-3 w-3" strokeWidth={2.5}/> Find friends</button>
              </div>
              {feed.length===0&&(<div className="rounded-xl border border-border bg-card p-10 text-center"><p className="text-2xl mb-2"> </p><p className="display text-[15px] font-bold text-foreground">No activity yet</p><p className="text-[13px] text-muted-foreground mt-1">Add friends to see their rounds</p></div>)}
              <div className="space-y-2.5">
                {(showAllFeed?feed:feed.slice(0,5)).map((r,i)=>{
                  const isYou=r.user_id===user?.id;
                  const pname=isYou?name:(r.profiles?.full_name||"Golfer");
                  const initials=pname.split(" ").map(x=>x[0]).join("").toUpperCase().slice(0,2);
                  const diff=r.score_vs_par||0;
                  return(
                    <article key={r.id||i} className="rounded-xl border border-border bg-card p-3.5">
                      <div className="flex items-center gap-2.5 mb-2.5"><div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center display text-[11px] font-bold shrink-0">{initials}</div><div className="min-w-0 flex-1"><p className="display text-[13px] font-bold tracking-tight">{pname}{isYou&&<span className="ml-1.5 text-[9px] uppercase tracking-wider text-primary"> you</span>}</p><p className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" strokeWidth={2.5}/>{r.course_name||"Unknown"}   {fmtDateShort(r.played_at)}</p></div><div className="text-right"><p className={cn("stat text-xl leading-none",diff<=0?"text-primary":"text-foreground")}>{r.total_score}</p><p className="display text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Score</p></div></div>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                        <button onClick={()=>setShowCard(r)} className="inline-flex items-center gap-1.5 display text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition">View round</button>
                      </div>
                    </article>
                  );
                })}
                {feed.length>5&&(<button onClick={()=>setShowAllFeed(s=>!s)} className="w-full text-center py-2.5 display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">{showAllFeed?"Show less":"View more"}</button>)}
              </div>
            </section>
            )}
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
      <nav className="nav-brand shrink-0 sticky bottom-0 z-30 backdrop-blur-xl pb-safe">
        <div className="grid grid-cols-4 px-2 pt-1.5 pb-1.5 max-w-md mx-auto">
          {NAV.map(({id,label,Icon})=>{
            const isActive=tab===id;
            return(
              <button key={id} onClick={()=>changeTab(id)}
                className={cn("flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg transition",
                  isActive?"text-foreground":"text-muted-foreground hover:text-foreground")}>
                <div className={cn("h-7 w-12 flex items-center justify-center rounded-lg transition",
                  isActive?"nav-pill-brand":"")}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={isActive?2.5:1.75}
                    style={isActive?{color:"#0d1200"}:{}}/>
                </div>
                <span className="display text-[10px] font-bold uppercase tracking-wider"
                  style={isActive?{color:"#CFFF04"}:{}}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
export default function ObiGolf(){ return <ErrorBoundary><ObiGolfApp/></ErrorBoundary>; }
