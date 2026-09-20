// Seconds: rise for five, grow for one, then quickly contract and disappear.
export function ritualPose(elapsed) {
  const t=Math.max(0,elapsed);
  if(t<5)return {rise:2.6*(t/5),scale:1,done:false};
  if(t<6)return {rise:2.6,scale:1+(t-5),done:false};
  if(t<6.35)return {rise:2.6,scale:2*(1-(t-6)/.35)**2,done:false};
  return {rise:2.6,scale:0,done:true};
}
