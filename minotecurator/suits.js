import {iconAsset} from './icon-options.js?v=3';
import {studioRequest,subscribeEdits,syncingPaused} from './storage.js?v=7';
import {suitDefaults,suitAssignments,suitBoxes,validateSuits} from './suits-model.js?v=4';
let settings={...suitDefaults},assignments=new Map(),ids=[],started=false,dirty=false,saving=false,panel,status,actions;
let synced={...suitDefaults},iconOverrides={};
export function cardIcon(id){return iconOverrides[id]||null;}
export function updateCardIcons(metadata){iconOverrides=metadata.iconOverrides||{};paint();}
const differs=(a,b)=>Object.keys(suitDefaults).some(key=>key!=='revision'&&a[key]!==b[key]);
function updateControls(){if(!panel)return;actions.hidden=!dirty;for(const input of panel.querySelectorAll('input'))input.value=settings[input.name];for(const control of panel.querySelectorAll('button,input'))control.disabled=saving||control.dataset.full==='true';}
export function applySuit(card,id){
 card.dataset.suitId=id;card.querySelectorAll('.suit-icon').forEach(icon=>icon.remove());
 if(!settings.visible||iconOverrides[id]?.hidden||!assignments.has(+id))return;
 for(const box of suitBoxes(+id,settings)){
  const styleSettings={...settings};const icon=new Image();icon.className='suit-icon';icon.alt='';icon.draggable=false;icon.src='/minotecurator/assets/suits/'+assignments.get(+id)+'.svg';
  Object.assign(icon.style,{position:'absolute',zIndex:3,pointerEvents:'none',width:box.size/20+'%',height:box.size/28+'%',left:box.x/20+'%',top:box.y/28+'%'});card.append(icon);
  if(styleSettings.stroke||styleSettings.shadow)styledSuit(assignments.get(+id),styleSettings).then(src=>{icon.src=src;const pad=effectPadding(styleSettings)/100*box.size;Object.assign(icon.style,{width:(box.size+2*pad)/20+'%',height:(box.size+2*pad)/28+'%',left:(box.x-pad)/20+'%',top:(box.y-pad)/28+'%'});}).catch(()=>{});
 }
}
function paint(){assignments=suitAssignments(ids,settings.seed);for(const [id,icon] of Object.entries(iconOverrides))assignments.set(+id,iconAsset(icon));document.querySelectorAll('[data-suit-id]').forEach(c=>applySuit(c,c.dataset.suitId));if(panel){for(const b of panel.querySelectorAll('[data-key]'))b.setAttribute('aria-pressed',String(settings[b.dataset.key]===b.dataset.value));for(const b of panel.querySelectorAll('[data-toggle]')){b.textContent=(settings[b.dataset.toggle]?'Disable ':'Enable ')+(b.dataset.toggle==='stroke'?'stroke':'drop shadow');b.setAttribute('aria-pressed',String(settings[b.dataset.toggle]));}panel.querySelector('#suitsVisible').textContent=settings.visible?'Hide corner icons':'Show corner icons';}}
async function refresh(){try{const meta=await studioRequest('/api/metadata');if(meta.ok)updateCardIcons(await meta.json());const r=await studioRequest('/api/suits');if(!r.ok)throw Error();const next=validateSuits(await r.json());if(next.revision>=synced.revision){synced=next;if(!dirty&&!saving){settings={...synced};paint();updateControls();}}return true;}catch{if(status)status.textContent='Could not sync suits. Your preview has not been shared.';return false;}}
export function startSuits(collection){ids=collection.map(c=>c.id);paint();if(!started){started=true;refresh();subscribeEdits(refresh);}}
async function save(){if(saving||!dirty)return;saving=true;updateControls();status.textContent='Saving…';const sent={...settings,revision:synced.revision};try{const r=await studioRequest('/api/suits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sent)});const result=await r.json();if(!r.ok){if(result.latest){synced=validateSuits(result.latest);throw Error('Suits changed elsewhere. Confirm again to share your preview, or Cancel to use the synced settings.');}throw Error(result.error||'Could not save suits');}const saved=validateSuits(result);if(saved.revision>=synced.revision)synced=saved;settings={...synced};dirty=false;paint();status.textContent=syncingPaused()?'Preview only — not saved':'Saved for everyone';}catch(e){status.textContent=e.message;}finally{saving=false;updateControls();}}
async function cancel(){if(saving)return;saving=true;updateControls();status.textContent='Restoring synced settings…';const refreshed=await refresh();settings={...synced};dirty=false;saving=false;paint();updateControls();status.textContent=refreshed?'Restored synced settings':'Restored last synced settings; currently unable to refresh.';}
function change(values){if(saving)return;Object.assign(settings,values);dirty=differs(settings,synced);paint();updateControls();status.textContent=dirty?'Preview only — confirm to share changes.':'';}
const presetKey='minote-suit-presets-v1';
function createPresets(){
 const section=document.createElement('section');section.className='suits-presets';section.setAttribute('aria-label','Local suit bookmarks');
 const heading=document.createElement('small');heading.textContent='Local bookmarks';const list=document.createElement('div');list.className='suits-preset-list';const add=document.createElement('button');add.textContent='Bookmark current settings';
 let presets=[];try{const stored=JSON.parse(localStorage.getItem(presetKey)||'[]');if(Array.isArray(stored))presets=stored.slice(0,6).map(validateSuits);}catch{}
 function store(next){try{if(!syncingPaused())localStorage.setItem(presetKey,JSON.stringify(next));presets=next;draw();return true;}catch{status.textContent='Could not save bookmarks in this browser.';return false;}}
 function draw(){list.replaceChildren();presets.forEach((preset,i)=>{const row=document.createElement('div');row.className='suits-row';const use=document.createElement('button');use.textContent='Bookmark '+(i+1);use.setAttribute('aria-label','Preview suit bookmark '+(i+1));use.onclick=()=>{const {revision,...values}=preset;change(values);};const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label','Remove suit bookmark '+(i+1));remove.onclick=()=>store(presets.filter((_,index)=>index!==i));row.append(use,remove);list.append(row);});add.disabled=presets.length>=6;add.dataset.full=String(presets.length>=6);}
 add.onclick=()=>{if(presets.length>=6)return;if(store([...presets,{...settings}]))status.textContent='Bookmarked on this browser.';};section.append(heading,list,add);draw();return section;
}
export function createSuitsControls(){
 const button=document.createElement('button');button.textContent='Suits';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','suitsPanel');document.querySelector('#viewToggle').before(button);
 panel=document.createElement('div');panel.id='suitsPanel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Suit settings');
 const visible=document.createElement('button');visible.id='suitsVisible';visible.onclick=()=>change({visible:!settings.visible});panel.append(visible);
 for(const [key,values] of [['side',['left','right']],['orientation',['vertical','horizontal']]]){const row=document.createElement('div');row.className='suits-row';for(const value of values){const b=document.createElement('button');b.textContent=value[0].toUpperCase()+value.slice(1);b.dataset.key=key;b.dataset.value=value;b.onclick=()=>change({[key]:value});row.append(b);}panel.append(row);}
 for(const [key,label,min,max] of [['size','Size',40,400],['spacingX','Horizontal edge spacing',0,300],['spacingY','Vertical edge spacing',0,300],['iconSpacing','Icon spacing',0,60]]){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.type='range';input.name=key;input.min=min;input.max=max;input.step=1;input.value=settings[key];input.setAttribute('aria-label','Suit '+label.toLowerCase());input.oninput=()=>change({[key]:+input.value});l.append(input);panel.append(l);}
 for(const effect of ['stroke','shadow']){
 const toggle=document.createElement('button');toggle.dataset.toggle=effect;toggle.onclick=()=>change({[effect]:!settings[effect]});panel.append(toggle);
 const row=document.createElement('div');row.className='suits-row';
 for(const color of ['white','black']){const b=document.createElement('button');b.textContent=color[0].toUpperCase()+color.slice(1);b.setAttribute('aria-label',effect+' '+color);b.dataset.key=effect+'Color';b.dataset.value=color;b.onclick=()=>change({[effect+'Color']:color});row.append(b);}panel.append(row);
 for(const [key,label,max] of effect==='stroke'?[['strokeWidth','Stroke thickness',10]]:[['shadowSize','Shadow size',20],['shadowOpacity','Shadow opacity',100]]){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.type='range';input.name=key;input.min=0;input.max=max;input.step=1;input.value=settings[key];input.setAttribute('aria-label',label);input.oninput=()=>change({[key]:+input.value});l.append(input);panel.append(l);}
 }
 const reroll=document.createElement('button');reroll.textContent='reroll';reroll.onclick=()=>change({seed:crypto.getRandomValues(new Uint32Array(1))[0]});status=document.createElement('small');status.setAttribute('role','status');actions=document.createElement('div');actions.className='suits-row suits-actions';actions.hidden=true;const cancelButton=document.createElement('button');cancelButton.textContent='Cancel';cancelButton.onclick=cancel;const confirmButton=document.createElement('button');confirmButton.textContent='Confirm';confirmButton.onclick=save;actions.append(cancelButton,confirmButton);panel.append(reroll,createPresets(),status,actions);document.body.append(panel);
 function close(){panel.hidden=true;button.setAttribute('aria-expanded','false');}
 button.onclick=()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));const r=button.getBoundingClientRect();panel.style.top=r.bottom+8+'px';panel.style.left=Math.max(8,Math.min(innerWidth-268,r.left))+'px';};
 document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target)&&!button.contains(e.target))close();});document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});window.addEventListener('resize',close);window.addEventListener('beforeunload',e=>{if(dirty||saving){e.preventDefault();e.returnValue='Suit changes have not been confirmed.';}});paint();
}
export function captureSuitExport(){return {settings:{...settings},assignments:new Map(assignments),iconOverrides:structuredClone(iconOverrides)};}
export async function exportSuit(ctx,id,loadImage,state=captureSuitExport()){if(!state.settings.visible||state.iconOverrides[id]?.hidden)return;const asset=state.assignments.get(id);if(!asset)return;const snapshot=state.settings;const styled=snapshot.stroke||snapshot.shadow;const image=await loadImage(styled?await styledSuit(asset,snapshot):'/minotecurator/assets/suits/'+asset+'.svg');for(const box of suitBoxes(id,snapshot)){const pad=styled?effectPadding(snapshot)/100*box.size:0;ctx.drawImage(image,box.x-pad,box.y-pad,box.size+2*pad,box.size+2*pad);}}

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
