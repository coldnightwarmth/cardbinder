// A two-tap hint with a fresh count after each five-second cooldown.
export function createSealHint(element){
 let taps=0,cooldownUntil=0,started=null,fadeAt=null;
 return {
  reset(){taps=0;cooldownUntil=0;started=null;fadeAt=null;element.style.opacity='0';},
  tap(now){
   if(now<cooldownUntil)return;
   if(++taps<2)return;
   taps=0;cooldownUntil=now+5000;started=now;fadeAt=null;
  },
  dismiss(now){if(started!==null&&fadeAt===null)fadeAt=now;},
  update(now,x,y,back,reduced){
   if(started===null){element.style.opacity='0';return;}
   const age=(now-started)/1000;
   const appear=Math.min(1,age/.16);
   const fade=fadeAt===null?Math.max(0,1-Math.max(0,age-1.65)/.4):Math.max(0,1-(now-fadeAt)/140);
   if(fade===0){started=null;fadeAt=null;element.style.opacity='0';return;}
   const bounce=reduced?0:7*(1-Math.cos(Math.min(age,1.6)/.8*Math.PI*2))/2;
   const side=back?-1:1;
   element.textContent=back?'⟲':'☜';
   element.style.left=`${x+side*(37+bounce)}px`;
   element.style.top=`${y}px`;
   element.style.transform=`translate(-50%,-50%) scaleX(1)`;
   element.style.opacity=String(appear*fade);
  },
  get active(){return started!==null;}
 };
}
