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
