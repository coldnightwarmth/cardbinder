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
 form.innerHTML='<input aria-label="Message other players" placeholder="Say something…" maxlength="180" autocomplete="off"><button type="submit" aria-label="Send message">→</button><span role="status" class="showroom-chat-feedback"></span>';
 hud.append(form);const input=form.querySelector('input'),feedback=form.querySelector('span');
 for(const name of ['keydown','keyup','pointerdown','click'])form.addEventListener(name,e=>e.stopPropagation());
 form.onsubmit=e=>{e.preventDefault();const text=input.value.trim();if(!text)return;if(!network.online){feedback.textContent='Reconnecting…';return;}network.send({type:'chat',text});input.value='';feedback.textContent='';};
 return {update(visible){form.hidden=!visible;if(!visible&&document.activeElement===input)input.blur();}};
}
