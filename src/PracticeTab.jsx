import React,{useState} from "react";
import {Video,X,ChevronRight,ChevronDown,Trash2} from "lucide-react";

function cn(){return Array.from(arguments).filter(Boolean).join(" ");}

export default function PracticeTab({
  swingFile,setSwingFile,
  swingNotes,setSwingNotes,
  swingAnalysis,setSwingAnalysis,
  swingLoading,
  swingHistory,setSwingHistory,
  swingThumb,setSwingThumb,
  swingInputRef,
  handleSwingAnalyze,
  speaking,speakText,
  supabase,fmtDateShort,
  renderSwingAnalysis,
  profile,
}){
  const [expanded,setExpanded]=useState(null);

  return(
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-5 pb-3 shrink-0">
        <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Practice</p>
        <h1 className="display text-[24px] font-bold tracking-tight leading-tight mt-0.5">Swing Lab.</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">

        {/* Upload button */}
        <button
          onClick={()=>{
            setSwingAnalysis("");setSwingNotes("");setSwingFile(null);setSwingThumb(null);
            if(swingInputRef.current){swingInputRef.current.value="";swingInputRef.current.click();}
          }}
          className="w-full rounded-xl bg-foreground text-background p-4 flex items-center gap-3 hover:opacity-95 transition"
        >
          <div className="h-11 w-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Video className="h-5 w-5" strokeWidth={2.5}/>
          </div>
          <div className="text-left flex-1">
            <p className="display text-[15px] font-bold tracking-tight">Analyze a swing</p>
            <p className="text-[12px] opacity-60 mt-0.5">Upload video or photo — AI breakdown</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 opacity-60" strokeWidth={2.5}/>
        </button>

        <input ref={swingInputRef} type="file" accept="video/*,image/*" className="hidden"
          onChange={e=>{
            const f=e.target.files&&e.target.files[0];if(!f)return;
            setSwingFile(f);setSwingThumb(null);
            if(f.type.startsWith("image/")){setSwingThumb(URL.createObjectURL(f));}
            else if(f.type.startsWith("video/")){
              const vid=document.createElement("video");vid.src=URL.createObjectURL(f);vid.currentTime=0.5;
              vid.onloadeddata=function(){const cv=document.createElement("canvas");cv.width=120;cv.height=90;cv.getContext("2d").drawImage(vid,0,0,120,90);setSwingThumb(cv.toDataURL("image/jpeg",0.7));};
            }
          }}
        />

        {/* File staged */}
        {swingFile&&!swingLoading&&(
          <div className="rounded-xl border border-primary/40 bg-card overflow-hidden">
            <div className="flex items-center gap-3 p-3.5 border-b border-border">
              {swingThumb?(
                <img src={swingThumb} alt="swing" className="h-14 w-20 object-cover rounded-lg shrink-0"/>
              ):(
                <div className="h-14 w-20 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Video className="h-6 w-6 text-primary" strokeWidth={2}/>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="display text-[13px] font-bold truncate">{swingFile.name}</p>
                <p className="text-[11px] text-muted-foreground">{(swingFile.size/1024/1024).toFixed(1)}MB</p>
              </div>
              <button onClick={()=>{setSwingFile(null);setSwingThumb(null);if(swingInputRef.current)swingInputRef.current.value="";}} className="text-muted-foreground hover:text-foreground shrink-0 p-1">
                <X className="h-4 w-4" strokeWidth={2.5}/>
              </button>
            </div>
            <div className="p-3.5 space-y-3">
              <input type="text" placeholder="Club used (e.g. 7-iron, driver)..." value={swingNotes}
                onChange={e=>setSwingNotes(e.target.value)}
                className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition"
              />
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
            <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" style={{animation:"spin 0.8s linear infinite"}}/>
            <p className="display text-[15px] font-bold">Analyzing your swing...</p>
            <p className="text-[12px] text-muted-foreground mt-1">Usually about 15 seconds</p>
          </div>
        )}

        {/* Swing history — the ONLY place analyses are shown */}
        {swingHistory.length>0&&(
          <div>
            <p className="display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
              All swings ({swingHistory.length})
            </p>
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {swingHistory.map(function(s,i){
                const key=s.id||("idx-"+i);
                const isExp=expanded===key;
                const thumb=s.thumbnail||null;
                const label=s.club_used&&s.club_used!=="unknown"?s.club_used:"Swing "+(swingHistory.length-i);
                const preview=(s.analysis||"").replace(/[*_#\n]/g," ").replace(/\s+/g," ").trim().slice(0,90);
                return(
                  <div key={key}>
                    <div className="flex items-center gap-3 px-3 py-3">
                      <div className="shrink-0">
                        {thumb?(
                          <img src={thumb} alt="" className="h-14 w-[72px] object-cover rounded-lg"/>
                        ):(
                          <div className="h-14 w-[72px] rounded-lg bg-secondary flex items-center justify-center">
                            <Video className="h-5 w-5 text-muted-foreground" strokeWidth={1.75}/>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="display text-[13px] font-bold tracking-tight">{label}</p>
                        <p className="display text-[10px] font-bold text-muted-foreground mt-0.5">{fmtDateShort(s.created_at)}</p>
                        {!isExp&&<p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-snug">{preview}{preview.length>=90?"…":""}</p>}
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0 ml-1">
                        <button
                          onClick={()=>setExpanded(isExp?null:key)}
                          className={cn("display text-[9px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 border transition text-center",
                            isExp?"bg-foreground text-background border-foreground":"border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                          )}>
                          {isExp?"Close":"View"}
                        </button>
                        <button
                          onClick={function(){
                            if(!window.confirm("Delete this swing?"))return;
                            if(s.id)supabase.from("swing_analyses").delete().eq("id",s.id).then(()=>{});
                            setSwingHistory(function(h){return h.filter(function(_,j){return j!==i;});});
                            if(isExp)setExpanded(null);
                          }}
                          className="display text-[9px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 border border-destructive/30 text-destructive hover:bg-destructive/10 transition text-center">
                          Delete
                        </button>
                      </div>
                    </div>
                    {isExp&&(
                      <div className="border-t border-border bg-secondary/20 p-3">
                        {renderSwingAnalysis(s.analysis||"",null,label,false,null,true,function(){})}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {swingHistory.length===0&&!swingFile&&!swingLoading&&(
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Video className="h-7 w-7 text-primary" strokeWidth={1.75}/>
            </div>
            <p className="display text-[15px] font-bold text-foreground">No swings yet</p>
            <p className="text-[12px] text-muted-foreground mt-1.5 leading-snug">Upload a video or photo and Obi will break down your swing</p>
          </div>
        )}

      </div>
    </div>
  );
}
