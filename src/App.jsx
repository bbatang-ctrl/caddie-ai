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

let CapGeo=null,CapHaptics=null,CapSpeech=null,CapKeyboard=null,CapStatusBar=null,CapSplash=null;
(async()=>{
  try{
    const isNative=window.Capacitor?.isNativePlatform?.();
    if(isNative){
      ({Geolocation:CapGeo}=await import('@capacitor/geolocation'));
      ({Haptics:CapHaptics}=await import('@capacitor/haptics'));
      ({Keyboard:CapKeyboard}=await import('@capacitor/keyboard'));
      ({StatusBar:CapStatusBar}=await import('@capacitor/status-bar'));
      ({SplashScreen:CapSplash}=await import('@capacitor/splash-screen'));
      setTimeout(()=>CapSplash?.hide({fadeOutDuration:500}),500);
      CapStatusBar?.setStyle({style:'DARK'});
      CapStatusBar?.setBackgroundColor({color:'#0d0d12'});
    }
  }catch(e){console.log('Capacitor plugins not available (web mode)');}}
)();
import { Home,MessageCircle,Target,Users,Sun,Moon,Settings,Cloud,ChevronRight,ChevronDown,MapPin,ArrowUp,Video,Sparkles,LogOut,Briefcase,BarChart3,X,TrendingDown,TrendingUp,Trophy } from "lucide-react";
function cn(...c){return c.filter(Boolean).join(" ");}

// ─── Swing video analysis helpers ────────────────────────────────────────────
let _poseLandmarker=null,_poseLandmarkerLoading=false;
async function loadPoseLandmarker(){
  if(_poseLandmarker)return _poseLandmarker;
  if(_poseLandmarkerLoading)return null;
  _poseLandmarkerLoading=true;
  try{
    const{FilesetResolver,PoseLandmarker}=await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs");
    const vision=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
    _poseLandmarker=await PoseLandmarker.createFromOptions(vision,{
      baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",delegate:"CPU"},
      runningMode:"IMAGE",numPoses:1
    });
    _poseLandmarkerLoading=false;
    return _poseLandmarker;
  }catch(e){console.warn("MediaPipe load failed:",e);_poseLandmarkerLoading=false;return null;}
}
function drawPoseOnCanvas(canvas,landmarks){
  if(!landmarks?.length)return;
  const ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height;
  const pt=(i)=>({x:landmarks[i].x*W,y:landmarks[i].y*H});
  const vis=(i)=>(landmarks[i]?.visibility??1)>0.4;
  // Skeleton connections
  [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[24,26],[25,27],[26,28]].forEach(([a,b])=>{
    if(!vis(a)||!vis(b))return;
    const pa=pt(a),pb=pt(b);
    ctx.strokeStyle="rgba(0,255,128,0.6)";ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();
  });
  [11,12,13,14,15,16,23,24,25,26].forEach(i=>{
    if(!vis(i))return;const p=pt(i);
    ctx.fillStyle="#00ff80";ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fill();
  });
  // Golf key lines (spine / shoulders / hips)
  if(vis(11)&&vis(12)&&vis(23)&&vis(24)){
    const ls=pt(11),rs=pt(12),lh=pt(23),rh=pt(24);
    const smx=(ls.x+rs.x)/2,smy=(ls.y+rs.y)/2,hmx=(lh.x+rh.x)/2,hmy=(lh.y+rh.y)/2;
    const dx=hmx-smx,dy=hmy-smy;
    // Spine angle — yellow dashed
    const spineDeg=Math.round(Math.abs(Math.atan2(Math.abs(dx),Math.abs(dy))*180/Math.PI));
    ctx.save();ctx.strokeStyle="rgba(255,220,0,0.9)";ctx.lineWidth=2.5;ctx.setLineDash([6,3]);
    ctx.beginPath();ctx.moveTo(smx-dx*0.2,smy-dy*0.2);ctx.lineTo(hmx+dx*0.2,hmy+dy*0.2);ctx.stroke();ctx.restore();
    ctx.fillStyle="#ffe000";ctx.font="bold 11px sans-serif";ctx.fillText("Spine "+spineDeg+"°",hmx+5,hmy);
    // Shoulder line — blue dashed
    const shDeg=Math.round(Math.abs(Math.atan2(rs.y-ls.y,rs.x-ls.x)*180/Math.PI));
    ctx.save();ctx.strokeStyle="rgba(100,180,255,0.85)";ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(ls.x,ls.y);ctx.lineTo(rs.x,rs.y);ctx.stroke();ctx.restore();
    ctx.fillStyle="#64b4ff";ctx.font="bold 10px sans-serif";ctx.fillText("Shldr "+shDeg+"°",Math.min(ls.x,rs.x),Math.min(ls.y,rs.y)-4);
    // Hip line — red dashed
    const hipDeg=Math.round(Math.abs(Math.atan2(rh.y-lh.y,rh.x-lh.x)*180/Math.PI));
    ctx.save();ctx.strokeStyle="rgba(255,120,120,0.85)";ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(lh.x,lh.y);ctx.lineTo(rh.x,rh.y);ctx.stroke();ctx.restore();
    ctx.fillStyle="#ff7878";ctx.font="bold 10px sans-serif";ctx.fillText("Hip "+hipDeg+"°",Math.min(lh.x,rh.x),Math.max(lh.y,rh.y)+13);
  }
}
// ── Frame extraction log buffer ────────────────────────────────────────────────
// processSwingVideo writes here so callers can attach logs to the swing entry
// and display them on-screen (useful on mobile where devtools are unavailable).
let _frameLogBuf=[];
const _flog=(...args)=>{
  const msg=args.map(a=>typeof a==="object"?JSON.stringify(a):String(a)).join(" ");
  _frameLogBuf.push(msg);
  console.log("[frames]",msg);
};

// ── Production-grade sequential frame extractor ────────────────────────────────
// WHY one video element + sequential seeks:
//   The old approach (3 parallel video elements) caused ALL THREE frames to be
//   IDENTICAL because each element reads from the same shared GPU decode buffer.
//   The decoder hadn't advanced to the correct timestamp before canvas.drawImage()
//   fired — so every capture got the same first decoded frame.
//
// The fix (matching production sports-video apps):
//   1. ONE video element — eliminates shared-buffer aliasing.
//   2. Sequential seeks — each fully completes before the next starts.
//   3. requestVideoFrameCallback (or 2× RAF fallback) — waits for the GPU to
//      composit the decoded frame before capture. This is the critical barrier
//      that guarantees canvas reads the *correct* frame, not the previous one.
//   4. DOM attachment + play() warm-up — iOS Safari requirements for accurate seeks.
async function processSwingVideo(videoSource,parsedResult){
  _frameLogBuf=[];
  const isBlob=videoSource instanceof Blob;
  const srcType=isBlob
    ?`Blob ${(videoSource.size/1024/1024).toFixed(1)}MB type=${videoSource.type||"(empty)"}`
    :`URL ${String(videoSource).slice(0,90)}`;
  _flog("▶ started —",srcType);

  const url=isBlob?URL.createObjectURL(videoSource):videoSource;

  // Single DOM-attached video element (iOS Safari requires DOM presence for decoding)
  const video=document.createElement("video");
  video.muted=true;video.playsInline=true;video.preload="auto";
  if(!isBlob)video.crossOrigin="anonymous";
  video.style.cssText="position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(video);

  const cleanup=()=>{
    video.pause();
    video.src="";  // release the media decoder before removing from DOM
    try{document.body.removeChild(video);}catch{}
    if(isBlob)URL.revokeObjectURL(url);
  };

  try{
    // Set handlers BEFORE src so we can't miss a fast-loading cached video
    video.src=url;
    video.load(); // explicit load call — more reliable than relying on src assignment alone

    // 1 ── Wait for metadata (gives us duration + dimensions)
    await new Promise((resolve,reject)=>{
      const t=setTimeout(()=>reject(new Error("loadedmetadata timeout")),15000);
      const onMeta=()=>{clearTimeout(t);video.removeEventListener("loadedmetadata",onMeta);resolve();};
      const onErr=()=>{clearTimeout(t);video.removeEventListener("error",onErr);reject(new Error("video load error: "+(video.error?.message||"unknown")));};
      video.addEventListener("loadedmetadata",onMeta);
      video.addEventListener("error",onErr);
    });
    const dur=video.duration;
    _flog("duration:",dur.toFixed(2)+"s  size:",video.videoWidth+"×"+video.videoHeight);

    // 2 ── Warm up the iOS decoder — without play() first, seeks produce blank frames
    await video.play().catch(()=>{});
    video.pause();
    _flog("decoder warmed up");

    // 3 ── Load MediaPipe (needed NOW for physics-based phase detection)
    const landmarker=await loadPoseLandmarker().catch(e=>{_flog("MediaPipe FAILED:",e?.message||e);return null;});
    _flog("MediaPipe loaded:",!!landmarker);

    // 4 ── Physics-based swing phase detection
    //
    // REPLACES Gemini fraction guesses. Gemini consistently confuses impact with
    // finish (returns 0.85–0.95). Fraction range clamping caused phase collapse.
    //
    // Algorithm:
    //   • Sample 12 frames from 3%–79% of the video using fast single-rVFC seeks.
    //   • Run MediaPipe on each to extract wrist Y (screen space: 0=top, 1=bottom).
    //   • Compute velocity and acceleration across the pose timeline.
    //   • Setup  = lowest-motion window in first 25% of samples (stable address).
    //   • Top    = minimum wristY (hands highest in frame) in middle 65% of clip.
    //   • Impact = maximum downward velocity AFTER top (hands moving fastest = ball contact).
    //   Falls back to Gemini fractions if MediaPipe fails or returns < 5 valid poses.

    // Fast pose-sample seek: single rVFC is fine (pose accuracy > pixel accuracy)
    const sampleFrame=async(t)=>{
      const clampT=Math.min(Math.max(t,0.03),dur-0.03);
      await new Promise((res,rej)=>{
        const timer=setTimeout(()=>rej(new Error("sample seek timeout")),8000);
        const onS=()=>{video.removeEventListener("seeked",onS);clearTimeout(timer);res();};
        video.addEventListener("seeked",onS);
        video.currentTime=clampT;
      });
      const pe=await video.play().then(()=>null).catch(e=>e);
      if(!pe){
        await new Promise(resolve=>{
          let s=false;const done=()=>{if(!s){s=true;resolve();}};
          if(typeof video.requestVideoFrameCallback==="function"){video.requestVideoFrameCallback(done);}
          else{requestAnimationFrame(()=>requestAnimationFrame(done));}
          setTimeout(done,400);
        });
        video.pause();
        await new Promise(r=>requestAnimationFrame(r));
      }else{
        // play() blocked — 3 RAFs
        await new Promise(r=>{let n=0;const f=()=>{if(++n>=3)r();else requestAnimationFrame(f);};requestAnimationFrame(f);});
      }
      const W=Math.min(video.videoWidth||320,320),H=Math.min(video.videoHeight||240,240);
      const cv=document.createElement("canvas");cv.width=W;cv.height=H;
      cv.getContext("2d").drawImage(video,0,0,W,H);
      return cv;
    };

    // Sample 16 frames and build wrist-motion timeline
    // (16 vs 12 gives ~33% denser coverage in the 0.3–0.5s downswing window)
    let phaseTimes=null;
    if(landmarker){
      const N=16;
      const timeline=[];
      for(let i=0;i<N;i++){
        const t=dur*(0.03+(0.76*i/(N-1))); // 3% → 79% of clip
        try{
          const cv=await sampleFrame(t);
          const lm=landmarker.detect(cv)?.landmarks?.[0]||null;
          // Average left (15) + right (16) wrist Y. Screen space: 0=top, 1=bottom.
          const ly=lm?.[15]?.visibility>0.35?lm[15].y:null;
          const ry=lm?.[16]?.visibility>0.35?lm[16].y:null;
          const wristY=(ly!==null&&ry!==null)?(ly+ry)/2:(ly??ry??null);
          if(wristY!==null){timeline.push({t,wristY});_flog("sample",t.toFixed(2)+"s wY="+wristY.toFixed(3));}
          else{_flog("sample",t.toFixed(2)+"s — no wrist");}
        }catch(e){_flog("sample",t.toFixed(2)+"s ERR:",e?.message);}
      }
      _flog("timeline points:",timeline.length);

      if(timeline.length>=5){
        // Annotate with velocity (dy/dt) and acceleration
        const tl=timeline.map((f,i)=>{
          const prev=timeline[i-1]||f;
          const dt=Math.max(f.t-prev.t,0.02);
          const v=i===0?0:(f.wristY-prev.wristY)/dt;
          const pp=timeline[i-2]||prev;
          const pdt=Math.max(prev.t-pp.t,0.02);
          const pv=i<2?0:(prev.wristY-pp.wristY)/pdt;
          return{...f,v,a:(v-pv)/dt};
        });

        // Setup: lowest total |velocity| window in first 25% of samples
        const setupEnd=Math.max(3,Math.ceil(tl.length*0.25));
        let setupT=tl[0].t,minMot=Infinity;
        for(let i=0;i<setupEnd-1;i++){
          const mot=Math.abs(tl[i].v)+Math.abs(tl[i+1].v);
          if(mot<minMot){minMot=mot;setupT=(tl[i].t+tl[i+1].t)/2;}
        }

        // TOP — windowed plateau detection (avoids first-derivative peak bias)
        //
        // Naive argmin of wristY picks the FIRST low point (leading edge of apex).
        // A sliding window of 3 finds the plateau where hands are consistently high
        // AND velocity is near-zero (true turnaround).
        // Temporal centroid weighted by (1−wristY) pins the time to the lowest Y
        // frames inside that window rather than the first frame of it.
        const topSlice=tl.slice(Math.floor(tl.length*0.08),Math.floor(tl.length*0.72));
        const WIN_T=Math.min(3,Math.max(1,topSlice.length-1));
        let bestTopScore=Infinity,bestTopWinIdx=0;
        for(let i=0;i<=topSlice.length-WIN_T;i++){
          const w=topSlice.slice(i,i+WIN_T);
          const avgY=w.reduce((s,f)=>s+f.wristY,0)/WIN_T;
          const velPen=w.reduce((s,f)=>s+Math.abs(f.v),0)/WIN_T;
          const score=avgY+velPen*0.5; // minimise: lowest hands + least motion
          if(score<bestTopScore){bestTopScore=score;bestTopWinIdx=i;}
        }
        const topWin=topSlice.slice(bestTopWinIdx,bestTopWinIdx+WIN_T);
        // Temporal centroid: frames with highest hands (lowest Y) contribute most
        const topWt=topWin.reduce((s,f)=>s+(1.0-f.wristY),0);
        const topT=topWt>0
          ?topWin.reduce((s,f)=>s+f.t*(1.0-f.wristY),0)/topWt
          :topWin[Math.floor(WIN_T/2)].t;

        // IMPACT — windowed velocity-plateau detection (avoids leading-edge bias)
        //
        // Naive argmax of velocity picks the FIRST high-velocity frame (leading edge
        // of the impulse).  The true ball-contact moment is at the CENTER of the
        // peak-velocity plateau (hands moving fastest over a 2–4 frame window).
        // Temporal centroid weighted by velocity places the detected time squarely
        // in the middle of the high-speed burst, not at its onset.
        const afterTopArr=tl.filter(f=>f.t>topT);
        let impactT=null;
        if(afterTopArr.length>=2){
          const WIN_I=Math.min(3,afterTopArr.length);
          let bestImpScore=-Infinity,bestImpWinIdx=0;
          for(let i=0;i<=afterTopArr.length-WIN_I;i++){
            const w=afterTopArr.slice(i,i+WIN_I);
            const avgV=w.reduce((s,f)=>s+f.v,0)/WIN_I;
            if(avgV>bestImpScore){bestImpScore=avgV;bestImpWinIdx=i;}
          }
          const impWin=afterTopArr.slice(bestImpWinIdx,bestImpWinIdx+WIN_I);
          // Temporal centroid weighted by velocity (faster frame = closer to true impact)
          const impWt=impWin.reduce((s,f)=>s+Math.max(f.v,0),0);
          impactT=impWt>0
            ?impWin.reduce((s,f)=>s+f.t*Math.max(f.v,0),0)/impWt
            :impWin[Math.floor(WIN_I/2)].t;
          // Don't allow impact in last 20% — that's finish territory
          if(impactT>dur*0.80){
            impactT=topT+Math.max((dur-topT)*0.35,dur*0.10);
            _flog("impact clamped from finish →",impactT.toFixed(2)+"s");
          }
        }
        if(!impactT)impactT=Math.min(topT+dur*0.18,dur*0.70);

        phaseTimes={setupT,topT,impactT};
        _flog("✓ physics phases — setup:",setupT.toFixed(2)+"s  top:",topT.toFixed(2)+"s  impact:",impactT.toFixed(2)+"s");
      }
    }

    // 5 ── Final fracs: physics-first, Gemini-fallback, hard defaults last
    let fracs;
    if(phaseTimes){
      fracs={setup:phaseTimes.setupT/dur,top:phaseTimes.topT/dur,impact:phaseTimes.impactT/dur};
      _flog("fracs source: PHYSICS");
    }else{
      const kf=parsedResult?.keyFrames||{};
      const inR=(v,lo,hi)=>typeof v==="number"&&v>=lo&&v<=hi;
      const topFrac=inR(kf.backswingTop,0.12,0.65)?kf.backswingTop:0.35;
      const rawImpact=typeof kf.impact==="number"?kf.impact:0;
      const relImpact=rawImpact-topFrac;
      const impactFrac=(relImpact>=0.08&&relImpact<=0.35)?rawImpact:Math.min(Math.max(topFrac+0.18,0.42),0.70);
      fracs={setup:inR(kf.setup,0.02,0.28)?kf.setup:0.08,top:topFrac,impact:impactFrac};
      _flog("fracs source: Gemini fallback — setup:",fracs.setup,"top:",fracs.top,"impact:",fracs.impact,"| raw Gemini impact:",kf.impact);
    }

    // 4 ── seekAndCapture: seek → play → rVFC → pause → RAF → drawImage
    //
    // WHY play() IS REQUIRED between seeks on iOS:
    //   On a paused iOS video, AVPlayer's display pipeline is idle.
    //   After a seek, `seeked` fires (position metadata updated) but the GPU pixel
    //   buffer still holds the PREVIOUS frame — drawImage() reads stale pixels.
    //   This produces the classic 1-frame lag cascade: top=setup, impact=top.
    //
    //   Calling play() activates the AVPlayer compositor, which pushes the newly
    //   decoded frame into the GPU buffer.  rVFC then fires on that fresh frame.
    //   pause() freezes it there.  One final RAF lets the GPU finish compositing.
    //   drawImage() now reads the correct pixels.
    //
    // This is the same technique used by professional sports video platforms
    // (Hudl, Coach's Eye, etc.) for reliable frame extraction on mobile Safari.
    const seekAndCapture=async(frac,label)=>{
      const clampT=Math.min(Math.max(frac*dur,0.05),dur-0.05);

      // Step 1: seek to target position
      await new Promise((resolve,reject)=>{
        const t=setTimeout(()=>reject(new Error(`seek timeout ${label}`)),10000);
        const onSeeked=()=>{
          video.removeEventListener("seeked",onSeeked);
          clearTimeout(t);
          _flog(label,"seeked at",clampT.toFixed(3)+"s");
          resolve();
        };
        video.addEventListener("seeked",onSeeked);
        video.currentTime=clampT;
      });

      // Step 2: play() — activates iOS compositor, pushes decoded frame to GPU buffer
      const playErr=await video.play().then(()=>null).catch(e=>e);
      if(playErr){
        // play() blocked (rare — autoplay policy). Fall back to 4 RAFs.
        _flog(label,"play() blocked:",playErr.message,"— using RAF fallback");
        await new Promise(r=>{ let n=0; const t=()=>{ if(++n>=4)r(); else requestAnimationFrame(t); }; requestAnimationFrame(t); });
      } else {
        // Step 3: wait for rVFC to fire TWICE.
        //
        // WHY TWICE is required on iOS:
        //   After play() the AVPlayer compositor wakes and immediately presents
        //   whatever frame is already in its pixel buffer — usually the PREVIOUS
        //   capture's frame.  That causes the classic 1-frame-behind pattern:
        //     top  shows setup frame   (setup's buffer not yet cleared)
        //     impact shows top frame   (top's buffer not yet cleared)
        //
        //   First  rVFC fire = pipeline draining the stale buffer (wrong frame).
        //   Second rVFC fire = decoder has produced and composited the actual new
        //                      frame we seeked to.  Safe to capture.
        //
        //   Each fire's currentTime is logged so the on-screen diagnostic shows
        //   exactly what the pipeline was presenting.
        await new Promise(resolve=>{
          let count=0,settled=false;
          const done=()=>{ if(!settled){settled=true;resolve();} };

          const onFrame=()=>{
            count++;
            _flog(label,"rVFC#"+count,"at",video.currentTime.toFixed(3)+"s");
            if(count>=2){ done(); return; }
            // Register for a second rVFC (or fall back to RAF if unsupported)
            if(typeof video.requestVideoFrameCallback==="function"){
              video.requestVideoFrameCallback(onFrame);
            }else{
              requestAnimationFrame(()=>requestAnimationFrame(done));
            }
          };

          if(typeof video.requestVideoFrameCallback==="function"){
            video.requestVideoFrameCallback(onFrame);
          }else{
            // No rVFC — triple RAF approximates two presentation cycles
            requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(done)));
          }
          setTimeout(done,1000); // safety: don't hang if rVFC misfires on iOS
        });

        // Step 4: pause — freeze on the frame second rVFC just presented
        video.pause();

        // Step 5: one RAF — lets GPU finish compositing the paused frame
        await new Promise(r=>requestAnimationFrame(r));
      }

      // Step 6: capture
      _flog(label,"currentTime at capture:",video.currentTime.toFixed(3)+"s");
      const cv=document.createElement("canvas");
      cv.width=video.videoWidth||480; cv.height=video.videoHeight||640;
      cv.getContext("2d").drawImage(video,0,0,cv.width,cv.height);
      _flog(label,"canvas:",cv.width+"×"+cv.height);
      return cv;
    };

    // 6 ── SEQUENTIAL seek+capture for each frame
    const canvases={};
    for(const[key,frac]of[["setup",fracs.setup],["top",fracs.top],["impact",fracs.impact]]){
      try{
        canvases[key]=await seekAndCapture(frac,key);
      }catch(e){_flog(key,"ERROR:",e?.message);}
    }

    // 7 ── Pose overlay (landmarker already loaded in step 3)
    const out={};
    for(const[key,canvas]of Object.entries(canvases)){
      if(landmarker){
        try{
          const det=landmarker.detect(canvas);
          const lm=det?.landmarks?.[0]||null;
          _flog(key,"landmarks:",lm?lm.length+" pts":"none");
          if(lm)drawPoseOnCanvas(canvas,lm);
        }catch(e){_flog(key,"pose ERROR:",e?.message);}
      }
      try{
        const dataUrl=canvas.toDataURL("image/jpeg",0.82);
        out[key]=dataUrl;
        _flog(key,"→ dataURL OK, len:",dataUrl.length);
      }catch(e){_flog(key,"toDataURL ERROR:",e?.message);}
    }
    _flog("✓ done — keys:",Object.keys(out).join(",")||"none");
    return Object.keys(out).length>0?out:{};

  }catch(e){
    _flog("FATAL:",e?.message);
    return {};
  }finally{
    cleanup();
  }
}
// ─────────────────────────────────────────────────────────────────────────────

const COURSE_ANCHORS={
  "serrano":      {lat:34.0195,lng:-117.0641},
  "olympic":      {lat:37.7290,lng:-122.4940},
  "empire ranch": {lat:38.6721,lng:-121.0648},
  "harding park": {lat:37.7239,lng:-122.5047},
  "poplar creek": {lat:37.5694,lng:-122.2619},
  "pebble beach": {lat:36.5680,lng:-121.9500},
  "augusta":      {lat:33.5021,lng:-82.0232},
  "tpc sawgrass": {lat:30.1975,lng:-81.3956},
  "st andrews":   {lat:56.3438,lng:-2.8022},
  "torrey pines": {lat:32.8997,lng:-117.2527},
  "pinehurst":    {lat:35.1957,lng:-79.4699},
  "bethpage":     {lat:40.7437,lng:-73.4637},
  "kiawah":       {lat:32.6076,lng:-80.0830},
  "erin hills":   {lat:43.3527,lng:-88.3643},
};
const getCourseAnchor=(name)=>{
  if(!name)return null;
  const lower=name.toLowerCase();
  for(const[key,anchor] of Object.entries(COURSE_ANCHORS)){
    if(lower.includes(key))return anchor;
  }
  return null;
};
const coordsNearAnchor=(tLat,tLng,gLat,gLng,courseName)=>{
  const anchor=getCourseAnchor(courseName);
  if(!anchor)return true; // no anchor = can't validate, allow
  const R=6371000,rad=x=>x*Math.PI/180;
  const midLat=(tLat+gLat)/2,midLng=(tLng+gLng)/2;
  const dLa=rad(midLat-anchor.lat),dLo=rad(midLng-anchor.lng);
  const a=Math.sin(dLa/2)**2+Math.cos(rad(anchor.lat))*Math.cos(rad(midLat))*Math.sin(dLo/2)**2;
  const distYards=2*R*Math.asin(Math.sqrt(a))*1.09361;
  if(distYards>5280){console.warn("Coords "+distYards.toFixed(0)+"y from "+courseName+" anchor — rejecting");return false;}
  return true;
};

const NAV=[{id:"home",label:"Home",Icon:Home},{id:"practice",label:"Practice",Icon:Target},{id:"caddie",label:"Caddie",Icon:MessageCircle},{id:"social",label:"Social",Icon:Users}];
function ObiLogo({size=32}){
  return(
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <line x1="13" y1="10" x2="13" y2="31" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M13 10 L26 14.5 L13 19 Z" fill="#CFFF04"/>
      <path d="M13 10 L26 14.5 L19 16 Z" fill="white" fillOpacity="0.25"/>
      <ellipse cx="16" cy="31" rx="5" ry="1.5" fill="currentColor" fillOpacity="0.12"/>
    </svg>
  );
}

// Multi-tee helpers
function scaleTee(holes,ratio){
  return holes.map(h=>({...h,yards:Math.max(50,Math.round(h.yards*ratio/5)*5)}));
}

// Serrano Country Club tees (verified Chronogolf)
const SER_PAR=[4,4,4,3,4,5,3,5,4,4,3,4,5,5,3,5,3,4];
const SER_SI =[13,5,1,11,9,7,15,17,3,12,14,4,10,16,6,2,18,8];
const SER_COP=[406,416,441,165,427,577,165,510,409,369,183,408,505,537,215,597,175,455];
const SER_H  =SER_COP.map((y,i)=>({par:SER_PAR[i],yards:y,si:SER_SI[i]}));

// Pebble Beach tees
const PEB_PAR=[4,5,4,4,3,5,3,4,4,4,4,3,4,5,4,4,3,5];
const PEB_SI =[11,7,9,17,13,3,15,5,1,4,14,16,10,2,8,12,18,6];
const PEB_BLK=[381,502,390,331,188,513,106,418,466,495,380,202,392,573,397,402,178,543];
const PEB_H  =PEB_BLK.map((y,i)=>({par:PEB_PAR[i],yards:y,si:PEB_SI[i]}));

// Olympic Club Lake
const OLC_PAR=[5,4,3,4,4,4,4,3,4,4,4,4,3,4,3,5,5,4];
const OLC_SI =[13,5,11,3,1,7,17,15,9,10,4,8,16,6,18,2,14,12];
const OLC_BLU=[518,388,211,396,434,442,307,177,424,391,420,406,175,412,139,576,476,334];
const OLC_H  =OLC_BLU.map((y,i)=>({par:OLC_PAR[i],yards:y,si:OLC_SI[i]}));

// Olympic Club Ocean
const OOC_PAR=[5,4,4,3,4,4,4,3,5,4,4,4,3,4,4,3,5,4];
const OOC_SI =[7,3,11,15,1,5,9,17,13,10,4,8,14,2,16,18,6,12];
const OOC_BLU=[487,390,372,195,435,415,375,165,515,360,405,395,185,430,395,175,490,408];
const OOC_H  =OOC_BLU.map((y,i)=>({par:OOC_PAR[i],yards:y,si:OOC_SI[i]}));

// TPC Harding Park
const HAR_PAR=[4,4,3,5,4,4,4,3,5,5,3,5,4,4,4,4,3,4];
const HAR_SI =[13,3,9,1,15,5,11,7,17,4,12,16,14,6,10,8,18,2];
const HAR_CHM=[395,449,183,606,429,473,344,230,525,562,200,494,428,467,405,336,175,468];
const HAR_H  =HAR_CHM.map((y,i)=>({par:HAR_PAR[i],yards:y,si:HAR_SI[i]}));

// Empire Ranch
const EMP_PAR=[4,3,5,4,4,4,5,3,4,4,5,3,4,4,5,3,4,3];
const EMP_SI =[7,9,17,11,15,1,3,13,5,8,10,18,4,12,14,16,6,2];
const EMP_BLU=[384,176,504,404,333,402,582,171,386,357,553,163,469,396,547,186,444,211];
const EMP_H  =EMP_BLU.map((y,i)=>({par:EMP_PAR[i],yards:y,si:EMP_SI[i]}));

// Poplar Creek
const POP_PAR=[5,4,3,4,3,4,3,4,5,4,4,3,4,5,3,5,3,4];
const POP_SI =[11,1,3,5,9,17,7,13,15,2,12,8,6,10,14,16,18,4];
const POP_BLK=[519,421,188,403,172,286,202,292,471,455,321,210,407,537,158,475,136,361];
const POP_H  =POP_BLK.map((y,i)=>({par:POP_PAR[i],yards:y,si:POP_SI[i]}));

const COURSE_DB={
  "pebble beach":{name:"Pebble Beach Golf Links",
    tees:{"Black":{rating:75.5,slope:145,holes:PEB_H},"Blue":{rating:73.8,slope:142,holes:scaleTee(PEB_H,6478/6828)},"White":{rating:71.0,slope:132,holes:scaleTee(PEB_H,5956/6828)},"Red":{rating:74.0,slope:130,holes:scaleTee(PEB_H,5197/6828)}},
    holes:PEB_H},
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
    tees:{"Copper":{rating:74.2,slope:134,holes:SER_H},"Black":{rating:71.6,slope:132,holes:scaleTee(SER_H,6525/6975)},"White":{rating:69.7,slope:127,holes:scaleTee(SER_H,6139/6975)},"Gold":{rating:72.8,slope:128,holes:scaleTee(SER_H,5784/6975)},"Green":{rating:69.7,slope:121,holes:scaleTee(SER_H,5232/6975)}},
    holes:SER_H},
  "serrano":{name:"Serrano Country Club",
    tees:{"Copper":{rating:74.2,slope:134,holes:SER_H},"Black":{rating:71.6,slope:132,holes:scaleTee(SER_H,6525/6975)},"White":{rating:69.7,slope:127,holes:scaleTee(SER_H,6139/6975)},"Gold":{rating:72.8,slope:128,holes:scaleTee(SER_H,5784/6975)},"Green":{rating:69.7,slope:121,holes:scaleTee(SER_H,5232/6975)}},
    holes:SER_H},
  "olympic club lake":{name:"Olympic Club - Lake Course",
    tees:{"Blue":{rating:73.8,slope:138,holes:OLC_H},"White":{rating:71.2,slope:131,holes:scaleTee(OLC_H,5955/6626)},"Red":{rating:75.2,slope:137,holes:scaleTee(OLC_H,5308/6626)}},
    holes:OLC_H},
  "olympic lake":{name:"Olympic Club - Lake Course",
    tees:{"Blue":{rating:73.8,slope:138,holes:OLC_H},"White":{rating:71.2,slope:131,holes:scaleTee(OLC_H,5955/6626)}},
    holes:OLC_H},
  "olympic club ocean":{name:"Olympic Club - Ocean Course",
    tees:{"Blue":{rating:72.9,slope:135,holes:OOC_H},"White":{rating:70.5,slope:129,holes:scaleTee(OOC_H,5810/6496)}},
    holes:OOC_H},
  "olympic ocean":{name:"Olympic Club - Ocean Course",holes:OOC_H},
  "olympic club cliffs":{name:"Olympic Club - Cliffs Course",
    holes:[{par:3,yards:155,si:1},{par:3,yards:170,si:5},{par:3,yards:145,si:9},{par:3,yards:160,si:3},{par:3,yards:175,si:7},{par:3,yards:150,si:2},{par:3,yards:165,si:6},{par:3,yards:140,si:8},{par:3,yards:172,si:4}]},
  "olympic cliffs":{name:"Olympic Club - Cliffs Course",
    holes:[{par:3,yards:155,si:1},{par:3,yards:170,si:5},{par:3,yards:145,si:9},{par:3,yards:160,si:3},{par:3,yards:175,si:7},{par:3,yards:150,si:2},{par:3,yards:165,si:6},{par:3,yards:140,si:8},{par:3,yards:172,si:4}]},
  "empire ranch":{name:"Empire Ranch Golf Club",
    tees:{"Blue":{rating:72.0,slope:128,holes:EMP_H},"White":{rating:69.8,slope:123,holes:scaleTee(EMP_H,6217/6668)},"Gold":{rating:67.5,slope:118,holes:scaleTee(EMP_H,5700/6668)},"Red":{rating:70.5,slope:122,holes:scaleTee(EMP_H,5180/6668)}},
    holes:EMP_H},
  "empire ranch golf":{name:"Empire Ranch Golf Club",
    tees:{"Blue":{rating:72.0,slope:128,holes:EMP_H},"White":{rating:69.8,slope:123,holes:scaleTee(EMP_H,6217/6668)}},
    holes:EMP_H},
  "harding park":{name:"TPC Harding Park",
    tees:{"Championship":{rating:75.4,slope:137,holes:HAR_H},"Blue":{rating:73.1,slope:133,holes:scaleTee(HAR_H,6743/7169)},"White":{rating:70.8,slope:128,holes:scaleTee(HAR_H,6270/7169)},"Red":{rating:74.2,slope:131,holes:scaleTee(HAR_H,5606/7169)}},
    holes:HAR_H},
  "tpc harding":{name:"TPC Harding Park",
    tees:{"Championship":{rating:75.4,slope:137,holes:HAR_H},"Blue":{rating:73.1,slope:133,holes:scaleTee(HAR_H,6743/7169)}},
    holes:HAR_H},
  "poplar creek":{name:"Poplar Creek Golf Course",
    tees:{"Black":{rating:70.3,slope:120,holes:POP_H},"White":{rating:68.0,slope:115,holes:scaleTee(POP_H,5620/6014)},"Red":{rating:69.5,slope:117,holes:scaleTee(POP_H,5050/6014)}},
    holes:POP_H},
  "erin hills":{name:"Erin Hills Golf Course",
    holes:[{par:4,yards:449,si:5},{par:5,yards:624,si:3},{par:4,yards:438,si:9},{par:4,yards:490,si:1},{par:3,yards:243,si:7},{par:4,yards:488,si:11},{par:5,yards:586,si:15},{par:3,yards:218,si:17},{par:4,yards:509,si:13},{par:4,yards:472,si:2},{par:4,yards:396,si:14},{par:4,yards:456,si:8},{par:3,yards:171,si:18},{par:4,yards:475,si:6},{par:4,yards:428,si:10},{par:5,yards:640,si:4},{par:3,yards:237,si:16},{par:4,yards:427,si:12}]},
};

function matchCourse(input){
  if(!input)return null;
  const k=input.toLowerCase().trim().replace(/[^a-z0-9 ]/g,"");
  for(const key of Object.keys(COURSE_DB)){
    if(k.includes(key)||key.includes(k))return COURSE_DB[key];
  }
  for(const key of Object.keys(COURSE_DB)){
    const words=key.split(" ").filter(w=>w.length>2);
    const matches=words.filter(w=>k.includes(w));
    if(matches.length>=2||(matches.length===1&&words.length===1))return COURSE_DB[key];
  }
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
:root{--font-sans:'Inter',ui-sans-serif,system-ui,sans-serif;--font-display:'Space Grotesk','Inter',ui-sans-serif,sans-serif;--radius:0.75rem;--bg:#0f0f14;--fg:#f0f0f5;--card:#17171f;--card-border:#2a2a38;--surface:#1f1f2a;--muted:#5a5a72;--muted-fg:#8888a4;--primary:#4ade80;--primary-dim:rgba(74,222,128,0.12);--accent:#fbbf24;--destructive:#f87171;--ring:#4ade80;}
.light{--bg:#f8f8fc;--fg:#1a1a28;--card:#ffffff;--card-border:#e4e4ef;--surface:#f0f0f8;--muted:#d0d0e0;--muted-fg:#7070a0;--primary:#16a34a;--primary-dim:rgba(22,163,74,0.1);--accent:#d97706;--destructive:#dc2626;}
.display{font-family:var(--font-display);font-weight:700;letter-spacing:-0.02em;}
.stat{font-family:var(--font-display);font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-0.04em;}
.tabular{font-variant-numeric:tabular-nums;}
.pt-safe{padding-top:env(safe-area-inset-top);}.pb-safe{padding-bottom:env(safe-area-inset-bottom);}
input,textarea,select{font-family:var(--font-sans);}
input::placeholder,textarea::placeholder{color:var(--muted-fg);}
button{cursor:pointer;font-family:inherit;}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}\n@keyframes typing-dot{0%,60%,100%{transform:translateY(0);opacity:0.35}30%{transform:translateY(-5px);opacity:1}}
@keyframes popIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes spin{to{transform:rotate(360deg)}}
.fade-up{animation:fadeUp 0.4s cubic-bezier(.2,.8,.4,1) both;}
.pop-in{animation:popIn 0.4s cubic-bezier(.34,1.56,.64,1) both;}
.scroll-y{overflow-y:auto;-webkit-overflow-scrolling:touch;}
.scroll-x{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.scroll-x::-webkit-scrollbar{display:none;}
.tab-pill{display:flex;gap:4px;background:var(--surface);border-radius:12px;padding:4px;}
.tab-pill button{flex:1;padding:7px 10px;border-radius:9px;border:none;background:transparent;color:var(--muted-fg);font-family:var(--font-display);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;transition:all 0.15s;}
.tab-pill button.active{background:var(--card);color:var(--fg);box-shadow:0 1px 4px rgba(0,0,0,0.3);}
.bubble-user{background:var(--primary);color:#000;border-radius:18px 18px 4px 18px;padding:10px 14px;max-width:82%;font-size:14px;line-height:1.5;}
.bubble-ai{background:var(--surface);color:var(--fg);border-radius:18px 18px 18px 4px;padding:10px 14px;max-width:88%;font-size:14px;line-height:1.6;border:1px solid var(--card-border);}
.chip{display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--card-border);border-radius:99px;padding:5px 12px;font-size:11px;font-family:var(--font-display);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg);white-space:nowrap;}
.stat-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:14px;}
.row-list{background:var(--card);border:1px solid var(--card-border);border-radius:16px;overflow:hidden;}
.row-list>*+*{border-top:1px solid var(--card-border);}
.nav-pip{width:4px;height:4px;border-radius:99px;background:var(--primary);margin:0 auto 2px;}
`;

function ObiGolfApp(){
  const [isDark,setIsDark]=useState(()=>{
    try{const s=localStorage.getItem("obi_dark");return s===null?true:s==="true";}catch{return true;}
  });
  useEffect(()=>{
    const id="obi-css";
    if(!document.getElementById(id)){const el=document.createElement("style");el.id=id;el.textContent=CSS;document.head.appendChild(el);}
  },[]);
  useEffect(()=>{
    const el=document.documentElement;
    el.classList.toggle("dark",isDark);el.classList.toggle("light",!isDark);
    document.body.style.backgroundColor=isDark?"#0d0d12":"#ffffff";
    try{localStorage.setItem("obi_dark",String(isDark));}catch{}
  },[isDark]);
  const T={bg:"var(--bg)",fg:"var(--fg)",card:"var(--card)",border:"var(--card-border)",surface:"var(--surface)",muted:"var(--muted)",mutedFg:"var(--muted-fg)",primary:"var(--primary)",primaryDim:"var(--primary-dim)",accent:"var(--accent)",red:"var(--destructive)"};
  const S={input:{background:T.surface,border:"1px solid "+T.border,borderRadius:"12px",color:T.fg,fontSize:"14px",padding:"11px 14px",outline:"none",width:"100%",fontFamily:"var(--font-sans)"},btnPrimary:{background:T.primary,border:"none",borderRadius:"12px",color:"#000",fontSize:"14px",fontFamily:"var(--font-display)",fontWeight:"700",padding:"12px 20px",textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"8px"},btnSecondary:{background:T.surface,border:"1px solid "+T.border,borderRadius:"12px",color:T.fg,fontSize:"13px",fontFamily:"var(--font-display)",fontWeight:"700",padding:"10px 16px",textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"6px"},btnGhost:{background:"transparent",border:"none",color:T.mutedFg,fontSize:"13px",fontFamily:"var(--font-display)",fontWeight:"700",padding:"8px",cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.06em"},card:{background:T.card,border:"1px solid "+T.border,borderRadius:"16px",padding:"16px"},pill:{background:T.surface,border:"1px solid "+T.border,borderRadius:"99px",padding:"5px 12px",fontSize:"11px",fontFamily:"var(--font-display)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer",color:T.fg,display:"inline-flex",alignItems:"center",gap:"6px"}};
  const [user,setUser]=useState(null);
  const [userProfile,setUserProfile]=useState(null);
  const [authScreen,setAuthScreen]=useState("login");
  const [authLoading,setAuthLoading]=useState(true);
  const [authEmail,setAuthEmail]=useState("");
  const [authPass,setAuthPass]=useState("");
  const [authName,setAuthName]=useState("");
  const [authError,setAuthError]=useState("");
  const [tab,setTab]=useState("home");
  const changeTab=(newTab)=>{if(window.speechSynthesis)window.speechSynthesis.cancel();setSpeaking(false);setTab(newTab);};
  const [subView,setSubView]=useState("chat");
  const [socialView,setSocialView]=useState("feed");
  const [profileSection,setProfileSection]=useState(null);
  const [avatarUrl,setAvatarUrl]=useState(null);
  const [uploadingAvatar,setUploadingAvatar]=useState(false);
  const [showAvatarZoom,setShowAvatarZoom]=useState(null);
  const avatarInputRef=useRef(null);
  const [profile,setProfile]=useState({handicap:"mid",hcp:13,persona:"pro",missTend:"straight",bag:DEFAULT_BAG,dexterity:"right",homeCourse:"",practiceGoal:""});
  const [onboardStep,setOnboardStep]=useState(0);
  const [editingBag,setEditingBag]=useState(false);
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
  const [micSupported]=useState(()=>!!(window.SpeechRecognition||window.webkitSpeechRecognition));
  const recognizerRef=useRef(null);
  const [shotHistory,setShotHistory]=useState([]);
  const [scorecard,setScorecard]=useState(Array(18).fill(null));
  const [fairways,setFairways]=useState(Array(18).fill(null));
  const [gir,setGir]=useState(Array(18).fill(null));
  const [putts,setPutts]=useState(Array(18).fill(null));
  const [scorecardOpen,setScorecardOpen]=useState(false);
  const [holeOpen,setHoleOpen]=useState(false);
  // Beginner + celebration features
  const [beginnerMode,setBeginnerMode]=useState(()=>{try{return localStorage.getItem("obi_beginner")!=="false";}catch{return true;}});
  const [celebration,setCelebration]=useState(null);
  const [showRulesModal,setShowRulesModal]=useState(false);
  const [rulesQuery,setRulesQuery]=useState("");
  const [rulesAnswer,setRulesAnswer]=useState("");
  const [rulesLoading,setRulesLoading]=useState(false);
  const [postRoundRecap,setPostRoundRecap]=useState(null);
  const [shareCard,setShareCard]=useState(null); // {total,diff,course,insight,persona,name,fwy,putts}
  const [shareGenerating,setShareGenerating]=useState(false);
  // Group round state
  const [groupRoundCode,setGroupRoundCode]=useState(null);  // 6-char join code
  const [groupPlayers,setGroupPlayers]=useState([]);        // [{name,scores:[],color}]
  const [showGroupModal,setShowGroupModal]=useState(false);
  const [joinCodeInput,setJoinCodeInput]=useState("");
  const [groupName,setGroupName]=useState("");
  const [mapFullscreen,setMapFullscreen]=useState(false);
  const [chatOpen,setChatOpen]=useState(false); // caddie drawer open/closed
  const [caddieView,setCaddieView]=useState(()=>{try{return localStorage.getItem("obi_caddie_view")||"chat";}catch{return "chat";}});
  const [obiTyping,setObiTyping]=useState(false); // typing indicator
  const [welcomeSent,setWelcomeSent]=useState(()=>{try{return localStorage.getItem("obi_welcome_sent")==="true";}catch{return false;}});
  const [welcomeStage,setWelcomeStage]=useState(0); // 0=not started,1=asked q1,2=asked course,3=done
  // IMPROVEMENT 1: tee selector state
  const [selectedTee,setSelectedTee]=useState(null);
  const [weather,setWeather]=useState(null);
  const [practiceSubTab,setPracticeSubTab]=useState("swing");
  const [swingFile,setSwingFile]=useState(null);
  const [swingNotes,setSwingNotes]=useState("");
  const [swingAnalysis,setSwingAnalysis]=useState("");
  const [swingThumb,setSwingThumb]=useState(null);
  const [expandedSwing,setExpandedSwing]=useState(null);
  const [analysisExpanded,setAnalysisExpanded]=useState(true);
  const [swingLoading,setSwingLoading]=useState(false);
  const [swingHistory,setSwingHistory]=useState([]);
  const [isOwnSwing,setIsOwnSwing]=useState(true); // true = my swing; false = guest/demo swing
  const [golferLevel,setGolferLevel]=useState("unknown"); // tour|competitive|club|beginner|unknown
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
  const [rounds,setRounds]=useState([]);
  const [friends,setFriends]=useState([]);
  const [friendReqs,setFriendReqs]=useState([]);
  const [friendSearch,setFriendSearch]=useState("");
  const [friendResults,setFriendResults]=useState([]);
  const [feed,setFeed]=useState([]);
  const [showAllFeed,setShowAllFeed]=useState(false);
  const [jabPost,setJabPost]=useState(null);
  const [showCard,setShowCard]=useState(null);
  const chatEndRef=useRef(null);
  const swingInputRef=useRef(null);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setUser(session?.user||null);setAuthLoading(false);if(session?.user)loadProfile(session.user);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{setUser(session?.user||null);if(session?.user){setUser(session.user);loadProfile(session.user);}else{setAuthScreen("login");}});
    return()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    const unlock=()=>{if(window._audioUnlocked)return;window._audioUnlocked=true;try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const buf=ctx.createBuffer(1,1,22050);const src2=ctx.createBufferSource();src2.buffer=buf;src2.connect(ctx.destination);src2.start(0);ctx.resume();}catch{}document.removeEventListener('touchstart',unlock);document.removeEventListener('touchend',unlock);};
    document.addEventListener('touchstart',unlock,{passive:true});document.addEventListener('touchend',unlock,{passive:true});
    return()=>{document.removeEventListener('touchstart',unlock);document.removeEventListener('touchend',unlock);};
  },[]);

  useEffect(()=>{
    if(!window.Capacitor?.isNativePlatform?.())return;
    const onShow=e=>{document.documentElement.style.setProperty('--kb-height',(e.keyboardHeight||300)+'px');};
    const onHide=()=>{document.documentElement.style.setProperty('--kb-height','0px');};
    window.addEventListener('keyboardWillShow',onShow);window.addEventListener('keyboardWillHide',onHide);
    return()=>{window.removeEventListener('keyboardWillShow',onShow);window.removeEventListener('keyboardWillHide',onHide);};
  },[]);

  const loadProfile=async(u)=>{
    const {data}=await supabase.from("profiles").select("*").eq("id",u.id).single();
    if(data){
      setUserProfile(data);setAvatarUrl(data.avatar_url||null);
      if(data.full_name&&!authName){setAuthName(data.full_name);} // sync name so buildSystem always has it
      // Load profile settings regardless
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
      // Only show onboarding if user has NEVER completed it
      // Check: no name AND no onboarded flag AND no handicap set
      const needsOnboard=!data.onboarded&&!data.full_name&&!data.handicap_category;
      if(needsOnboard){
        setAuthScreen("onboard");
      } else {
        // Already onboarded — go straight to app
        setAuthScreen("app");
      }
      loadRounds(u.id);loadFriends(u.id);loadFeed();
    }else{
      // No profile row yet — new user, needs onboarding
      setAuthScreen("onboard");
    }
  };

  const saveProfile=async(overrideName)=>{
    if(!user)return;
    const fullName=overrideName||authName||userProfile?.full_name||"";
    const{error}=await supabase.from("profiles").upsert({
      id:user.id,
      full_name:fullName,
      handicap_category:profile.handicap,
      handicap_index:profile.hcp,
      caddie_persona:profile.persona,
      miss_tendency:profile.missTend,
      bag:profile.bag,
      dexterity:profile.dexterity,
      home_course:profile.homeCourse,
      practice_goal:profile.practiceGoal,
      onboarded:true,  // critical — prevents re-onboarding loop
      updated_at:new Date().toISOString(),
    });
    if(error){console.error("saveProfile failed:",error.message);}
    else{
      // Immediately mark as onboarded in local state too — belt and suspenders
      setUserProfile(p=>({...(p||{}),full_name:fullName,onboarded:true,handicap_category:profile.handicap}));
    }
    return !error;
  };

  const loadRounds=async(uid)=>{const {data}=await supabase.from("rounds").select("*").eq("user_id",uid).order("played_at",{ascending:false}).limit(20);if(data)setRounds(data);};
  const loadFriends=async(uid)=>{const {data}=await supabase.from("friendships").select("*,requester:profiles!friendships_requester_id_fkey(id,full_name,handicap_index,avatar_url),addressee:profiles!friendships_addressee_id_fkey(id,full_name,handicap_index,avatar_url)").or("requester_id.eq."+uid+",addressee_id.eq."+uid);if(data){setFriends(data.filter(f=>f.status==="accepted"));setFriendReqs(data.filter(f=>f.status==="pending"&&f.addressee_id===uid));}};
  const loadFeed=async()=>{const {data}=await supabase.from("rounds").select("*,profiles(full_name,avatar_url,handicap_index)").order("played_at",{ascending:false}).limit(20);if(data)setFeed(data);};

  const handleLogin=async(e)=>{e&&e.preventDefault();setAuthError("");const{error}=await supabase.auth.signInWithPassword({email:authEmail,password:authPass});if(error)setAuthError(error.message);};
  const handleSignup=async(e)=>{
    e&&e.preventDefault();setAuthError("");
    const{error}=await supabase.auth.signUp({email:authEmail,password:authPass,options:{data:{full_name:authName}}});
    if(error){setAuthError(error.message);}
    // Don't manually set authScreen — onAuthStateChange + loadProfile handles it.
    // New user: no profile row → loadProfile sets "onboard". Existing: goes to "app".
  }
  const handleLogout=async()=>{await supabase.auth.signOut();setUser(null);setMessages([]);setRounds([]);};
  const handleGoogleAuth=async()=>{await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});};

  const fetchWeather=useCallback(()=>{
    if(!navigator.geolocation)return;
    navigator.geolocation.getCurrentPosition(async({coords:{latitude:lat,longitude:lng}})=>{
      try{const r=await fetch("https://api.open-meteo.com/v1/forecast?latitude="+lat+"&longitude="+lng+"&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph");const d=await r.json();setWeather({temp:Math.round(d.current.temperature_2m),wind:Math.round(d.current.wind_speed_10m),windDeg:d.current.wind_direction_10m,code:d.current.weather_code});}catch{}
    });
  },[]);
  useEffect(()=>{fetchWeather();},[fetchWeather]);

  const buildSystem=()=>{
    const personas={pro:"You are a calm precise Tour-level golf caddie named Obi. Quiet authority. MAX 2-3 sentences. No essays.",coach:"You are an encouraging golf coach-caddie named Obi. Warm and confidence-building. MAX 2-3 sentences. Be brief.",hype:"You are an energetic hype-man caddie named Obi. Enthusiastic and motivating. 2-3 sentences.",savage:"You are a savage trash-talking caddie named Obi. Brutal honesty with humor. 2-3 sentences.",oldschool:"You are a gritty old-school caddie named Obi. Straight talk. Short and real."};
    const persona=personas[profile.persona]||personas.pro;
    const bagStr=profile.bag.map(b=>b.club+":"+b.carry+"y").join(", ");
    const wx=weather?"Wind "+weather.wind+"mph "+windDir(weather.windDeg)+". "+weather.temp+"F.":"No weather.";
    const py=yardage?playingYards(parseInt(yardage),elevation,weather?.wind||0,weather?.windDeg||0):null;
    const name=firstName(authName)||firstName(userProfile?.full_name)||"Golfer";
    const handed=profile.dexterity==="left"?"left-handed":"right-handed";
    const yardStr=yardage?(yardage+"y actual, ~"+py+"y playing"):"not set";
    const recentStr=shotHistory.slice(-3).map(s=>"H"+s.hole+": "+s.outcome).join(". ")||"none";
    const bMode=beginnerMode?"\nBEGINNER MODE ON: "+name+" is new to golf. Explain WHY you pick each club in simple plain English. Mention course management basics. Be encouraging, warm, never condescending. If asked about rules, explain clearly with penalty info. Make golf fun for them.":"";
    return persona+"\nPLAYER: "+name+". Always use first name. "+handed+" golfer. HCP "+profile.hcp+" ("+profile.handicap+"). Miss: "+profile.missTend+". Home: "+(profile.homeCourse||"unknown")+".\nBAG: "+bagStr+"\nHOLE: "+(course||"unknown")+", Hole "+hole+", Par "+holePars[hole-1]+"\nYARDAGE: "+yardStr+". Lie: "+lie+". Elevation: "+elevation+"ft.\nCONDITIONS: "+wx+"\nRECENT: "+recentStr+bMode+"\nRULES: Only clubs from bag. No markdown. No bullets. KEEP RESPONSE TO 2-3 SENTENCES MAX — be concise, direct, actionable. Tailor to "+handed+" player.";
  };

  const [gpsPos,setGpsPos]=useState(null);
  const [gpsWatcher,setGpsWatcher]=useState(null);

  const startGPS=useCallback(async()=>{
    if(window.Capacitor?.isNativePlatform?.()&&CapGeo){
      try{await CapGeo.requestPermissions();const id=await CapGeo.watchPosition({enableHighAccuracy:true,maximumAge:2000,timeout:10000},pos=>{if(pos)setGpsPos({lat:pos.coords.latitude,lng:pos.coords.longitude,acc:Math.round(pos.coords.accuracy)});});setGpsWatcher(id);}catch(e){console.warn("Native GPS error",e);}
    }else{
      if(!navigator.geolocation)return;
      const id=navigator.geolocation.watchPosition(p=>setGpsPos({lat:p.coords.latitude,lng:p.coords.longitude,acc:Math.round(p.coords.accuracy)}),err=>console.warn("GPS",err),{enableHighAccuracy:true,maximumAge:2000,timeout:10000});
      setGpsWatcher(id);
    }
  },[]);

  const stopGPS=useCallback(async()=>{
    if(gpsWatcher!=null){if(window.Capacitor?.isNativePlatform?.()&&CapGeo){await CapGeo.clearWatch({id:gpsWatcher});}else{navigator.geolocation.clearWatch(gpsWatcher);}}
    setGpsWatcher(null);setGpsPos(null);
  },[gpsWatcher]);

  const haversineYards=(lat1,lng1,lat2,lng2)=>{
    const R=6371000,toRad=x=>x*Math.PI/180;
    const dLat=toRad(lat2-lat1),dLng=toRad(lng2-lng1);
    const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return Math.round(2*R*Math.asin(Math.sqrt(a))*1.09361);
  };

  const [holeMap,setHoleMap]=useState(null);
  const [holeMapLoading,setHoleMapLoading]=useState(false);
  const [showHoleMap,setShowHoleMap]=useState(false);
  const [osmError,setOsmError]=useState(false);
  const [manualPins,setManualPins]=useState({});
  const [pinDropMode,setPinDropMode]=useState(false);
  const [holeBearing,setHoleBearing]=useState(0); // degrees: tee→green angle (0=north)

    const fetchHoleMap=useCallback(async(courseName,holeNum)=>{
    if(!courseName||holeMapLoading)return;
    setHoleMapLoading(true);setHoleMap(null);setOsmError(false);
    const dbCourse=matchCourse(courseName);
    // IMPROVEMENT 2: use selectedTee-specific holes if available
    const teeHoles=(selectedTee&&dbCourse?.tees?.[selectedTee]?.holes)||dbCourse?.holes;
    const dbHole=teeHoles?.[holeNum-1];
    if(dbHole){setYardage(String(dbHole.yards));setHolePars(prev=>{const n=[...prev];n[holeNum-1]=dbHole.par;return n;});}
    let osmData=null;
    let osmCourseCenter=null;
    let apiHole=null;

    // ── Step 1: GolfCourseAPI — course location + hole metadata ───────────────
    // This is now the PRIMARY location source. It reliably returns the course's
    // verified address lat/lng and per-hole par/yardage/handicap.
    // The old hardcoded COURSE_ANCHORS had wrong coordinates (e.g. Serrano was
    // 300 miles off). GolfCourseAPI is always more accurate.
    try{
      const cr=await fetch("/api/course?name="+encodeURIComponent(courseName)+"&hole="+holeNum);
      if(cr.ok){
        const cd=await cr.json();
        if(cd.found){
          apiHole=cd.hole;
          if(cd.location?.lat&&cd.location?.lng)osmCourseCenter=cd.location;
        }
      }
    }catch(e){console.warn("GolfCourseAPI failed",e);}

    // ── Step 2: Nominatim — backup location if GolfCourseAPI didn't find it ───
    if(!osmCourseCenter){
      try{
        const geoQuery=encodeURIComponent(courseName+" golf course");
        const geoResp=await fetch("https://nominatim.openstreetmap.org/search?q="+geoQuery+"&format=json&limit=1&featuretype=leisure",{headers:{"User-Agent":"CaddieAI/1.0 (golf app)"}});
        if(geoResp.ok){
          const geoData=await geoResp.json();
          if(geoData[0])osmCourseCenter={lat:parseFloat(geoData[0].lat),lng:parseFloat(geoData[0].lon)};
        }
      }catch(e){console.warn("Nominatim failed",e);}
    }

    // ── Step 3: Overpass/OSM — hole shape overlays (bonus, when available) ────
    // Searches within 1.2 km of the verified course center for hole features.
    try{
      if(osmCourseCenter){
        const{lat,lng}=osmCourseCenter;
        const q="[out:json][timeout:30];(way[\"golf\"](around:1200,"+lat+","+lng+");node[\"golf\"](around:1200,"+lat+","+lng+");way[\"leisure\"=\"golf_course\"](around:1200,"+lat+","+lng+"););out body;>;out skel qt;";
        const resp=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",body:"data="+encodeURIComponent(q),headers:{"Content-Type":"application/x-www-form-urlencoded"}});
        if(resp.ok){
          const d=await resp.json();
          osmData=parseOSMHole(d,holeNum);
          // Refine center from actual course boundary nodes if available
          const nodeMap={};
          d.elements.filter(e=>e.type==="node").forEach(n=>{nodeMap[n.id]={lat:n.lat,lng:n.lon};});
          const boundaryWays=d.elements.filter(e=>e.type==="way"&&e.tags?.leisure==="golf_course");
          if(boundaryWays.length>0){
            const pts=boundaryWays.flatMap(w=>(w.nodes||[]).map(id=>nodeMap[id]).filter(Boolean));
            if(pts.length>0)osmCourseCenter={lat:pts.reduce((s,p)=>s+p.lat,0)/pts.length,lng:pts.reduce((s,p)=>s+p.lng,0)/pts.length};
          }
        }
      }
    }catch(e){console.warn("Overpass failed",e);}

    // ── Step 4: AI for text data only (description, tips, hazards) ────────────
    // Never used for GPS — AI cannot reliably generate coordinates.
    try{
      const knownYards=dbHole?.yards||apiHole?.yards||null;
      const knownPar=dbHole?.par||apiHole?.par||null;
      const p=`Return ONLY valid JSON, no markdown. Golf course: ${courseName}. Hole number: ${holeNum}. ${knownPar?'Par is '+knownPar+'.':''}${knownYards?'Yardage is '+knownYards+' yards. ':''} Return exactly this JSON shape: {"par":${knownPar||4},"yards":${knownYards||400},"strokeIndex":1,"description":"one sentence describing this hole","shape":"straight","hazards":["hazard description"],"tips":"one actionable tip"}. Do not include any GPS or coordinate fields.`;
      const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:p}],system:"Golf course data API. Return only valid JSON with hole description, shape, hazards, and tips. Never include GPS coordinates."})});
      const d=await r.json();
      const raw=d?.content?.[0]?.text||"";const t=raw.split("```json").join("").split("```").join("").trim();
      const s=t.indexOf("{"),e=t.lastIndexOf("}");
      if(s>=0&&e>s){
        const gd=JSON.parse(t.slice(s,e+1));
        const finalPar=dbHole?.par||apiHole?.par||gd.par||4;
        const finalYards=dbHole?.yards||apiHole?.yards||gd.yards||400;
        const finalSI=dbHole?.si||apiHole?.strokeIndex||gd.strokeIndex||holeNum;
        // GPS comes from OSM only — GolfCourseAPI has no per-hole coordinates
        const holeMap={
          par:finalPar,yards:finalYards,strokeIndex:finalSI,
          description:gd.description||"",shape:gd.shape||"straight",
          hazards:gd.hazards||[],tips:gd.tips||"",
          osmFeatures:osmData,courseCenterFallback:osmCourseCenter,
          tee_lat:null,tee_lng:null,green_lat:null,green_lng:null
        };
        setHoleMap(holeMap);setYardage(String(finalYards));setHolePars(prev=>{const n=[...prev];n[holeNum-1]=finalPar;return n;});
      }
    }catch(e){
      const fallPar=dbHole?.par||apiHole?.par||osmData?.estimatedPar||4;
      const fallYards=dbHole?.yards||apiHole?.yards||osmData?.estimatedYards||400;
      setHoleMap({par:fallPar,yards:fallYards,strokeIndex:dbHole?.si||holeNum,description:courseName+" hole "+holeNum,shape:"straight",hazards:[],tips:"",osmFeatures:osmData,courseCenterFallback:osmCourseCenter,tee_lat:null,tee_lng:null,green_lat:null,green_lng:null});
      setYardage(String(fallYards));setHolePars(prev=>{const n=[...prev];n[holeNum-1]=fallPar;return n;});
    }
    setHoleMapLoading(false);
  },[holeMapLoading,holePars,yardage,selectedTee]);

  useEffect(()=>{
    const db=matchCourse(course);
    if(db?.holes){setHolePars(db.holes.map(h=>h.par));}
    setManualPins({});
    setSelectedTee(null);
    setHoleMap(null);
    // Don't auto-fetch here — the hole/course effect below handles it
  },[course]);

  useEffect(()=>{
    // Auto-fetch when hole or course changes — no longer gated on showHoleMap
    if(course)fetchHoleMap(course,hole);
  },[hole,course]);

  const prevHoleRef=useRef(1);
  useEffect(()=>{
    if(prevHoleRef.current!==hole&&course&&messages.length>0){prevHoleRef.current=hole;const par=holePars[hole-1]||4;const autoMsg="Hole "+hole+", par "+par+(yardage?", "+yardage+"y":"")+". Quick read.";sendMessage(autoMsg);}
    prevHoleRef.current=hole;
  },[hole]);

  const parseOSMHole=(osmData,holeNum)=>{
    const nodes={};osmData.elements.filter(e=>e.type==="node").forEach(n=>{nodes[n.id]={lat:n.lat,lng:n.lon};});
    const ways=osmData.elements.filter(e=>e.type==="way");
    const getCoords=way=>(way.nodes||[]).map(id=>nodes[id]).filter(Boolean);
    const tagged=(golf,ref)=>ways.filter(w=>w.tags?.golf===golf&&(ref?w.tags?.ref===String(ref):true));
    const features=[];
    const addFeature=(type,ways_)=>{ways_.forEach(w=>{const coords=getCoords(w);if(coords.length>0)features.push({type,coords,ref:w.tags?.ref});});};
    let fairways=tagged("fairway",holeNum);let greens=tagged("green",holeNum);let tees=tagged("tee",holeNum);let bunkers=tagged("bunker",holeNum);let water=tagged("water_hazard",holeNum);
    if(!fairways.length)fairways=tagged("fairway");if(!greens.length)greens=tagged("green");if(!tees.length)tees=tagged("tee");if(!bunkers.length)bunkers=tagged("bunker");if(!water.length)water=tagged("water_hazard");
    addFeature("fairway",fairways.slice(0,3));addFeature("green",greens.slice(0,1));addFeature("tee",tees.slice(0,2));addFeature("bunker",bunkers.slice(0,8));addFeature("water",water.slice(0,3));
    if(!features.length)return null;
    const allCoords=features.flatMap(f=>f.coords);
    const lats=allCoords.map(c=>c.lat),lngs=allCoords.map(c=>c.lng);
    const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
    const latSpan=maxLat-minLat||0.001,lngSpan=maxLng-minLng||0.001;
    const norm=coord=>({x:(coord.lng-minLng)/lngSpan,y:1-(coord.lat-minLat)/latSpan});
    const normFeatures=features.map(f=>({...f,pts:f.coords.map(norm)}));
    const fw=features.find(f=>f.type==="fairway"),green=features.find(f=>f.type==="green"),tee=features.find(f=>f.type==="tee");
    let estimatedYards=400;
    if(fw&&tee&&green){const teeC={lat:(Math.min(...tee.coords.map(c=>c.lat))+Math.max(...tee.coords.map(c=>c.lat)))/2,lng:(Math.min(...tee.coords.map(c=>c.lng))+Math.max(...tee.coords.map(c=>c.lng)))/2};const greenC={lat:(Math.min(...green.coords.map(c=>c.lat))+Math.max(...green.coords.map(c=>c.lat)))/2,lng:(Math.min(...green.coords.map(c=>c.lng))+Math.max(...green.coords.map(c=>c.lng)))/2};const R=6371000,toRad=x=>x*Math.PI/180;const dLat=toRad(greenC.lat-teeC.lat),dLng=toRad(greenC.lng-teeC.lng);const a=Math.sin(dLat/2)**2+Math.cos(toRad(teeC.lat))*Math.cos(toRad(greenC.lat))*Math.sin(dLng/2)**2;estimatedYards=Math.round(2*R*Math.asin(Math.sqrt(a))*1.09361);}
    return{features:normFeatures,bounds:{minLat,maxLat,minLng,maxLng},estimatedYards,estimatedPar:estimatedYards<175?3:estimatedYards<430?4:5};
  };

  const HoleMapCanvas=({map:holeData,gps,W=280,H=380,weather=null,bearing=0,fullscreen=false})=>{
    const containerRef=useRef(null);const mapRef=useRef(null);const playerSourceRef=useRef(null);const lineSourceRef=useRef(null);
    const gpsRef=useRef(gps);useEffect(()=>{gpsRef.current=gps;},[gps]);
    const hYards=(lat1,lng1,lat2,lng2)=>{const R=6371000,r=x=>x*Math.PI/180;const dLat=r(lat2-lat1),dLng=r(lng2-lng1);const a=Math.sin(dLat/2)**2+Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(dLng/2)**2;return Math.round(2*R*Math.asin(Math.sqrt(a))*1.09361);};
    const buildGeoJSON=(features,type)=>({type:"FeatureCollection",features:(features||[]).filter(f=>f.type===type).map(f=>({type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[f.pts.map(p=>[holeData.osmFeatures.bounds.minLng+p.x*(holeData.osmFeatures.bounds.maxLng-holeData.osmFeatures.bounds.minLng),holeData.osmFeatures.bounds.minLat+p.y*(holeData.osmFeatures.bounds.maxLat-holeData.osmFeatures.bounds.minLat)])]}}))});
    const getCenter=()=>{
      if(holeData?.osmFeatures?.bounds){const{minLat,maxLat,minLng,maxLng}=holeData.osmFeatures.bounds;return{center:[(minLng+maxLng)/2,(minLat+maxLat)/2],bbox:[[minLng-0.0003,minLat-0.0003],[maxLng+0.0003,maxLat+0.0003]],reliable:true};}
      if(holeData?.tee_lat&&holeData?.green_lat){const cLat=(holeData.tee_lat+holeData.green_lat)/2,cLng=(holeData.tee_lng+holeData.green_lng)/2;if(gps?.lat){const R=6371000,toRad=x=>x*Math.PI/180;const dLat=toRad(cLat-gps.lat),dLng=toRad(cLng-gps.lng);const a=Math.sin(dLat/2)**2+Math.cos(toRad(gps.lat))*Math.cos(toRad(cLat))*Math.sin(dLng/2)**2;const distYards=2*R*Math.asin(Math.sqrt(a))*1.09361;if(distYards>3000){return{center:[gps.lng,gps.lat],bbox:null,reliable:false,gpsOnly:true};}}return{center:[cLng,cLat],bbox:null,reliable:true};}
      // Use OSM-derived course center when AI coords were rejected — at least show the correct course
      if(holeData?.courseCenterFallback){const cc=holeData.courseCenterFallback;return{center:[cc.lng,cc.lat],bbox:null,reliable:true,courseOnly:true};}
      if(gps?.lat)return{center:[gps.lng,gps.lat],bbox:null,reliable:false,gpsOnly:true};
      return{center:[0,0],bbox:null,reliable:false};
    };
    useEffect(()=>{
      if(!containerRef.current||!holeData)return;
      const{center,bbox,reliable,gpsOnly,courseOnly}=getCenter();
      let finalCenter=center;
      if(center[0]===0&&center[1]===0){if(gpsRef.current?.lat){finalCenter=[gpsRef.current.lng,gpsRef.current.lat];}else return;}
      // courseOnly = OSM gave us the course center but no hole detail — zoom out to show the course
      const initZoom=courseOnly?15:(gpsOnly||(center[0]===0&&gps?.lat))?18:18;
      const m=new maplibregl.Map({container:containerRef.current,style:{version:8,glyphs:"https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",sources:{satellite:{type:"raster",tiles:["https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token="+import.meta.env.VITE_MAPBOX_TOKEN],tileSize:512,maxzoom:22,attribution:"© Mapbox © OpenStreetMap"}},layers:[{id:"satellite",type:"raster",source:"satellite",paint:{
          // Vivid, high-contrast satellite: greens pop, bunkers read white, water reads blue
          "raster-brightness-min":0.05,"raster-brightness-max":1.0,
          "raster-saturation":0.5,"raster-contrast":0.3,"raster-hue-rotate":0
        }}]},center:finalCenter,zoom:initZoom,
        bearing:bearing,pitch:0,interactive:true,attributionControl:false});
      mapRef.current=m;
      m.on("load",()=>{
        if(bbox){m.fitBounds(bbox,{padding:40,duration:0,maxZoom:20});}else if(gpsOnly&&gpsRef.current){m.setCenter([gpsRef.current.lng,gpsRef.current.lat]);m.setZoom(18);}
        // Apply hole-up bearing after map loads
        if(bearing&&bearing!==0){m.rotateTo(bearing,{duration:0});}
        const osm=holeData?.osmFeatures;
        if(osm?.features?.length>0){
          const types=[{type:"fairway",fillColor:"#4ade80",fillOpacity:0.3,lineColor:"#22c55e",lineWidth:2},{type:"green",fillColor:"#16a34a",fillOpacity:0.75,lineColor:"#4ade80",lineWidth:2.5},{type:"tee",fillColor:"#15803d",fillOpacity:0.8,lineColor:"#14532d",lineWidth:1.5},{type:"bunker",fillColor:"#fde68a",fillOpacity:0.8,lineColor:"#b45309",lineWidth:1.5},{type:"water",fillColor:"#3b82f6",fillOpacity:0.65,lineColor:"#1d4ed8",lineWidth:1.5}];
          types.forEach(({type,fillColor,fillOpacity,lineColor,lineWidth})=>{const gj=buildGeoJSON(osm.features,type);if(!gj.features.length)return;m.addSource(type,{type:"geojson",data:gj});m.addLayer({id:type+"-fill",type:"fill",source:type,paint:{"fill-color":fillColor,"fill-opacity":fillOpacity}});m.addLayer({id:type+"-line",type:"line",source:type,paint:{"line-color":lineColor,"line-width":lineWidth,"line-opacity":0.9}});});
          const fw=osm.features.filter(f=>f.type==="fairway")[0];
          if(fw&&fw.pts.length>2&&holeData.yards){const yards=holeData.yards;const markerFeats=[75,100,125,150,175,200].filter(y=>y<yards).map(y=>{const t=y/yards;const idx=Math.min(Math.floor(t*(fw.pts.length-1)),fw.pts.length-2);const frac=t*(fw.pts.length-1)-idx;const p1=fw.pts[idx],p2=fw.pts[Math.min(idx+1,fw.pts.length-1)];const px=p1.x+(p2.x-p1.x)*frac;const py=p1.y+(p2.y-p1.y)*frac;const lng=osm.bounds.minLng+px*(osm.bounds.maxLng-osm.bounds.minLng);const lat=osm.bounds.minLat+py*(osm.bounds.maxLat-osm.bounds.minLat);return{type:"Feature",properties:{label:y+"y"},geometry:{type:"Point",coordinates:[lng,lat]}};});if(markerFeats.length>0){m.addSource("dist-markers",{type:"geojson",data:{type:"FeatureCollection",features:markerFeats}});m.addLayer({id:"dist-dots",type:"circle",source:"dist-markers",paint:{"circle-radius":5,"circle-color":"rgba(255,255,255,0.85)","circle-stroke-color":"#374151","circle-stroke-width":1.5}});m.addLayer({id:"dist-labels",type:"symbol",source:"dist-markers",layout:{"text-field":["get","label"],"text-font":["Open Sans Bold"],"text-size":10,"text-offset":[0,-1.2],"text-anchor":"bottom"},paint:{"text-color":"#ffffff","text-halo-color":"rgba(0,0,0,0.8)","text-halo-width":1.5}});}}
        }else{
          const shape=holeData?.shape||"straight";const tee=holeData?.tee_lat?[holeData.tee_lng,holeData.tee_lat]:null;const green=holeData?.green_lat?[holeData.green_lng,holeData.green_lat]:null;
          if(tee&&green){
            const mid=[tee[0]+(green[0]-tee[0])*0.5,tee[1]+(green[1]-tee[1])*0.5];const offset=0.00015;const dogOff=shape==="dogleg-left"?-offset*2:shape==="dogleg-right"?offset*2:0;
            const fwLine={type:"Feature",geometry:{type:"LineString",coordinates:[tee,[mid[0]+dogOff,mid[1]],green]}};
            m.addSource("fw-line",{type:"geojson",data:fwLine});m.addLayer({id:"fw-stroke",type:"line",source:"fw-line",paint:{"line-color":"#4ade80","line-width":22,"line-opacity":0.3,"line-cap":"round","line-join":"round"}});m.addLayer({id:"fw-center",type:"line",source:"fw-line",paint:{"line-color":"#86efac","line-width":8,"line-opacity":0.5,"line-cap":"round","line-join":"round"}});
            const greenGJ={type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"Point",coordinates:green},properties:{}}]};m.addSource("green-pt",{type:"geojson",data:greenGJ});m.addLayer({id:"green-circle",type:"circle",source:"green-pt",paint:{"circle-radius":20,"circle-color":"#16a34a","circle-opacity":0.8,"circle-stroke-color":"#4ade80","circle-stroke-width":2.5}});
            const teeGJ={type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"Point",coordinates:tee},properties:{}}]};m.addSource("tee-pt",{type:"geojson",data:teeGJ});m.addLayer({id:"tee-circle",type:"circle",source:"tee-pt",paint:{"circle-radius":8,"circle-color":"#1f2937","circle-opacity":0.9,"circle-stroke-color":"#eeeef5","circle-stroke-width":2}});
            // Smart aim line: dashed line from tee to landing zone (60% down fairway)
            const aimPt=[tee[0]+(green[0]-tee[0])*0.62+dogOff*0.5,tee[1]+(green[1]-tee[1])*0.62];
            m.addSource("aim-l",{type:"geojson",data:{type:"Feature",geometry:{type:"LineString",coordinates:[tee,aimPt]}}});
            m.addLayer({id:"aim-dash",type:"line",source:"aim-l",paint:{"line-color":"#CFFF04","line-width":2.5,"line-opacity":0.9,"line-dasharray":[5,3],"line-cap":"round"}});
            m.addSource("aim-d",{type:"geojson",data:{type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"Point",coordinates:aimPt},properties:{}}]}});
            m.addLayer({id:"aim-dot",type:"circle",source:"aim-d",paint:{"circle-radius":6,"circle-color":"#CFFF04","circle-opacity":0.95,"circle-stroke-color":"#000","circle-stroke-width":1.5}});
            (holeData.hazards||[]).slice(0,3).forEach((hz,i)=>{const t=0.3+i*0.2;const hPos=[tee[0]+(green[0]-tee[0])*t+(i%2===0?offset:-offset)*3,tee[1]+(green[1]-tee[1])*t];const isWater=new RegExp("water|lake|pond|ocean|creek","i").test(hz);const hGJ={type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"Point",coordinates:hPos},properties:{}}]};m.addSource("haz-"+i,{type:"geojson",data:hGJ});m.addLayer({id:"haz-c-"+i,type:"circle",source:"haz-"+i,paint:{"circle-radius":14,"circle-color":isWater?"rgba(59,130,246,0.6)":"rgba(253,230,138,0.7)","circle-stroke-color":isWater?"#2563eb":"#b45309","circle-stroke-width":1.5}});});
            const yards=holeData.yards||400;const distFeats=[100,150,200].filter(y=>y<yards).map(y=>{const t=y/yards;const dogX=dogOff*(t<0.5?t*2:1);return{type:"Feature",properties:{label:y+"y"},geometry:{type:"Point",coordinates:[tee[0]+(green[0]-tee[0])*t+dogX,tee[1]+(green[1]-tee[1])*t]}};});
            if(distFeats.length>0){m.addSource("dist-m",{type:"geojson",data:{type:"FeatureCollection",features:distFeats}});m.addLayer({id:"dist-d",type:"circle",source:"dist-m",paint:{"circle-radius":5,"circle-color":"rgba(255,255,255,0.85)","circle-stroke-color":"#374151","circle-stroke-width":1.5}});}
          }
        }
        const{gpsOnly:go}=getCenter();
        // Best pin coord: OSM green centroid > Gemini coords > null
        let pinCoord=null;
        if(!go){
          const osmGreen=holeData?.osmFeatures?.features?.filter(f=>f.type==="green")?.[0];
          if(osmGreen?.coords?.length>0){
            // Use centroid of OSM green polygon — always accurate
            const avgLat=osmGreen.coords.reduce((s,c)=>s+c.lat,0)/osmGreen.coords.length;
            const avgLng=osmGreen.coords.reduce((s,c)=>s+c.lng,0)/osmGreen.coords.length;
            pinCoord=[avgLng,avgLat];
          } else if(holeData?.green_lat){
            pinCoord=[holeData.green_lng,holeData.green_lat];
          }
        }
        if(pinCoord){const flagEl=document.createElement("div");flagEl.innerHTML='<div style="width:16px;height:16px;border-radius:50%;background:#ffffff;border:2.5px solid #000;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>';
          flagEl.style.cssText="cursor:default;";new maplibregl.Marker({element:flagEl,anchor:"bottom"}).setLngLat(pinCoord).addTo(m);
          // Yardage rings 100/150/200y from pin
          const toRad2=x=>x*Math.PI/180;
          [100,150,200].forEach((yards,ri)=>{
            const rm=yards*0.9144;
            const pts=[];
            for(let a=0;a<=360;a+=5){pts.push([pinCoord[0]+((rm/(111320*Math.cos(toRad2(pinCoord[1]))))*Math.sin(toRad2(a))),pinCoord[1]+((rm/111320)*Math.cos(toRad2(a)))]);}
            const rc=["rgba(255,255,255,0.5)","rgba(255,220,0,0.55)","rgba(255,140,0,0.5)"][ri];
            m.addSource("yr"+yards,{type:"geojson",data:{type:"Feature",geometry:{type:"Polygon",coordinates:[pts]}}});
            m.addLayer({id:"yr-l"+yards,type:"line",source:"yr"+yards,paint:{"line-color":rc,"line-width":1.5,"line-dasharray":[3,2]}});
            m.addSource("yl"+yards,{type:"geojson",data:{type:"Feature",properties:{lbl:yards+"y"},geometry:{type:"Point",coordinates:[pinCoord[0],pinCoord[1]+(rm/111320)]}}});
            m.addLayer({id:"yt"+yards,type:"symbol",source:"yl"+yards,layout:{"text-field":["get","lbl"],"text-font":["Open Sans Bold"],"text-size":9,"text-anchor":"bottom"},paint:{"text-color":"#ffffff","text-halo-color":"rgba(0,0,0,0.9)","text-halo-width":1.5}});
          });
        }
        const playerGJ={type:"Feature",geometry:{type:"Point",coordinates:[0,0]},properties:{}};const lineGJ={type:"Feature",geometry:{type:"LineString",coordinates:[[0,0],[0,0]]},properties:{}};
        m.addSource("player",{type:"geojson",data:playerGJ});m.addSource("dist-line",{type:"geojson",data:lineGJ});
        m.addLayer({id:"dist-line",type:"line",source:"dist-line",paint:{"line-color":"#ffffff","line-width":2,"line-opacity":0.7,"line-dasharray":[4,3]}});
        m.addLayer({id:"player-ring",type:"circle",source:"player",paint:{"circle-radius":18,"circle-color":"rgba(59,130,246,0.12)","circle-stroke-color":"rgba(59,130,246,0.35)","circle-stroke-width":2}});
        m.addLayer({id:"player-dot",type:"circle",source:"player",paint:{"circle-radius":9,"circle-color":"#3b82f6","circle-stroke-color":"#ffffff","circle-stroke-width":2.5}});
        // Wind overlay badge
        if(weather?.wind>0){
          const we=document.createElement("div");
          we.style.cssText="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.7);border-radius:8px;padding:4px 8px;display:flex;align-items:center;gap:4px;pointer-events:none;";
          we.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CFFF04" stroke-width="2.5" style="transform:rotate('+(weather.windDeg||0)+'deg)"><path d="M12 2v20M12 2L6 8M12 2L18 8"/></svg><span style="font-family:var(--font-display,sans-serif);font-size:10px;font-weight:700;color:#fff;">'+weather.wind+'mph</span>';
          containerRef.current.appendChild(we);
        }
        playerSourceRef.current=m.getSource("player");lineSourceRef.current=m.getSource("dist-line");
        if(gps?.lat){playerSourceRef.current.setData({type:"Feature",geometry:{type:"Point",coordinates:[gps.lng,gps.lat]},properties:{}});if(pinCoord){lineSourceRef.current.setData({type:"Feature",geometry:{type:"LineString",coordinates:[[gps.lng,gps.lat],pinCoord]},properties:{}}); }}
      });
      return()=>{m.remove();mapRef.current=null;playerSourceRef.current=null;lineSourceRef.current=null;};
    },[holeData?.osmFeatures,holeData?.tee_lat,holeData?.green_lat,bearing]);

    useEffect(()=>{
      if(!mapRef.current||!gps?.lat)return;
      const{gpsOnly:go}=getCenter();
      if(go){const curr=mapRef.current.getCenter();const dist=Math.abs(curr.lat-gps.lat)+Math.abs(curr.lng-gps.lng);if(dist>0.0005)mapRef.current.easeTo({center:[gps.lng,gps.lat],zoom:18,duration:800});}
    },[gps?.lat,gps?.lng]);

    useEffect(()=>{
      if(!playerSourceRef.current||!gps?.lat)return;
      const coord=[gps.lng,gps.lat];
      playerSourceRef.current.setData({type:"Feature",geometry:{type:"Point",coordinates:coord},properties:{}});
      const{gpsOnly:go2}=getCenter();
      if(go2&&mapRef.current){mapRef.current.easeTo({center:coord,zoom:18,duration:800});}
      const pinCoord=(go2||!holeData?.green_lat)?null:[holeData.green_lng,holeData.green_lat];
      if(pinCoord&&lineSourceRef.current){lineSourceRef.current.setData({type:"Feature",geometry:{type:"LineString",coordinates:[coord,pinCoord]},properties:{}});}
    },[gps]);

    return(
      <div style={{position:fullscreen?"absolute":"relative",inset:fullscreen?"0":undefined,width:"100%",height:fullscreen?"100%":H+"px"}}>
        <div ref={containerRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}} className="bg-emerald-950/20"/>
        {(()=>{const{gpsOnly:go3}=getCenter();return go3;})()&&(
          <div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.75)",borderRadius:"8px",padding:"6px 12px",color:"#fff",fontSize:"11px",fontWeight:"700",whiteSpace:"nowrap",pointerEvents:"none"}}>
            ~{holeMap?.yards||"?"}y to pin -- tap to drop pin
          </div>
        )}
      </div>
    );
  };

  const sendMessage=async(text)=>{
    const msg=text||input;if(!msg.trim()||loading)return;setInput("");
    const userMsg={role:"user",content:msg};const newMessages=[...messages,userMsg];setMessages(newMessages);setLoading(true);
    // During welcome conversation, route to welcome handler
    if(welcomeStage===1||welcomeStage===2){
      setLoading(false);
      await handleWelcomeReply(msg,welcomeStage);
      return;
    }
    const doFetch=async(attempt)=>{
      const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:newMessages,system:buildSystem()})});
      if(!r.ok){const t=await r.text().catch(()=>"HTTP "+r.status);throw new Error(t);}
      const d=await r.json();
      let reply="";
      if(d?.content?.[0]?.text)reply=d.content[0].text;
      else if(d?.candidates?.[0]?.content?.parts?.[0]?.text)reply=d.candidates[0].content.parts[0].text;
      else if(typeof d?.text==="string")reply=d.text;
      else if(typeof d?.message==="string")reply=d.message;
      else if(typeof d?.response==="string")reply=d.response;
      else{console.error("API shape:",JSON.stringify(d).slice(0,300));if(attempt<2)throw new Error("retry");reply="Having trouble connecting. Try again.";}
      return reply;
    };
    try{
      let reply="";
      try{reply=await doFetch(1);}
      catch(e){
        if(e.message==="retry"||e.message.includes("5")){
          await new Promise(res=>setTimeout(res,1200));
          reply=await doFetch(2);
        } else throw e;
      }
      setMessages(m=>[...m,{role:"assistant",content:reply}]);
      if(autoSpeak&&reply){setTimeout(()=>speakText(reply),400);}
    }
    catch(e){console.error("Chat error:",e);setMessages(m=>[...m,{role:"assistant",content:"Connection error — check your internet and try again."}]);}
    setLoading(false);
  };

  // ── OBI WELCOME CONVERSATION ───────────────────────────────────
  // Fires once per user, ever. Obi speaks first, asks one question,
  // builds context through natural back-and-forth.
  const obiSpeak=async(text,delayMs=400)=>{
    setObiTyping(true);
    await new Promise(r=>setTimeout(r,delayMs+Math.min(text.length*18,1800)));
    setObiTyping(false);
    setMessages(m=>[...m,{role:"assistant",content:text}]);
  };

  const triggerWelcome=useCallback(async()=>{
    if(welcomeSent)return;
    try{localStorage.setItem("obi_welcome_sent","true");}catch{}
    setWelcomeSent(true);
    setChatOpen(true);
    setWelcomeStage(1);
    const name=firstName(authName)||firstName(userProfile?.full_name)||"there";
    await obiSpeak(
      "Hey "+name+" — I'm Obi, your caddie. I've been on the bag for players at every level, from first-timers to scratch golfers. One question before we do anything else: what's the single thing costing you the most strokes right now?",
      600
    );
  },[welcomeSent,userProfile]);

  // Handle welcome follow-ups after user responds
  const handleWelcomeReply=useCallback(async(userMsg,stage)=>{
    if(stage===1){
      // They answered "what's costing you strokes" — respond + ask course
      setWelcomeStage(2);
      const name=firstName(authName)||firstName(userProfile?.full_name)||"";
      const prompt=`The player just said this is costing them strokes: "${userMsg}". Respond in 2 sentences: first give a specific insight validating their answer (not generic), then ask what course they play most. Warm and direct. Use their name: ${name}. No markdown.`;
      setObiTyping(true);
      try{
        const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({messages:[{role:"user",content:prompt}],
            system:"You are Obi, a warm expert golf caddie. MAX 2 sentences. Plain English. No markdown. Ask what course they play at the end."})});
        const d=await r.json();
        let reply=d?.content?.[0]?.text||d?.candidates?.[0]?.content?.parts?.[0]?.text||d?.text||"";
        if(reply){
          await new Promise(res=>setTimeout(res,Math.min(reply.length*15,2000)));
          setObiTyping(false);
          setMessages(m=>[...m,{role:"assistant",content:reply}]);
        } else setObiTyping(false);
      }catch{setObiTyping(false);}
    } else if(stage===2){
      // They named their course — set it and respond
      setWelcomeStage(3);
      const detectedCourse=userMsg.trim();
      if(detectedCourse.length>2){
        setCourse(detectedCourse);
        setCourseInput(detectedCourse);
        fetchHoleMap(detectedCourse,1);
      }
      const name=firstName(authName)||firstName(userProfile?.full_name)||"";
      await obiSpeak(
        "Perfect — I know that course well. I'm pulling up the layout now. "+
        (detectedCourse.length>2?"Start on hole 1 or tell me which hole you want to talk about. ":"")+
        "From here on, just ask me anything — what club, where to aim, rules questions, anything. I've got you, "+name+".",
        300
      );
    }
  },[userProfile,welcomeStage]);

  const speakText=(text)=>{
    if(!window.speechSynthesis||!text)return;window.speechSynthesis.cancel();setSpeaking(false);
    const clean=text.replace(new RegExp("[*_#]","g"),"").replace(new RegExp("\n","g")," ").trim();if(!clean)return;
    const doSpeak=()=>{const utt=new SpeechSynthesisUtterance(clean);utt.rate=0.9;utt.pitch=1;utt.volume=1;const voices=window.speechSynthesis.getVoices();const pick=voices.find(v=>new RegExp("samantha|karen|daniel|alex|moira","i").test(v.name)&&v.lang.startsWith("en"))||voices.find(v=>v.lang==="en-US"&&!v.name.includes("Google"))||voices.find(v=>v.lang.startsWith("en"))||voices[0];if(pick)utt.voice=pick;utt.onstart=()=>setSpeaking(true);utt.onend=()=>setSpeaking(false);utt.onerror=()=>setSpeaking(false);window.speechSynthesis.speak(utt);};
    const voices=window.speechSynthesis.getVoices();if(voices.length>0){doSpeak();}else{window.speechSynthesis.onvoiceschanged=()=>{window.speechSynthesis.onvoiceschanged=null;doSpeak();};setTimeout(()=>{if(!speaking)doSpeak();},300);}
  };

  const stopSpeak=()=>{if(window.speechSynthesis)window.speechSynthesis.cancel();setSpeaking(false);};

  const startMic=async()=>{
    if(micActive){if(window.Capacitor?.isNativePlatform?.()&&CapSpeech){await CapSpeech.stop().catch(()=>{});}else{recognizerRef.current?.stop();}setMicActive(false);return;}
    if(window.Capacitor?.isNativePlatform?.()&&CapSpeech){
      try{await CapSpeech.requestPermissions();const avail=await CapSpeech.available();if(!avail.available)return;setMicActive(true);CapSpeech.start({language:"en-US",maxResults:1,prompt:"Ask Obi anything...",partialResults:true,popup:false});CapSpeech.addListener('partialResults',data=>{if(data.matches?.[0])setInput(data.matches[0]);});CapSpeech.addListener('listeningState',state=>{if(state.status==="stopped"){setMicActive(false);if(input.trim())setTimeout(()=>sendMessage(input),100);}});}catch{setMicActive(false);}
    }else{
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;
      const r=new SR();r.lang="en-US";r.continuous=false;r.interimResults=true;r.onstart=()=>setMicActive(true);r.onend=()=>setMicActive(false);r.onerror=()=>setMicActive(false);
      r.onresult=e=>{const transcript=Array.from(e.results).map(r=>r[0].transcript).join("");setInput(transcript);if(e.results[e.results.length-1].isFinal){setMicActive(false);setTimeout(()=>sendMessage(transcript),100);}};
      recognizerRef.current=r;r.start();
    }
  };

  const speak=(text)=>{if(!window.speechSynthesis)return;if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return;}const utt=new SpeechSynthesisUtterance(text.replace(new RegExp("[*_#]","g"),""));utt.rate=0.93;utt.pitch=0.95;utt.onend=()=>setSpeaking(false);setSpeaking(true);window.speechSynthesis.speakText(utt);};

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  // Trigger welcome conversation when caddie tab opens for the first time
  useEffect(()=>{
    if(tab==="caddie"&&!welcomeSent&&userProfile){
      const t=setTimeout(()=>triggerWelcome(),800);
      return()=>clearTimeout(t);
    }
  },[tab,welcomeSent,userProfile]);

  const saveRound=async()=>{
    if(!user)return;const filled=scorecard.filter(Boolean);if(filled.length===0)return;
    const total=filled.reduce((a,b)=>a+b,0);const par=holePars.slice(0,filled.length).reduce((a,b)=>a+b,0);const diff=total-par;
    const {data,error}=await supabase.from("rounds").insert({user_id:user.id,course_name:course||"Unknown Course",total_score:total,holes_played:filled.length,score_vs_par:diff,played_at:new Date().toISOString(),scorecard,hole_pars:holePars,fairways,gir,putts}).select().single();
    if(!error&&data){
      const newRounds=[data,...rounds];
      setRounds(newRounds);
      // Check for milestone celebrations
      const milestones=checkMilestones(newRounds,total,diff,scorecard,holePars);
      if(milestones.length>0){setCelebration(milestones[0]);}
      // Generate post-round recap via Obi
      const puttTotal=putts.filter(p=>p!==null).reduce((a,b)=>a+b,0);
      const fwyCount=fairways.filter(f=>f===true).length;
      const fwyTot=fairways.filter(f=>f!==null).length;
      const diffStr=diff===0?"even par":diff>0?"+"+diff+" over par":Math.abs(diff)+" under par";
      (async()=>{
        try{
          const prompt="Golf round just completed. Player: "+(firstName(userProfile?.full_name)||"Golfer")+". HCP: "+profile.hcp+". Course: "+(course||"Unknown")+". Score: "+total+" ("+diffStr+"). "+
            (fwyTot>0?"Fairways: "+fwyCount+"/"+fwyTot+". ":"")+
            (puttTotal>0?"Putts: "+puttTotal+". ":"")+
            "Scorecard: "+scorecard.map((s,i)=>s?"H"+(i+1)+":"+s+"(p"+holePars[i]+")":"").filter(Boolean).join(" ")+". "+
            "Write ONE sentence of warm, specific, personal coaching insight about this round. What was the biggest pattern? What should they focus on next time? Plain English, no markdown, use their first name.";
          const resp=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({messages:[{role:"user",content:prompt}],system:"You are Obi, an encouraging golf caddie. Give ONE specific actionable insight. Warm tone. Plain English. Max 2 sentences."})});
          if(resp.ok){
            const d=await resp.json();
            let insight="";
            if(d?.content?.[0]?.text)insight=d.content[0].text;
            else if(d?.candidates?.[0]?.content?.parts?.[0]?.text)insight=d.candidates[0].content.parts[0].text;
            if(insight){
              setPostRoundRecap({total,diff,diffStr,insight,milestones,fwyCount,fwyTot,puttTotal});
              // Build share card data
              setShareCard({
                total,diff,diffStr,
                course:course||"Unknown Course",
                insight,
                persona:profile.persona||"pro",
                name:firstName(userProfile?.full_name)||"Golfer",
                fwyCount,fwyTot,puttTotal,
                date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
              });
            }
          }
        }catch(e){console.warn("Recap error",e);}
      })();
      setScorecard(Array(18).fill(null));setFairways(Array(18).fill(null));setGir(Array(18).fill(null));setPutts(Array(18).fill(null));
    }
  };

  const handleAvatarUpload=async(e)=>{
    const file=e.target.files?.[0];if(!file||!user)return;setUploadingAvatar(true);
    try{const canvas=document.createElement("canvas");const img=new Image();img.onload=async()=>{const maxSize=400;let{width:w,height:h}={width:img.width,height:img.height};if(w>h){if(w>maxSize){h=h*(maxSize/w);w=maxSize;}}else{if(h>maxSize){w=w*(maxSize/h);h=maxSize;}}canvas.width=w;canvas.height=h;canvas.getContext("2d").drawImage(img,0,0,w,h);canvas.toBlob(async(blob)=>{if(!blob)return;const ext=file.name.split(".").pop()||"jpg";const path=user.id+"."+ext;const{error:upErr}=await supabase.storage.from("avatars").upload(path,blob,{upsert:true,contentType:"image/jpeg"});if(!upErr){const{data:{publicUrl}}=supabase.storage.from("avatars").getPublicUrl(path);const url=publicUrl+"?t="+Date.now();setAvatarUrl(url);await supabase.from("profiles").update({avatar_url:url}).eq("id",user.id);}setUploadingAvatar(false);},"image/jpeg",0.85);};img.src=URL.createObjectURL(file);}catch{setUploadingAvatar(false);}
  };

  // ── GROUP ROUND ───────────────────────────────────────────────
  const generateGroupCode=()=>{
    const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  };

  const startGroupRound=()=>{
    const code=generateGroupCode();
    setGroupRoundCode(code);
    const me={id:user?.id||"me",name:firstName(userProfile?.full_name)||"You",scores:Array(18).fill(null),color:"#CFFF04",isMe:true};
    setGroupPlayers([me]);
    setShowGroupModal(true);
    // Share text
    const shareText=`Join my Obi Golf round! Code: ${code}\nDownload Obi Golf and enter this code to follow along live.\ncaddie-ai-ivory.vercel.app`;
    if(navigator.share){navigator.share({title:"Join my Obi Golf round",text:shareText}).catch(()=>{});}
    else{navigator.clipboard?.writeText(shareText).catch(()=>{});}
  };

  const addGroupPlayer=(name)=>{
    if(!name.trim())return;
    const colors=["#60a5fa","#f87171","#a78bfa","#34d399","#fb923c"];
    const color=colors[groupPlayers.length%colors.length];
    setGroupPlayers(p=>[...p,{id:"p"+Date.now(),name:name.trim(),scores:Array(18).fill(null),color,isMe:false}]);
    setGroupName("");
  };

  const updateGroupScore=(playerId,holeIdx,score)=>{
    setGroupPlayers(ps=>ps.map(p=>p.id===playerId?{...p,scores:p.scores.map((s,i)=>i===holeIdx?score:s)}:p));
  };

  const lookupRule=async(query)=>{
    if(!query.trim())return;
    setRulesLoading(true);setRulesAnswer("");
    try{
      const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:[{role:"user",content:query}],
          system:"You are a friendly golf rules expert. Answer in plain English a beginner can understand. Be concise (3-4 sentences). State the ruling clearly, any penalty strokes, and exactly what the player does next. No markdown or bullets."})});
      if(!r.ok)throw new Error("HTTP "+r.status);
      const d=await r.json();
      let ans="";
      if(d?.content?.[0]?.text)ans=d.content[0].text;
      else if(d?.candidates?.[0]?.content?.parts?.[0]?.text)ans=d.candidates[0].content.parts[0].text;
      else if(typeof d?.text==="string")ans=d.text;
      setRulesAnswer(ans||"Try rephrasing your question.");
    }catch(e){setRulesAnswer("Connection error. Try again.");}
    setRulesLoading(false);
  };

  const checkMilestones=(allRounds,total,diff,sc,pars)=>{
    const milestones=[];
    if(allRounds.length===1)milestones.push({emoji:"🏌️",title:"First Round Saved!",body:"You just saved your first round with Obi. Every pro started exactly where you are right now."});
    const prevScores=allRounds.slice(1).map(r=>r.total_score||999).filter(s=>s<998);
    if(prevScores.length>0&&total<Math.min(...prevScores))milestones.push({emoji:"🏆",title:"New Personal Best!",body:"You shot "+total+" — beating your previous best of "+Math.min(...prevScores)+" by "+(Math.min(...prevScores)-total)+" strokes. That's real progress."});
    const thresholds=[120,110,100,95,90,85,80];
    const prevBest=prevScores.length>0?Math.min(...prevScores):999;
    thresholds.forEach(t=>{if(total<=t&&prevBest>t)milestones.push({emoji:"🎯",title:"Broke "+t+"!",body:"You shot "+total+" — under "+t+" for the first time. Most golfers never reach this. Keep going."});});
    const hadBirdie=allRounds.slice(1).some(r=>(r.scorecard||[]).some((s,i)=>s!==null&&s<((r.hole_pars||[])[i]||4)));
    const todayBirdies=sc.filter((s,i)=>s!==null&&pars[i]&&s<pars[i]);
    if(todayBirdies.length>0&&!hadBirdie)milestones.push({emoji:"🐦",title:"First Birdie Ever!",body:"You made your first birdie today! That feeling never gets old — this is what the game is about."});
    if(diff<=0&&allRounds.length>1)milestones.push({emoji:"⭐",title:"Even Par or Better!",body:"You shot even par or better. That puts you in elite company. Seriously impressive."});
    if(allRounds.length>=3){const last3=allRounds.slice(0,3).map(r=>r.total_score||0);if(Math.max(...last3)-Math.min(...last3)<=5)milestones.push({emoji:"🔥",title:"Scoring Consistency!",body:"Last 3 rounds: "+last3.join(", ")+". Tight range — that's the mark of a real golfer finding their game."});}
    return milestones;
  };

  const searchFriends=async()=>{if(!friendSearch.trim())return;const{data}=await supabase.from("profiles").select("id,full_name,handicap_index,avatar_url").ilike("full_name","%"+friendSearch+"%").neq("id",user?.id).limit(10);setFriendResults(data||[]);};
  const sendFriendReq=async(toId)=>{if(!user)return;await supabase.from("friendships").insert({requester_id:user.id,addressee_id:toId,status:"pending"});setFriendResults(r=>r.filter(x=>x.id!==toId));};
  const acceptFriend=async(fid)=>{await supabase.from("friendships").update({status:"accepted"}).eq("id",fid);if(user)loadFriends(user.id);};

  const handleSwingAnalyze=async()=>{
    if(!swingFile||swingLoading)return;
    setSwingLoading(true);setSwingAnalysis("");
    const currentFile=swingFile;
    const currentNotes=swingNotes;
    const currentThumb=swingThumb;
    // Some iOS devices report empty MIME type for .MOV files — fall back to extension check.
    const isVideo=currentFile.type.startsWith("video/")||
      /\.(mp4|mov|avi|webm|mkv|m4v|hevc|3gp|qt)$/i.test(currentFile.name||"");
    const localBlobUrl=isVideo?URL.createObjectURL(currentFile):null;
    const ownSwing=isOwnSwing; // capture current value before async work
    const capturedLevel=golferLevel; // capture before async
    try{
      // analyzeSwingVideo returns { text, videoUrl }; analyzeSwing returns a plain string
      let analysisText,persistedVideoUrl=null;
      if(isVideo){
        const r=await analyzeSwingVideo(currentFile,currentNotes,profile,capturedLevel);
        if(r&&typeof r==="object"){analysisText=r.text;persistedVideoUrl=r.videoUrl||null;}
        else{analysisText=r;}
      }else{analysisText=await analyzeSwing(currentFile,currentNotes,profile,capturedLevel);}
      const result=analysisText;
      const videoBlobUrl=persistedVideoUrl||localBlobUrl; // prefer persisted URL
      setSwingAnalysis(result);
      // Parse JSON to extract keyFrames for frame extraction
      // Use indexOf/lastIndexOf so preamble text from Gemini doesn't break the parse
      let parsedResult=null;
      try{let js=result.replace(/^```json\s*/m,"").replace(/\s*```\s*$/m,"").trim();const s0=js.indexOf("{"),e0=js.lastIndexOf("}");if(s0!==-1&&e0>s0){js=js.slice(s0,e0+1);}parsedResult=JSON.parse(js);}catch(e){}
      const entryTime=new Date().toISOString();
      const newEntry={
        id:null,
        club_used:currentNotes||"unknown",
        notes:currentNotes,
        analysis:result,
        thumbnail:currentThumb||null,
        videoUrl:videoBlobUrl,
        video_url:persistedVideoUrl||null,
        is_own_swing:ownSwing,
        golfer_level:capturedLevel,
        frames:null,  // null = loading; {} = done (even if failed); object = ready
        created_at:entryTime,
      };
      // Add to local history immediately — before any DB call that could throw
      setSwingHistory(h=>[{...newEntry},...h]);
      // Save to DB in background — non-fatal, never blocks or hides the result
      if(user){
        supabase.from("swing_analyses").insert({
          user_id:user.id,notes:currentNotes,analysis:result,
          club_used:currentNotes||"unknown",thumbnail:currentThumb||null,
          video_url:persistedVideoUrl||null,
          is_own_swing:ownSwing,
          golfer_level:capturedLevel,
          created_at:entryTime,
        }).select("id").single().then(({data,error})=>{
          if(error){
            console.warn("DB save failed:",error.message);
            // Mark entry so UI can show "not saved" warning — data is visible this session only
            setSwingHistory(h=>h.map(e=>e.created_at===entryTime?{...e,saveError:error.message}:e));
            return;
          }
          if(data?.id)setSwingHistory(h=>h.map(e=>e.created_at===entryTime?{...e,id:data.id}:e));
        }).catch(err=>{
          console.warn("DB save error:",err.message);
          setSwingHistory(h=>h.map(e=>e.created_at===entryTime?{...e,saveError:err.message}:e));
        });
      }
      // Process frames + pose async — runs for ALL videos regardless of JSON parse success
      if(isVideo){
        processSwingVideo(currentFile,parsedResult||{})
          .then(frames=>{
            const f=frames||{};
            const logs=[..._frameLogBuf];
            setSwingHistory(h=>h.map(e=>e.created_at===entryTime?{...e,frames:f,frameLogs:logs}:e));
            // Persist frames to DB — wrapped in try/catch so any sync throw can't
            // escape into the outer .catch() and overwrite the frames we just set.
            if(user&&(f.setup||f.top||f.impact)){
              setTimeout(()=>{
                setSwingHistory(h=>{
                  const ent=h.find(e=>e.created_at===entryTime);
                  if(ent?.id){
                    try{
                      supabase.from("swing_analyses").update({
                        frame_setup:f.setup||null,
                        frame_top:f.top||null,
                        frame_impact:f.impact||null,
                      }).eq("id",ent.id).catch(()=>{});
                    }catch(dbErr){console.warn("[frames] db update threw:",dbErr?.message);}
                  }
                  return h;
                });
              },2500);
            }
          })
          // GUARD: only mark as failed if frames is still null (loading).
          // Without this guard the .catch() overwrites {setup,top,impact} with {}
          // when anything inside .then() throws after setSwingHistory has already run.
          .catch(()=>setSwingHistory(h=>h.map(e=>
            e.created_at===entryTime&&e.frames===null?{...e,frames:{}}:e
          )));
      }
    }catch(e){
      console.error("Swing analysis error:",e);
      setSwingAnalysis("Analysis failed: "+e.message);
    }
    setSwingFile(null);setSwingThumb(null);
    if(swingInputRef.current)swingInputRef.current.value="";
    setIsOwnSwing(true);      // reset to "My swing" for next upload
    setGolferLevel("unknown"); // reset level for next upload
    setSwingLoading(false);
  };

  // Re-extract key frames for a historical entry that has a stored video_url.
  // Called when the user expands a swing card loaded from the DB (frames=undefined).
  const reExtractFrames=useCallback((entry)=>{
    const videoUrl=entry.video_url||entry.videoUrl||null;
    const entryTime=entry.created_at;
    if(!videoUrl||!entryTime)return;
    // Mark as loading so the spinner shows immediately
    setSwingHistory(h=>h.map(e=>e.created_at===entryTime?{...e,frames:null}:e));
    // Parse stored analysis to get Gemini keyFrame hints (for timing fallback)
    let parsedResult=null;
    try{
      const js=(entry.analysis||"").replace(/^```json\s*/m,"").replace(/\s*```\s*$/m,"").trim();
      const s0=js.indexOf("{"),e0=js.lastIndexOf("}");
      if(s0!==-1&&e0>s0)parsedResult=JSON.parse(js.slice(s0,e0+1));
    }catch{}
    processSwingVideo(videoUrl,parsedResult||{})
      .then(frames=>{
        const f=frames||{};
        const logs=[..._frameLogBuf];
        setSwingHistory(h=>h.map(e=>e.created_at===entryTime?{...e,frames:f,frameLogs:logs}:e));
        // Save to DB — isolated in try/catch so any sync throw can't reach the outer .catch()
        // and overwrite the frames we just stored in state.
        if(user&&entry.id&&(f.setup||f.top||f.impact)){
          try{
            supabase.from("swing_analyses").update({
              frame_setup:f.setup||null,
              frame_top:f.top||null,
              frame_impact:f.impact||null,
            }).eq("id",entry.id).catch(()=>{});
          }catch(dbErr){console.warn("[frames] db update threw:",dbErr?.message);}
        }
      })
      // GUARD: only mark as failed if frames is still null (loading).
      // The .catch() fires when something inside .then() throws synchronously.
      // Without the guard it overwrites {setup,top,impact} with {} even though
      // setSwingHistory above already saved the correct frames.
      .catch(()=>setSwingHistory(h=>h.map(e=>
        e.created_at===entryTime&&e.frames===null?{...e,frames:{}}:e
      )));
  },[user]);

  useEffect(()=>{
    if(!user)return;
    supabase.from("swing_analyses").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(20).then(({data,error})=>{
      if(error)console.warn("History load error:",error.message);
      if(data)setSwingHistory(data.map(s=>({
        ...s,
        // Reconstruct in-memory frames object from persisted DB columns.
        // undefined = never extracted (triggers reExtractFrames on expand).
        // {} = extracted but nothing captured. {setup,top,impact} = ready to display.
        frames:(s.frame_setup||s.frame_top||s.frame_impact)?{
          ...(s.frame_setup?{setup:s.frame_setup}:{}),
          ...(s.frame_top?{top:s.frame_top}:{}),
          ...(s.frame_impact?{impact:s.frame_impact}:{}),
        }:undefined,
      })));
    });
    supabase.from("range_shots").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50).then(({data})=>{if(data){setRangeHistory(data);const stats={};data.forEach(s=>{if(!stats[s.club])stats[s.club]={count:0,shapes:{},totalCarry:0,shapeCount:0,typicalShape:"straight",consistencyStars:3};stats[s.club].count++;if(s.shape)stats[s.club].shapes[s.shape]=(stats[s.club].shapes[s.shape]||0)+1;});Object.keys(stats).forEach(club=>{const sh=stats[club].shapes;const top=Object.entries(sh).sort((a,b)=>b[1]-a[1])[0];if(top){stats[club].typicalShape=top[0];stats[club].shapeCount=top[1];}});setClubStats(stats);}});
  },[user]);

  const analyzeRangeShot=async(videoBlob)=>{
    setRangeLoading(true);setRangeShotResult(null);
    try{const frames=[];const video=document.createElement("video");video.src=URL.createObjectURL(videoBlob);await new Promise(res=>{video.onloadedmetadata=res;});const duration=Math.min(video.duration,5);const numFrames=4;for(let i=0;i<numFrames;i++){video.currentTime=(duration/(numFrames+1))*(i+1);await new Promise(res=>{video.onseeked=res;});const canvas=document.createElement("canvas");canvas.width=320;canvas.height=240;canvas.getContext("2d").drawImage(video,0,0,320,240);frames.push(canvas.toDataURL("image/jpeg",0.7).split(",")[1]);}
    const r=await fetch("/api/swing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({frames,club:rangeClub,mode:"range",playerProfile:{handicap:profile.hcp,persona:profile.persona,missTend:profile.missTend,dexterity:profile.dexterity}})});
    const d=await r.json();const jsonStart=d.analysis.indexOf("{");const jsonEnd=d.analysis.lastIndexOf("}");const match=jsonStart>=0&&jsonEnd>jsonStart?[d.analysis.slice(jsonStart,jsonEnd+1)]:null;
    if(match){const parsed=JSON.parse(match[0]);setRangeShotResult(parsed);const shotData={user_id:user?.id,club:rangeClub,shape:parsed.shape||"straight",carry:parsed.carry||0,notes:parsed.coaching||"",created_at:new Date().toISOString()};setRangeHistory(h=>[shotData,...h]);setClubStats(prev=>{const s={...prev};if(!s[rangeClub])s[rangeClub]={count:0,shapes:{},shapeCount:0,typicalShape:"straight",consistencyStars:3};s[rangeClub].count++;if(parsed.shape){s[rangeClub].shapes[parsed.shape]=(s[rangeClub].shapes[parsed.shape]||0)+1;const top=Object.entries(s[rangeClub].shapes).sort((a,b)=>b[1]-a[1])[0];s[rangeClub].typicalShape=top[0];s[rangeClub].shapeCount=top[1];}return s;});if(user)await supabase.from("range_shots").insert(shotData);}
    }catch(e){setRangeShotResult({error:"Analysis failed"});}setRangeLoading(false);
  };

  const startCamera=async()=>{try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play();}setCameraActive(true);}catch(e){alert("Camera access denied.");}};
  const stopCamera=()=>{if(videoRef.current?.srcObject){videoRef.current.srcObject.getTracks().forEach(t=>t.stop());videoRef.current.srcObject=null;}setCameraActive(false);setRecording(false);};
  const startRecording=()=>{if(!videoRef.current?.srcObject)return;chunksRef.current=[];const mr=new MediaRecorder(videoRef.current.srcObject,{mimeType:"video/webm;codecs=vp8"});mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};mr.onstop=()=>{const blob=new Blob(chunksRef.current,{type:"video/webm"});stopCamera();analyzeRangeShot(blob);};mediaRecorderRef.current=mr;mr.start();setRecording(true);setTimeout(()=>{if(mr.state==="recording")mr.stop();},4000);};
  const stopRecording=()=>{if(mediaRecorderRef.current?.state==="recording")mediaRecorderRef.current.stop();setRecording(false);};

  const renderSwingAnalysis=(text,thumb,noteLabel,isCollapsible,expandedKey,expandedState,setExpandedState,videoUrl,frames)=>{
    if(!text)return null;

    // Try to parse as structured JSON — accepts both new (categories) and old (phases) formats
    let parsed=null;
    try{
      const jsonStr=text.replace(/^```json\n?/,"").replace(/\n?```$/,"").trim();
      parsed=JSON.parse(jsonStr);
      if(!parsed?.categories&&!parsed?.phases)parsed=null;
    }catch(e){}

    if(parsed){
      // Normalise: new format uses "categories", old format used "phases"
      // New keys: followthrough + tempo; old key: followThrough (no tempo)
      const cats=parsed.categories||parsed.phases||{};
      const isNewFormat=!!parsed.categories;
      const phases=isNewFormat
        ?[{key:"setup",label:"Setup"},{key:"backswing",label:"Bkswng"},{key:"downswing",label:"Dwnswng"},{key:"impact",label:"Impact"},{key:"followthrough",label:"Follow"},{key:"tempo",label:"Tempo"}]
        :[{key:"setup",label:"Setup"},{key:"backswing",label:"Bkswng"},{key:"downswing",label:"Dwnswng"},{key:"impact",label:"Impact"},{key:"followThrough",label:"Follow"}];
      const sc=(s)=>s>=8?"text-green-400":s>=6?"text-amber-400":"text-red-400";
      const sb=(s)=>s>=8?"border-green-500/30 bg-green-500/5":s>=6?"border-amber-400/30 bg-amber-400/5":"border-red-400/30 bg-red-400/5";
      const overall=parsed.overall||0;
      const oc=overall>=70?"text-green-400":overall>=50?"text-amber-400":"text-red-400";
      // Build readable text for TTS — prefer new "summary" field
      const drillText=typeof parsed.drill==="string"?parsed.drill:(Array.isArray(parsed.drill)?parsed.drill.join(". "):"");
      const readableText=parsed.summary||`Overall score ${overall} out of 100. ${parsed.primaryFault||""} ${drillText?"Drill: "+drillText+".":""} Strengths: ${(Array.isArray(parsed.positives)?parsed.positives:[]).join(", ")}.`;
      return(
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isCollapsible?(
            <button onClick={()=>setExpandedState(e=>!e)} className="w-full flex items-center gap-2 px-4 py-3 border-b border-border bg-foreground text-background hover:opacity-90 transition">
              {thumb&&<img src={thumb} alt="" className="h-8 w-12 object-cover rounded shrink-0"/>}
              <p className="display text-[13px] font-bold flex-1 text-left">Obi Analysis</p>
              <span className="display text-[10px] font-bold opacity-50 mr-2">{noteLabel||"Swing"}</span>
              <span className={cn("display text-[16px] font-bold",oc)}>{overall}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform shrink-0 ml-1",expandedState&&"rotate-180")} strokeWidth={2.5}/>
            </button>
          ):(
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-foreground text-background">
              <p className="display text-[13px] font-bold flex-1">Obi Analysis</p>
              <span className={cn("display text-[18px] font-bold",oc)}>{overall}</span>
              <span className="display text-[10px] font-bold opacity-50 ml-1">/100</span>
            </div>
          )}
          {(!isCollapsible||expandedState)&&(
            <React.Fragment>
              <div className="p-3 space-y-2">
                {/* Video player */}
                {videoUrl&&(
                  <video src={videoUrl} controls playsInline loop className="w-full rounded-xl bg-black" style={{maxHeight:"240px",objectFit:"contain"}}/>
                )}
                {/* Key frames filmstrip with pose overlays */}
                {videoUrl&&frames&&(frames.setup||frames.top||frames.impact)&&(
                  <div className="rounded-xl border border-border bg-secondary/20 overflow-hidden">
                    <p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 pt-2.5 pb-1">Key Frames · Pose Analysis</p>
                    <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                      {[{key:"setup",label:"Setup"},{key:"top",label:"Top"},{key:"impact",label:"Impact"}].map(({key,label})=>(
                        frames[key]?(
                          <div key={key} className="flex flex-col">
                            <img src={frames[key]} alt={label} className="w-full object-cover" style={{aspectRatio:"9/16"}}/>
                            <p className="display text-[9px] font-bold uppercase text-center text-muted-foreground py-1.5">{label}</p>
                          </div>
                        ):null
                      ))}
                    </div>
                  </div>
                )}
                {/* Frames still loading */}
                {videoUrl&&frames===null&&(
                  <div className="rounded-xl border border-border bg-secondary/20 p-3.5 flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent shrink-0" style={{animation:"spin 0.8s linear infinite"}}/>
                    <p className="display text-[11px] font-bold text-muted-foreground">Analyzing movement frames…</p>
                  </div>
                )}
                {/* Category scorecard — 6 cols for new format (includes Tempo), 5 for old */}
                <div className="rounded-xl border border-border bg-secondary/20 p-3">
                  <p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Swing Breakdown</p>
                  <div className={cn("grid gap-1 mb-2",isNewFormat?"grid-cols-6":"grid-cols-5")}>
                    {phases.map(ph=>{const d=cats[ph.key]||{score:5,note:""};return(<div key={ph.key} className={cn("rounded-lg border p-1.5 text-center",sb(d.score))}><p className={cn("display text-[17px] font-bold leading-none",sc(d.score))}>{d.score}</p><p className="display text-[8px] font-bold uppercase text-muted-foreground mt-1 leading-none">{ph.label}</p></div>);})}
                  </div>
                  <div className="space-y-1">
                    {phases.map(ph=>{const d=cats[ph.key];if(!d?.note)return null;return(<div key={ph.key} className="flex gap-2 text-[11px] leading-snug"><span className={cn("display font-bold shrink-0 w-[52px]",sc(d.score))}>{ph.label}</span><span className="text-muted-foreground">{d.note}</span></div>);})}
                  </div>
                </div>
                {/* Fix This First — prominent card */}
                {parsed.primaryFault&&(
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5">
                    <p className="display text-[10px] font-bold uppercase tracking-wider text-amber-400/80 mb-1.5">Fix This First</p>
                    <p className="text-[14px] font-semibold text-foreground leading-snug">{parsed.primaryFault}</p>
                  </div>
                )}
                {/* Drill — string (new) or array (old) */}
                {parsed.drill&&(
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
                    <p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Your Drill</p>
                    {typeof parsed.drill==="string"?(
                      <p className="text-[13px] text-foreground leading-relaxed">{parsed.drill}</p>
                    ):(
                      <ol className="space-y-1.5">
                        {parsed.drill.map((step,i)=>(<li key={i} className="flex gap-2.5 text-[13px] text-foreground leading-snug"><span className="display text-[10px] font-bold bg-blue-500/20 text-blue-400 rounded-full h-4 w-4 flex items-center justify-center shrink-0 mt-0.5">{i+1}</span><span>{step}</span></li>))}
                      </ol>
                    )}
                  </div>
                )}
                {/* Strengths */}
                {Array.isArray(parsed.positives)&&parsed.positives.length>0&&(
                  <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3">
                    <p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Strengths</p>
                    <ul className="space-y-1.5">
                      {parsed.positives.map((p,i)=>(<li key={i} className="flex gap-2 text-[13px] text-foreground leading-snug"><span className="text-green-400 shrink-0">✓</span><span>{p}</span></li>))}
                    </ul>
                  </div>
                )}
                {/* Coaching summary (new format only) */}
                {parsed.summary&&(
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Obi's Take</p>
                    <p className="text-[13px] text-foreground leading-relaxed italic">{parsed.summary}</p>
                  </div>
                )}
                {/* Club tip (old format only — keep for backwards compat) */}
                {parsed.clubNote&&(<div className="rounded-xl border border-border bg-secondary/30 p-3"><p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Club Tip</p><p className="text-[13px] text-foreground leading-snug">{parsed.clubNote}</p></div>)}
              </div>
              <div className="flex gap-2 px-3 pb-3">
                <button onClick={()=>speakText(readableText)} className={cn("display text-[10px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 border transition",speaking?"bg-primary/20 border-primary/40 text-primary":"border-border text-muted-foreground hover:text-foreground")}>{speaking?"Stop":"Read"}</button>
                {isCollapsible&&(<button onClick={()=>{setSwingAnalysis("");setSwingFile(null);setSwingNotes("");setSwingThumb(null);}} className="display text-[10px] font-bold uppercase tracking-wider border border-border rounded-lg px-2.5 py-1.5 text-muted-foreground hover:text-foreground ml-auto">+ New swing</button>)}
              </div>
            </React.Fragment>
          )}
        </div>
      );
    }

    // Fallback: plain text renderer for older history entries
    const sentences=(text.match(new RegExp("[^.!?]+[.!?]+","g"))||[text]).map(s2=>s2.trim()).filter(Boolean);
    const g={summary:[],strengths:[],fixes:[],drills:[],other:[]};
    sentences.forEach(s2=>{if(new RegExp("overall|summary|assessment|your swing|shows|demonstrates","i").test(s2))g.summary.push(s2);else if(new RegExp("good|well done|strength|positive|excellent|nice|solid|great job","i").test(s2))g.strengths.push(s2);else if(new RegExp("drill|practice|try|work on|focus on|exercise|repeat","i").test(s2))g.drills.push(s2);else if(new RegExp("need|should|must|improve|fix|adjust|lack|issue|problem|fault|tend to|too much|too little","i").test(s2))g.fixes.push(s2);else g.other.push(s2);});
    if(!g.summary.length)g.summary=g.other.splice(0,2);
    const secs=[{label:"Overview",items:g.summary,color:"border-primary/30 bg-primary/5"},{label:"Strengths",items:g.strengths,color:"border-green-500/30 bg-green-500/5"},{label:"Fix These",items:g.fixes,color:"border-amber-500/30 bg-amber-500/5"},{label:"Drills",items:g.drills,color:"border-blue-500/30 bg-blue-500/5"},{label:"Notes",items:g.other,color:"border-border bg-secondary/20"}].filter(s2=>s2.items.length>0);
    return(
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isCollapsible?(
          <button onClick={()=>setExpandedState(e=>!e)} className="w-full flex items-center gap-2 px-4 py-3 border-b border-border bg-foreground text-background hover:opacity-90 transition">
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
                  <ul className="space-y-1.5">{sec.items.map((item,idx)=>(<li key={idx} className="flex gap-2 text-[13px] text-foreground leading-snug"><span className="text-muted-foreground shrink-0 mt-0.5">*</span><span>{item}</span></li>))}</ul>
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-3 pb-3">
              <button onClick={()=>speakText(text)} className={cn("display text-[10px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 border transition",speaking?"bg-primary/20 border-primary/40 text-primary":"border-border text-muted-foreground hover:text-foreground")}>{speaking?"Stop":"Read"}</button>
              {isCollapsible&&(<button onClick={()=>{setSwingAnalysis("");setSwingFile(null);setSwingNotes("");setSwingThumb(null);}} className="display text-[10px] font-bold uppercase tracking-wider border border-border rounded-lg px-2.5 py-1.5 text-muted-foreground hover:text-foreground ml-auto">+ New swing</button>)}
            </div>
          </React.Fragment>
        )}
      </div>
    );
  };

  const avgScore=rounds.length>0?Math.round(rounds.slice(0,10).reduce((a,r)=>a+(r.total_score||0),0)/Math.min(rounds.length,10)):null;
  const bestScore=rounds.length>0?Math.min(...rounds.map(r=>r.total_score||99)):null;

  if(authLoading)return(
    <div className="bg-background flex flex-col items-center justify-center gap-5" style={{minHeight:"100dvh"}}>
      <ObiLogo size={56}/>
      <p className="display text-3xl text-foreground">Obi Golf</p>
      <div className="flex gap-1.5">{[0,1,2].map(i=>(<div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" style={{animation:"pulse-dot 1.2s "+(i*0.2)+"s infinite"}}/>))}</div>
    </div>
  );
  if(!user||authScreen==="onboard")return(
    <div style={{minHeight:"100dvh",background:"#0c0c0f",display:"flex",flexDirection:"column"}}>
      <div style={{maxWidth:"440px",width:"100%",margin:"0 auto",flex:1,display:"flex",flexDirection:"column",padding:"0 24px"}}>

        {/* Onboarding flow */}
        {authScreen==="onboard"&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",paddingTop:"48px",paddingBottom:"32px"}}>
            <OnboardingFlow authName={authName} setAuthName={setAuthName} profile={profile} setProfile={setProfile} onComplete={async()=>{
  try{await saveProfile(authName);}
  catch(e){console.warn("saveProfile error",e);}
  // Always proceed to app — don't let a save failure trap the user in onboarding
  setAuthScreen("app");
  setTab("home");
}}/>
          </div>
        )}

        {/* Auth screens */}
        {authScreen!=="onboard"&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",paddingTop:"48px",paddingBottom:"40px"}}>

            {/* Hero */}
            <div style={{textAlign:"center",marginBottom:"40px"}}>
              <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"72px",height:"72px",borderRadius:"20px",background:"#CFFF04",marginBottom:"16px"}}>
                <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
                  <line x1="13" y1="10" x2="13" y2="31" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M13 10 L26 14.5 L13 19 Z" fill="#000"/>
                  <ellipse cx="16" cy="31" rx="5" ry="1.5" fill="rgba(0,0,0,0.3)"/>
                </svg>
              </div>
              <h1 style={{fontFamily:"Space Grotesk,sans-serif",fontSize:"32px",fontWeight:"700",color:"#fff",margin:"0 0 8px",letterSpacing:"-0.02em"}}>Obi Golf</h1>
              <p style={{fontSize:"15px",color:"rgba(255,255,255,0.45)",margin:0}}>The caddie you always wanted.</p>
            </div>

            {/* Tab toggle */}
            <div style={{display:"flex",background:"rgba(255,255,255,0.06)",borderRadius:"14px",padding:"4px",marginBottom:"24px"}}>
              {["login","signup"].map(s=>(
                <button key={s} onClick={()=>setAuthScreen(s)}
                  style={{flex:1,padding:"10px",borderRadius:"10px",border:"none",cursor:"pointer",fontFamily:"Space Grotesk,sans-serif",fontSize:"13px",fontWeight:"700",letterSpacing:"0.05em",textTransform:"uppercase",transition:"all 0.2s",
                    background: authScreen===s?"#CFFF04":"transparent",
                    color:      authScreen===s?"#000":"rgba(255,255,255,0.35)",
                  }}>
                  {s==="login"?"Sign In":"Sign Up"}
                </button>
              ))}
            </div>

            {/* Google */}
            <button onClick={handleGoogleAuth}
              style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",padding:"14px",borderRadius:"14px",border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.05)",cursor:"pointer",fontFamily:"Space Grotesk,sans-serif",fontSize:"14px",fontWeight:"700",letterSpacing:"0.04em",textTransform:"uppercase",color:"#fff",marginBottom:"20px",transition:"background 0.2s"}}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px"}}>
              <div style={{flex:1,height:"1px",background:"rgba(255,255,255,0.08)"}}/>
              <span style={{fontFamily:"Space Grotesk,sans-serif",fontSize:"10px",fontWeight:"700",letterSpacing:"0.18em",textTransform:"uppercase",color:"rgba(255,255,255,0.2)"}}>or</span>
              <div style={{flex:1,height:"1px",background:"rgba(255,255,255,0.08)"}}/>
            </div>

            {/* Inputs */}
            <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"6px"}}>
              {authScreen==="signup"&&(
                <input placeholder="Full name" value={authName} onChange={e=>setAuthName(e.target.value)}
                  style={{width:"100%",boxSizing:"border-box",padding:"14px 16px",borderRadius:"14px",border:"1.5px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:"15px",outline:"none",fontFamily:"Inter,sans-serif",transition:"border 0.2s"}}
                  onFocus={e=>e.target.style.border="1.5px solid #CFFF04"}
                  onBlur={e=>e.target.style.border="1.5px solid rgba(255,255,255,0.1)"}
                />
              )}
              <input placeholder="Email" type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)}
                style={{width:"100%",boxSizing:"border-box",padding:"14px 16px",borderRadius:"14px",border:"1.5px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:"15px",outline:"none",fontFamily:"Inter,sans-serif",transition:"border 0.2s"}}
                onFocus={e=>e.target.style.border="1.5px solid #CFFF04"}
                onBlur={e=>e.target.style.border="1.5px solid rgba(255,255,255,0.1)"}
              />
              <input placeholder="Password" type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&(authScreen==="login"?handleLogin():handleSignup())}
                style={{width:"100%",boxSizing:"border-box",padding:"14px 16px",borderRadius:"14px",border:"1.5px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:"15px",outline:"none",fontFamily:"Inter,sans-serif",transition:"border 0.2s"}}
                onFocus={e=>e.target.style.border="1.5px solid #CFFF04"}
                onBlur={e=>e.target.style.border="1.5px solid rgba(255,255,255,0.1)"}
              />
            </div>

            {authError&&<p style={{color:"#f87171",fontSize:"13px",textAlign:"center",margin:"8px 0"}}>{authError}</p>}

            <button onClick={authScreen==="login"?handleLogin:handleSignup}
              style={{width:"100%",padding:"16px",borderRadius:"14px",border:"none",cursor:"pointer",fontFamily:"Space Grotesk,sans-serif",fontSize:"14px",fontWeight:"700",letterSpacing:"0.06em",textTransform:"uppercase",background:"#CFFF04",color:"#000",marginTop:"16px",transition:"opacity 0.2s"}}>
              {authScreen==="login"?"Sign In":"Create Account →"}
            </button>

            {/* Social proof */}
            {authScreen==="signup"&&(
              <p style={{textAlign:"center",fontSize:"12px",color:"rgba(255,255,255,0.2)",marginTop:"20px",lineHeight:"1.5"}}>
                Free to use. No credit card. The caddie you always wanted.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return(
    <div className="flex flex-col bg-background text-foreground overflow-hidden" style={{height:"100dvh",maxWidth:"480px",margin:"0 auto",position:"relative"}}>
      {showCard&&(
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={()=>setShowCard(null)}>
          <div className="bg-card border border-border rounded-2xl w-full overflow-y-auto" style={{maxWidth:"460px",maxHeight:"88vh"}} onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border"><div><p className="display text-[15px] font-bold text-foreground">{showCard.course_name||"Unknown Course"}</p><p className="text-[11px] text-muted-foreground">{fmtDate(showCard.played_at)}</p></div><button onClick={()=>setShowCard(null)} className="text-muted-foreground hover:text-foreground ml-3 shrink-0"><X className="h-5 w-5"/></button></div>
            <div className="grid grid-cols-4 gap-px bg-border border-b border-border">
              {(()=>{const diff=showCard.score_vs_par||0;const diffStr=diff===0?"E":diff>0?"+"+diff:""+diff;const fwyHit=(showCard.fairways||[]).filter(f=>f===true).length;const fwyTot=(showCard.fairways||[]).filter(f=>f!==null).length;const puttTot=(showCard.putts||[]).filter(p=>p!==null).reduce((a,b)=>a+b,0);return[["Score",showCard.total_score,"text-foreground"],["vs Par",diffStr,diff<=0?"text-primary":"text-destructive"],["FWY",fwyTot>0?fwyHit+"/"+fwyTot:"--","text-foreground"],["Putts",puttTot||"--","text-foreground"]].map(([l,v,c])=>(<div key={l} className="bg-card px-2 py-3 text-center"><p className="display text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">{l}</p><p className={"stat text-[22px] leading-none "+c}>{v}</p></div>));})()}
            </div>
            {(()=>{const sc=showCard.scorecard||[];const pars=showCard.hole_pars||Array(18).fill(4);const fw=showCard.fairways||Array(18).fill(null);const gr=showCard.gir||Array(18).fill(null);const pt=showCard.putts||Array(18).fill(null);const hasAny=sc.some(Boolean);if(!hasAny)return(<div className="p-6 text-center"><p className="display text-[13px] font-bold text-muted-foreground">No hole-by-hole data saved</p></div>);return(<div className="overflow-x-auto"><table className="w-full text-center" style={{minWidth:"540px"}}><thead><tr className="bg-secondary/50 border-b border-border"><td className="display text-[9px] font-bold uppercase text-muted-foreground px-2 py-1.5 text-left w-8">Hole</td>{Array.from({length:18},(_,i)=>i+1).map(n=>(<td key={n} className="display text-[9px] font-bold uppercase text-muted-foreground py-1.5 px-0.5">{n}</td>))}</tr></thead><tbody className="divide-y divide-border"><tr><td className="display text-[9px] font-bold uppercase text-muted-foreground px-2 py-2 text-left">Par</td>{pars.map((p,i)=><td key={i} className="display text-[11px] text-muted-foreground py-2 px-0.5">{p}</td>)}</tr><tr><td className="display text-[9px] font-bold uppercase text-muted-foreground px-2 py-2 text-left">Score</td>{sc.map((s,i)=>(<td key={i} className="py-2 px-0.5"><span className={cn("display text-[12px] font-bold",s===null?"text-muted-foreground/30":s<pars[i]?"text-primary":s>pars[i]+1?"text-destructive":"text-foreground")}>{s||" "}</span></td>))}</tr>{fw.some(f=>f!==null)&&(<tr><td className="display text-[9px] font-bold uppercase text-muted-foreground px-2 py-2 text-left">FWY</td>{fw.map((f,i)=>(<td key={i} className="py-2 px-0.5"><span className={cn("display text-[11px] font-bold",f===null?"text-muted-foreground/30":f?"text-primary":"text-destructive")}>{f===null?" ":f?"\u2713":"\u2715"}</span></td>))}</tr>)}{gr.some(g=>g!==null)&&(<tr><td className="display text-[9px] font-bold uppercase text-muted-foreground px-2 py-2 text-left">GIR</td>{gr.map((g,i)=>(<td key={i} className="py-2 px-0.5"><span className={cn("display text-[11px] font-bold",g===null?"text-muted-foreground/30":g?"text-primary":"text-destructive")}>{g===null?" ":g?"\u2713":"\u2715"}</span></td>))}</tr>)}{pt.some(p=>p!==null)&&(<tr><td className="display text-[9px] font-bold uppercase text-muted-foreground px-2 py-2 text-left">Putts</td>{pt.map((p,i)=>(<td key={i} className="py-2 px-0.5"><span className={cn("display text-[11px] font-bold",p===null?"text-muted-foreground/30":p<=1?"text-primary":p>=3?"text-destructive":"text-foreground")}>{p===null?" ":p}</span></td>))}</tr>)}</tbody></table></div>);})()}
          </div>
        </div>
      )}
      {/* ── SHARE CARD MODAL ─────────────────────────────────── */}
      {shareCard&&(
        <div className="fixed inset-0 z-[62] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm">
            <div className="rounded-2xl overflow-hidden bg-zinc-900 border border-white/10">
              <div className="bg-primary px-5 pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ObiLogo size={18}/>
                    <span className="display text-[13px] font-bold text-black">Obi Golf</span>
                  </div>
                  <span className="display text-[11px] font-bold text-black/50">{shareCard.date}</span>
                </div>
                <p className="display text-[11px] font-bold uppercase tracking-[0.15em] text-black/60 mb-1">{shareCard.course}</p>
                <div className="flex items-end gap-3">
                  <p className="stat text-[64px] leading-none text-black">{shareCard.total}</p>
                  <div className="pb-2">
                    <p className="display text-[24px] font-bold text-black">{shareCard.diff===0?"E":shareCard.diff>0?"+"+shareCard.diff:""+shareCard.diff}</p>
                    <p className="display text-[10px] font-bold text-black/50 uppercase tracking-wider">{shareCard.diffStr}</p>
                  </div>
                </div>
              </div>
              {(shareCard.fwyTot>0||shareCard.puttTotal>0)&&(
                <div className="flex border-b border-white/10">
                  {shareCard.fwyTot>0&&<div className="flex-1 px-4 py-3 text-center border-r border-white/10"><p className="display text-[9px] font-bold uppercase tracking-wider text-white/40 mb-0.5">Fairways</p><p className="stat text-[20px] text-white">{shareCard.fwyCount}/{shareCard.fwyTot}</p></div>}
                  {shareCard.puttTotal>0&&<div className="flex-1 px-4 py-3 text-center"><p className="display text-[9px] font-bold uppercase tracking-wider text-white/40 mb-0.5">Putts</p><p className="stat text-[20px] text-white">{shareCard.puttTotal}</p></div>}
                </div>
              )}
              <div className="px-5 py-4">
                <p className="display text-[9px] font-bold uppercase tracking-[0.15em] text-primary mb-2">Obi says</p>
                <p className="text-[14px] text-white/90 leading-relaxed italic">&ldquo;{shareCard.insight}&rdquo;</p>
              </div>
              <div className="px-5 pb-4">
                <p className="display text-[9px] font-bold text-white/25 uppercase tracking-wider">caddie-ai-ivory.vercel.app</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={async()=>{
                const shareText=`I shot ${shareCard.total} (${shareCard.diffStr}) at ${shareCard.course} today.\n\nObi says: "${shareCard.insight}"\n\nTracked with Obi Golf — caddie-ai-ivory.vercel.app`;
                if(navigator.share){try{await navigator.share({title:"My round at "+shareCard.course,text:shareText});}catch(e){}}
                else{navigator.clipboard?.writeText(shareText);alert("Copied to clipboard!");}
              }} className="flex-1 bg-primary text-black rounded-xl py-3 display text-[13px] font-bold uppercase tracking-wider hover:opacity-90 transition">
                Share Round
              </button>
              <button onClick={()=>setShareCard(null)} className="flex-1 bg-white/10 text-white rounded-xl py-3 display text-[13px] font-bold uppercase tracking-wider hover:bg-white/20 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── GROUP ROUND MODAL ─────────────────────────────────── */}
      {showGroupModal&&(
        <div className="fixed inset-0 z-[61] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={()=>setShowGroupModal(false)}>
          <div className="bg-zinc-950 border border-white/10 rounded-t-2xl w-full p-5 pb-8 shadow-2xl" style={{maxWidth:"480px"}} onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="display text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Group Round</p>
                <p className="display text-[18px] font-bold text-white mt-0.5">Playing with friends?</p>
              </div>
              <button onClick={()=>setShowGroupModal(false)} className="text-white/40 hover:text-white"><X className="h-5 w-5"/></button>
            </div>
            {groupRoundCode&&(
              <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 mb-4">
                <p className="display text-[10px] font-bold uppercase tracking-wider text-primary/70 mb-2">Round code — share with your group</p>
                <div className="flex items-center justify-between">
                  <p className="stat text-[36px] text-white tracking-[0.2em]">{groupRoundCode}</p>
                  <button onClick={()=>{const t=`Join my Obi Golf round! Code: ${groupRoundCode}\ncaddie-ai-ivory.vercel.app`;if(navigator.share){navigator.share({title:"Join my round",text:t}).catch(()=>{});}else{navigator.clipboard?.writeText(t).catch(()=>{});}}} className="bg-primary text-black rounded-xl px-4 py-2 display text-[12px] font-bold uppercase tracking-wider">Share Code</button>
                </div>
              </div>
            )}
            <div className="space-y-2 mb-4">
              {groupPlayers.map(p=>(
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{background:p.color}}/>
                  <p className="display text-[13px] font-bold text-white flex-1">{p.name}{p.isMe?" (you)":""}</p>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5,6,7,8,9,10].filter(v=>v>=(holePars[hole-1]||4)-1&&v<=(holePars[hole-1]||4)+4).map(v=>(
                      <button key={v} onClick={()=>updateGroupScore(p.id,hole-1,p.scores[hole-1]===v?null:v)}
                        className="h-7 w-7 rounded-lg display text-[11px] font-bold transition"
                        style={{background:p.scores[hole-1]===v?p.color:"rgba(255,255,255,0.08)",color:p.scores[hole-1]===v?"#000":"rgba(255,255,255,0.5)"}}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input value={groupName} onChange={e=>setGroupName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addGroupPlayer(groupName)} placeholder="Add player name..." className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-[14px] text-white placeholder:text-white/25 outline-none focus:border-white/40"/>
              <button onClick={()=>addGroupPlayer(groupName)} disabled={!groupName.trim()} className="bg-white/10 text-white rounded-xl px-4 display text-[12px] font-bold uppercase tracking-wider hover:bg-white/20 disabled:opacity-30 transition">Add</button>
            </div>
            {groupPlayers.some(p=>p.scores.some(s=>s!==null))&&(
              <div>
                <p className="display text-[9px] font-bold uppercase tracking-wider text-white/30 mb-2">Live — Hole {hole}</p>
                <div className="space-y-1">
                  {[...groupPlayers].sort((a,b)=>a.scores.filter(Boolean).reduce((x,y)=>x+y,0)-b.scores.filter(Boolean).reduce((x,y)=>x+y,0)).map((p,rank)=>{
                    const tot=p.scores.filter(Boolean).reduce((a,b)=>a+b,0);
                    const par=holePars.slice(0,p.scores.filter(Boolean).length).reduce((a,b)=>a+b,0);
                    const d=tot-par;
                    return(<div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
                      <span className="display text-[11px] font-bold text-white/40 w-4">{rank+1}</span>
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{background:p.color}}/>
                      <p className="display text-[13px] font-bold text-white flex-1">{p.name}</p>
                      <p className={cn("display text-[13px] font-bold",d<0?"text-primary":d>0?"text-red-400":"text-white")}>{tot===0?"--":d===0?"E":d>0?"+"+d:""+d}</p>
                    </div>);
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CELEBRATION MODAL ──────────────────────────────── */}
      {celebration&&(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm" onClick={()=>setCelebration(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full text-center shadow-2xl animate-pop-in" style={{maxWidth:"360px"}} onClick={e=>e.stopPropagation()}>
            <div className="text-6xl mb-3 leading-none">{celebration.emoji}</div>
            <h2 className="display text-[22px] font-bold tracking-tight text-foreground mb-2">{celebration.title}</h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed">{celebration.body}</p>
            <button onClick={()=>setCelebration(null)}
              className="mt-5 w-full bg-primary text-primary-foreground rounded-xl py-3 display text-[13px] font-bold uppercase tracking-wider hover:opacity-90 transition">
              Let's Keep Going 🏌️
            </button>
          </div>
        </div>
      )}

      {/* ── POST-ROUND RECAP MODAL ────────────────────────────── */}
      {postRoundRecap&&(
        <div className="fixed inset-0 z-[59] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={()=>setPostRoundRecap(null)}>
          <div className="bg-card border border-border rounded-t-2xl w-full p-5 pb-8 shadow-2xl animate-fade-up" style={{maxWidth:"480px"}} onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="display text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Round Complete</p>
              <button onClick={()=>setPostRoundRecap(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4"/></button>
            </div>
            <div className="flex items-end gap-3 mb-4">
              <p className="stat text-[56px] leading-none">{postRoundRecap.total}</p>
              <div className="pb-2">
                <p className={cn("display text-[18px] font-bold",postRoundRecap.diff<=0?"text-primary":"text-foreground")}>{postRoundRecap.diff===0?"Even":postRoundRecap.diff>0?"+"+postRoundRecap.diff:""+postRoundRecap.diff}</p>
                <p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{course||"Round"}</p>
              </div>
            </div>
            {(postRoundRecap.fwyTot>0||postRoundRecap.puttTotal>0)&&(
              <div className="flex gap-4 mb-4 pb-4 border-b border-border">
                {postRoundRecap.fwyTot>0&&<div><p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fairways</p><p className="stat text-[20px] leading-none mt-0.5">{postRoundRecap.fwyCount}/{postRoundRecap.fwyTot}</p></div>}
                {postRoundRecap.puttTotal>0&&<div><p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Putts</p><p className="stat text-[20px] leading-none mt-0.5">{postRoundRecap.puttTotal}</p></div>}
              </div>
            )}
            <div className="rounded-xl bg-primary/10 border border-primary/30 p-3.5 mb-4">
              <p className="display text-[9px] font-bold uppercase tracking-wider text-primary mb-1.5">Obi's Read</p>
              <p className="text-[14px] text-foreground leading-snug">{postRoundRecap.insight}</p>
            </div>
            {postRoundRecap.milestones?.length>0&&(
              <div className="space-y-2 mb-4">
                {postRoundRecap.milestones.map((m,i)=>(
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
                    <span className="text-2xl shrink-0">{m.emoji}</span>
                    <div><p className="display text-[12px] font-bold">{m.title}</p><p className="text-[11px] text-muted-foreground leading-snug">{m.body}</p></div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={()=>setPostRoundRecap(null)}
              className="w-full bg-foreground text-background rounded-xl py-3 display text-[13px] font-bold uppercase tracking-wider hover:opacity-90 transition">
              Nice Work 👊
            </button>
          </div>
        </div>
      )}

      {/* ── RULES MODAL ───────────────────────────────────────── */}
      {showRulesModal&&(
        <div className="fixed inset-0 z-[58] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={()=>{setShowRulesModal(false);setRulesAnswer("");setRulesQuery("");}}>
          <div className="bg-card border border-border rounded-t-2xl w-full p-5 pb-8 shadow-2xl" style={{maxWidth:"480px"}} onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📖</span>
                <p className="display text-[15px] font-bold">Rules Assistant</p>
              </div>
              <button onClick={()=>{setShowRulesModal(false);setRulesAnswer("");setRulesQuery("");}} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4"/></button>
            </div>
            <p className="text-[12px] text-muted-foreground mb-3">Ask anything — what's the penalty, what do you do next, is that allowed.</p>
            <div className="flex gap-2 mb-3">
              <input value={rulesQuery} onChange={e=>setRulesQuery(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&lookupRule(rulesQuery)}
                placeholder="e.g. My ball is in the water..."
                className="flex-1 bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition"/>
              <button onClick={()=>lookupRule(rulesQuery)} disabled={!rulesQuery.trim()||rulesLoading}
                className={cn("bg-primary text-primary-foreground rounded-xl px-4 display text-[12px] font-bold uppercase tracking-wider transition",(!rulesQuery.trim()||rulesLoading)?"opacity-40":"hover:opacity-90")}>
                {rulesLoading?"...":"Ask"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {["Ball in the water","Out of bounds","Lost ball","Ball unplayable","Wrong club","Hit wrong ball"].map(q=>(
                <button key={q} onClick={()=>{setRulesQuery(q);lookupRule(q);}}
                  className="display text-[10px] font-bold uppercase tracking-wider rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition">
                  {q}
                </button>
              ))}
            </div>
            {rulesLoading&&<div className="flex items-center gap-2 py-3"><div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent" style={{animation:"spin 0.8s linear infinite"}}/><p className="text-[13px] text-muted-foreground">Looking that up...</p></div>}
            {rulesAnswer&&(
              <div className="rounded-xl bg-secondary/40 border border-border p-3.5">
                <p className="display text-[9px] font-bold uppercase tracking-wider text-primary mb-1.5">The Ruling</p>
                <p className="text-[14px] text-foreground leading-relaxed">{rulesAnswer}</p>
              </div>
            )}
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
                <Avatar url={avatarUrl} name={userProfile?.full_name||""} size={56}/>
                <button onClick={()=>avatarInputRef.current?.click()} className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold border-2 border-background">{uploadingAvatar?"...":"+"}</button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload}/>
              </div>
              <div className="min-w-0 flex-1"><h1 className="display text-[20px] font-bold tracking-tight">{userProfile?.full_name||""}</h1><p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5 mt-0.5"><span className="inline-block h-1.5 w-1.5 rounded-full bg-primary"/>HCP {profile.hcp} &nbsp; {profile.homeCourse||"No home course"}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">{[["Rounds",rounds.length],["Avg",avgScore||"--"],["Best",bestScore||"--"]].map(([l,v])=>(<div key={l} className="rounded-xl border border-border bg-card p-3 text-center"><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">{l}</p><p className="stat text-2xl leading-none">{v}</p></div>))}</div>
            <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">Your game</p>
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border mb-4">
              {[{Icon:Briefcase,label:"My Bag",sub:profile.bag.length+" clubs",id:"bag",tone:"bg-primary/15 text-primary"},{Icon:Sparkles,label:"Caddie Style",sub:{pro:"Tour Pro",coach:"The Coach",oldschool:"Old School"}[profile.persona]||profile.persona,id:"style",tone:"bg-accent/20 text-accent"}].map(({Icon,label,sub,id,tone})=>(
                <React.Fragment key={id}>
                  <button onClick={()=>setProfileSection(profileSection===id?null:id)} className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/40 transition text-left">
                    <div className={"h-9 w-9 rounded-lg flex items-center justify-center shrink-0 "+tone}><Icon className="h-4 w-4" strokeWidth={2.5}/></div>
                    <div className="min-w-0 flex-1"><p className="display text-[13px] font-bold tracking-tight">{label}</p><p className="text-[11px] text-muted-foreground truncate">{sub}</p></div>
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform",profileSection===id&&"rotate-90")} strokeWidth={2.5}/>
                  </button>
                  {profileSection===id&&id==="bag"&&(
                    <div>
                      <div className="divide-y divide-border">{profile.bag.map((b,i)=>(<div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5"><span className="display text-[13px] font-bold flex-1 min-w-0 truncate">{b.club}</span><input type="number" placeholder="0" value={b.carry||""} onChange={e=>{const v=e.target.value===""?0:parseInt(e.target.value)||0;setProfile(p=>{const bag=[...p.bag];bag[i]={...bag[i],carry:v};return{...p,bag};});}} className="w-16 bg-input border border-border rounded-lg px-2 py-1.5 text-center display text-[13px] font-bold text-foreground outline-none focus:border-primary transition" style={{MozAppearance:"textfield"}}/><span className="display text-[10px] font-bold text-muted-foreground w-5">y</span><button onClick={()=>setProfile(p=>({...p,bag:p.bag.filter((_,j)=>j!==i)}))} className="h-6 w-6 rounded-md bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition shrink-0"><X className="h-3 w-3" strokeWidth={3}/></button></div>))}</div>
                      <div className="px-3.5 py-3 border-t border-border"><p className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Add a club</p><div className="flex flex-wrap gap-1.5">{["Driver","3-wood","5-wood","7-wood","Hybrid","2-iron","3-iron","4-iron","5-iron","6-iron","7-iron","8-iron","9-iron","PW","GW","SW","LW","Putter"].filter(c=>!profile.bag.some(b=>b.club===c)).map(c=>(<button key={c} onClick={()=>setProfile(p=>({...p,bag:[...p.bag,{club:c,carry:0}]}))} className="display text-[10px] font-bold uppercase tracking-wider rounded-lg border border-dashed border-border px-2.5 py-1.5 text-muted-foreground hover:border-primary hover:text-primary transition">+ {c}</button>))}</div></div>
                      <div className="px-3.5 pb-3.5"><button onClick={async()=>{const ok=await saveProfile();if(ok!==false)setProfileSection(null);}} className="w-full bg-primary text-primary-foreground rounded-xl py-3 display text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition">Save Bag</button></div>
                    </div>
                  )}
                  {profileSection===id&&id==="style"&&(
                    <div className="p-3.5 space-y-2.5">
                      {[{v:"pro",label:"Tour Pro",desc:"Calm, clinical precision. Minimal words, maximum clarity."},{v:"coach",label:"The Coach",desc:"Warm and encouraging. Builds confidence every hole."},{v:"oldschool",label:"Old School",desc:"Gritty, direct, no-nonsense caddie. Old-fashioned and real."}].map(o=>(
                        <button key={o.v} onClick={()=>setProfile(p=>({...p,persona:o.v}))} className={cn("w-full flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-all",profile.persona===o.v?"border-primary bg-primary/10":"border-border hover:border-foreground/30")}>
                          <div className="flex-1 min-w-0"><p className="display text-[14px] font-bold tracking-tight">{o.label}</p><p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{o.desc}</p></div>
                          {profile.persona===o.v&&(<div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0"><svg viewBox="0 0 12 12" className="h-3 w-3" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>)}
                        </button>
                      ))}
                      <button onClick={saveProfile} className="w-full bg-primary text-primary-foreground rounded-xl py-3 display text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition mt-1">Save style</button>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <button onClick={handleLogout} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3.5 py-3 display text-[12px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive hover:border-destructive/40 transition"><LogOut className="h-3.5 w-3.5" strokeWidth={2.5}/> Sign out</button>
          </div>
          </div>
        </div>
      )}
      <header className={cn("shrink-0 sticky top-0 z-30 pt-safe",tab==="caddie"&&"hidden")} style={{background:"#CFFF04"}}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><line x1="13" y1="10" x2="13" y2="31" stroke={isDark?"#0d0d12":"#1a1a00"} strokeWidth="2.5" strokeLinecap="round"/><path d="M13 10 L26 14.5 L13 19 Z" fill={isDark?"#0d0d12":"#1a1a00"}/><ellipse cx="16" cy="31" rx="5" ry="1.5" fill={isDark?"rgba(0,0,0,0.2)":"rgba(0,0,0,0.15)"}/></svg>
            <span className="display font-bold tracking-tight text-[17px]" style={{color:isDark?"#0d0d12":"#1a1a00",letterSpacing:"-0.02em"}}>Obi Golf</span>
          </div>
          <div className="flex items-center gap-1.5">
            {tab==="caddie"&&weather&&(<div className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 tabular text-[11px] text-secondary-foreground"><Cloud className="h-3 w-3"/><span className="font-medium">{weather.temp}&deg;</span><span className="text-muted-foreground">&nbsp;</span><span className="text-muted-foreground">{weather.wind}mph {windDir(weather.windDeg)}</span></div>)}
            <button onClick={()=>setIsDark(d=>!d)} className="h-8 w-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-muted transition">{isDark?<Sun className="h-3.5 w-3.5"/>:<Moon className="h-3.5 w-3.5"/>}</button>
            <button onClick={()=>setTab("profile_panel")} className="h-8 w-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-muted transition" title="Settings"><Settings className="h-3.5 w-3.5"/></button>
            <button onClick={handleLogout} className="h-8 w-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-destructive/20 hover:text-destructive transition" title="Sign out"><LogOut className="h-3.5 w-3.5"/></button>
          </div>
        </div>
      </header>

      <div className={cn("flex-1 min-h-0",tab==="caddie"?"overflow-hidden":"overflow-y-auto")} style={{WebkitOverflowScrolling:"touch"}}>
        {tab==="home"&&(
          <div className="overflow-y-auto pb-8">
            <section className="px-4 pt-5 pb-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Dashboard</p>
                  <h1 className="display text-[24px] font-bold tracking-tight leading-tight mt-0.5">{rounds.length===0?"Welcome to Obi.":"Your game, by the numbers."}</h1>
                </div>
                <button onClick={()=>{const next=!beginnerMode;setBeginnerMode(next);try{localStorage.setItem("obi_beginner",String(next));}catch{}}}
                  className={cn("display text-[10px] font-bold uppercase tracking-wider rounded-xl px-3 py-2 border transition shrink-0",
                    beginnerMode?"bg-primary/15 border-primary/40 text-primary":"border-border text-muted-foreground hover:border-foreground/40")}>
                  {beginnerMode?"🌱 Beginner":"⚡ Pro"}
                </button>
              </div>
            </section>

            {/* New golfer welcome card */}
            {rounds.length===0&&(
              <section className="px-4 pt-3">
                <div className="rounded-xl bg-foreground text-background p-4 space-y-3">
                  <p className="display text-[16px] font-bold leading-snug">Hey {firstName(userProfile?.full_name)||"golfer"} 👋 Obi's got your back.</p>
                  <p className="text-[13px] opacity-70 leading-relaxed">Head to the <strong>Caddie tab</strong> to start your round. Type your course name, set your hole, and ask Obi anything — what club to hit, how to play the hole, rules questions, all of it.</p>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[["🗺️","Hole Maps","See every hole from above"],["🎙️","Voice Caddie","Obi talks to you"],["📖","Rules Help","Ask any rules question"]].map(([e,t,d])=>(
                      <div key={t} className="rounded-lg bg-white/10 p-2.5 text-center">
                        <p className="text-xl mb-1">{e}</p>
                        <p className="display text-[10px] font-bold">{t}</p>
                        <p className="text-[9px] opacity-60 mt-0.5 leading-tight">{d}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Rules + Etiquette quick access */}
            <section className="px-4 pt-3">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={()=>setShowRulesModal(true)}
                  className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-2.5 hover:bg-secondary/40 transition text-left">
                  <span className="text-2xl shrink-0">📖</span>
                  <div><p className="display text-[12px] font-bold">Rules Help</p><p className="text-[10px] text-muted-foreground mt-0.5">Ask any ruling</p></div>
                </button>
                <button onClick={()=>{setTab("caddie");setTimeout(()=>sendMessage("Give me a quick etiquette tip for today's round"),200);}}
                  className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-2.5 hover:bg-secondary/40 transition text-left">
                  <span className="text-2xl shrink-0">🤝</span>
                  <div><p className="display text-[12px] font-bold">Etiquette Tip</p><p className="text-[10px] text-muted-foreground mt-0.5">From Obi</p></div>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button onClick={()=>{setTab("caddie");if(!groupRoundCode)startGroupRound();else setShowGroupModal(true);}}
                  className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-2.5 hover:bg-secondary/40 transition text-left">
                  <span className="text-2xl shrink-0">👥</span>
                  <div><p className="display text-[12px] font-bold">Group Round</p><p className="text-[10px] text-muted-foreground mt-0.5">Play with friends</p></div>
                </button>
                {shareCard&&<button onClick={()=>setShareCard(shareCard)}
                  className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 flex items-center gap-2.5 hover:bg-primary/10 transition text-left">
                  <span className="text-2xl shrink-0">📊</span>
                  <div><p className="display text-[12px] font-bold text-primary">Share Round</p><p className="text-[10px] text-muted-foreground mt-0.5">Show your score</p></div>
                </button>}
              </div>
            </section>
            {/* Etiquette cards — beginners only, first visit */}
            {beginnerMode&&rounds.length===0&&(
              <section className="px-4 pt-3">
                <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">Golf 101</p>
                <div className="space-y-1.5">
                  {[["🔇","Stay quiet during swings","When someone is hitting, stay still and silent."],["🐾","Don't step in putting lines","The line between ball and hole is sacred — walk around it."],["⛱️","Rake the bunker","Smooth the sand after you play from it. Leave it better than you found it."],["⚡","Play ready golf","If you're ready and it's safe — hit. Don't wait for honors. Keep pace."],["📱","90 seconds to find your ball","Start looking immediately. After 90 sec, take a drop with penalty."]].map(([e,t,d])=>(
                    <div key={t} className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                      <span className="text-lg shrink-0 mt-0.5">{e}</span>
                      <div><p className="display text-[12px] font-bold">{t}</p><p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{d}</p></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="px-4 pt-4">
              <div className="rounded-xl bg-foreground text-background p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="display text-[10px] font-bold uppercase tracking-[0.18em] opacity-50 mb-1">Handicap index</p>
                    <div className="flex items-end gap-2"><p className="stat text-[48px] leading-none">{profile.hcp}</p><span className="display text-[11px] font-bold uppercase tracking-wider text-primary inline-flex items-center gap-0.5 pb-2"><TrendingDown className="h-3 w-3" strokeWidth={3}/>{profile.handicap}</span></div>
                    <p className="text-[11px] opacity-50 mt-1.5 font-medium">{rounds.length>0?"Updated after "+fmtDateShort(rounds[0]?.played_at)+"   "+(rounds[0]?.course_name||""):"No rounds yet -- start playing!"}</p>
                  </div>
                  <button onClick={()=>{setSocialView("rounds");setTab("social");}} className="display text-[10px] font-bold uppercase tracking-wider text-primary inline-flex items-center gap-0.5 mt-1">History <ChevronRight className="h-3 w-3" strokeWidth={3}/></button>
                </div>
              </div>
            </section>
            {(()=>{
              const roundsWithData=rounds.filter(r=>r.scorecard&&Array.isArray(r.scorecard));const n=Math.min(roundsWithData.length,10);
              const avgScoreVal=n>0?Math.round(roundsWithData.slice(0,n).reduce((a,r)=>a+(r.total_score||0),0)/n):null;
              const bestScoreVal=rounds.length>0?Math.min(...rounds.map(r=>r.total_score||999)):null;
              let fwyHit=0,fwyTotal=0;roundsWithData.slice(0,n).forEach(r=>{if(r.fairways&&Array.isArray(r.fairways)){r.fairways.forEach(f=>{if(f!==null){fwyTotal++;if(f===true)fwyHit++;}});}});const fwyPct=fwyTotal>0?Math.round(fwyHit/fwyTotal*100):null;
              let girHit=0,girTotal=0;roundsWithData.slice(0,n).forEach(r=>{if(r.gir&&Array.isArray(r.gir)){r.gir.forEach(g=>{if(g!==null){girTotal++;if(g===true)girHit++;}});}});const girPct=girTotal>0?Math.round(girHit/girTotal*100):null;
              let puttTotal=0,puttRounds=0;roundsWithData.slice(0,n).forEach(r=>{if(r.putts&&Array.isArray(r.putts)){const rPutts=r.putts.filter(p=>p!==null).reduce((a,b)=>a+b,0);if(rPutts>0){puttTotal+=rPutts;puttRounds++;}}});const avgPutts=puttRounds>0?Math.round(puttTotal/puttRounds):null;
              const stats=[{label:"Avg Score",value:avgScoreVal||"--",sub:n>0?"last "+n+" rounds":"no rounds yet",color:"text-foreground"},{label:"Best Score",value:bestScoreVal||"--",sub:rounds.length>0?"all time":"--",color:"text-primary"},{label:"Rounds",value:rounds.length,sub:"total played",color:"text-foreground"},{label:"Fairways",value:fwyPct!==null?fwyPct+"%":"--",sub:fwyTotal>0?fwyTotal+" tracked":"no data yet",color:fwyPct!==null?(fwyPct>=60?"text-primary":"text-foreground"):"text-muted-foreground"},{label:"GIR",value:girPct!==null?girPct+"%":"--",sub:girTotal>0?girTotal+" tracked":"no data yet",color:girPct!==null?(girPct>=50?"text-primary":"text-foreground"):"text-muted-foreground"},{label:"Putts/Rnd",value:avgPutts||"--",sub:puttRounds>0?puttRounds+" rounds":"no data yet",color:avgPutts!==null?(avgPutts<=32?"text-primary":avgPutts>=36?"text-destructive":"text-foreground"):"text-muted-foreground"}];
              return(<section className="px-4 pt-3"><div className="grid grid-cols-2 gap-2.5">{stats.map(s=>(<div key={s.label} className="rounded-xl border border-border bg-card p-3.5"><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{s.label}</p><p className={"stat text-[32px] leading-none mt-1.5 "+s.color}>{s.value}</p><p className="display text-[10px] font-bold text-muted-foreground mt-1.5">{s.sub}</p></div>))}</div>{rounds.length>0&&fwyTotal===0&&(<p className="text-[11px] text-muted-foreground mt-2 text-center">Track Fairways, GIR &amp; Putts in the Caddie scorecard to see detailed stats here</p>)}</section>);
            })()}
            <section className="px-4 pt-4">
              <div className="flex items-center justify-between mb-2.5"><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Recent rounds</p><button onClick={()=>{setSocialView("rounds");setTab("social");}} className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">All <ChevronRight className="h-3 w-3" strokeWidth={3}/></button></div>
              {rounds.length===0?(<div className="rounded-xl border border-border bg-card p-8 text-center"><p className="display text-[14px] font-bold text-foreground">No rounds saved yet</p><p className="text-[12px] text-muted-foreground mt-1">Save a round from the Caddie tab to see stats here</p></div>):(
                <div className="space-y-2">{rounds.slice(0,5).map((r,i)=>{const diff=r.score_vs_par||0;const fwyPct=r.fairways?Math.round(r.fairways.filter(f=>f===true).length/Math.max(1,r.fairways.filter(f=>f!==null).length)*100):null;const girPct=r.gir?Math.round(r.gir.filter(g=>g===true).length/Math.max(1,r.gir.filter(g=>g!==null).length)*100):null;const totalPutts=r.putts?r.putts.filter(p=>p!==null).reduce((a,b)=>a+b,0):null;return(<button key={r.id||i} onClick={()=>setShowCard(r)} className="w-full rounded-xl border border-border bg-card p-3.5 hover:bg-secondary/30 transition text-left"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0"><MapPin className="h-4 w-4 text-muted-foreground" strokeWidth={2.5}/></div><div className="min-w-0 flex-1"><p className="display text-[14px] font-bold tracking-tight truncate">{r.course_name||"Unknown"}</p><p className="text-[11px] text-muted-foreground">{fmtDateShort(r.played_at)}</p></div><div className="text-right shrink-0"><p className={cn("stat text-[22px] leading-none",diff<=0?"text-primary":"text-foreground")}>{r.total_score}</p><p className="display text-[10px] font-bold text-muted-foreground">{diff===0?"E":diff>0?"+"+diff:""+diff}</p></div></div>{(fwyPct!==null||girPct!==null||totalPutts!==null)&&(<div className="flex gap-3 mt-2.5 pt-2.5 border-t border-border">{fwyPct!==null&&<span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">FWY <span className="text-foreground">{fwyPct}%</span></span>}{girPct!==null&&<span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GIR <span className="text-foreground">{girPct}%</span></span>}{totalPutts!==null&&<span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Putts <span className="text-foreground">{totalPutts}</span></span>}</div>)}</button>);})}</div>
              )}
            </section>
          </div>
        )}

        {tab==="caddie"&&(
          <div className="flex flex-col h-full min-h-0 bg-zinc-950">

            {/* ── MODE TOGGLE BAR ──────────────────────────────── */}
            <div className="shrink-0 px-4 pt-4 pb-2" style={{paddingTop:"calc(1rem + env(safe-area-inset-top))"}}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Caddie</p>
                  <h1 className="display text-[22px] font-bold tracking-tight text-white leading-tight">Obi.</h1>
                </div>
                <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                  <button
                    onClick={()=>{setCaddieView("chat");try{localStorage.setItem("obi_caddie_view","chat");}catch{}}}
                    className={cn("display text-[11px] font-bold px-3 py-1.5 rounded-lg transition",caddieView==="chat"?"bg-primary text-black":"text-white/50 hover:text-white")}>
                    💬 Caddie
                  </button>
                  <button
                    onClick={()=>{setCaddieView("map");try{localStorage.setItem("obi_caddie_view","map");}catch{}}}
                    className={cn("display text-[11px] font-bold px-3 py-1.5 rounded-lg transition",caddieView==="map"?"bg-primary text-black":"text-white/50 hover:text-white")}>
                    🗺️ Map
                  </button>
                </div>
              </div>
            </div>

            {/* ── CHAT MODE ────────────────────────────────────── */}
            {caddieView==="chat"&&(
              <div className="flex flex-col flex-1 min-h-0">

                {/* Course + hole selector */}
                <div className="shrink-0 px-4 pb-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5">
                      <svg className="h-3.5 w-3.5 text-white/30 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input value={courseInput} onChange={e=>setCourseInput(e.target.value)}
                        onBlur={()=>{if(courseInput.trim()){setCourse(courseInput.trim());}}}
                        onKeyDown={e=>{if(e.key==="Enter"&&courseInput.trim()){setCourse(courseInput.trim());e.target.blur();}}}
                        placeholder="Course name..."
                        className="flex-1 bg-transparent display text-[13px] font-bold text-white outline-none placeholder:text-white/30"/>
                      {course&&<span className="display text-[9px] font-bold text-primary uppercase tracking-wider shrink-0">SET</span>}
                    </div>
                    {/* Hole selector */}
                    <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5">
                      <span className="display text-[10px] font-bold text-white/40 uppercase tracking-wider">H</span>
                      <select value={hole} onChange={e=>setHole(Number(e.target.value))}
                        className="appearance-none bg-transparent display text-[15px] font-bold text-white outline-none cursor-pointer w-7 text-center">
                        {Array.from({length:18},(_,i)=>i+1).map(n=><option key={n} value={n} className="bg-zinc-900">{n}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Hole quick strip */}
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{scrollbarWidth:"none"}}>
                    {Array.from({length:18},(_,i)=>i+1).map(n=>(
                      <button key={n} onClick={()=>setHole(n)}
                        className={cn("h-7 w-7 rounded-lg display text-[11px] font-bold shrink-0 transition",
                          hole===n?"bg-primary text-black":"border border-white/15 text-white/50 hover:text-white hover:border-white/40")}>
                        {n}
                      </button>
                    ))}
                  </div>

                  {/* Par / yardage info strip if known */}
                  {holeMap&&(
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-center">
                        <p className="display text-[9px] font-bold text-white/40 uppercase tracking-wider">Par</p>
                        <p className="stat text-[18px] font-bold text-white leading-none">{holeMap.par||"—"}</p>
                      </div>
                      <div className="w-px h-8 bg-white/10"/>
                      <div className="text-center">
                        <p className="display text-[9px] font-bold text-white/40 uppercase tracking-wider">Yards</p>
                        <p className="stat text-[18px] font-bold text-white leading-none">{holeMap.yards||"—"}</p>
                      </div>
                      {holeMap.strokeIndex&&(<>
                        <div className="w-px h-8 bg-white/10"/>
                        <div className="text-center">
                          <p className="display text-[9px] font-bold text-white/40 uppercase tracking-wider">S/I</p>
                          <p className="stat text-[18px] font-bold text-white leading-none">{holeMap.strokeIndex}</p>
                        </div>
                      </>)}
                      {holeMap.hazards?.length>0&&(
                        <div className="ml-auto flex flex-wrap gap-1 justify-end">
                          {holeMap.hazards.slice(0,3).map((h,i)=>(
                            <span key={i} className="display text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 uppercase tracking-wider">{h}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Chat messages — scrollable */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-0" style={{scrollbarWidth:"none"}}>

                  {/* Latest AI response pinned at top */}
                  {messages.length>0&&messages[messages.length-1].role==="assistant"&&(
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                      <div className="flex items-center gap-2 mb-2">
                        <ObiLogo size={16}/>
                        <p className="display text-[9px] font-bold uppercase tracking-[0.18em] text-primary">Obi's Read</p>
                        {holeMap&&<span className="display text-[9px] font-bold text-white/30 uppercase tracking-wider ml-auto">Hole {hole} · Par {holeMap.par}</span>}
                      </div>
                      <p className="text-[14px] text-white leading-relaxed">
                        {messages[messages.length-1].content}
                      </p>
                      <div className="flex gap-1.5 mt-2.5 flex-wrap">
                        {["Why?","Alternatives","Risk?","Bag?"].map(q=>(
                          <button key={q} onClick={()=>sendMessage(q==="Why?"?"Why do you recommend that?":q==="Alternatives"?"What are my alternatives?":q==="Risk?"?"Biggest risk on this hole?":"What club from my bag?")}
                            className="display text-[9px] font-bold uppercase tracking-wider rounded-lg px-2 py-1.5 border border-white/15 text-white/60 hover:text-white hover:border-white/40 transition">
                            {q}
                          </button>
                        ))}
                        <button onClick={()=>{speaking?stopSpeak():speakText(messages[messages.length-1].content);}}
                          className={cn("display text-[9px] font-bold uppercase tracking-wider rounded-lg px-2 py-1.5 border transition",speaking?"bg-primary/20 border-primary/40 text-primary":"border-white/15 text-white/60 hover:text-white")}>
                          {speaking?"⏹ Stop":"🔊 Read"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick prompts when no messages */}
                  {messages.length===0&&!loading&&!obiTyping&&(
                    <div className="space-y-2">
                      <p className="display text-[9px] font-bold uppercase tracking-[0.18em] text-white/30 px-1">Ask Obi</p>
                      {(beginnerMode?["What club should I hit?","How do I play this hole safe?","I'm nervous — what should I focus on?","📖 Rules question"]:["What's the smart play here?","Wind factor on this shot?","Lay up or go for it?","What's the miss to avoid?"]).map(prompt=>(
                        <button key={prompt} onClick={()=>{if(prompt.startsWith("📖")){setShowRulesModal(true);}else{sendMessage(prompt);}}}
                          className="w-full text-left px-3.5 py-3 rounded-xl border border-white/12 bg-white/[0.03] display text-[13px] font-bold text-white/60 hover:text-white hover:border-white/30 hover:bg-white/[0.06] transition">
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Chat history (skip last AI — pinned above) */}
                  {messages.length>0&&(
                    <div className="space-y-2">
                      {messages.map((m,i)=>{
                        const isAI=m.role==="assistant";
                        if(isAI&&i===messages.length-1)return null; // pinned above
                        return(
                          <div key={i} className={cn("flex",isAI?"justify-start gap-2 items-end":"justify-end")}>
                            {isAI&&<ObiLogo size={14}/>}
                            <div className={cn("rounded-2xl px-3 py-2 text-[13px] leading-snug max-w-[85%]",
                              isAI?"bg-zinc-800 text-white rounded-bl-sm":"bg-primary text-black rounded-br-sm font-medium")}>
                              {m.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Typing indicator */}
                  {(obiTyping||loading)&&(
                    <div className="flex justify-start gap-2 items-end">
                      <ObiLogo size={14}/>
                      <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-3.5 py-3 flex gap-1 items-center">
                        {[0,1,2].map(i=>(
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50"
                            style={{animation:"typing-dot 1.2s "+(i*0.2)+"s infinite ease-in-out"}}/>
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef}/>
                </div>

                {/* Scorecard strip */}
                <div className="shrink-0 border-t border-white/10 px-3 py-2 flex items-center gap-1.5 overflow-x-auto" style={{scrollbarWidth:"none"}}>
                  <span className="display text-[9px] font-bold uppercase tracking-wider text-white/30 shrink-0 mr-1">H{hole}</span>
                  {[1,2,3,4,5,6,7,8,9,10].map(v=>(
                    <button key={v} onClick={()=>setScorecard(s=>{const n=[...s];n[hole-1]=scorecard[hole-1]===v?null:v;return n;})}
                      className={cn("h-7 w-7 rounded-lg display text-[11px] font-bold shrink-0 transition",
                        scorecard[hole-1]===v?"bg-primary text-black":
                        v===holePars[hole-1]?"border border-white/30 text-white/70":"text-white/25 hover:text-white/60")}>
                      {v}
                    </button>
                  ))}
                  {scorecard.some(Boolean)&&(
                    <button onClick={saveRound} className="ml-auto display text-[10px] font-bold uppercase tracking-wider bg-primary text-black rounded-lg px-2.5 py-1.5 shrink-0">Save</button>
                  )}
                </div>

                {/* Input bar */}
                <div className="shrink-0 bg-zinc-950 px-3 pb-safe border-t border-white/10" style={{paddingBottom:"calc(0.75rem + env(safe-area-inset-bottom))",paddingTop:"10px"}}>
                  {beginnerMode&&(
                    <div className="flex items-center gap-2 mb-2">
                      <span className="display text-[9px] font-bold text-primary uppercase tracking-wider">🌱 Beginner Mode</span>
                      <button onClick={()=>{setBeginnerMode(false);try{localStorage.setItem("obi_beginner","false");}catch{}}} className="ml-auto display text-[9px] font-bold uppercase tracking-wider text-white/30 hover:text-white/60">Off</button>
                    </div>
                  )}
                  {speaking&&(
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-0.5 items-end h-3">{[0,1,2,3].map(i=>(<div key={i} className="w-0.5 rounded-full bg-primary" style={{height:(4+i%2*4)+"px",animation:"pulse-dot 0.8s "+(i*0.12)+"s infinite"}}/>))}</div>
                      <span className="display text-[9px] font-bold text-primary uppercase tracking-wider">Speaking</span>
                      <button onClick={stopSpeak} className="ml-auto display text-[9px] font-bold text-white/40 hover:text-white">Stop</button>
                    </div>
                  )}
                  {loading&&!speaking&&(
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 w-3 rounded-full border border-primary border-t-transparent" style={{animation:"spin 0.8s linear infinite"}}/>
                      <span className="display text-[9px] font-bold text-white/40 uppercase tracking-wider">Obi thinking...</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button onClick={()=>{const next=!autoSpeak;setAutoSpeak(next);try{localStorage.setItem("obi_autospeak",String(next));}catch{}if(!next)stopSpeak();}}
                      className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition border",autoSpeak?"bg-primary/20 border-primary/40 text-primary":"bg-white/5 border-white/10 text-white/40 hover:text-white/70")}>
                      {autoSpeak?(<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                      ):(<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>)}
                    </button>
                    <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 pl-3 pr-1.5 py-1.5">
                      <input value={input} onChange={e=>setInput(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage()}
                        placeholder={micActive?"Listening...":"Ask Obi anything..."}
                        className={cn("flex-1 bg-transparent text-[14px] outline-none",micActive?"text-primary font-medium":"text-white placeholder:text-white/30")}/>
                      {micSupported&&(
                        <button onClick={startMic}
                          className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition",micActive?"bg-primary text-black":"bg-white/10 text-white/50 hover:text-white")}>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>
                        </button>
                      )}
                      <button onClick={()=>sendMessage()} disabled={!input.trim()||loading}
                        className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition bg-primary",(!input.trim()||loading)?"opacity-30":"hover:opacity-85 active:scale-95")}>
                        <ArrowUp className="h-4 w-4 text-black" strokeWidth={3}/>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── MAP MODE (original layout preserved) ─────────── */}
            {caddieView==="map"&&(
              <div className="relative flex-1 min-h-0 overflow-hidden bg-black">

                {/* FULL-SCREEN MAP */}
                {holeMap?(
                  <div className="absolute inset-0" style={{width:"100%",height:"100%"}}>
                    <HoleMapCanvas
                      map={holeMap} gps={gpsPos}
                      W={480} H={800}
                      weather={weather}
                      bearing={holeBearing}
                      fullscreen={true}
                    />
                  </div>
                ):(
                  <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center">
                    {holeMapLoading?(
                      <div className="text-center">
                        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent mx-auto mb-3" style={{animation:"spin 0.8s linear infinite"}}/>
                        <p className="display text-[13px] font-bold text-white/60 uppercase tracking-wider">Loading hole map...</p>
                      </div>
                    ):(
                      <div className="text-center px-8">
                        <p className="text-5xl mb-3">⛳</p>
                        <p className="display text-[15px] font-bold text-white">Set your course to see the map</p>
                        <p className="text-[12px] text-white/50 mt-1.5">Type your course name below and tap a hole</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TOP OVERLAY */}
                <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
                  <div className="flex items-start justify-between px-3 pt-2 gap-2">
                    <div className="bg-black/70 backdrop-blur-md rounded-xl px-3 py-2 pointer-events-auto">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="display text-[11px] font-bold text-white/60 uppercase tracking-wider">Hole</span>
                        <select value={hole} onChange={e=>{setHole(Number(e.target.value));if(course)fetchHoleMap(course,Number(e.target.value));}}
                          className="appearance-none bg-transparent display text-[18px] font-bold text-white outline-none cursor-pointer w-8">
                          {Array.from({length:18},(_,i)=>i+1).map(n=><option key={n} value={n} className="bg-zinc-900">{n}</option>)}
                        </select>
                        {holeMap&&<span className="display text-[11px] font-bold text-white/60">Par {holeMap.par}</span>}
                      </div>
                      {(()=>{
                        const manualPin=manualPins[hole];
                        const gemP=holeMap?.green_lat?{lat:holeMap.green_lat,lng:holeMap.green_lng}:null;
                        const gemOk=gpsPos&&gemP&&haversineYards(gpsPos.lat,gpsPos.lng,gemP.lat,gemP.lng)<=2000;
                        const pin=manualPin||(gemOk?gemP:null);
                        const dist=gpsPos&&pin?haversineYards(gpsPos.lat,gpsPos.lng,pin.lat,pin.lng):null;
                        return dist?(
                          <div>
                            <span className="stat text-[36px] leading-none text-white">{dist<3?"Pin":dist}</span>
                            {dist>=3&&<span className="display text-[11px] font-bold text-white/50 ml-1">yds</span>}
                          </div>
                        ):(
                          holeMap?.yards?<div><span className="stat text-[22px] leading-none text-white/70">{holeMap.yards}</span><span className="display text-[10px] font-bold text-white/40 ml-1">yds</span></div>:null
                        );
                      })()}
                    </div>
                    <div className="flex flex-col gap-1.5 pointer-events-auto">
                      <button onClick={gpsWatcher==null?startGPS:stopGPS}
                        className={cn("h-9 w-9 rounded-xl flex items-center justify-center backdrop-blur-md transition",
                          gpsWatcher!=null?"bg-primary/90 text-primary-foreground":"bg-black/70 text-white/70 hover:text-white")}>
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                        </svg>
                      </button>
                      {course&&<button onClick={()=>fetchHoleMap(course,hole)}
                        className="h-9 w-9 rounded-xl bg-black/70 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
                      </button>}
                      {gpsPos&&<button onClick={()=>setManualPins(p=>({...p,[hole]:{lat:gpsPos.lat,lng:gpsPos.lng}}))}
                        className="h-9 w-9 rounded-xl bg-black/70 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition">
                        <MapPin className="h-4 w-4" strokeWidth={2.5}/>
                      </button>}
                      <button onClick={()=>{if(!groupRoundCode)startGroupRound();else setShowGroupModal(true);}}
                        className={cn("h-9 w-9 rounded-xl backdrop-blur-md flex items-center justify-center transition",
                          groupPlayers.length>1?"bg-primary/90 text-black":"bg-black/70 text-white/70 hover:text-white")}
                        title="Group round">
                        <Users className="h-4 w-4" strokeWidth={2.5}/>
                      </button>
                    </div>
                  </div>
                  <div className="px-3 pt-1.5">
                    <div className="bg-black/60 backdrop-blur-md rounded-xl px-3 py-2 pointer-events-auto">
                      <div className="flex items-center gap-2">
                        <input value={courseInput} onChange={e=>setCourseInput(e.target.value)}
                          onBlur={()=>{if(courseInput){setCourse(courseInput);fetchHoleMap(courseInput,hole);}}}
                          onKeyDown={e=>{if(e.key==="Enter"&&courseInput){setCourse(courseInput);fetchHoleMap(courseInput,hole);}}}
                          placeholder="Course name..."
                          className="flex-1 bg-transparent display text-[13px] font-bold text-white outline-none placeholder:text-white/30"/>
                        {course&&<span className="display text-[9px] font-bold text-primary uppercase tracking-wider shrink-0">ON</span>}
                      </div>
                      {matchCourse(courseInput)?.tees&&(
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {Object.entries(matchCourse(courseInput).tees).map(([tee,data])=>(
                            <button key={tee} onClick={()=>{setSelectedTee(tee);setHoleMap(null);fetchHoleMap(courseInput,hole);}}
                              className={"display text-[9px] font-bold px-2 py-1 rounded-lg border transition "+(selectedTee===tee?"bg-primary text-primary-foreground border-primary":"border-white/20 text-white/60 hover:border-white/50")}>
                              {tee} <span className="opacity-50">{data.rating}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* HAZARD TAGS */}
                {holeMap?.hazards?.length>0&&!chatOpen&&(
                  <div className="absolute top-1/2 left-3 z-10 flex flex-col gap-1 pointer-events-none" style={{transform:"translateY(-50%)"}}>
                    {holeMap.hazards.slice(0,4).map((h,i)=>(
                      <div key={i} className="bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
                        <p className="display text-[9px] font-bold text-red-400 uppercase tracking-wider">{h}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* BOTTOM CHAT DRAWER */}
                <div className="absolute bottom-0 left-0 right-0 z-30">
                  <div onClick={()=>setChatOpen(o=>!o)} className="bg-black/80 backdrop-blur-xl border-t border-white/10 cursor-pointer">
                    <div className="flex justify-center pt-2 pb-1">
                      <div className="w-8 h-1 rounded-full bg-white/30"/>
                    </div>
                    {!chatOpen&&(
                      <div className="px-4 pb-2">
                        {obiTyping||loading?(
                          <div className="flex items-center gap-2">
                            <ObiLogo size={14}/>
                            <div className="flex gap-1 items-center">
                              {[0,1,2].map(i=>(
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50"
                                  style={{animation:"typing-dot 1.2s "+(i*0.2)+"s infinite ease-in-out"}}/>
                              ))}
                            </div>
                            <span className="display text-[10px] font-bold text-white/40 uppercase tracking-wider">Obi is thinking...</span>
                          </div>
                        ):messages.length>0&&messages[messages.length-1].role==="assistant"?(
                          <p className="text-[13px] text-white leading-snug line-clamp-2 opacity-90">{messages[messages.length-1].content}</p>
                        ):(
                          <p className="display text-[12px] font-bold text-white/50 uppercase tracking-wider">Ask Obi anything about this hole ↑</p>
                        )}
                      </div>
                    )}
                  </div>
                  {chatOpen&&(
                    <div className="bg-zinc-950 border-t border-white/10" style={{maxHeight:"60vh",display:"flex",flexDirection:"column"}}>
                      {messages.length>0&&messages[messages.length-1].role==="assistant"&&(
                        <div className="px-4 pt-3 pb-2 border-b border-white/10 shrink-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <ObiLogo size={16}/>
                            <p className="display text-[9px] font-bold uppercase tracking-[0.18em] text-primary">AI Caddie Analysis</p>
                          </div>
                          <p className="text-[14px] text-white leading-snug">{messages[messages.length-1].content}</p>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {["Why?","Alternatives","Risk?"].map(q=>(
                              <button key={q} onClick={()=>sendMessage(q==="Why?"?"Why do you recommend that?":q==="Alternatives"?"What are my alternatives?":"Biggest risk?")}
                                className="display text-[9px] font-bold uppercase tracking-wider rounded-lg px-2 py-1.5 border border-white/20 text-white/70 hover:text-white hover:border-white/50 transition">
                                {q}
                              </button>
                            ))}
                            <button onClick={()=>{speaking?stopSpeak():speakText(messages[messages.length-1].content);}}
                              className={cn("display text-[9px] font-bold uppercase tracking-wider rounded-lg px-2 py-1.5 border transition",speaking?"bg-primary/30 border-primary text-primary":"border-white/20 text-white/70 hover:text-white")}>
                              {speaking?"⏹ Stop":"🔊 Read"}
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0" style={{scrollbarWidth:"none"}}>
                        {messages.length===0&&(
                          <div className="space-y-1.5 py-1">
                            {(beginnerMode?["What club should I hit?","How do I play this hole safe?","I'm nervous — what should I focus on?","📖 Rules question"]:["What's the smart play here?","Wind factor on this shot?","Lay up or go for it?","What's the miss to avoid?"]).map(prompt=>(
                              <button key={prompt} onClick={()=>{if(prompt.startsWith("📖")){setShowRulesModal(true);}else{sendMessage(prompt);}}}
                                className="w-full text-left px-3 py-2 rounded-xl border border-white/15 display text-[12px] font-bold text-white/70 hover:text-white hover:border-white/40 transition">
                                {prompt}
                              </button>
                            ))}
                          </div>
                        )}
                        {messages.map((m,i)=>{
                          const isAI=m.role==="assistant";
                          const isLastAI=isAI&&i===messages.length-1;
                          if(isLastAI&&messages.length>0)return null;
                          return(
                            <div key={i} className={cn("flex",isAI?"justify-start gap-2 items-end":"justify-end")}>
                              {isAI&&<ObiLogo size={16}/>}
                              <div className={cn("rounded-2xl px-3 py-2 text-[13px] leading-snug max-w-[85%]",
                                isAI?"bg-zinc-800 text-white rounded-bl-sm":"bg-primary text-black rounded-br-sm")}>
                                {m.content}
                              </div>
                            </div>
                          );
                        })}
                        {(obiTyping||loading)&&(
                          <div className="flex justify-start gap-2 items-end">
                            <ObiLogo size={16}/>
                            <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-3.5 py-3 flex gap-1 items-center">
                              {[0,1,2].map(i=>(
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50"
                                  style={{animation:"typing-dot 1.2s "+(i*0.2)+"s infinite ease-in-out"}}/>
                              ))}
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef}/>
                      </div>
                      <div className="border-t border-white/10 px-3 py-2 flex items-center gap-2 shrink-0 overflow-x-auto" style={{scrollbarWidth:"none"}}>
                        <span className="display text-[9px] font-bold uppercase tracking-wider text-white/40 shrink-0">H{hole}</span>
                        {[1,2,3,4,5,6,7,8,9,10].map(v=>(
                          <button key={v} onClick={()=>setScorecard(s=>{const n=[...s];n[hole-1]=scorecard[hole-1]===v?null:v;return n;})}
                            className={cn("h-7 w-7 rounded-lg display text-[11px] font-bold shrink-0 transition",
                              scorecard[hole-1]===v?"bg-primary text-black":
                              v===holePars[hole-1]?"border border-white/30 text-white/70":"text-white/30 hover:text-white/60")}>
                            {v}
                          </button>
                        ))}
                        {scorecard.some(Boolean)&&(
                          <button onClick={saveRound} className="ml-auto display text-[10px] font-bold uppercase tracking-wider bg-primary text-black rounded-lg px-2.5 py-1.5 shrink-0">Save</button>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="bg-zinc-950/95 backdrop-blur-xl px-3 pb-safe" style={{paddingBottom:"calc(0.75rem + env(safe-area-inset-bottom))",paddingTop:"8px",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
                    {beginnerMode&&(
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="display text-[9px] font-bold text-primary uppercase tracking-wider">🌱 Beginner Mode</span>
                        <button onClick={()=>{setBeginnerMode(false);try{localStorage.setItem("obi_beginner","false");}catch{}}} className="ml-auto display text-[9px] font-bold uppercase tracking-wider text-white/30 hover:text-white/60">Off</button>
                      </div>
                    )}
                    {speaking&&(
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex gap-0.5 items-end h-3">{[0,1,2,3].map(i=>(<div key={i} className="w-0.5 rounded-full bg-primary" style={{height:(4+i%2*4)+"px",animation:"pulse-dot 0.8s "+(i*0.12)+"s infinite"}}/>))}</div>
                        <span className="display text-[9px] font-bold text-primary uppercase tracking-wider">Speaking</span>
                        <button onClick={stopSpeak} className="ml-auto display text-[9px] font-bold text-white/40 hover:text-white">Stop</button>
                      </div>
                    )}
                    {loading&&!speaking&&(
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-3 w-3 rounded-full border border-primary border-t-transparent" style={{animation:"spin 0.8s linear infinite"}}/>
                        <span className="display text-[9px] font-bold text-white/40 uppercase tracking-wider">Obi thinking...</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={()=>{const next=!autoSpeak;setAutoSpeak(next);try{localStorage.setItem("obi_autospeak",String(next));}catch{}if(!next)stopSpeak();}}
                        className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition border",autoSpeak?"bg-primary/20 border-primary/40 text-primary":"bg-white/5 border-white/10 text-white/40 hover:text-white/70")}>
                        {autoSpeak?(<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                        ):(<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>)}
                      </button>
                      <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 pl-3 pr-1.5 py-1.5">
                        <input value={input} onChange={e=>setInput(e.target.value)}
                          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage()}
                          placeholder={micActive?"Listening...":"Ask Obi..."}
                          className={cn("flex-1 bg-transparent text-[14px] outline-none",micActive?"text-primary font-medium":"text-white placeholder:text-white/30")}/>
                        {micSupported&&(
                          <button onClick={startMic}
                            className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition",micActive?"bg-primary text-black":"bg-white/10 text-white/50 hover:text-white")}>
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>
                          </button>
                        )}
                        <button onClick={()=>sendMessage()} disabled={!input.trim()||loading}
                          className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition bg-primary",(!input.trim()||loading)?"opacity-30":"hover:opacity-85 active:scale-95")}>
                          <ArrowUp className="h-4 w-4 text-black" strokeWidth={3}/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

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
            isOwnSwing={isOwnSwing} setIsOwnSwing={setIsOwnSwing}
            golferLevel={golferLevel} setGolferLevel={setGolferLevel}
            speaking={speaking} speakText={speakText} stopSpeak={stopSpeak}
            supabase={supabase} fmtDateShort={fmtDateShort}
            renderSwingAnalysis={renderSwingAnalysis}
            reExtractFrames={reExtractFrames}
            profile={profile}
          />
        )}

        {tab==="social"&&(
          <div className="pb-8">
            <section className="px-4 pt-5"><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Social</p><h1 className="display text-[26px] font-bold tracking-tight leading-tight mt-0.5">Your crew.</h1></section>
            <section className="px-4 pt-3"><div className="flex gap-1 bg-secondary rounded-xl p-1">{[["feed","Feed"],["rounds","My Rounds"],["friends","Friends"+(friendReqs.length>0?" ("+friendReqs.length+")":"")]].map(([id,label])=>(<button key={id} onClick={()=>setSocialView(id)} className={cn("flex-1 py-2 rounded-[10px] display text-[10px] font-bold uppercase tracking-wider transition-all",socialView===id?"nav-pill-active":"text-muted-foreground hover:text-foreground")}>{label}</button>))}</div></section>
            {socialView==="feed"&&friends.length>0&&(
              <section className="px-4 pt-4"><div className="rounded-xl border border-border bg-card overflow-hidden"><div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/50"><Trophy className="h-3.5 w-3.5 text-primary" strokeWidth={2.5}/><p className="display text-[11px] font-bold uppercase tracking-[0.18em]">This week&apos;s leaderboard</p></div><div className="divide-y divide-border">{[{rank:1,name:firstName(userProfile?.full_name)||"You",score:bestScore||"--",you:true},...friends.slice(0,2).map((f,idx)=>{const other=f.requester_id===user?.id?f.addressee:f.requester;return{rank:idx+2,name:other?.full_name||"Friend",score:"--",you:false};})].sort((a,b)=>a.rank-b.rank).map(p=>(<div key={p.rank} className={cn("flex items-center gap-3 px-4 py-3",p.you&&"bg-primary/10")}><span className={cn("stat text-lg w-6",p.rank===1?"text-primary":"text-muted-foreground")}>{p.rank}</span><div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center display text-[11px] font-bold shrink-0">{p.name.slice(0,2).toUpperCase()}</div><p className="display text-[13px] font-bold tracking-tight flex-1">{p.name}{p.you&&<span className="ml-1.5 text-[9px] uppercase tracking-wider text-primary">you</span>}</p><span className="stat text-lg">{p.score}</span></div>))}</div></div></section>
            )}
            {socialView==="rounds"&&(
              <section className="px-4 pt-4 space-y-2">
                {rounds.length===0&&(<div className="rounded-xl border border-border bg-card p-10 text-center"><p className="display text-[15px] font-bold text-foreground">No rounds saved yet</p><p className="text-[12px] text-muted-foreground mt-1">Save a round from the Caddie tab</p></div>)}
                {rounds.map((r,i)=>{const diff=r.score_vs_par||0;const fwyHit=(r.fairways||[]).filter(f=>f===true).length;const fwyTot=(r.fairways||[]).filter(f=>f!==null).length;const girHit=(r.gir||[]).filter(g=>g===true).length;const girTot=(r.gir||[]).filter(g=>g!==null).length;const puttTot=(r.putts||[]).filter(p=>p!==null).reduce((a,b)=>a+b,0);return(<div key={r.id||i} className="rounded-xl border border-border bg-card overflow-hidden"><button onClick={()=>setShowCard(r)} className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 transition text-left"><div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0"><MapPin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5}/></div><div className="min-w-0 flex-1"><p className="display text-[13px] font-bold tracking-tight truncate">{r.course_name||"Unknown"}</p><p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(r.played_at)}</p></div><div className="text-right shrink-0"><p className={cn("stat text-xl leading-none",diff<=0?"text-primary":"text-foreground")}>{r.total_score}</p><p className="display text-[10px] font-bold text-muted-foreground">{diff===0?"E":diff>0?"+"+diff:""+diff}</p></div></button><div className="flex items-center justify-between px-3.5 py-2 border-t border-border bg-secondary/20"><div className="flex gap-3 min-w-0 flex-1">{fwyTot>0&&<span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">FWY <span className="text-foreground">{fwyHit}/{fwyTot}</span></span>}{girTot>0&&<span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GIR <span className="text-foreground">{girHit}/{girTot}</span></span>}{puttTot>0&&<span className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Putts <span className="text-foreground">{puttTot}</span></span>}{!fwyTot&&!girTot&&!puttTot&&<span className="display text-[10px] text-muted-foreground italic">No stats tracked</span>}</div><div className="flex gap-1.5 shrink-0"><button onClick={()=>setShowCard(r)} className="display text-[10px] font-bold uppercase tracking-wider border border-border rounded-lg px-2 py-1 text-muted-foreground hover:text-foreground transition">View</button><button onClick={async()=>{if(!window.confirm("Delete this round from "+(r.course_name||"Unknown")+"?"))return;const{error}=await supabase.from("rounds").delete().eq("id",r.id);if(!error)setRounds(prev=>prev.filter(x=>x.id!==r.id));}} className="display text-[10px] font-bold uppercase tracking-wider border border-destructive/30 rounded-lg px-2 py-1 text-destructive hover:bg-destructive/10 transition">Delete</button></div></div></div>);})}
              </section>
            )}
            {socialView==="feed"&&(
              <section className="px-4 pt-4">
                <div className="flex items-center justify-between mb-2"><p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Friend activity</p><button onClick={()=>setSocialView("friends")} className="display text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Users className="h-3 w-3" strokeWidth={2.5}/> Find friends</button></div>
                {feed.length===0&&(<div className="rounded-xl border border-border bg-card p-10 text-center"><p className="display text-[15px] font-bold text-foreground">No activity yet</p><p className="text-[13px] text-muted-foreground mt-1">Add friends to see their rounds</p></div>)}
                <div className="space-y-2.5">
                  {(showAllFeed?feed:feed.slice(0,5)).map((r,i)=>{const isYou=r.user_id===user?.id;const pname=isYou?(firstName(userProfile?.full_name)||"You"):(r.profiles?.full_name||"Golfer");const diff=r.score_vs_par||0;return(<article key={r.id||i} className="rounded-xl border border-border bg-card p-3.5"><div className="flex items-center gap-2.5 mb-2.5"><div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center display text-[11px] font-bold shrink-0">{pname.split(" ").map(x=>x[0]).join("").toUpperCase().slice(0,2)}</div><div className="min-w-0 flex-1"><p className="display text-[13px] font-bold tracking-tight">{pname}{isYou&&<span className="ml-1.5 text-[9px] uppercase tracking-wider text-primary">you</span>}</p><p className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" strokeWidth={2.5}/>{r.course_name||"Unknown"} &nbsp; {fmtDateShort(r.played_at)}</p></div><div className="text-right"><p className={cn("stat text-xl leading-none",diff<=0?"text-primary":"text-foreground")}>{r.total_score}</p><p className="display text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Score</p></div></div><div className="flex items-center gap-4 mt-3 pt-3 border-t border-border"><button onClick={()=>setShowCard(r)} className="inline-flex items-center gap-1.5 display text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition">View round</button></div></article>);})}
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
          {NAV.map(({id,label,Icon})=>{const isActive=tab===id;return(<button key={id} onClick={()=>changeTab(id)} className={cn("flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg transition",isActive?"text-foreground":"text-muted-foreground hover:text-foreground")}><div className={cn("h-7 w-12 flex items-center justify-center rounded-lg transition",isActive?"nav-pill-brand":"")}><Icon className="h-[18px] w-[18px]" strokeWidth={isActive?2.5:1.75} style={isActive?{color:"#0d1200"}:{}}/></div><span className="display text-[10px] font-bold uppercase tracking-wider" style={isActive?{color:"#CFFF04"}:{}}>{label}</span></button>);})}
        </div>
      </nav>
    </div>
  );
}
export default function ObiGolf(){ return <ErrorBoundary><ObiGolfApp/></ErrorBoundary>; }
// Course GPS anchors — module level so always available in closures


