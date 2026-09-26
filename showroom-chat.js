import * as THREE from 'three';
export function createChatBubble(text){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=320;const ctx=canvas.getContext('2d');
 ctx.font='500 32px system-ui';const lines=[];let line='';for(const char of Array.from(text)){if(ctx.measureText(line+char).width>680){lines.push(line);line='';}line+=char;}if(line)lines.push(line);
 const height=36+lines.length*40;canvas.height=height;ctx.font='500 32px system-ui';ctx.fillStyle='rgba(20,24,32,.94)';ctx.beginPath();ctx.roundRect(0,0,768,height,24);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((line,i)=>ctx.fillText(line,384,38+i*40));
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.SpriteMaterial({map:texture,depthTest:true,depthWrite:false,toneMapped:false});const sprite=new THREE.Sprite(material);sprite.scale.set(1.8,1.8*height/768,1);sprite.position.y=.40+sprite.scale.y/2;sprite.name='player-chat';
 return {sprite,dispose(){sprite.removeFromParent();texture.dispose();material.dispose();}};
}
export function createChatInput(hud,network){
 const form=document.createElement('form');form.id='showroomChat';form.hidden=true;
 form.innerHTML='<div class="showroom-chat-log" role="log" aria-label="Your messages" aria-live="polite"></div><input aria-label="Message other players" placeholder="Say something…" maxlength="180" autocomplete="off"><button type="submit" aria-label="Send message"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></button><span role="status" class="showroom-chat-feedback"></span>';
 hud.append(form);const input=form.querySelector('input'),feedback=form.querySelector('span'),log=form.querySelector('.showroom-chat-log');
 for(const name of ['keydown','keyup','pointerdown','click'])form.addEventListener(name,e=>e.stopPropagation());
 form.onsubmit=e=>{e.preventDefault();const text=input.value.trim();if(!text)return;if(!network.online){feedback.textContent='Reconnecting…';return;}network.send({type:'chat',text});input.value='';feedback.textContent='';};
 return {record(text){const entry=document.createElement('div');entry.className='showroom-chat-message';entry.textContent=text;log.append(entry);log.scrollTop=log.scrollHeight;},update(visible){const opening=form.hidden&&visible;form.hidden=!visible;if(opening)log.scrollTop=log.scrollHeight;if(!visible&&document.activeElement===input)input.blur();}};
}
