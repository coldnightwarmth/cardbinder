export function createChatBubble(text){
 const element=document.createElement('div');element.className='showroom-player-chat';element.textContent=text;element.hidden=true;
 document.body.append(element);let measuredWidth=0,width=0,height=0;
 return {element,update(x,y,visible){if(element.hidden===visible)element.hidden=!visible;if(!visible)return;
   if(measuredWidth!==innerWidth){width=element.offsetWidth;height=element.offsetHeight;measuredWidth=innerWidth;}
   element.style.left=`${Math.max(8,Math.min(innerWidth-width-8,x-width/2))}px`;
   element.style.top=`${Math.max(8,y-height-12)}px`;
 },dispose(){element.remove();}};
}
export function createChatInput(hud,network,{resume=()=>{}}={}){
 let focusPending=false;
 const form=document.createElement('form');form.id='showroomChat';form.hidden=true;
 form.innerHTML='<div class="showroom-chat-log" role="log" aria-label="Your messages" aria-live="polite"></div><input aria-label="Message other players" placeholder="Say something…" maxlength="180" autocomplete="off"><button type="submit" aria-label="Send message"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></button><span role="status" class="showroom-chat-feedback"></span>';
 hud.append(form);const input=form.querySelector('input'),feedback=form.querySelector('span'),log=form.querySelector('.showroom-chat-log');
 for(const name of ['keydown','keyup','pointerdown','click'])form.addEventListener(name,e=>e.stopPropagation());
 function send(returnToWalking){const text=input.value.trim();if(!text)return;if(!network.online){feedback.textContent='Reconnecting…';return;}network.send({type:'chat',text});input.value='';feedback.textContent='';if(returnToWalking){focusPending=false;input.blur();resume();}}
 input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();send(true);}});
 form.onsubmit=e=>{e.preventDefault();send(false);};
 return {focus(){focusPending=true;},record(text){const entry=document.createElement('div');entry.className='showroom-chat-message';entry.textContent=text;log.append(entry);log.scrollTop=log.scrollHeight;},update(visible){const opening=form.hidden&&visible;form.hidden=!visible;if(opening)log.scrollTop=log.scrollHeight;if(visible&&(opening||focusPending)){focusPending=false;input.focus({preventScroll:true});}if(!visible&&document.activeElement===input)input.blur();}};
}
