const angleDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
// Render a short distance behind the latest stream so normal packet jitter
// does not become visible acceleration/deceleration. Predict at most 80 ms.
export function createPoseBuffer({delay=85,maxPrediction=80}={}) {
  let samples=[],clockOffset=Infinity;
  return {
    push(pose,receivedAt,serverAt=receivedAt) {
      const previous=samples.at(-1);
      if(previous&&serverAt<=previous.time)return;
      const jump=previous&&(pose.room!==previous.pose.room||Math.hypot(pose.x-previous.pose.x,pose.y-previous.pose.y,pose.z-previous.pose.z)>4);
      if(jump){samples=[];clockOffset=Infinity;}
      clockOffset=Math.min(clockOffset,receivedAt-serverAt);
      samples.push({pose:{...pose},time:serverAt});if(samples.length>12)samples.shift();
    },
    sample(now) {
      if(!samples.length)return null;
      const time=now-clockOffset-delay;
      if(samples.length===1||time<=samples[0].time)return {...samples[0].pose};
      let a=samples[0],b=samples[1];
      for(let i=1;i<samples.length;i++){a=samples[i-1];b=samples[i];if(b.time>=time)break;}
      const duration=Math.max(1,b.time-a.time);
      // A long pause indicates idle motion, not a useful velocity estimate.
      const future=duration>250?0:Math.min(maxPrediction,Math.max(0,time-b.time));
      const t=time>b.time?1+future/duration:(time-a.time)/duration;
      const result={...b.pose};
      for(const key of ['x','y','z','pitch'])result[key]=a.pose[key]+(b.pose[key]-a.pose[key])*t;
      result.yaw=a.pose.yaw+angleDelta(a.pose.yaw,b.pose.yaw)*t;
      return result;
    },
  };
}
// Parallel cards in a staggered fan cannot intersect, even where their
// silhouettes overlap. Limit row width for larger hands.
export function remoteHandPose(index,count) {
  const row=Math.floor(index/8),column=index%8;
  const rowCount=Math.min(8,count-row*8);
  return {x:(column-(rowCount-1)/2)*.115,y:-.57-row*.09,z:-.49-index*.008-row*.09*Math.tan(.16),rx:-.16,ry:0,rz:0};
}
