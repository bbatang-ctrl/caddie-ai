import React from "react";
import {Video,X,ChevronRight,ChevronDown,Sparkles} from "lucide-react";

function cn(){
  return Array.from(arguments).filter(Boolean).join(" ");
}

export default function PracticeTab({
  practiceSubTab,setPracticeSubTab,
  swingFile,setSwingFile,
  swingNotes,setSwingNotes,
  swingAnalysis,setSwingAnalysis,
  swingLoading,
  swingHistory,setSwingHistory,
  swingThumb,setSwingThumb,
  analysisExpanded,setAnalysisExpanded,
  expandedSwing,setExpandedSwing,
  swingInputRef,
  handleSwingAnalyze,
  speaking,speakText,
  supabase,fmtDateShort,
  renderSwingAnalysis,
  profile,
}){
  return(
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-5 pb-3 shrink-0">
        <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Practice</p>
        <h1 className="display text-[24px] font-bold tracking-tight leading-tight mt-0.5">Sharpen your game.</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">

        {/* Upload button - always visible */}
        {(
          <button onClick={()=>swingInputRef.current&&swingInputRef.current.click()}
            className="w-full rounded-xl bg-foreground text-background p-4 flex items-center gap-3 hover:opacity-95 transition">
            <div className="h-11 w-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Video className="h-5 w-5" strokeWidth={2.5}/>
            </div>
            <div className="text-left flex-1">
              <p className="display text-[15px] font-bold tracking-tight">{swingAnalysis?"Upload another swing":"Record or upload a swing"}</p>
              <p className="text-[12px] opacity-60 mt-0.5">Video or photo - AI breakdown</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 opacity-60" strokeWidth={2.5}/>
          </button>
        )}
        <input ref={swingInputRef} type="file" accept="video/*,image/*" className="hidden"
          onChange={e=>{
            const f=e.target.files&&e.target.files[0];
            if(!f)return;
            setSwingFile(f);
            if(f.type.startsWith("image/")){
              setSwingThumb(URL.createObjectURL(f));
            }else if(f.type.startsWith("video/")){
              const video=document.createElement("video");
              video.src=URL.createObjectURL(f);
              video.currentTime=0.5;
              video.onloadeddata=function(){
                const cv=document.createElement("canvas");
                cv.width=120;cv.height=90;
                cv.getContext("2d").drawImage(video,0,0,120,90);
                setSwingThumb(cv.toDataURL("image/jpeg",0.7));
              };
            }
          }}/>

        {/* File selected */}
        {swingFile&&!swingAnalysis&&!swingLoading&&(
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 p-3.5 border-b border-border">
              {swingThumb?(
                <img src={swingThumb} alt="swing" className="h-14 w-20 object-cover rounded-lg shrink-0 bg-muted"/>
              ):(
                <div className="h-14 w-20 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Video className="h-6 w-6 text-primary" strokeWidth={2}/>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="display text-[13px] font-bold truncate">{swingFile.name}</p>
                <p className="text-[11px] text-muted-foreground">{Math.round(swingFile.size/1024)}KB</p>
              </div>
              <button onClick={()=>{setSwingFile(null);setSwingThumb(null);}} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-4 w-4" strokeWidth={2.5}/>
              </button>
            </div>
            <div className="p-3.5 space-y-3">
              <textarea placeholder="Notes - club, what to work on..." value={swingNotes}
                onChange={e=>setSwingNotes(e.target.value)} rows={2}
                className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"/>
              <button onClick={handleSwingAnalyze}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 display text-[13px] font-bold uppercase tracking-wider hover:opacity-90 transition">
                Analyze with Obi
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {swingLoading&&(
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"
              style={{animation:"spin 0.8s linear infinite"}}/>
            <p className="display text-[15px] font-bold">Analyzing your swing...</p>
          </div>
        )}

        {/* Current analysis */}
        {swingAnalysis&&renderSwingAnalysis(swingAnalysis,swingThumb,swingNotes,true,null,analysisExpanded,setAnalysisExpanded)}

        {/* Swing history */}
        {swingHistory.length>0&&(
          <div>
            <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">All swings ({swingHistory.length})</p>
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {swingHistory.map(function(s,i){
                const isExp=expandedSwing===(s.id||i);
                const thumb=s.thumbnail||null;
                return(
                  <div key={s.id||i}>
                    <div className="flex items-center gap-3 p-3">
                      {thumb?(
                        <img src={thumb} alt="swing" className="h-12 w-16 object-cover rounded-lg shrink-0"/>
                      ):(
                        <div className="h-12 w-16 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <Video className="h-5 w-5 text-muted-foreground" strokeWidth={1.75}/>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="display text-[13px] font-bold truncate">{s.club_used||"Swing"}</p>
                        <p className="display text-[10px] text-muted-foreground font-bold">{fmtDateShort(s.created_at)}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{(s.analysis||"").slice(0,60)}...</p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button onClick={()=>setExpandedSwing(isExp?null:(s.id||i))}
                          className="display text-[9px] font-bold uppercase tracking-wider border border-border rounded-lg px-2 py-1 text-muted-foreground hover:text-foreground transition">
                          {isExp?"Hide":"View"}
                        </button>
                        <button onClick={function(){
                          if(!window.confirm("Delete this swing analysis?"))return;
                          if(s.id)supabase.from("swing_analyses").delete().eq("id",s.id);
                          setSwingHistory(function(h){return h.filter(function(_,j){return j!==i;});});
                          if(isExp)setExpandedSwing(null);
                        }}
                          className="display text-[9px] font-bold uppercase tracking-wider border border-destructive/30 rounded-lg px-2 py-1 text-destructive hover:bg-destructive/10 transition">
                          Delete
                        </button>
                      </div>
                    </div>
                    {isExp&&renderSwingAnalysis(s.analysis||"",null,s.club_used||"Swing",false,null,true,function(){})}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
