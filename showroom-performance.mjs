// Adjust only pixel density, with hysteresis to avoid oscillating quality.
export function createResolutionBudget(maxRatio) {
  let ratio=maxRatio, elapsed=0, total=0, samples=0, cooldown=0;
  return {
    get ratio() { return ratio; },
    sample(milliseconds) {
      if(milliseconds<=0 || milliseconds>150) return null;
      elapsed+=milliseconds; total+=milliseconds; samples++;
      if(elapsed<2000) return null;
      const average=total/samples;
      elapsed=0;total=0;samples=0;
      if(cooldown>0) {cooldown--;return null;}
      const next=average>24 ? Math.max(Math.min(1,maxRatio),ratio-.2)
        : average<18 ? Math.min(maxRatio,ratio+.1) : ratio;
      if(Math.abs(next-ratio)<.001) return null;
      ratio=next;cooldown=2;return ratio;
    },
  };
}

// Quality changes only after sustained samples, and recovery is deliberately
// slower than degradation to avoid visible oscillation on integrated GPUs.
export function createShowroomQuality(initial=1) {
 let tier=initial,total=0,count=0,elapsed=0,cooldown=0;
 const settings=()=>({tier,reflectionSize:[256,512,1024][tier],reflectionInterval:[100,66,33][tier]});
 return {get settings(){return settings();},sample(ms){
  if(ms<=0||ms>150)return null;
  total+=ms;count++;elapsed+=ms;if(elapsed<2500)return null;
  const average=total/count;total=0;count=0;elapsed=0;
  if(cooldown>0){cooldown--;return null;}
  const next=average>25?Math.max(0,tier-1):average<17.5?Math.min(2,tier+1):tier;
  if(next===tier)return null;tier=next;cooldown=next===0?3:2;return settings();
 }};
}
