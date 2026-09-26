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
// Cards rotate within parallel, depth-separated planes: a compact curved fan
// with no intersections, even when the hand spans multiple rows.
export function remoteHandPose(index,count) {
  const row=Math.floor(index/8),column=index%8,rowCount=Math.min(8,count-row*8);
  const offset=column-(rowCount-1)/2,angle=-offset*.095;
  const y=-.57-row*.075+(Math.cos(angle)-1)*.22;
  return {x:Math.sin(-angle)*.32,y,z:-.49-index*.006+(y+.57)*Math.tan(.16),rx:-.16,ry:0,rz:angle};
}
