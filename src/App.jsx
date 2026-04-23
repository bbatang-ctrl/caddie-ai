// OBI-GOLF-FIXED-v4 - zero backticks
import React,{useState,useEffect,useRef,useCallback} from "react";
import {supabase} from "./supabase.js";
import {DARK_THEME,LIGHT_THEME,DEFAULT_BAG,Ball,ScoreBadge,Avatar,
  fmtDate,fmtDateShort,windDir,wxIcon,playingYards,firstName,randJab,
  JABS,QUICK_PROMPTS,analyzeSwing,analyzeSwingVideo,
  ErrorBoundary,ShotShapeDiagram,OnboardingFlow} from "./AppPart1.jsx";
function ObiGolfApp(){
  const [darkMode,setDarkMode]=useState(()=>{ const saved=localStorage.getItem("obi_dark"); return saved===null?true:saved!=="false"; });
  const D = darkMode ? DARK_THEME : LIGHT_THEME;

  // Shared styles - theme-reactive
  const S={
    input:{background:D.surface,border:"1.5px solid "+(D.border),borderRadius:"12px",color:D.text,fontSize:"15px",padding:"13px 16px",outline:"none",fontFamily:"'Inter',sans-serif",width:"100%",boxSizing:"border-box",transition:"border-color 0.2s"},
    btnPrimary:{background:D.accent,border:"none",borderRadius:"12px",color:"#fff",fontSize:"15px",padding:"14px",cursor:"pointer",fontWeight:"600",fontFamily:"'Inter',sans-serif",width:"100%",letterSpacing:"-0.2px"},
    btnSecondary:{background:D.surface,border:"1.5px solid "+(D.border),borderRadius:"12px",color:D.text,fontSize:"15px",padding:"13px",cursor:"pointer",fontWeight:"500",fontFamily:"'Inter',sans-serif",width:"100%"},
    btnGhost:{background:"transparent",border:"none",color:D.muted,fontSize:"14px",padding:"10px",cursor:"pointer",fontFamily:"'Inter',sans-serif",width:"100%"},
    card:{background:D.card,border:"1px solid "+(D.border),borderRadius:"16px",padding:"16px",boxShadow:darkMode?"0 1px 3px rgba(0,0,0,0.4)":"0 1px 3px rgba(0,0,0,0.07),0 4px 16px rgba(0,0,0,0.04)"},
    pill:{background:D.surface,border:"1px solid "+(D.border),borderRadius:"99px",padding:"5px 12px",fontSize:"12px",color:D.muted,fontFamily:"'Inter',sans-serif",cursor:"pointer",whiteSpace:"nowrap"},
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
  const [holeOpen,setHoleOpen]=useState(false);
  const [socialView,setSocialView]=useState("feed"); // feed | rounds | friends
  const [profileSection,setProfileSection]=useState(null); // null | game | bag | app
  // Stop speech when navigating away
  const changeTab = (newTab) => {
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
    setTab(newTab);
  };
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
  const [showAllFeed,setShowAllFeed]=useState(false);
  const [showAllShots,setShowAllShots]=useState(false);
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
  useEffect(()=>{
    // Inject CSS into document head once
    const styleEl = document.getElementById("obi-styles") || document.createElement("style");
    styleEl.id = "obi-styles";
    styleEl.textContent = CSS;
    if (!document.getElementById("obi-styles")) document.head.appendChild(styleEl);
  }, []);

  useEffect(()=>{
    localStorage.setItem("obi_dark", darkMode);
    document.body.style.background = darkMode ? "#0c0c0f" : "#fafafa";
    document.body.style.transition = "background 0.2s";
  },[darkMode]);

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
      // Compress image before upload
      const compressed = await compressImage(file, 400);

      // Upload to Supabase Storage - file named by user ID
      const ext = "jpg"; // always save as jpg after compression
      const path = (user.id)+"."+(ext);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });

      if(uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl + "?t=" + Date.now(); // cache bust

      setAvatarUrl(url);

      // Save to profile immediately
      await supabase.from("profiles").update({
        avatar_url: url,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);

    }catch(err){
      console.error("Avatar upload failed:", err);
      alert("Photo upload failed: " + err.message);
    }
    setUploadingAvatar(false);
  }

  // Compress image to max width/height using canvas
  function compressImage(file, maxSize=400){
    return new Promise((resolve)=>{
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = ()=>{
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if(w > h){ if(w > maxSize){ h = h*(maxSize/w); w = maxSize; } }
        else { if(h > maxSize){ w = w*(maxSize/h); h = maxSize; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob)=>{
          resolve(new File([blob], file.name, { type: "image/jpeg" }));
        }, "image/jpeg", 0.82);
      };
      img.src = url;
    });
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
      const r=await fetch("https://api.open-meteo.com/v1/forecast?latitude="+(lat)+"&longitude="+(lon)+"&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,relative_humidity_2m&wind_speed_unit=mph&temperature_unit=fahrenheit");
      const d=await r.json();const c=d.current;
      setWeather({temp:Math.round(c.temperature_2m),wind:Math.round(c.wind_speed_10m),windDeg:c.wind_direction_10m,humidity:c.relative_humidity_2m,code:c.weather_code});
    }catch{setWeather({temp:72,wind:8,windDeg:225,humidity:55,code:1});}
    setWxLoading(false);
  },[]);

  useEffect(()=>{if(user)fetchWeather();},[user]);

  const speak=(text)=>{
    if(!window.speechSynthesis)return;
    window.speechSynthesis.cancel();
    const utt=new SpeechSynthesisUtterance(text.replace(/[*_#]/g,""));
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
      const msg=e.message?.includes("quota")||e.message?.includes("429")?"API quota hit - wait a minute.":"Connection issue. Try again.";
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
      // Consistency - coefficient of variation
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
    const handed = profile.dexterity==="left" ? "left-handed" : "right-handed";
    const knownCarry = profile.bag.find(b=>b.club===club)?.carry || 150;

    const promptText = "You are a golf expert analyzing a swing. Player: "+handed+", Club: "+club+" (~"+knownCarry+"y carry).\nRespond ONLY with JSON, nothing else:\n{\"shot_shape\":\"straight\",\"launch_angle\":\"mid\",\"estimated_carry\":"+knownCarry+",\"contact_quality\":\"flush\",\"swing_path\":\"neutral\",\"ball_flight\":\"mid-trajectory\",\"tip\":\"Stay balanced through impact.\"}\nshot_shape: straight,slight draw,draw,strong draw,hook,slight fade,fade,strong fade,slice\nlaunch_angle: low,mid-low,mid,mid-high,high  contact_quality: flush,slightly thin,thin,fat,toe,heel";

    // Extract a frame from video - avoids ALL size/upload issues
    const frameBlob = await new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const url = URL.createObjectURL(videoFile);
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";

      const cleanup = () => URL.revokeObjectURL(url);

      video.onerror = () => { cleanup(); reject(new Error("Could not read video")); };

      video.onloadedmetadata = () => {
        // Seek to impact zone (40% through)
        video.currentTime = Math.min(video.duration * 0.4, video.duration - 0.1);
      };

      video.onseeked = () => {
        try {
          canvas.width  = Math.min(video.videoWidth,  640);
          canvas.height = Math.min(video.videoHeight, 480);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          cleanup();
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error("Could not extract frame"));
          }, "image/jpeg", 0.8);
        } catch(e) { cleanup(); reject(e); }
      };

      // Fallback timeout
      setTimeout(() => { cleanup(); reject(new Error("Video read timeout - try a shorter clip")); }, 10000);
      video.load();
    });

    // Convert frame to base64
    const b64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result.split(",")[1]);
      reader.onerror = () => reject(new Error("Could not encode frame"));
      reader.readAsDataURL(frameBlob);
    });

    // Send frame image through proxy - always small, never hits size limit
    const res = await fetch("/api/swing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: b64 } },
            { text: promptText }
          ]
        }]
      }),
    });

    if (!res.ok) throw new Error("Server error " + res.status);
    const data = await res.json();
    if (data.error) {
      const msg = typeof data.error === "string" ? data.error : data.error.message;
      throw new Error(msg || "Analysis failed");
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      const clean = rawText.replace(/\u0060\u0060\u0060json|\u0060\u0060\u0060/g, "").trim();
      const jsonStart = clean.indexOf('{'); const jsonEnd = clean.lastIndexOf('}'); const match = jsonStart >= 0 && jsonEnd > jsonStart ? [clean.slice(jsonStart, jsonEnd + 1)] : null;
      parsed = JSON.parse(match ? match[0] : clean);
    } catch {
      // Fallback defaults if JSON parse fails
      parsed = {};
    }

    return {
      shot_shape:      parsed.shot_shape      || "straight",
      launch_angle:    parsed.launch_angle    || "mid",
      estimated_carry: parseInt(parsed.estimated_carry) || knownCarry,
      contact_quality: parsed.contact_quality || "flush",
      swing_path:      parsed.swing_path      || "neutral",
      ball_flight:     parsed.ball_flight     || "mid-trajectory",
      tip:             parsed.tip             || "Keep a smooth tempo through the ball.",
    };
  }


  async function runRangeAnalysis(){
    if(!rangeFile)return;
    setRangeLoading(true);
    setRangeShotResult(null);
    try{
      const result = await analyzeRangeShot(rangeFile, rangeClub);
      setRangeShotResult(result);
      if(user){
        try{
          await supabase.from("range_shots").insert({
            user_id:          user.id,
            club:             rangeClub,
            shot_shape:       result.shot_shape,
            launch_angle:     result.launch_angle,
            estimated_carry:  result.estimated_carry,
            contact_quality:  result.contact_quality,
            swing_path:       result.swing_path,
            ball_flight:      result.ball_flight,
            tip:              result.tip,
            recorded_at:      new Date().toISOString(),
          });
          loadRangeHistory(user.id);
        } catch(dbErr){
          console.error("DB save failed:", dbErr);
          // Don't crash - result still shows
        }
      }
    } catch(err){
      console.error("Range analysis error:", err);
      setRangeShotResult({ error: err.message || "Analysis failed. Please try again." });
    } finally {
      setRangeLoading(false);
      setRangeFile(null);
    }
  }
  async function searchUsers(q){if(!q.trim()){setSearchRes([]);return;}const{data}=await supabase.from("profiles").select("*").ilike("full_name","%"+(q)+"%").neq("id",user?.id).limit(8);if(data)setSearchRes(data);}
  async function sendFriendReq(fid){await supabase.from("friendships").insert({user_id:user.id,friend_id:fid,status:"pending"});setSearchRes(prev=>prev.filter(u=>u.id!==fid));}
  async function acceptFriendReq(reqId,requesterId){await supabase.from("friendships").update({status:"accepted"}).eq("id",reqId);await supabase.from("friendships").insert({user_id:user.id,friend_id:requesterId,status:"accepted"});loadSocial(user.id);}

  async function runSwingAnalysis(){
    if(!swingFile)return;
    setSwingLoading(true);setSwingAnalysis("");
    try{
      if(swingFile.type.startsWith("video/")){
        // Send full video directly to Google File API - full motion analysis
        const notesWithGoal=profile.practiceGoal?"GOAL:"+(profile.practiceGoal)+"\n"+(swingNotes):swingNotes;
        const analysis=await analyzeSwingVideo(swingFile,notesWithGoal,profile.bag,profile.hcp);
        setSwingAnalysis(analysis);
        if(user){await supabase.from("swing_analyses").insert({user_id:user.id,notes:swingNotes,analysis,analyzed_at:new Date().toISOString()});loadSwings(user.id);}
      } else {
        // Image - use existing inline method
        const reader=new FileReader();
        reader.onload=async(e)=>{
          try{
            const b64=e.target.result.split(",")[1];
            const notesWithGoal=profile.practiceGoal?"GOAL:"+(profile.practiceGoal)+"\n"+(swingNotes):swingNotes;
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
    const ds=d>0?"+"+(d):d===0?"even par":(d);
    const txt="🏌️ Just finished "+(round.course_name||"a round")+" on Obi Golf\n⛳ "+(round.total_score)+" strokes ("+(ds)+")\n📍 "+(round.holes_played)+" holes played\n\nGet your AI caddie → obigolf.app";
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
      <div style={{display:"flex",gap:"7px",animation:"fadeUp 0.6s 0.4s both"}}>{[0,1,2].map(i=><div key={i} style={{width:"6px",height:"6px",borderRadius:"50%",background:D.accent,animation:"pulse 1.2s infinite "+(i*0.2)+"s"}}/>)}</div>
    </div>
  );

  // AUTH
  if(!user||authScreen==="onboard")return(
    <div style={{minHeight:"100vh",background:D.bg,fontFamily:"'Inter',sans-serif",backgroundImage:darkMode?"radial-gradient(ellipse at 20% 10%,"+(D.accentDim)+"66 0%,transparent 50%),radial-gradient(ellipse at 80% 90%,"+(D.accentDim)+"33 0%,transparent 50%)":"none"}}>
      <div style={{maxWidth:"420px",margin:"0 auto",padding:"40px 24px",display:"flex",flexDirection:"column",minHeight:"100vh",justifyContent:"center"}}>
        <div style={{textAlign:"center",marginBottom:"36px",animation:"fadeUp 0.5s both"}}>
          <Ball size={56}/>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"36px",fontWeight:"800",color:D.white,letterSpacing:"2px",marginTop:"12px"}}>OBI GOLF</div>
          <div style={{color:D.muted,fontSize:"14px",marginTop:"4px",letterSpacing:"1px"}}>AI CADDIE - COACH - COMMUNITY</div>
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
    </div>
  );

  // SUMMARY MODAL
  const SummaryModal=({round})=>{
    const diff=round.total_score-round.total_par;
    const diffStr=diff>0?"+"+(diff):diff===0?"E":(diff);
    const diffColor=diff>0?D.red:diff<0?D.accent:D.blue;
    return(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={()=>setShowCard(null)}>
        <div onClick={e=>e.stopPropagation()} style={{background:"linear-gradient(160deg,"+(D.card)+" 0%,"+(D.dark)+" 100%)",border:"1px solid "+(D.border),borderRadius:"24px",padding:"28px 24px",width:"100%",maxWidth:"360px",animation:"popIn 0.4s cubic-bezier(.34,1.56,.64,1) both"}}>
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
            {[["SCORE",round.total_score,D.white],["vs PAR",diffStr,diffColor],["HOLES",(round.holes_played)+"/18",D.text]].map(([l,v,c])=>(
              <div key={l} style={{background:D.surface,borderRadius:"14px",padding:"14px 8px",textAlign:"center",border:"1px solid "+(D.border)}}>
                <div style={{fontSize:"9px",color:D.muted,letterSpacing:"1.5px",marginBottom:"6px"}}>{l}</div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"24px",fontWeight:"700",letterSpacing:"-0.3px",color:c,lineHeight:1}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{background:D.surface,borderRadius:"14px",padding:"14px 16px",marginBottom:"20px",borderLeft:"3px solid "+(D.accent)}}>
            <div style={{fontSize:"11px",color:D.accent,letterSpacing:"1.5px",marginBottom:"6px"}}>OBI SAYS</div>
            <div style={{fontSize:"14px",color:D.text,lineHeight:1.6,fontStyle:"italic"}}>"{diff<0?"Outstanding round. That's the kind of golf that gets talked about in the clubhouse.":diff===0?"Solid par golf. Consistent - let's find those birdies next time.":"Every round is data. Obi will have you better prepared next time."}"</div>
          </div>
          <div style={{fontSize:"12px",color:D.muted,textAlign:"center",marginBottom:"20px"}}>🏌️ {userProfile?.full_name||"Golfer"} - HCP {userProfile?.handicap_index||"-"} - obigolf.app</div>
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
    <div style={{minHeight:"100vh",maxWidth:"480px",margin:"0 auto",background:D.bg,fontFamily:"'Inter',sans-serif",display:"flex",flexDirection:"column",position:"relative",transition:"background 0.2s,color 0.2s"}}>
      {showCard&&<SummaryModal round={showCard}/>}

      {/* Avatar zoom modal */}
      {showAvatarZoom&&(
        <div onClick={()=>setShowAvatarZoom(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
          <div onClick={e=>e.stopPropagation()} style={{maxWidth:"360px",width:"100%",textAlign:"center"}}>
            <img src={showAvatarZoom} alt="Profile" style={{width:"280px",height:"280px",borderRadius:"50%",objectFit:"cover",border:"3px solid "+D.accent,boxShadow:"0 0 40px "+D.accent+"44"}}/>
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
      <div style={{padding:"12px 18px",background:D.dark,borderBottom:"1px solid "+(D.border),display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(12px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <Ball size={28}/>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"17px",fontWeight:"700",color:D.white,letterSpacing:"-0.3px"}}>Obi Golf
            {speaking&&<span style={{display:"inline-block",width:"6px",height:"6px",borderRadius:"50%",background:D.accent,animation:"pulse 1s infinite",marginLeft:"8px",verticalAlign:"middle"}}/>}
          </div>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          {weather&&(
            <div style={{background:D.surface,border:"1px solid "+(D.border),borderRadius:"99px",padding:"5px 12px",display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",color:D.muted}}>
              <span>{wxIcon(weather.code)}</span>
              <span style={{color:D.text}}>{weather.temp}°</span>
              <span style={{color:D.border}}>-</span>
              <span>{weather.wind}mph {windDir(weather.windDeg)}</span>
            </div>
          )}
          <button onClick={()=>setDarkMode(d=>!d)} style={{background:D.surface,border:"1px solid "+(D.border),borderRadius:"99px",padding:"6px 10px",cursor:"pointer",fontSize:"14px",color:D.muted,fontFamily:"'Inter',sans-serif",lineHeight:1}}>
            {darkMode?"☀️":"🌙"}
          </button>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"480px",background:D.dark,borderTop:"1px solid "+(D.border),display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)",backdropFilter:"blur(12px)"}}>
        {[
          {id:"caddie",   label:"Caddie",   color:"#34d399", bg:"#064e3b", svg:(<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>)},
          {id:"practice", label:"Practice", color:"#818cf8", bg:"#1e1b4b", svg:(<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2.5c0 1.5-1.5 6-1.5 6h-2S9 4 9 2.5a2.5 2.5 0 0 1 5 0z"/><path d="M11 8.5V21"/><path d="M8 21h6"/><path d="M15 13c2.5-1 4-3 4-5"/></svg>)},
          {id:"social",   label:"Social",   color:"#f59e0b", bg:"#451a03", badge:friendReqs.length, svg:(<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>)},
          {id:"profile",  label:"Profile",  color:"#f472b6", bg:"#500724", svg:(<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>)},
        ].map(t=>(
          <button key={t.id} onClick={()=>changeTab(t.id)} style={{flex:1,padding:"8px 4px 6px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",position:"relative"}}>
            <div style={{width:"40px",height:"30px",borderRadius:"10px",background:tab===t.id?t.bg:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",color:tab===t.id?t.color:D.muted}}>
              {t.svg}
            </div>
            <span style={{fontSize:"10px",color:tab===t.id?t.color:D.muted,fontFamily:"'Inter',sans-serif",fontWeight:tab===t.id?"600":"400",transition:"color 0.2s"}}>{t.label}</span>
            {t.badge>0&&<div style={{position:"absolute",top:"4px",right:"calc(50% - 22px)",width:"7px",height:"7px",borderRadius:"50%",background:D.red,border:"1.5px solid "+(D.dark)}}/>}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{flex:1,paddingBottom:"72px",overflowY:"auto"}}>

        {/* CADDIE TAB */}
        {tab==="caddie"&&(
          <div style={{display:"flex",flexDirection:"column",minHeight:"100%"}}>

            {/* -- Hole setup row - always visible, compact -- */}
            <div style={{padding:"10px 16px",background:D.dark,borderBottom:"1px solid "+(D.border),position:"sticky",top:"52px",zIndex:10}}>
              {/* Collapsed row */}
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                {/* Hole stepper */}
                <div style={{display:"flex",alignItems:"center",gap:"4px",flexShrink:0}}>
                  <button onClick={()=>setHole(h=>Math.max(1,h-1))} style={{background:D.surface,border:"1px solid "+(D.border),borderRadius:"8px",color:D.muted,padding:"4px 9px",cursor:"pointer",fontSize:"15px",lineHeight:1}}>&#8249;</button>
                  <div style={{textAlign:"center",minWidth:"42px"}}>
                    <div style={{fontSize:"8px",color:D.muted,letterSpacing:"1.5px",textTransform:"uppercase"}}>HOLE</div>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"22px",fontWeight:"700",color:D.white,lineHeight:1}}>{hole}</div>
                  </div>
                  <button onClick={()=>setHole(h=>Math.min(18,h+1))} style={{background:D.surface,border:"1px solid "+(D.border),borderRadius:"8px",color:D.muted,padding:"4px 9px",cursor:"pointer",fontSize:"15px",lineHeight:1}}>&#8250;</button>
                </div>
                {/* Yardage */}
                <input type="number" placeholder="Yds" value={yardage} onChange={e=>setYardage(e.target.value)}
                  style={{...S.input,width:"68px",padding:"6px 8px",fontSize:"15px",fontWeight:"600",textAlign:"center",flexShrink:0}}/>
                {/* Lie - compact */}
                <select value={lie} onChange={e=>setLie(e.target.value)}
                  style={{...S.input,flex:1,padding:"6px 8px",fontSize:"13px",minWidth:0}}>
                  {["tee box","fairway","light rough","deep rough","bunker","hardpan","uphill lie","downhill lie"].map(l=>(
                    <option key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>
                  ))}
                </select>
                {/* Expand toggle */}
                <button onClick={()=>setHoleOpen(o=>!o)} style={{background:holeOpen?D.accentDim:D.surface,border:"1px solid "+(holeOpen?D.accent:D.border),borderRadius:"8px",color:holeOpen?D.accent:D.muted,padding:"6px 9px",cursor:"pointer",fontSize:"13px",flexShrink:0,lineHeight:1}}>
                  {holeOpen?"▲":"▼"}
                </button>
              </div>

              {/* Expanded - par, course, wind */}
              {holeOpen&&(
                <div style={{marginTop:"10px",display:"flex",flexDirection:"column",gap:"8px",animation:"fadeUp 0.15s both"}}>
                  <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                    <span style={{fontSize:"12px",color:D.muted,width:"30px",flexShrink:0}}>Par</span>
                    <div style={{display:"flex",gap:"4px"}}>
                      {[3,4,5].map(p=>(
                        <button key={p} onClick={()=>{const n=[...holePars];n[hole-1]=p;setHolePars(n);}}
                          style={{background:par===p?D.accentDim:D.surface,border:"1px solid "+(par===p?D.accent:D.border),borderRadius:"8px",color:par===p?D.accent:D.muted,padding:"5px 14px",fontSize:"13px",cursor:"pointer",fontWeight:"600"}}>
                          {p}
                        </button>
                      ))}
                    </div>
                    {py&&recClub&&(
                      <div style={{marginLeft:"auto",fontSize:"12px",color:D.accent,fontWeight:"600"}}>
                        {py}y plays → <span style={{color:D.white}}>{recClub.club}</span>
                      </div>
                    )}
                  </div>
                  <input placeholder="Course name (optional)" value={courseInput} onChange={e=>setCourseInput(e.target.value)}
                    onBlur={()=>{if(courseInput&&courseInput!==course){setCourse(courseInput);sendMessage("I'm playing "+(courseInput)+". Tips for hole "+(hole)+"?");}}}
                    onKeyDown={e=>{if(e.key==="Enter"&&courseInput&&courseInput!==course){setCourse(courseInput);sendMessage("I'm playing "+(courseInput)+". Tips for hole "+(hole)+"?");}}}
                    style={{...S.input,fontSize:"13px",padding:"8px 12px"}}/>
                  {weather&&(
                    <div style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"12px",color:D.muted,padding:"4px 0"}}>
                      <span>{weather.icon}</span>
                      <span>{weather.temp}°{weather.unit}</span>
                      <span>-</span>
                      <span>Wind {weather.wind}mph {windDir(weather.windDeg)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* -- Chat messages -- */}
            <div style={{flex:1,padding:"12px 16px",display:"flex",flexDirection:"column",gap:"10px"}}>
              {messages.length===0&&(
                <div style={{textAlign:"center",padding:"32px 16px 16px"}}>
                  <div style={{marginBottom:"12px"}}><Ball size={48}/></div>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:"700",color:D.white,marginBottom:"6px"}}>
                    Hey{profile.name?" "+(profile.name.split(" ")[0]):""}! 👋
                  </div>
                  <div style={{fontSize:"14px",color:D.muted,lineHeight:1.6,marginBottom:"20px"}}>
                    Set your yardage above and I'll recommend a club, or just ask me anything.
                  </div>
                  {/* Quick prompts */}
                  <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                    {[
                      {label:"🏌️  Club for this yardage",msg:"I'm "+(yardage||150)+" yards out from "+(lie)+". What club?"},
                      {label:"🌬️  Wind adjustment",msg:"Wind is blowing. How should I adjust my shot?"},
                      {label:"🎯  Course strategy",msg:"What's the smart play on a par "+(par)+" at "+(yardage||150)+" yards?"},
                      {label:"📊  Check my scorecard",msg:"My current score is "+(totalScore)+" after "+(played)+" holes, "+(scoreDiff>0?"+"+scoreDiff:scoreDiff)+" vs par. How am I doing?"},
                    ].map(({label,msg})=>(
                      <button key={label} onClick={()=>sendMessage(msg)}
                        style={{background:D.surface,border:"1px solid "+(D.border),borderRadius:"12px",padding:"12px 16px",color:D.text,fontSize:"14px",cursor:"pointer",fontFamily:"'Inter',sans-serif",textAlign:"left",transition:"all 0.15s"}}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                  {m.role==="assistant"&&(
                    <div style={{width:"28px",height:"28px",borderRadius:"50%",background:D.accentDim,display:"flex",alignItems:"center",justifyContent:"center",marginRight:"8px",flexShrink:0,alignSelf:"flex-end",marginBottom:"2px"}}>
                      <Ball size={18}/>
                    </div>
                  )}
                  <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="user"?D.accent:D.card,color:m.role==="user"?"#fff":D.text,fontSize:"14px",lineHeight:1.6,fontFamily:"'Inter',sans-serif",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}>
                    {m.content}
                  </div>
                  {m.role==="assistant"&&(
                    <button onClick={()=>speak(m.content)} style={{background:"none",border:"none",cursor:"pointer",padding:"0 0 0 6px",color:D.muted,alignSelf:"flex-end",marginBottom:"4px",flexShrink:0}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    </button>
                  )}
                </div>
              ))}
              {loading&&(
                <div style={{display:"flex",gap:"5px",padding:"10px 14px",background:D.card,borderRadius:"18px 18px 18px 4px",alignSelf:"flex-start",marginLeft:"36px"}}>
                  {[0,1,2].map(i=><div key={i} style={{width:"6px",height:"6px",borderRadius:"50%",background:D.accent,animation:"pulse 1.2s infinite "+(i*0.2)+"s"}}/>)}
                </div>
              )}
            </div>

            {/* -- Scorecard strip (compact, only if playing) -- */}
            {played>0&&(
              <div style={{padding:"8px 16px",background:D.surface,borderTop:"1px solid "+(D.border),display:"flex",alignItems:"center",gap:"12px",overflowX:"auto"}}>
                <div style={{flexShrink:0}}>
                  <div style={{fontSize:"9px",color:D.muted,letterSpacing:"1px",textTransform:"uppercase"}}>Score</div>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"18px",fontWeight:"700",color:scoreDiff<0?D.accent:scoreDiff===0?D.blue:D.red,lineHeight:1}}>
                    {scoreDiff>0?"+"+scoreDiff:scoreDiff===0?"E":scoreDiff}
                  </div>
                </div>
                <div style={{width:"1px",height:"28px",background:D.border,flexShrink:0}}/>
                <div style={{display:"flex",gap:"4px",overflowX:"auto"}}>
                  {scores.slice(0,played).map((s,i)=>{
                    const diff=s-(holePars[i]||4);
                    const bg=diff<=-2?"#7c3aed":diff===-1?D.accent:diff===0?D.surface:diff===1?"#f59e0b44":D.red+"44";
                    const col=diff<=-2?"#fff":diff===-1?"#fff":diff===0?D.muted:diff===1?D.gold:D.red;
                    return <div key={i} style={{width:"22px",height:"22px",borderRadius:"6px",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"700",color:col,flexShrink:0}}>{s}</div>;
                  })}
                </div>
              </div>
            )}

            {/* -- Input bar -- */}
            <div style={{padding:"10px 12px",background:D.dark,borderTop:"1px solid "+(D.border),display:"flex",gap:"8px",alignItems:"center",position:"sticky",bottom:0}}>
              <input
                value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),sendMessage(input))}
                placeholder="Ask Obi anything…"
                style={{...S.input,flex:1,padding:"10px 14px",fontSize:"14px",borderRadius:"12px"}}
              />
              <button onClick={startListening} style={{background:listening?D.red:D.surface,border:"1px solid "+(listening?D.red:D.border),borderRadius:"10px",padding:"10px",cursor:"pointer",color:listening?"#fff":D.muted,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
              <button onClick={()=>sendMessage(input)} disabled={!input.trim()||loading}
                style={{background:input.trim()&&!loading?D.accent:D.surface,border:"none",borderRadius:"10px",padding:"10px 14px",cursor:input.trim()&&!loading?"pointer":"default",color:input.trim()&&!loading?"#fff":D.muted,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* PRACTICE TAB */}
        {tab==="practice"&&(
          <div style={{display:"flex",flexDirection:"column"}}>

            {/* Practice sub tabs */}
            <div style={{display:"flex",background:D.dark,borderBottom:"1px solid "+(D.border),position:"sticky",top:"52px",zIndex:10}}>
              {[
                {id:"swinglab",label:"Swing Lab"},
                {id:"range",label:"Range Mode"},
              ].map(t=>(
                <button key={t.id} onClick={()=>setPracticeSubTab(t.id)} style={{flex:1,padding:"10px 4px",background:"transparent",border:"none",borderBottom:"2px solid "+(practiceSubTab===t.id?D.accent:"transparent"),color:practiceSubTab===t.id?D.accent:D.muted,fontSize:"13px",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:practiceSubTab===t.id?"600":"400",transition:"all 0.15s"}}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* -- SWING LAB -- */}
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
                      <button key={g.v} onClick={()=>setProfile(p=>({...p,practiceGoal:g.v}))} style={{background:profile.practiceGoal===g.v?D.accentDim:D.surface,border:"1.5px solid "+(profile.practiceGoal===g.v?D.accent:D.border),borderRadius:"12px",padding:"12px 10px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"flex-start",gap:"4px",textAlign:"left",transition:"all 0.15s"}}>
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
                <div onClick={()=>fileRef.current?.click()} style={{background:swingFile?D.accentDim:D.surface,border:"2px dashed "+(swingFile?D.accent:D.border),borderRadius:"18px",padding:"24px",textAlign:"center",cursor:"pointer",marginBottom:"14px",transition:"all 0.2s"}}>
                  <input ref={fileRef} type="file" accept="video/*,image/*" onChange={e=>setSwingFile(e.target.files[0])} style={{display:"none"}}/>
                  {swingFile?<div><div style={{fontSize:"36px",marginBottom:"8px"}}>🎬</div><div style={{color:D.accent,fontWeight:"600",fontSize:"15px"}}>{swingFile.name}</div><div style={{color:D.muted,fontSize:"12px",marginTop:"4px"}}>Tap to change</div></div>:<div><div style={{fontSize:"44px",marginBottom:"10px"}}>📹</div><div style={{color:D.white,fontWeight:"600",fontSize:"16px"}}>Upload Swing Video</div><div style={{color:D.muted,fontSize:"13px",marginTop:"6px",lineHeight:1.5}}>Face-on or down-the-line - Video or photo</div></div>}
                </div>

                <button onClick={runSwingAnalysis} disabled={!swingFile||swingLoading||(profile.practiceGoal==="custom"&&!swingNotes.trim())} style={{...S.btnPrimary,opacity:(swingFile&&!swingLoading)?1:0.4,marginBottom:"20px"}}>
                  {swingLoading?"🔍 Obi is analyzing...":"🎯 Analyze My Swing"}
                </button>

                {swingLoading&&<div style={{...S.card,textAlign:"center",padding:"28px",marginBottom:"16px"}}><div style={{display:"flex",gap:"6px",justifyContent:"center",marginBottom:"14px"}}>{[0,1,2].map(i=><div key={i} style={{width:"10px",height:"10px",borderRadius:"50%",background:D.accent,animation:"bounce 1s infinite "+(i*0.15)+"s"}}/>)}</div><div style={{color:D.text,fontWeight:"600",fontSize:"15px",marginBottom:"4px"}}>Obi is watching your swing</div><div style={{color:D.muted,fontSize:"13px"}}>This takes 15-20 seconds...</div></div>}

                {swingAnalysis&&!swingLoading&&(
                  <div style={{...S.card,marginBottom:"20px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"}}><Ball size={32}/><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"17px",fontWeight:"700",color:D.white}}>Obi&apos;s Analysis</div></div>
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
                      <div key={i} style={{...S.card,marginBottom:"10px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"6px"}}>
                          <div>
                            <div style={{color:D.text,fontSize:"13px",fontWeight:"500"}}>{fmtDate(s.analyzed_at)}</div>
                            {s.notes&&<div style={{fontSize:"12px",color:D.accent,marginTop:"2px",fontStyle:"italic"}}>{s.notes.slice(0,50)}</div>}
                          </div>
                          <button onClick={async(e)=>{
                            e.stopPropagation();
                            const confirmed=window.confirm("Delete this swing analysis?");
                            if(!confirmed)return;
                            const{error}=await supabase.from("swing_analyses").delete().eq("id",s.id).eq("user_id",user.id);
                            if(error){ alert("Delete failed: "+error.message); return; }
                            loadSwings(user.id);
                          }} style={{background:"transparent",border:"none",color:D.muted,cursor:"pointer",padding:"4px",display:"flex",alignItems:"center"}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </div>
                        <div style={{fontSize:"13px",color:D.muted,lineHeight:1.5,cursor:"pointer"}} onClick={()=>setSelectedSwing(selectedSwing?.id===s.id?null:s)}>
                          {selectedSwing?.id===s.id
                            ?<div style={{color:D.text,whiteSpace:"pre-wrap",marginTop:"8px"}}>{s.analysis}</div>
                            :<div>{s.analysis?.slice(0,120)}… <span style={{color:D.accent}}>Read more</span></div>
                          }
                        </div>
                        {selectedSwing?.id===s.id&&<button onClick={()=>speak(s.analysis)} style={{marginTop:"8px",background:"none",border:"none",color:D.muted,fontSize:"12px",cursor:"pointer",padding:0,fontFamily:"'Inter',sans-serif"}}>🔊 Read aloud</button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* -- RANGE MODE -- */}
            {practiceSubTab==="range"&&(
              <div style={{padding:"20px 16px"}}>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"24px",fontWeight:"700",letterSpacing:"-0.3px",color:D.white,marginBottom:"4px"}}>Range Mode</div>
                <div style={{color:D.muted,fontSize:"14px",marginBottom:"20px",lineHeight:1.6}}>
                  Record your shot, get instant ball flight stats. Builds your real carry distances and shot shape profile over time.
                </div>

                {/* Setup tip */}
                <div style={{background:D.accentDim,border:"1px solid "+(D.accent)+"33",borderRadius:"12px",padding:"12px 16px",marginBottom:"20px",display:"flex",gap:"10px",alignItems:"flex-start"}}>
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
                        <button key={b.club} onClick={()=>setRangeClub(b.club)} style={{flexShrink:0,background:isSelected?D.accentDim:D.surface,border:"1.5px solid "+(isSelected?D.accent:D.border),borderRadius:"12px",padding:"10px 12px",cursor:"pointer",textAlign:"center",minWidth:"70px",transition:"all 0.15s"}}>
                          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:"700",fontSize:"13px",color:isSelected?D.accent:D.text}}>{b.club}</div>
                          <div style={{fontSize:"11px",color:isSelected?D.accent:D.muted,marginTop:"2px"}}>
                            {cs?.avgCarry?(cs.avgCarry)+"y avg":(b.carry)+"y"}
                          </div>
                          {cs?.count>0&&<div style={{fontSize:"10px",color:D.subtle,marginTop:"1px"}}>{cs.count} shots</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Club stats card if we have data */}
                {clubStats[rangeClub]?.count>=3&&(
                  <div style={{...S.card,marginBottom:"16px",background:"linear-gradient(135deg,"+(D.accentDim)+","+(D.surface)+")"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"16px",fontWeight:"700",color:D.white}}>{rangeClub} - Your Numbers</div>
                      <button onClick={()=>setShowClubProfile(rangeClub)} style={{...S.pill,color:D.accent,borderColor:D.accent+"44"}}>Full Profile</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"12px"}}>
                      {[
                        ["AVG CARRY",(clubStats[rangeClub].avgCarry)+"y",D.accent],
                        ["RANGE",(clubStats[rangeClub].minCarry)+"-"+(clubStats[rangeClub].maxCarry)+"y",D.text],
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
                      <div style={{...S.pill,background:D.surface,color:clubStats[rangeClub].consistencyStars>=4?D.accent:clubStats[rangeClub].consistencyStars>=3?D.gold:D.red}}>
                        {"⭐".repeat(Math.max(0,clubStats[rangeClub].consistencyStars||0))} {clubStats[rangeClub].consistency}
                      </div>
                    </div>
                  </div>
                )}

                {/* Camera Recording / Upload */}
                {!rangeFile&&!isRecording&&(
                  <div style={{marginBottom:"14px"}}>
                    <button
                      onClick={async()=>{
                        try{
                          const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});
                          const mimeType=MediaRecorder.isTypeSupported("video/mp4")?"video/mp4":"video/webm";
                          const mr=new MediaRecorder(stream,{mimeType});
                          const chunks=[];
                          mr.ondataavailable=e=>chunks.push(e.data);
                          mr.onstop=()=>{
                            stream.getTracks().forEach(t=>t.stop());
                            const blob=new Blob(chunks,{type:mimeType});
                            setRangeFile(new File([blob],"shot."+(mimeType.includes("mp4")?"mp4":"webm"),{type:blob.type}));
                            setIsRecording(false);
                          };
                          setMediaRecorder(mr);
                          setIsRecording(true);
                          mr.start();
                          setTimeout(()=>{ if(mr.state==="recording") mr.stop(); },15000);
                        }catch(err){
                          alert("Camera access needed. Please allow camera in browser settings, then try uploading instead.");
                        }
                      }}
                      style={{...S.btnPrimary,marginBottom:"10px",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>
                      Record My Shot
                    </button>
                    <button onClick={()=>rangeFileRef.current?.click()} style={{...S.btnSecondary,display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",fontSize:"14px"}}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      Upload from camera roll
                    </button>
                    <input ref={rangeFileRef} type="file" accept="video/*" onChange={e=>setRangeFile(e.target.files[0])} style={{display:"none"}}/>
                  </div>
                )}

                {/* Recording in progress */}
                {isRecording&&(
                  <div style={{background:D.red+"18",border:"2px solid "+(D.red)+"55",borderRadius:"16px",padding:"20px",textAlign:"center",marginBottom:"14px"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",marginBottom:"12px"}}>
                      <div style={{width:"10px",height:"10px",borderRadius:"50%",background:D.red,animation:"pulse 1s infinite"}}/>
                      <span style={{color:D.red,fontWeight:"600",fontSize:"15px",fontFamily:"'Space Grotesk',sans-serif"}}>Recording your shot...</span>
                    </div>
                    <div style={{color:D.muted,fontSize:"13px",marginBottom:"14px"}}>Swing when ready - auto-stops at 15s</div>
                    <button onClick={()=>{ if(mediaRecorder&&mediaRecorder.state==="recording") mediaRecorder.stop(); }} style={{background:D.red,border:"none",borderRadius:"10px",color:"#fff",fontWeight:"600",fontSize:"14px",padding:"10px 24px",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                      Done - Stop Recording
                    </button>
                  </div>
                )}

                {/* Video ready to analyze */}
                {rangeFile&&!isRecording&&(
                  <div style={{background:D.accentDim,border:"1.5px solid "+(D.accent)+"55",borderRadius:"14px",padding:"12px 14px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"12px"}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={D.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                    <div style={{flex:1}}>
                      <div style={{color:D.accent,fontWeight:"600",fontSize:"14px"}}>Shot recorded ✓</div>
                      <div style={{color:D.muted,fontSize:"12px",marginTop:"1px"}}>{rangeClub} - tap analyze when ready</div>
                    </div>
                    <button onClick={()=>setRangeFile(null)} style={{background:"transparent",border:"none",color:D.muted,cursor:"pointer",padding:"4px"}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )}

                <button onClick={runRangeAnalysis} disabled={!rangeFile||rangeLoading||isRecording} style={{...S.btnPrimary,opacity:rangeFile&&!rangeLoading&&!isRecording?1:0.4,marginBottom:"20px"}}>
                  {rangeLoading?"📡 Analyzing shot...":"📊 Analyze Shot"}
                </button>


                {/* Loading */}
                {rangeLoading&&(
                  <div style={{...S.card,textAlign:"center",padding:"28px",marginBottom:"16px"}}>
                    <div style={{display:"flex",gap:"6px",justifyContent:"center",marginBottom:"14px"}}>{[0,1,2].map(i=><div key={i} style={{width:"10px",height:"10px",borderRadius:"50%",background:D.accent,animation:"bounce 1s infinite "+(i*0.15)+"s"}}/>)}</div>
                    <div style={{color:D.text,fontWeight:"600",fontSize:"15px",marginBottom:"4px"}}>Reading your ball flight...</div>
                    <div style={{color:D.muted,fontSize:"13px"}}>Analyzing shape, carry, and contact - 15-20 seconds</div>
                  </div>
                )}

                {/* Shot result */}
                {rangeShotResult&&!rangeLoading&&(
                  rangeShotResult.error?(
                    <div style={{...S.card,marginBottom:"16px",borderColor:D.red+"44"}}>
                      <div style={{color:D.red,fontSize:"14px"}}>Analysis failed: {rangeShotResult.error}</div>
                    </div>
                  ):(
                    <div>
                      {/* Animated shot shape diagram */}
                      <ShotShapeDiagram result={rangeShotResult} club={rangeClub} dexterity={profile.dexterity} T={D}/>

                    <div style={{...S.card,marginBottom:"16px",background:D.card}}>
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
                            Your avg: {clubStats[rangeClub].avgCarry}y - {rangeShotResult.estimated_carry>clubStats[rangeClub].avgCarry?"+"+(rangeShotResult.estimated_carry-clubStats[rangeClub].avgCarry)+" above avg":(rangeShotResult.estimated_carry-clubStats[rangeClub].avgCarry)+" below avg"}
                          </div>
                        )}
                      </div>

                      {/* Stats grid */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"14px"}}>
                        {[
                          ["Shot Shape",rangeShotResult.shot_shape,D.blue],
                          ["Launch",rangeShotResult.launch_angle,D.gold],
                          ["Contact",rangeShotResult.contact_quality,rangeShotResult.contact_quality==="flush"?D.accent:rangeShotResult.contact_quality?.includes("thin")||rangeShotResult.contact_quality?.includes("fat")?D.red:D.gold],
                          ["Ball Flight",rangeShotResult.ball_flight,D.text],
                          ["Swing Path",rangeShotResult.swing_path,D.blue],
                          ["Club",rangeClub,D.muted],
                        ].map(([l,v,c])=>(
                          <div key={l} style={{background:"rgba(0,0,0,0.2)",borderRadius:"10px",padding:"10px 8px",textAlign:"center"}}>
                            <div style={{fontSize:"9px",color:D.muted,letterSpacing:"1px",marginBottom:"4px",textTransform:"uppercase"}}>{l}</div>
                            <div style={{fontSize:"12px",color:c,fontWeight:"600",textTransform:"capitalize"}}>{v||"-"}</div>
                          </div>
                        ))}
                      </div>

                      {/* Obi tip */}
                      {rangeShotResult.tip&&(
                        <div style={{background:D.accentDim,borderRadius:"12px",padding:"12px 14px",borderLeft:"3px solid "+(D.accent)}}>
                          <div style={{fontSize:"10px",color:D.accent,letterSpacing:"1.5px",marginBottom:"6px"}}>OBI SAYS</div>
                          <div style={{fontSize:"14px",color:D.text,lineHeight:1.6}}>{rangeShotResult.tip}</div>
                        </div>
                      )}

                      <div style={{display:"flex",gap:"8px",marginTop:"12px"}}>
                        <button onClick={()=>speak((rangeClub)+". Estimated carry "+(rangeShotResult.estimated_carry)+" yards. Shot shape: "+(rangeShotResult.shot_shape)+". Contact: "+(rangeShotResult.contact_quality)+". "+(rangeShotResult.tip||""))} style={{...S.pill}}>🔊 Read</button>
                        <button onClick={()=>{setRangeShotResult(null);setRangeFile(null);}} style={{...S.pill}}>🔄 Next shot</button>
                      </div>
                    </div>
                    </div>
                  )
                )}

                {/* Shot history by club */}
                {rangeHistory.length>0&&(
                  <div>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"17px",fontWeight:"600",letterSpacing:"-0.2px",color:D.white,margin:"0 0 12px"}}>Recent Shots</div>
                    {(showAllShots?rangeHistory:rangeHistory.slice(0,5)).map((s,i)=>{
                      const diff=clubStats[s.club]?.avgCarry?s.estimated_carry-clubStats[s.club].avgCarry:null;
                      return(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px 14px",background:D.surface,borderRadius:"10px",border:"1px solid "+(D.border),marginBottom:"6px"}}>
                          <div style={{minWidth:"72px"}}>
                            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:"700",fontSize:"13px",color:D.text}}>{s.club}</div>
                            <div style={{fontSize:"11px",color:D.muted}}>{fmtDateShort(s.recorded_at)}</div>
                          </div>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                              <span style={{...S.pill,fontSize:"11px",padding:"2px 8px"}}>{s.shot_shape||"-"}</span>
                              <span style={{...S.pill,fontSize:"11px",padding:"2px 8px"}}>{s.contact_quality||"-"}</span>
                            </div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:"800",color:D.accent,lineHeight:1}}>{s.estimated_carry}</div>
                            <div style={{fontSize:"10px",color:diff>0?D.accent:diff<0?D.red:D.muted}}>{diff!=null?(diff>0?"+"+(diff):(diff)):""}y</div>
                          </div>
                          <button onClick={async(e)=>{
                            e.stopPropagation();
                            if(!window.confirm("Delete this shot?"))return;
                            const{error}=await supabase.from("range_shots").delete().eq("id",s.id).eq("user_id",user.id);
                            if(error){alert("Delete failed: "+error.message);return;}
                            loadRangeHistory(user.id);
                          }} style={{background:"transparent",border:"none",color:D.muted,cursor:"pointer",padding:"4px",flexShrink:0,display:"flex",alignItems:"center",marginLeft:"auto"}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </div>
                      );
                    })}
                    {!showAllShots&&rangeHistory.length>5&&(
                      <button onClick={()=>setShowAllShots(true)} style={{width:"100%",background:D.surface,border:"1px solid "+(D.border),borderRadius:"10px",padding:"10px",color:D.muted,fontSize:"13px",cursor:"pointer",fontFamily:"'Inter',sans-serif",marginTop:"4px"}}>
                        View {rangeHistory.length-5} more shots v
                      </button>
                    )}
                    {showAllShots&&rangeHistory.length>5&&(
                      <button onClick={()=>setShowAllShots(false)} style={{width:"100%",background:"transparent",border:"none",color:D.muted,fontSize:"12px",cursor:"pointer",fontFamily:"'Inter',sans-serif",padding:"6px",marginTop:"2px"}}>
                        Show less ^
                      </button>
                    )}
                  </div>
                )}

          </div>
        )}

        {tab==="social"&&(
          <div>
            <div style={{display:"flex",background:D.dark,borderBottom:"1px solid "+(D.border),position:"sticky",top:"52px",zIndex:10}}>
              {[{id:"feed",label:"Feed"},{id:"rounds",label:"My Rounds"},{id:"friends",label:"Friends"+(friendReqs.length>0?" -"+friendReqs.length:"")}].map(t=>(
                <button key={t.id} onClick={()=>setSocialView(t.id)}
                  style={{flex:1,padding:"11px 4px",background:"transparent",border:"none",borderBottom:"2px solid "+(socialView===t.id?D.accent:"transparent"),color:socialView===t.id?D.accent:D.muted,fontSize:"13px",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:socialView===t.id?"600":"400",transition:"all 0.15s"}}>
                  {t.label}
                </button>
              ))}
            </div>
            <div style={{padding:"16px"}}>

              {/* FEED */}
              {socialView==="feed"&&(
                <>
                  {feed.length===0?(
                    <div style={{textAlign:"center",padding:"48px 20px"}}>
                      <div style={{fontSize:"40px",marginBottom:"12px"}}>👥</div>
                      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"18px",fontWeight:"700",color:D.white,marginBottom:"6px"}}>Add friends to see their rounds</div>
                      <div style={{color:D.muted,fontSize:"14px",marginBottom:"20px"}}>Your feed will show up here</div>
                      <button onClick={()=>setSocialView("friends")} style={{...S.btnPrimary,width:"auto",padding:"10px 24px"}}>Find Friends</button>
                    </div>
                  ):(
                    <>
                      {(showAllFeed?feed:feed.slice(0,5)).map((r,i)=>{
                        const diff=r.total_score-r.total_par;
                        const isMe=r.user_id===user?.id;
                        return(
                          <div key={i} style={{background:D.card,border:"1px solid "+(D.border),borderRadius:"14px",marginBottom:"10px",overflow:"hidden"}}>
                            <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"12px 14px"}}>
                              <Avatar name={r.profile?.full_name} size={36} highlight={isMe} photoUrl={r.profile?.avatar_url} T={D} onClick={()=>r.profile?.avatar_url&&setShowAvatarZoom(r.profile.avatar_url)}/>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontWeight:"600",color:D.white,fontSize:"14px",fontFamily:"'Space Grotesk',sans-serif"}}>
                                  {r.profile?.full_name||"Golfer"}{isMe&&<span style={{color:D.accent,fontSize:"10px",marginLeft:"6px"}}>you</span>}
                                </div>
                                <div style={{fontSize:"12px",color:D.muted,marginTop:"1px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.course_name||"Unknown course"} - {fmtDateShort(r.played_at)}</div>
                              </div>
                              <div style={{textAlign:"right",flexShrink:0}}>
                                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"22px",fontWeight:"700",color:diff<0?D.accent:diff===0?D.blue:D.red,lineHeight:1}}>{diff>0?"+"+diff:diff===0?"E":diff}</div>
                                <div style={{fontSize:"11px",color:D.muted}}>{r.total_score} strokes</div>
                              </div>
                            </div>
                            <div style={{display:"flex",borderTop:"1px solid "+(D.border)}}>
                              <button onClick={()=>{const j=randJab();setJabPost(j);}} style={{flex:1,background:"transparent",border:"none",color:D.muted,fontSize:"12px",cursor:"pointer",fontFamily:"'Inter',sans-serif",padding:"8px",display:"flex",alignItems:"center",justifyContent:"center",gap:"5px"}}>😂 Jab</button>
                              {isMe&&<button onClick={()=>shareRound(r)} style={{flex:1,background:"transparent",border:"none",borderLeft:"1px solid "+(D.border),color:D.accent,fontSize:"12px",cursor:"pointer",fontFamily:"'Inter',sans-serif",padding:"8px",fontWeight:"600",display:"flex",alignItems:"center",justifyContent:"center",gap:"5px"}}>📤 Share</button>}
                            </div>
                          </div>
                        );
                      })}
                      {!showAllFeed&&feed.length>5&&(
                        <button onClick={()=>setShowAllFeed(true)} style={{width:"100%",background:D.surface,border:"1px solid "+(D.border),borderRadius:"12px",padding:"12px",color:D.muted,fontSize:"13px",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                          View {feed.length-5} more rounds v
                        </button>
                      )}
                      {showAllFeed&&feed.length>5&&(
                        <button onClick={()=>setShowAllFeed(false)} style={{width:"100%",background:"transparent",border:"none",color:D.muted,fontSize:"12px",cursor:"pointer",fontFamily:"'Inter',sans-serif",padding:"8px"}}>Show less ^</button>
                      )}
                    </>
                  )}
                </>
              )}

              {/* MY ROUNDS */}
              {socialView==="rounds"&&(
                <>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"17px",fontWeight:"700",color:D.white,marginBottom:"14px"}}>My Rounds</div>
                  {myRounds.length===0?(
                    <div style={{textAlign:"center",padding:"32px 20px",color:D.muted,fontSize:"14px"}}>No rounds saved yet.</div>
                  ):myRounds.map((r,i)=>{
                    const diff=r.total_score-r.total_par;
                    return(
                      <div key={i} style={{...S.card,marginBottom:"10px",display:"flex",alignItems:"center",gap:"12px"}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:"600",color:D.white,fontSize:"14px",fontFamily:"'Space Grotesk',sans-serif"}}>{r.course_name||"Unknown course"}</div>
                          <div style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>{r.holes_played} holes - {fmtDate(r.played_at)}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"22px",fontWeight:"700",color:diff<0?D.accent:diff===0?D.blue:D.red,lineHeight:1}}>{diff>0?"+"+diff:diff===0?"E":diff}</div>
                          <div style={{fontSize:"11px",color:D.muted}}>{r.total_score}</div>
                        </div>
                        <button onClick={()=>shareRound(r)} style={{background:D.surface,border:"1px solid "+(D.border),borderRadius:"10px",padding:"8px",cursor:"pointer",color:D.muted}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        </button>
                      </div>
                    );
                  })}
                </>
              )}

              {/* FRIENDS */}
              {socialView==="friends"&&(
                <>
                  {friendReqs.length>0&&(
                    <div style={{marginBottom:"20px"}}>
                      <div style={{fontSize:"12px",color:D.accent,fontWeight:"600",letterSpacing:"1px",textTransform:"uppercase",marginBottom:"10px"}}>Requests</div>
                      {friendReqs.map((req,i)=>(
                        <div key={i} style={{...S.card,marginBottom:"8px",display:"flex",alignItems:"center",gap:"10px"}}>
                          <Avatar name={req.requester?.full_name} size={36} photoUrl={req.requester?.avatar_url} T={D}/>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:"600",color:D.white,fontSize:"14px"}}>{req.requester?.full_name}</div>
                            <div style={{fontSize:"12px",color:D.muted}}>wants to connect</div>
                          </div>
                          <button onClick={()=>acceptFriendReq(req.id,req.user_id)} style={{background:D.accentDim,border:"1px solid "+(D.accent)+"44",borderRadius:"8px",color:D.accent,fontSize:"12px",cursor:"pointer",padding:"6px 12px",fontWeight:"600"}}>Accept</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{marginBottom:"16px"}}>
                    <input placeholder="Search by name…" value={friendSearch} onChange={e=>{setFriendSearch(e.target.value);searchUsers(e.target.value);}} style={{...S.input}}/>
                  </div>
                  {searchRes.map((u,i)=>(
                    <div key={i} style={{...S.card,marginBottom:"8px",display:"flex",alignItems:"center",gap:"10px"}}>
                      <Avatar name={u.full_name} size={36} photoUrl={u.avatar_url} T={D}/>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:"600",color:D.white,fontSize:"14px"}}>{u.full_name}</div>
                        <div style={{fontSize:"12px",color:D.muted}}>{u.handicap_category||"Golfer"}</div>
                      </div>
                      <button onClick={()=>sendFriendReq(u.id)} style={{background:D.accentDim,border:"1px solid "+(D.accent)+"44",borderRadius:"8px",color:D.accent,fontSize:"12px",cursor:"pointer",padding:"6px 12px",fontWeight:"600"}}>Add</button>
                    </div>
                  ))}
                  {friends.length>0&&!friendSearch&&(
                    <>
                      <div style={{fontSize:"12px",color:D.muted,fontWeight:"600",letterSpacing:"1px",textTransform:"uppercase",marginBottom:"10px",marginTop:"4px"}}>Your Friends</div>
                      {friends.map((f,i)=>(
                        <div key={i} style={{...S.card,marginBottom:"8px",display:"flex",alignItems:"center",gap:"10px"}}>
                          <Avatar name={f.full_name} size={36} photoUrl={f.avatar_url} T={D}/>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:"600",color:D.white,fontSize:"14px"}}>{f.full_name}</div>
                            <div style={{fontSize:"12px",color:D.muted}}>{f.handicap_category||"Golfer"}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {tab==="profile"&&(
          <div style={{padding:"16px"}}>

            {/* Avatar hero */}
            <div style={{...S.card,marginBottom:"12px",display:"flex",alignItems:"center",gap:"14px"}}>
              <div style={{position:"relative",flexShrink:0}}>
                <Avatar name={userProfile?.full_name||user?.email} size={60} photoUrl={avatarUrl} T={D}/>
                <button onClick={()=>avatarInputRef.current?.click()} style={{position:"absolute",bottom:0,right:0,width:"22px",height:"22px",borderRadius:"50%",background:D.accent,border:"2px solid "+(D.bg),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:0}}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={e=>e.target.files[0]&&uploadAvatar(e.target.files[0])} style={{display:"none"}}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"18px",fontWeight:"700",color:D.white}}>{userProfile?.full_name||"Your Name"}</div>
                <div style={{fontSize:"12px",color:D.muted,marginTop:"2px"}}>{user?.email}</div>
                <div style={{display:"flex",gap:"6px",marginTop:"6px",flexWrap:"wrap"}}>
                  {profile.homeCourse&&<span style={{fontSize:"11px",color:D.muted,background:D.surface,borderRadius:"99px",padding:"2px 8px"}}>📍 {profile.homeCourse}</span>}
                  <span style={{fontSize:"11px",color:D.accent,background:D.accentDim,borderRadius:"99px",padding:"2px 8px"}}>{profile.handicap==="scratch"?"Scratch":profile.handicap==="plus"?"+Handicap":profile.handicap==="low"?"Low (1-9)":profile.handicap==="mid"?"Mid (10-18)":"High (19+)"}</span>
                </div>
              </div>
              {uploadingAvatar&&<div style={{fontSize:"12px",color:D.accent,flexShrink:0}}>Uploading…</div>}
            </div>

            {/* My Game section */}
            <div style={{...S.card,marginBottom:"10px",overflow:"hidden",padding:0}}>
              <button onClick={()=>setProfileSection(s=>s==="game"?null:"game")} style={{width:"100%",background:"transparent",border:"none",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",color:D.white,fontFamily:"'Space Grotesk',sans-serif",fontSize:"15px",fontWeight:"600"}}>
                ⛳ My Game
                <span style={{color:D.muted,fontSize:"12px"}}>{profileSection==="game"?"▲":"▼"}</span>
              </button>
              {profileSection==="game"&&(
                <div style={{padding:"14px 16px 16px",borderTop:"1px solid "+(D.border)}}>
                  <div style={{marginBottom:"14px"}}>
                    <div style={{fontSize:"12px",color:D.muted,marginBottom:"6px",fontWeight:"500"}}>Handicap</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                      {[{v:"plus",l:"+HCP"},{v:"scratch",l:"Scratch"},{v:"low",l:"Low (1-9)"},{v:"mid",l:"Mid (10-18)"},{v:"high",l:"High (19+)"}].map(function(item){return(
                        <button key={item.v} onClick={()=>setProfile(p=>({...p,handicap:item.v}))} style={{background:profile.handicap===item.v?D.accentDim:D.surface,border:"1px solid "+(profile.handicap===item.v?D.accent:D.border),borderRadius:"8px",color:profile.handicap===item.v?D.accent:D.muted,padding:"6px 12px",fontSize:"13px",cursor:"pointer"}}>{item.l}</button>
                      );})}
                    </div>
                  </div>
                  <div style={{marginBottom:"14px"}}>
                    <div style={{fontSize:"12px",color:D.muted,marginBottom:"6px",fontWeight:"500"}}>Typical miss</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                      {["straight","slight fade","fade","slice","slight draw","draw","hook"].map(function(v){return(
                        <button key={v} onClick={()=>setProfile(p=>({...p,missTend:v}))} style={{background:profile.missTend===v?D.accentDim:D.surface,border:"1px solid "+(profile.missTend===v?D.accent:D.border),borderRadius:"8px",color:profile.missTend===v?D.accent:D.muted,padding:"6px 12px",fontSize:"12px",cursor:"pointer",textTransform:"capitalize"}}>{v}</button>
                      );})}
                    </div>
                  </div>
                  <div style={{marginBottom:"14px"}}>
                    <div style={{fontSize:"12px",color:D.muted,marginBottom:"6px",fontWeight:"500"}}>Home course</div>
                    <input placeholder="e.g. Pebble Beach" value={profile.homeCourse||""} onChange={e=>setProfile(p=>({...p,homeCourse:e.target.value}))} style={{...S.input}}/>
                  </div>
                  <div style={{marginBottom:"14px"}}>
                    <div style={{fontSize:"12px",color:D.muted,marginBottom:"6px",fontWeight:"500"}}>Caddie persona</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                      {[{v:"hype",l:"🔥 Hype Man"},{v:"pro",l:"🎯 Tour Pro"},{v:"coach",l:"📚 Coach"},{v:"savage",l:"😂 Savage"}].map(function(item){return(
                        <button key={item.v} onClick={()=>setProfile(p=>({...p,persona:item.v}))} style={{background:profile.persona===item.v?D.accentDim:D.surface,border:"1px solid "+(profile.persona===item.v?D.accent:D.border),borderRadius:"8px",color:profile.persona===item.v?D.accent:D.muted,padding:"6px 12px",fontSize:"13px",cursor:"pointer"}}>{item.l}</button>
                      );})}
                    </div>
                  </div>
                  <button onClick={saveProfile} style={{...S.btnPrimary}}>Save Changes</button>
                </div>
              )}
            </div>

            {/* My Bag section */}
            <div style={{...S.card,marginBottom:"10px",overflow:"hidden",padding:0}}>
              <button onClick={()=>setProfileSection(s=>s==="bag"?null:"bag")} style={{width:"100%",background:"transparent",border:"none",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",color:D.white,fontFamily:"'Space Grotesk',sans-serif",fontSize:"15px",fontWeight:"600"}}>
                🏌️ My Bag
                <span style={{color:D.muted,fontSize:"12px"}}>{profileSection==="bag"?"▲":"▼"}</span>
              </button>
              {profileSection==="bag"&&(
                <div style={{padding:"14px 16px 16px",borderTop:"1px solid "+(D.border)}}>
                  <div style={{fontSize:"13px",color:D.muted,marginBottom:"12px"}}>Set carry distances so Obi can recommend the right club.</div>
                  {profile.bag.map(function(b,i){return(
                    <div key={b.club} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
                      <div style={{width:"64px",fontSize:"13px",color:D.text,fontWeight:"500",flexShrink:0}}>{b.club}</div>
                      <input type="number" value={b.carry||""} onChange={e=>{const n=[...profile.bag];n[i]={...b,carry:parseInt(e.target.value)||0};setProfile(p=>({...p,bag:n}));}} placeholder="yds" style={{...S.input,width:"80px",padding:"7px 10px",fontSize:"14px",textAlign:"center"}}/>
                      <div style={{fontSize:"12px",color:D.muted}}>yards</div>
                    </div>
                  );})}
                  <button onClick={saveProfile} style={{...S.btnPrimary,marginTop:"8px"}}>Save Bag</button>
                </div>
              )}
            </div>

            {/* App Settings section */}
            <div style={{...S.card,marginBottom:"10px",overflow:"hidden",padding:0}}>
              <button onClick={()=>setProfileSection(s=>s==="app"?null:"app")} style={{width:"100%",background:"transparent",border:"none",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",color:D.white,fontFamily:"'Space Grotesk',sans-serif",fontSize:"15px",fontWeight:"600"}}>
                ⚙️ App Settings
                <span style={{color:D.muted,fontSize:"12px"}}>{profileSection==="app"?"▲":"▼"}</span>
              </button>
              {profileSection==="app"&&(
                <div style={{padding:"14px 16px 16px",borderTop:"1px solid "+(D.border)}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",marginBottom:"12px"}}>
                    <span style={{fontSize:"14px",color:D.text}}>Dark Mode</span>
                    <button onClick={()=>setDarkMode(d=>!d)} style={{background:darkMode?D.accent:D.surface,border:"1px solid "+(D.border),borderRadius:"99px",padding:"4px",cursor:"pointer",width:"44px",height:"26px",position:"relative",transition:"background 0.2s"}}>
                      <div style={{position:"absolute",top:"3px",left:darkMode?"20px":"3px",width:"20px",height:"20px",borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                    </button>
                  </div>
                  <div style={{height:"1px",background:D.border,marginBottom:"12px"}}/>
                  <button onClick={fetchWeather} style={{...S.btnSecondary,fontSize:"14px",marginBottom:"10px"}}>Refresh Weather</button>
                  <button onClick={handleLogout} style={{background:"transparent",border:"1.5px solid "+(D.red)+"44",borderRadius:"12px",color:D.red,fontSize:"14px",padding:"12px",cursor:"pointer",fontFamily:"'Inter',sans-serif",width:"100%"}}>Sign Out</button>
                </div>
              )}
            </div>

          </div>
        )}


      </div>
    </div>
  );
}

export default function ObiGolf(){ return <ErrorBoundary><ObiGolfApp/></ErrorBoundary>; }
