import {studioRequest,subscribeEdits} from './storage.js?v=3';
import {suitDefaults,suitAssignments,suitBoxes,validateSuits} from './suits-model.js?v=3';
let settings={...suitDefaults},assignments=new Map(),ids=[],started=false,dirty=false,saving=false,timer,panel,status;
export function applySuit(card,id){
 card.dataset.suitId=id;card.querySelectorAll('.suit-icon').forEach(icon=>icon.remove());
 if(!settings.visible||!assignments.has(+id))return;
 for(const box of suitBoxes(+id,settings)){
  const styleSettings={...settings};const icon=new Image();icon.className='suit-icon';icon.alt='';icon.draggable=false;icon.src='/minotecurator/assets/suits/'+assignments.get(+id)+'.svg';
  Object.assign(icon.style,{position:'absolute',zIndex:3,pointerEvents:'none',width:box.size/20+'%',height:box.size/28+'%',left:box.x/20+'%',top:box.y/28+'%'});card.append(icon);
  if(styleSettings.stroke||styleSettings.shadow)styledSuit(assignments.get(+id),styleSettings).then(src=>{icon.src=src;const pad=effectPadding(styleSettings)/100*box.size;Object.assign(icon.style,{width:(box.size+2*pad)/20+'%',height:(box.size+2*pad)/28+'%',left:(box.x-pad)/20+'%',top:(box.y-pad)/28+'%'});}).catch(()=>{});
 }
}
function paint(){assignments=suitAssignments(ids,settings.seed);document.querySelectorAll('[data-suit-id]').forEach(c=>applySuit(c,c.dataset.suitId));if(panel){for(const b of panel.querySelectorAll('[data-key]'))b.setAttribute('aria-pressed',String(settings[b.dataset.key]===b.dataset.value));for(const b of panel.querySelectorAll('[data-toggle]')){b.textContent=(settings[b.dataset.toggle]?'Disable ':'Enable ')+(b.dataset.toggle==='stroke'?'stroke':'drop shadow');b.setAttribute('aria-pressed',String(settings[b.dataset.toggle]));}panel.querySelector('#suitsVisible').textContent=settings.visible?'Hide corner icons':'Show corner icons';}}
async function refresh(){if(dirty||saving)return;try{const r=await studioRequest('/api/suits');if(!r.ok)throw Error();const next=await r.json();if(next.revision>=settings.revision){settings=validateSuits(next);paint();if(panel)for(const input of panel.querySelectorAll('input'))input.value=settings[input.name];}}catch{if(status)status.textContent='Could not sync suits. Retry a setting to save.';}}
export function startSuits(collection){ids=collection.map(c=>c.id);paint();if(!started){started=true;refresh();subscribeEdits(refresh);}}
async function save(){if(saving)return;saving=true;dirty=false;const sent={...settings};try{const r=await studioRequest('/api/suits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sent)});const result=await r.json();if(!r.ok){if(result.latest){settings=validateSuits(result.latest);dirty=false;paint();}throw Error(result.error||'Could not save suits');}settings.revision=result.revision;status.textContent='Saved for everyone';}catch(e){status.textContent=e.message;}finally{saving=false;if(dirty)save();}}
function change(values){Object.assign(settings,values);dirty=true;paint();status.textContent='Saving…';clearTimeout(timer);timer=setTimeout(save,200);}
export function createSuitsControls(){
 const button=document.createElement('button');button.textContent='Suits';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','suitsPanel');document.querySelector('#inkFilter').after(button);
 panel=document.createElement('div');panel.id='suitsPanel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Suit settings');
 const visible=document.createElement('button');visible.id='suitsVisible';visible.onclick=()=>change({visible:!settings.visible});panel.append(visible);
 for(const [key,values] of [['side',['left','right']],['orientation',['vertical','horizontal']]]){const row=document.createElement('div');row.className='suits-row';for(const value of values){const b=document.createElement('button');b.textContent=value[0].toUpperCase()+value.slice(1);b.dataset.key=key;b.dataset.value=value;b.onclick=()=>change({[key]:value});row.append(b);}panel.append(row);}
 for(const [key,label,min,max] of [['size','Size',40,400],['spacingX','Horizontal edge spacing',0,300],['spacingY','Vertical edge spacing',0,300]]){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.type='range';input.name=key;input.min=min;input.max=max;input.step=1;input.value=settings[key];input.setAttribute('aria-label','Suit '+label.toLowerCase());input.oninput=()=>change({[key]:+input.value});l.append(input);panel.append(l);}
 for(const effect of ['stroke','shadow']){
 const toggle=document.createElement('button');toggle.dataset.toggle=effect;toggle.onclick=()=>change({[effect]:!settings[effect]});panel.append(toggle);
 const row=document.createElement('div');row.className='suits-row';
 for(const color of ['white','black']){const b=document.createElement('button');b.textContent=color[0].toUpperCase()+color.slice(1);b.setAttribute('aria-label',effect+' '+color);b.dataset.key=effect+'Color';b.dataset.value=color;b.onclick=()=>change({[effect+'Color']:color});row.append(b);}panel.append(row);
 for(const [key,label,max] of effect==='stroke'?[['strokeWidth','Stroke thickness',10]]:[['shadowSize','Shadow size',20],['shadowOpacity','Shadow opacity',100]]){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.type='range';input.name=key;input.min=0;input.max=max;input.step=1;input.value=settings[key];input.setAttribute('aria-label',label);input.oninput=()=>change({[key]:+input.value});l.append(input);panel.append(l);}
 }
 const reroll=document.createElement('button');reroll.textContent='reroll';reroll.onclick=()=>change({seed:crypto.getRandomValues(new Uint32Array(1))[0]});status=document.createElement('small');status.setAttribute('role','status');panel.append(reroll,status);document.body.append(panel);
 function close(){panel.hidden=true;button.setAttribute('aria-expanded','false');}
 button.onclick=()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));const r=button.getBoundingClientRect();panel.style.top=r.bottom+8+'px';panel.style.left=Math.max(8,Math.min(innerWidth-268,r.left))+'px';};
 document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target)&&!button.contains(e.target))close();});document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});window.addEventListener('resize',close);window.addEventListener('beforeunload',e=>{if(dirty||saving){e.preventDefault();e.returnValue='Suits are still saving.';}});paint();
}
export async function exportSuit(ctx,id,loadImage){if(!settings.visible)return;const asset=assignments.get(id);if(!asset)return;const snapshot={...settings};const styled=snapshot.stroke||snapshot.shadow;const image=await loadImage(styled?await styledSuit(asset,snapshot):'/minotecurator/assets/suits/'+asset+'.svg');for(const box of suitBoxes(id,snapshot)){const pad=styled?effectPadding(snapshot)/100*box.size:0;ctx.drawImage(image,box.x-pad,box.y-pad,box.size+2*pad,box.size+2*pad);}}

// Use the same padded SVG filter in the DOM and canvas exports so effects scale with icons.
const sources=new Map();
function effectPadding(s){return Math.ceil((s.stroke?s.strokeWidth:0)+(s.shadow?s.shadowSize*4:0)+2);}
async function styledSuit(asset,s){
 if(!sources.has(asset))sources.set(asset,fetch('/minotecurator/assets/suits/'+asset+'.svg').then(r=>{if(!r.ok)throw Error('Suit image unavailable');return r.text();}).catch(e=>{sources.delete(asset);throw e;}));
 const source=await sources.get(asset),content=source.replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>\s*$/,'');
 const pad=effectPadding(s),extent=100+pad*2;let filter='';
 if(s.stroke)filter+=`<feMorphology in="SourceAlpha" operator="dilate" radius="${s.strokeWidth}" result="outline"/><feFlood flood-color="${s.strokeColor}"/><feComposite in2="outline" operator="in" result="stroke"/><feMerge result="outlined"><feMergeNode in="stroke"/><feMergeNode in="SourceGraphic"/></feMerge>`;
 const base=s.stroke?'outlined':'SourceGraphic';
 if(s.shadow)filter+=`<feGaussianBlur in="${base}" stdDeviation="${s.shadowSize*.65}" result="blur"/><feOffset in="blur" dx="${s.shadowSize*.35}" dy="${s.shadowSize*.6}" result="offset"/><feFlood flood-color="${s.shadowColor}" flood-opacity="${s.shadowOpacity/100}"/><feComposite in2="offset" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="${base}"/></feMerge>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${extent}" height="${extent}" viewBox="${-pad} ${-pad} ${extent} ${extent}"><defs><filter id="effect" filterUnits="userSpaceOnUse" x="${-pad}" y="${-pad}" width="${extent}" height="${extent}" color-interpolation-filters="sRGB">${filter}</filter></defs><g filter="url(#effect)">${content}</g></svg>`);
}
