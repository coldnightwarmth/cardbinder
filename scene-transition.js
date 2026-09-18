// Runs in the head so a destination never flashes before its scene is ready.
(() => {
  const key='cards:scene-transition', root=document.documentElement;
  let arriving=false, color='#000', departing=false, curtain, fallback;
  try {
    const saved=JSON.parse(sessionStorage.getItem(key)||'null');
    sessionStorage.removeItem(key);
    arriving=Boolean(saved && Date.now()-saved.at<30000 && saved.path===location.pathname+location.search+location.hash);
    if(arriving)color=saved.color;
  } catch {}
  const style=document.createElement('style');
  style.textContent=`html.scene-arriving{background:var(--scene-transition-color)!important}html.scene-arriving::after{content:'';position:fixed;inset:0;z-index:2147483647;background:var(--scene-transition-color);pointer-events:auto}.scene-transition-curtain{position:fixed;inset:0;z-index:2147483647;background:var(--scene-transition-color);opacity:0;transition:opacity 420ms ease;pointer-events:auto}@media(prefers-reduced-motion:reduce){.scene-transition-curtain{transition:none}}`;
  document.head.append(style);
  function setColor(value){root.style.setProperty('--scene-transition-color',value);}
  function overlay(opacity) {
    if(!curtain){curtain=document.createElement('div');curtain.className='scene-transition-curtain';curtain.setAttribute('aria-hidden','true');root.append(curtain);}
    curtain.style.opacity=opacity;
    return curtain;
  }
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const paint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  async function ready() {
    if(!arriving)return;
    arriving=false;clearTimeout(fallback);
    overlay('1');root.classList.remove('scene-arriving');
    await paint();curtain.style.opacity='0';
    setTimeout(()=>{curtain?.remove();curtain=null;},reduced()?0:450);
  }
  window.cardSceneTransition={get arriving(){return arriving;},get departing(){return departing;},ready};
  if(arriving){setColor(color);root.classList.add('scene-arriving');fallback=setTimeout(ready,20000);}
  document.addEventListener('keydown',event=>{
    if(arriving || departing){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  document.addEventListener('click',async event=>{
    const link=event.target.closest?.('.wallet-showroom-link,#showroomLeave');
    if(!link || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented)return;
    const destination=new URL(link.href,location.href);
    if(destination.origin!==location.origin)return;
    event.preventDefault();if(departing)return;
    departing=true;
    color=document.body.classList.contains('is-light')?'#fff':'#000';setColor(color);
    window.dispatchEvent(new Event('scene-transition-start'));
    overlay('0');await paint();curtain.style.opacity='1';
    await new Promise(resolve=>setTimeout(resolve,reduced()?0:440));
    try{sessionStorage.setItem(key,JSON.stringify({at:Date.now(),color,path:destination.pathname+destination.search+destination.hash}));}catch{}
    location.assign(destination.href);
  });
  window.addEventListener('pageshow',event=>{
    if(!event.persisted)return;
    departing=false;arriving=false;root.classList.remove('scene-arriving');curtain?.remove();curtain=null;
  });
})();
