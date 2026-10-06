import {studioRequest,subscribeEdits} from './storage.js?v=3';
import {suitDefaults,suitAssignments,suitBoxes} from './suits-model.js';
let settings={...suitDefaults},assignments=new Map(),ids=[],started=false,dirty=false,saving=false,timer,panel,status;
export function applySuit(card,id){
 card.dataset.suitId=id;card.querySelectorAll('.suit-icon').forEach(icon=>icon.remove());
 if(!settings.visible||!assignments.has(+id))return;
 for(const box of suitBoxes(+id,settings)){
  const icon=new Image();icon.className='suit-icon';icon.alt='';icon.draggable=false;icon.src='/minotecurator/assets/suits/'+assignments.get(+id)+'.svg';
  Object.assign(icon.style,{position:'absolute',zIndex:3,pointerEvents:'none',width:box.size/20+'%',height:box.size/28+'%',left:box.x/20+'%',top:box.y/28+'%'});card.append(icon);
 }
}
function paint(){assignments=suitAssignments(ids,settings.seed);document.querySelectorAll('[data-suit-id]').forEach(c=>applySuit(c,c.dataset.suitId));if(panel){for(const b of panel.querySelectorAll('[data-key]'))b.setAttribute('aria-pressed',String(settings[b.dataset.key]===b.dataset.value));panel.querySelector('#suitsVisible').textContent=settings.visible?'Hide corner icons':'Show corner icons';}}
async function refresh(){if(dirty||saving)return;try{const r=await studioRequest('/api/suits');if(!r.ok)throw Error();const next=await r.json();if(next.revision>=settings.revision){settings=next;paint();if(panel)for(const input of panel.querySelectorAll('input'))input.value=settings[input.name];}}catch{if(status)status.textContent='Could not sync suits. Retry a setting to save.';}}
export function startSuits(collection){ids=collection.map(c=>c.id);paint();if(!started){started=true;refresh();subscribeEdits(refresh);}}
async function save(){if(saving)return;saving=true;dirty=false;const sent={...settings};try{const r=await studioRequest('/api/suits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sent)});const result=await r.json();if(!r.ok){if(result.latest){settings=result.latest;dirty=false;paint();}throw Error(result.error||'Could not save suits');}settings.revision=result.revision;status.textContent='Saved for everyone';}catch(e){status.textContent=e.message;}finally{saving=false;if(dirty)save();}}
function change(values){Object.assign(settings,values);dirty=true;paint();status.textContent='Saving…';clearTimeout(timer);timer=setTimeout(save,200);}
export function createSuitsControls(){
 const button=document.createElement('button');button.textContent='Suits';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','suitsPanel');document.querySelector('#inkFilter').after(button);
 panel=document.createElement('div');panel.id='suitsPanel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Suit settings');
 const visible=document.createElement('button');visible.id='suitsVisible';visible.onclick=()=>change({visible:!settings.visible});panel.append(visible);
 for(const [key,values] of [['side',['left','right']],['orientation',['vertical','horizontal']]]){const row=document.createElement('div');row.className='suits-row';for(const value of values){const b=document.createElement('button');b.textContent=value[0].toUpperCase()+value.slice(1);b.dataset.key=key;b.dataset.value=value;b.onclick=()=>change({[key]:value});row.append(b);}panel.append(row);}
 for(const [key,label,min,max] of [['size','Size',40,400],['spacing','Edge spacing',0,300]]){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.type='range';input.name=key;input.min=min;input.max=max;input.step=1;input.value=settings[key];input.setAttribute('aria-label','Suit '+label.toLowerCase());input.oninput=()=>change({[key]:+input.value});l.append(input);panel.append(l);}
 const reroll=document.createElement('button');reroll.textContent='Reroll suits';reroll.onclick=()=>change({seed:crypto.getRandomValues(new Uint32Array(1))[0]});status=document.createElement('small');status.setAttribute('role','status');panel.append(reroll,status);document.body.append(panel);
 function close(){panel.hidden=true;button.setAttribute('aria-expanded','false');}
 button.onclick=()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));const r=button.getBoundingClientRect();panel.style.top=r.bottom+8+'px';panel.style.left=Math.max(8,Math.min(innerWidth-268,r.left))+'px';};
 document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target)&&!button.contains(e.target))close();});document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});window.addEventListener('resize',close);window.addEventListener('beforeunload',e=>{if(dirty||saving){e.preventDefault();e.returnValue='Suits are still saving.';}});paint();
}
export async function exportSuit(ctx,id,loadImage){if(!settings.visible)return;const asset=assignments.get(id);if(!asset)return;const image=await loadImage('/minotecurator/assets/suits/'+asset+'.svg');for(const box of suitBoxes(id,settings))ctx.drawImage(image,box.x,box.y,box.size,box.size);}
