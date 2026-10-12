// Opt-in diagnostics only (?perf). info.autoReset=false includes every portal
// and nested reflection render in the reported frame rather than only the last
// scene submission. Frame intervals are wall-clock timing, not GPU timings.
export function createShowroomDiagnostics({renderer,canvas,document:doc=document,now=()=>performance.now()}) {
  const panel=doc.createElement('output');panel.id='showroomPerformance';
  panel.setAttribute('aria-label','Showroom performance diagnostics');
  panel.style.cssText='position:fixed;right:12px;top:12px;z-index:10000;padding:9px 11px;border-radius:7px;background:#10151bdd;color:#dce8ed;font:11px/1.5 ui-monospace,monospace;white-space:pre;pointer-events:none';
  doc.body.append(panel);
  const previousAutoReset=renderer.info.autoReset;renderer.info.autoReset=false;
  const samples=new Float32Array(180);let count=0,cursor=0,lastFrame=null,nextReport=0;
  const visible=()=>{lastFrame=null;};doc.addEventListener('visibilitychange',visible);
  function begin() {
    const time=now();
    if(lastFrame!==null&&!doc.hidden){samples[cursor]=Math.max(0,time-lastFrame);cursor=(cursor+1)%samples.length;count=Math.min(samples.length,count+1);}
    lastFrame=time;renderer.info.reset();
  }
  function end({inside=false}={}) {
    const time=now();if(time<nextReport)return;nextReport=time+1000;
    const sorted=Array.from(samples.slice(0,count)).sort((a,b)=>a-b);
    const average=sorted.length?sorted.reduce((sum,n)=>sum+n,0)/sorted.length:0;
    const round=n=>Math.round(n*100)/100;
    const data={sampleCount:count,meanFrameMs:round(average),p95FrameMs:round(sorted[Math.max(0,Math.ceil(count*.95)-1)]||0),
      renderCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,points:renderer.info.render.points,lines:renderer.info.render.lines,
      textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,
      width:canvas.width,height:canvas.height,pixelRatio:round(renderer.getPixelRatio()),room:inside?'ritual':'showroom'};
    panel.dataset.metrics=JSON.stringify(data);
    panel.textContent=`Frame avg ${data.meanFrameMs.toFixed(1)} ms · p95 ${data.p95FrameMs.toFixed(1)} ms\n`
      +`${data.renderCalls} draws · ${data.triangles.toLocaleString()} triangles\n`
      +`${data.textures} textures · ${data.geometries} geometries\n`
      +`${data.width} × ${data.height} · DPR ${data.pixelRatio} · ${data.room}`;
  }
  return {panel,begin,end,dispose(){renderer.info.autoReset=previousAutoReset;doc.removeEventListener('visibilitychange',visible);panel.remove();}};
}
