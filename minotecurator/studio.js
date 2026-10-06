import {createExportOptions} from './export-options.js';
import {bodySource} from './body-source.js';
import {maskName,drawMaskedName} from './title-mask.js';
import {applySuit,startSuits,createSuitsControls,exportSuit} from './suits.js?v=3';
import {createMetadataSidebar} from './metadata.js?v=3';
import {createTagFilter} from './tag-filter.js?v=3';
import {studioRequest,subscribeEdits} from './storage.js?v=3';
const $=s=>document.querySelector(s),W=2000,H=2800,defaults=()=>({zoom:1,x:0,y:0,nameZoom:1,nameX:0,nameY:0,ink:"original",body:false,bodyZoom:1,bodyX:0,bodyY:0});let collection=[],edits={},filtered=[],current=null,crop=defaults(),history=[],future=[],timer,bodyFilter=0,inkFilter=0,saveChain=Promise.resolve();const grid=$('#grid'),dialog=$('#editor');let revisions={},pending=new Set(),conflicts=new Map(),editSerial={};
function geometry(item,v){const s=Math.max(W/item.width,H/item.height)*v.zoom;return {w:item.width*s,h:item.height*s}}
function clamp(item,v){v={...defaults(),...v,zoom:Math.max(1,Math.min(5,v.zoom))};const g=geometry(item,v);v.x=Math.max(-(g.w-W)/2,Math.min((g.w-W)/2,v.x));v.y=Math.max(-(g.h-H)/2,Math.min((g.h-H)/2,v.y));const b=nameGeometry(item,{...v,nameZoom:1});v.nameZoom=Math.max(.25,Math.min(4,W/b.w,H/b.h,v.nameZoom));const n=nameGeometry(item,v);const bg=bodyGeometry({...v,bodyZoom:1});v.bodyZoom=Math.max(.25,Math.min(4,W/bg.w,H/bg.h,v.bodyZoom));const q=bodyGeometry(v);return v}
function position(img,item,v){const g=geometry(item,v);img.style.width=g.w/W*100+'%';img.style.height=g.h/H*100+'%';img.style.left=((W-g.w)/2+v.x)/W*100+'%';img.style.top=((H-g.h)/2+v.y)/H*100+'%'}
const BODY={w:1053/1466*W,h:386/2052*H,cx:749.5/1466*W,cy:1795/2052*H};
function bodyGeometry(v){return {w:BODY.w*(v.bodyZoom??1),h:BODY.h*(v.bodyZoom??1),cx:BODY.cx+(v.bodyX??0),cy:BODY.cy+(v.bodyY??0)}}
function bodyPosition(el,v){const b=bodyGeometry(v);el.style.width=b.w/W*100+'%';el.style.height=b.h/H*100+'%';el.style.left=(b.cx-b.w/2)/W*100+'%';el.style.top=(b.cy-b.h/2)/H*100+'%'}
function layerKeys(l=layer){return l==='name'?['nameX','nameY','nameZoom']:l==='body'?['bodyX','bodyY','bodyZoom']:['x','y','zoom']}
function maxZoom(l=layer){return l==='name'?Math.min(4,W/nameGeometry(current,{...crop,nameZoom:1}).w):l==='body'?Math.min(4,W/BODY.w,H/BODY.h):5}
function nameGeometry(item,v){const scale=Math.min(1,1440/item.nameWidth,176/item.nameHeight)*.9*(v.nameZoom??1);return {w:item.nameWidth*scale,h:item.nameHeight*scale,cx:W/2+(v.nameX??0),cy:210+(v.nameY??0)}}
function namePosition(img,item,v=defaults()){const n=nameGeometry(item,v);img.style.width=n.w/W*100+'%';img.style.height=n.h/H*100+'%';img.style.left=(n.cx-n.w/2)/W*100+'%';img.style.top=(n.cy-n.h/2)/H*100+'%'}
function nameSource(item,v){return `/api/name/${item.id}/${v.ink||'original'}.png?v=bold3`}
const palettes={rainbow:['#d40b3f','#dd5300','#ba9000','#148438','#008cb6','#244bc9','#9521b6'],prism:['#621bb3','#084ee0','#009c95','#719500','#de7200','#df1260','#671bbe'],aurora:['#332aa8','#087cd0','#009577','#4e9835','#067da5','#7725ba'],sunset:['#6d169c','#c3137d','#e72b45','#d26d00','#ba9300','#c82b68'],electric:['#1534c7','#7e1acb','#d70e91','#194cdd','#008e9d','#1a36b5']};
Object.assign(palettes,{"rosewood": ["#6b2445", "#b34269", "#d78076", "#8e3c58"], "ocean": ["#193b80", "#167a9b", "#249a96", "#285488"], "forest": ["#244d3b", "#537a32", "#a08228", "#356455"], "copper": ["#6b3428", "#b45e32", "#d39545", "#864335"], "berry": ["#422466", "#85428d", "#bc497c", "#633488"], "ribbon": ["#275b9a", "#b74479", "#275b9a", "#b74479", "#275b9a", "#b74479", "#275b9a"]});
const imageCache=new Map(),tintCache=new Map();function loadImage(src){if(imageCache.size>40)imageCache.delete(imageCache.keys().next().value);if(!imageCache.has(src))imageCache.set(src,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>{imageCache.delete(src);reject(Error('Artwork could not load. Please try again.'))};im.src=src}));return imageCache.get(src)}
async function inkImage(id,ink){if(tintCache.size>80)tintCache.delete(tintCache.keys().next().value);const key=id+'/'+ink;if(!tintCache.has(key))tintCache.set(key,(async()=>{const source=await loadImage(`/minotecurator/assets/names/${id}.webp?v=trim3`);if(ink==='original')return source;const c=document.createElement('canvas');c.width=source.width;c.height=source.height;const ctx=c.getContext('2d');ctx.drawImage(source,0,0);ctx.globalCompositeOperation='source-in';const g=ctx.createLinearGradient(0,0,c.width,0);palettes[ink].forEach((color,i)=>g.addColorStop(i/(palettes[ink].length-1),color));ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);return loadImage(c.toDataURL())})().catch(e=>{tintCache.delete(key);throw e}));return tintCache.get(key)}
const nameObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){nameObserver.unobserve(e.target);resolveName(e.target)}}),{rootMargin:'400px'});
function resolveName(img){const src=img.dataset.requested,m=src?.match(/\/api\/name\/(\d+)\/(\w+)\.png/);if(!m||img.dataset.loadingName===src)return;const attempt=Number(img.dataset.nameRetry||0);img.dataset.loadingName=src;img.alt='';inkImage(m[1],m[2]).then(im=>{if(img.dataset.requested===src){img.src=im.src;delete img.dataset.nameRetry}}).catch(()=>{if(img.dataset.requested!==src)return;delete img.dataset.loadingName;if(attempt<2){img.dataset.nameRetry=String(attempt+1);setTimeout(()=>{if(img.isConnected||img.id==='name')resolveName(img)},250*2**attempt)}else{img.alt='Name unavailable—will retry automatically';delete img.dataset.nameRetry;if(img.isConnected&&img.id!=='name')nameObserver.observe(img)}}).finally(()=>{if(img.dataset.loadingName===src)delete img.dataset.loadingName})}
function observeNames(root){if(root.nodeType!==Node.ELEMENT_NODE)return;const names=root.matches?.('img.name')?[root]:root.querySelectorAll?.('img.name')||[];for(const img of names)if(img.id!=='name'&&img.dataset.requested?.startsWith('/api/name/'))nameObserver.observe(img)}
new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(observeNames))).observe(grid,{childList:true,subtree:true});
function setSource(img,src){if(img.dataset.requested===src)return;img.dataset.requested=src;delete img.dataset.loadingName;delete img.dataset.nameRetry;if(src.startsWith('/api/name/')){if(img.id==='name')resolveName(img);else if(img.isConnected)nameObserver.observe(img)}else img.src=src}
grid.addEventListener('error',event=>{const img=event.target;if(!(img instanceof HTMLImageElement)||img.dataset.requested?.startsWith('/api/name/'))return;const attempt=Number(img.dataset.assetRetry||0);if(attempt>=2)return;img.dataset.assetRetry=String(attempt+1);const src=img.dataset.requested;setTimeout(()=>{if(!img.isConnected||img.dataset.requested!==src)return;const retryUrl=new URL(src,location.href);retryUrl.searchParams.set('_retry',String(attempt+1));img.loading='eager';img.src=retryUrl.href},250*2**attempt)},true);
grid.addEventListener('load',event=>{if(event.target instanceof HTMLImageElement)delete event.target.dataset.assetRetry},true);
function isEdited(id){const v=edits[id];return v&&Object.entries(defaults()).some(([key,value])=>typeof value==='number'?Math.abs((v[key]??value)-value)>.001:(v[key]??value)!==value)}
function image(src,cls){const img=document.createElement('img');img.className=cls;img.loading='lazy';img.decoding='async';img.alt='';setSource(img,src);return img}
function tile(item){const b=document.createElement('article');b.className='tile';b.tabIndex=0;b.setAttribute('role','button');b.dataset.id=item.id;b.setAttribute('aria-label',`Edit card ${item.id}: ${item.name}`);const c=document.createElement('div');c.className='card';if(item.available){const art=image(`/minotecurator/assets/thumbs/${item.id}.webp`,'art');position(art,item,edits[item.id]||defaults());c.append(art,image('/minotecurator/assets/strip.png','strip'));const v={...defaults(),...edits[item.id]};if(v.body){const body=image(bodySource(item.id),'body-box');bodyPosition(body,v);c.append(body)}const name=image(nameSource(item,v),'name');namePosition(name,item,v);c.append(name);maskName(name);b.onclick=e=>{if(current?.id!==item.id){const selectedLayer=layerAt(e,c,item,{...defaults(),...edits[item.id]});open(item.id);layer=selectedLayer;render()}else if(carousel)centerCarouselCard(item.id)};b.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target===b){e.preventDefault();open(item.id)}}}else{c.classList.add('unavailable');const a=document.createElement('strong');a.textContent=String(item.id).padStart(4,'0');const s=document.createElement('span');s.textContent='Artwork unavailable';c.append(a,s);b.setAttribute('aria-disabled','true');b.tabIndex=-1}applySuit(c,item.id);b.append(c);const cap=document.createElement('div');cap.className='caption';const id=document.createElement('span');id.className='id';id.textContent=String(item.id).padStart(4,'0');const label=document.createElement('span');label.className='label';label.textContent=item.name;const mark=document.createElement('span');mark.className='edited-mark';mark.textContent=isEdited(item.id)?'Edited':'';cap.append(id,label,mark);b.append(cap);return b}
function drawGrid(){nameObserver.disconnect();if(current){persist().catch(()=>{});parkEditor();current=null;toolbar.hidden=true}const q=$('#search').value.trim().toLowerCase();filtered=collection.filter(i=>tagFilter.quick||matchesAppearanceFilters(edits[i.id])&&tagFilter.matches(i.id)&&(!q||i.name.toLowerCase().includes(q)||String(i.id).includes(q)));grid.replaceChildren(...filtered.map(tile));$('#empty').hidden=filtered.length>0;const missing=collection.filter(i=>!i.available).length;$('#count').textContent=`${filtered.length.toLocaleString()} cards${missing?' · '+missing+' artworks unavailable locally':''}`;requestAnimationFrame(()=>{updateCarouselNav();updateQuickTags();})}
function refreshTile(){const tile=grid.querySelector(`[data-id="${current.id}"]`);if(tile){const img=tile.querySelector('.art');if(img)position(img,current,crop);tile.querySelector('.edited-mark').textContent=isEdited(current.id)?'Edited':''}}
function render(){maskName($('#name'));applySuit($('#stage'),current.id);metadataSidebar.render();cancelButton.hidden=!entryCrop||!Object.keys(defaults()).some(key=>crop[key]!==entryCrop[key]);position($('#art'),current,crop);namePosition($('#name'),current,crop);setSource($('#name'),nameSource(current,crop));namePosition(nameFrame,current,crop);setSource(bodyImage,bodySource(current.id));bodyPosition(bodyImage,crop);bodyPosition(bodyFrame,crop);bodyImage.hidden=!crop.body;$('#bodyToggle').checked=crop.body;const key=layerKeys()[2];$('#zoom').min=layer==='artwork'?1:.25;$('#zoom').max=maxZoom();$('#zoom').value=crop[key];$('#zoomValue').textContent=Math.round(crop[key]*100)+'%';$('#sizeLabel').textContent=layer==='name'?'Name size':layer==='body'?'Body box size':'Artwork size';$('#reset').textContent=layer==='name'?'Reset name':layer==='body'?'Reset box':'Reset crop';$('#undo').disabled=!history.length;stageWrap.classList.toggle('name-mode',layer!=='artwork');nameFrame.hidden=layer!=='name';bodyFrame.hidden=layer!=='body'||!crop.body;document.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.layer===layer));document.querySelectorAll('[data-ink]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.ink===crop.ink))}
function remember(){history.push({...crop});if(history.length>40)history.shift();future=[]}
function travelHistory(from,to){
 if(!current||!from.length)return;
 to.push({...crop});if(to.length>40)to.shift();
 crop=from.pop();change(crop);persist().catch(()=>{});
}
function undo(){travelHistory(history,future)}
function redo(){travelHistory(future,history)}
async function post(url,data){const r=await studioRequest(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!r.ok){const result=await r.json();const e=Error(result.error||'Could not save');e.status=r.status;e.latest=result.latest;throw e}return r}
function persist(){clearTimeout(timer);timer=null;if(!current)return Promise.resolve();const id=current.id,v={...crop},serial=editSerial[id]||0;edits[id]=v;refreshTile();if(conflicts.has(id))return Promise.reject(Error('Resolve the change from another user before saving.'));if(!pending.has(id))return saveChain;$('#saveStatus').textContent='Saving for everyone…';saveChain=saveChain.catch(()=>{}).then(async()=>{if(conflicts.has(id))throw Error('Resolve the change from another user before saving.');const r=await post('/api/save',{id,...v,_revision:revisions[id]||0}),saved=await r.json();revisions[id]=saved._revision;if((editSerial[id]||0)===serial){pending.delete(id);edits[id]=saved;if(current?.id===id){crop={...crop,...saved};$('#saveStatus').textContent='Saved for everyone'}}}).catch(e=>{if(e.status===409)conflicts.set(id,e.latest);if(current?.id===id){$('#saveStatus').textContent='Draft not saved';$('#error').textContent=e.message;$('#useShared').hidden=!conflicts.has(id)}throw e});saveChain.catch(()=>{});return saveChain}
function change(v){crop=clamp(current,{...crop,...v});pending.add(current.id);editSerial[current.id]=(editSerial[current.id]||0)+1;render();edits[current.id]={...crop};refreshTile();$('#saveStatus').textContent='Unsaved changes';clearTimeout(timer);timer=setTimeout(()=>persist().catch(()=>{}),300)}
const stageWrap=$('#stageWrap');const parking=document.createElement('div');parking.hidden=true;document.body.append(parking);parking.append(stageWrap);
const toolbar=document.createElement('section');toolbar.className='inline-toolbar';toolbar.hidden=true;toolbar.setAttribute('aria-label','Selected card crop controls');
const selectedLabel=document.createElement('div');selectedLabel.className='selected-label';selectedLabel.append($('#number'),$('#title'));
const zoomGroup=document.createElement('div');zoomGroup.className='inline-zoom';zoomGroup.append($('.zoom-label'),$('#zoom'));
const sizeSteps=document.createElement('span');sizeSteps.className='size-steps';
for(const [text,delta,label] of [['−',-.01,'Decrease size'],['+',.01,'Increase size']]){const button=document.createElement('button');button.type='button';button.textContent=text;button.setAttribute('aria-label',label);button.onclick=()=>{if(!current)return;remember();const key=layerKeys()[2];change({[key]:Math.max(Number($('#zoom').min),Math.min(Number($('#zoom').max),Math.round((crop[key]+delta)*1000)/1000))});persist().catch(()=>{});};sizeSteps.append(button);}
zoomGroup.querySelector('#zoom').after(sizeSteps);

const saveGroup=document.createElement('div');saveGroup.className='inline-save';saveGroup.append($('#saveStatus'),$('#error'));
const cancelButton=document.createElement('button');cancelButton.id='cancel';cancelButton.textContent='Cancel';
const downloadIcon='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5"/></svg>';
$('#export').innerHTML=downloadIcon;$('#export').setAttribute('aria-label','Download card PNG');$('#export').title='Download card PNG';
toolbar.append(selectedLabel,zoomGroup,$('#reset'),$('#undo'),saveGroup,cancelButton,$('#close'),$('#export'));document.body.append(toolbar);
let layer='artwork',entryCrop=null,cancelling=false;
const sidebar=document.createElement('section');sidebar.className='layer-sidebar';sidebar.hidden=true;sidebar.setAttribute('aria-label','Card appearance');sidebar.innerHTML=`<button id="centerName">Center name on strip</button><div class="ink-heading">Name ink</div><div class="ink-options"><button data-ink="original" aria-pressed="true"><i style="background:#454545"></i>Original pen</button><button data-ink="rainbow"><i class="rainbow"></i>Rainbow</button><button data-ink="prism"><i class="prism"></i>Prism</button><button data-ink="aurora"><i class="aurora"></i>Aurora</button><button data-ink="sunset"><i class="sunset"></i>Sunset</button><button data-ink="electric"><i class="electric"></i>Electric</button><button data-ink="rosewood"><i class="rosewood"></i>Rosewood</button><button data-ink="ocean"><i class="ocean"></i>Ocean</button><button data-ink="forest"><i class="forest"></i>Forest</button><button data-ink="copper"><i class="copper"></i>Copper</button><button data-ink="berry"><i class="berry"></i>Berry</button><button data-ink="ribbon"><i class="ribbon"></i>Ribbon</button></div><div class="body-control"><label><input id="bodyToggle" type="checkbox"> Add notebook body box</label><img src="/minotecurator/assets/body.png" alt="Notebook body box preview"></div>`;document.body.append(sidebar);
const sizeText=$('.zoom-label');sizeText.firstChild.textContent='';const sizeLabel=document.createElement('span');sizeLabel.id='sizeLabel';sizeLabel.textContent='Artwork size';sizeText.prepend(sizeLabel);
const bodyImage=image('/minotecurator/assets/body-crop.png','body-box');bodyImage.hidden=true;$('#stage').insertBefore(bodyImage,$('#name'));
const nameFrame=document.createElement('div');nameFrame.className='name-frame';nameFrame.hidden=true;nameFrame.innerHTML=['nw','ne','sw','se','n','e','s','w'].map(c=>`<button class="handle ${c}" data-corner="${c}" aria-label="Resize name from ${c} corner"></button>`).join('');stageWrap.append(nameFrame);
const bodyFrame=document.createElement('div');bodyFrame.className='body-frame';bodyFrame.hidden=true;bodyFrame.innerHTML=['nw','ne','sw','se','n','e','s','w'].map(c=>`<button class="handle ${c}" data-corner="${c}" aria-label="Resize body box from ${c} corner"></button>`).join('');stageWrap.append(bodyFrame);
sidebar.querySelectorAll('[data-ink]').forEach(b=>b.onclick=()=>{remember();change({ink:b.dataset.ink});persist().catch(()=>{})});$('#centerName').onclick=()=>{remember();change({nameX:0,nameY:0});persist().catch(()=>{})};$('#bodyToggle').onchange=e=>{remember();if(e.target.checked)layer='body';else if(layer==='body')layer='artwork';change({body:e.target.checked});persist().catch(()=>{})};
const tagFilter=createTagFilter(()=>{drawGrid();updateQuickTags();},{allowQuick:true});
const metadataSidebar=createMetadataSidebar(sidebar,()=>current,metadata=>{
 const wasActive=tagFilter.active;tagFilter.update(metadata);updateQuickTags();
 if(wasActive){
  const q=$('#search').value.trim().toLowerCase();
  const next=collection.filter(i=>matchesAppearanceFilters(edits[i.id])&&tagFilter.matches(i.id)&&(!q||i.name.toLowerCase().includes(q)||String(i.id).includes(q)));
  if(next.length!==filtered.length||next.some((item,i)=>item.id!==filtered[i]?.id))drawGrid();
 }
});
function parkEditor(){parking.append(stageWrap);document.body.classList.remove('editing');sidebar.hidden=true}
async function open(id){
 if(current?.id===id){if(carousel)centerCarouselCard(id);return;}
 if(current){persist().catch(()=>{});const old=grid.querySelector(`[data-id="${current.id}"]`);parkEditor();if(old)old.replaceWith(tile(current))}
 current=collection.find(i=>i.id===id);if(!current?.available){current=null;return}
 crop=clamp(current,edits[id]||defaults());entryCrop={...crop};history=[];future=[];$('#number').textContent='CARD '+String(id).padStart(4,'0');$('#title').textContent=current.name;$('#art').className='art';$('#art').src=`/minotecurator/assets/thumbs/${id}.webp`;const full=new Image();full.onload=()=>{if(current?.id===id)$('#art').src=full.src};full.src=`/minotecurator/assets/originals/${id}.webp`;$('#art').alt=current.name;setSource($('#name'),nameSource(current,crop));namePosition($('#name'),current);$('#saveStatus').textContent='Saved for everyone';$('#error').textContent=conflicts.has(id)?'This card changed in another user. Your draft is preserved.':'';$('#useShared').hidden=!conflicts.has(id);
 const target=grid.querySelector(`[data-id="${id}"]`);target.classList.add('active-tile');target.querySelector('.card').replaceWith(stageWrap);toolbar.hidden=false;sidebar.hidden=false;document.body.classList.add('editing');render();requestAnimationFrame(()=>{updateCarouselLayout();if(carousel){if(current?.id===id)centerCarouselCard(id);return;}const r=target.getBoundingClientRect(),top=document.querySelector('header').getBoundingClientRect().bottom+22,bottom=toolbar.getBoundingClientRect().top-22;if(r.top<top||r.bottom>bottom)window.scrollBy({top:(r.top+r.bottom-top-bottom)/2,behavior:'instant'})});
}
$('#close').textContent='Done';$('#close').setAttribute('aria-label','Done');$('#close').onclick=async()=>{
 if(cancelling)return;
 cancelling=true;grid.inert=sidebar.inert=toolbar.inert=document.querySelector('header').inert=true;
 try{
  if(current){
   await persist();
   const old=grid.querySelector(`[data-id="${current.id}"]`);parkEditor();if(old)old.replaceWith(tile(current));current=null;entryCrop=null;
  }
  toolbar.hidden=true;if(bodyFilter||inkFilter||tagFilter.active)drawGrid();
 }catch(error){$('#error').textContent=error.message;}
 finally{cancelling=false;grid.inert=sidebar.inert=toolbar.inert=document.querySelector('header').inert=false;}
};
// Capture before a focused gallery tile can reopen the card on Enter.
document.addEventListener('keydown',e=>{if(document.querySelector('#exportOptions[open]'))return;
 if(document.querySelector('#exportOptions[open]'))return;
 if(e.key!=='Enter'||!current||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
 if(e.target.isContentEditable||e.target.matches('textarea,input:not([type=range]):not([type=checkbox])'))return;
 e.preventDefault();e.stopImmediatePropagation();
 if(!e.repeat&&!cancelling)$('#close').click();
},true);
cancelButton.onclick=async()=>{
 if(!current||!entryCrop||cancelling)return;
 const id=current.id,original={...entryCrop};
 cancelling=true;clearTimeout(timer);timer=null;
 // Freeze selection while the rollback joins the existing save queue. This
 // prevents a late autosave from restoring edits that were just cancelled.
 grid.inert=sidebar.inert=toolbar.inert=document.querySelector('header').inert=true;
 try{
  if(conflicts.has(id))throw Error('Load the saved version before cancelling; another user changed this card.');
  const changed=Object.keys(defaults()).some(key=>crop[key]!==original[key]);
  if(changed){change(original);clearTimeout(timer);timer=null;await persist();}
  else await saveChain;
  if(current?.id===id){
   const old=grid.querySelector(`[data-id="${id}"]`);parkEditor();if(old)old.replaceWith(tile(current));
   current=null;entryCrop=null;history=[];future=[];toolbar.hidden=true;if(bodyFilter||inkFilter||tagFilter.active)drawGrid();
  }
 }catch(error){$('#error').textContent=error.message;}
 finally{cancelling=false;grid.inert=sidebar.inert=toolbar.inert=document.querySelector('header').inert=false;}
};
$('#zoom').addEventListener('pointerdown',remember);$('#zoom').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key))remember()});$('#zoom').oninput=e=>change({...crop,[layerKeys()[2]]:+e.target.value});$('#zoom').onchange=()=>persist().catch(()=>{});
$('#reset').onclick=()=>{remember();change(layer==='name'?{nameZoom:1,nameX:0,nameY:0}:layer==='body'?{bodyZoom:1,bodyX:0,bodyY:0}:{zoom:1,x:0,y:0});persist().catch(()=>{})};$('#undo').onclick=undo;
function navigate(direction){const list=filtered.filter(i=>i.available),i=list.findIndex(c=>c.id===current.id);if(i+direction>=0&&i+direction<list.length)open(list[i+direction].id)}$('#prev').onclick=()=>navigate(-1);$('#next').onclick=()=>navigate(1);
$('#search').oninput=drawGrid;
// 0 = all, 1 = include, 2 = exclude. Both filters can be combined.
function matchesAppearanceFilters(value={}){
 const hasBody=value.body===true,hasColor=(value.ink??'original')!=='original';
 return (!bodyFilter||(bodyFilter===1?hasBody:!hasBody))&&(!inkFilter||(inkFilter===1?hasColor:!hasColor));
}
function cycleAppearanceFilter(kind){
 const isBody=kind==='body';
 if(isBody)bodyFilter=(bodyFilter+1)%3;else inkFilter=(inkFilter+1)%3;
 const state=isBody?bodyFilter:inkFilter,button=$(isBody?'#bodyFilter':'#inkFilter');
 const label=isBody?'Body box':'Colored names';
 button.textContent=state===1?label+' only':state===2?'Exclude '+label.toLowerCase():label;
 button.dataset.state=String(state);
 button.setAttribute('aria-pressed',String(state!==0));
 button.setAttribute('aria-label',`${label}: ${['all cards','matching cards only','matching cards excluded'][state]}`);
 button.title=['Show matching cards','Exclude matching cards','Show all cards'][state];
 drawGrid();
}
$('#bodyFilter').onclick=()=>cycleAppearanceFilter('body');
$('#inkFilter').onclick=()=>cycleAppearanceFilter('ink');

function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)}
$('#backup').onclick=()=>download(new Blob([JSON.stringify({version:1,edits},null,2)],{type:'application/json'}),'mi-note-card-edits.json');
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
async function withDPI(blob){const data=new Uint8Array(await blob.arrayBuffer()),chunk=new Uint8Array(21),view=new DataView(chunk.buffer);view.setUint32(0,9);chunk.set([112,72,89,115],4);view.setUint32(8,31496);view.setUint32(12,31496);chunk[16]=1;view.setUint32(17,crc32(chunk.slice(4,17)));return new Blob([data.slice(0,33),chunk,data.slice(33)],{type:'image/png'})}
async function exportCard(item,v,kind='full'){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
 const full=kind==='full',overlays=kind==='overlays';
 if(full){ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);}
 if(full||kind==='art'){const art=await loadImage(`/minotecurator/assets/originals/${item.id}.webp`),g=geometry(item,v);ctx.drawImage(art,(W-g.w)/2+v.x,(H-g.h)/2+v.y,g.w,g.h);}
 const strip=await loadImage('/minotecurator/assets/strip.png');
 if(full||overlays||kind==='name-box'||kind==='boxes')ctx.drawImage(strip,0,0,W,H);
 if(v.body&&(full||overlays||['body-box','boxes','body-text','texts'].includes(kind))){
  const textOnly=kind==='body-text'||kind==='texts',paperOnly=kind==='body-box'||kind==='boxes';
  const source=bodySource(item.id),body=await loadImage(paperOnly?'/minotecurator/assets/body-crop.png':source),b=bodyGeometry(v);
  if(!textOnly)ctx.drawImage(body,b.cx-b.w/2,b.cy-b.h/2,b.w,b.h);
  else if(source.includes('/body-text/')){
   const ink=document.createElement('canvas');ink.width=body.naturalWidth;ink.height=body.naturalHeight;const pen=ink.getContext('2d',{willReadFrequently:true});pen.drawImage(body,0,0);const pixels=pen.getImageData(0,0,ink.width,ink.height),d=pixels.data;
   // Printed ink is dark neutral/purple; exclude cyan rules and the paper's outer edge.
   for(let y=0;y<ink.height;y++)for(let x=0;x<ink.width;x++){const i=(y*ink.width+x)*4,max=Math.max(d[i],d[i+1],d[i+2]);const interior=x>ink.width*.055&&x<ink.width*.945&&y>ink.height*.09&&y<ink.height*.92&&d[i+1]<=d[i]+18;d[i+3]=interior?Math.round(d[i+3]*Math.max(0,Math.min(1,(195-max)/55))):0;}
   pen.putImageData(pixels,0,0);ctx.drawImage(ink,b.cx-b.w/2,b.cy-b.h/2,b.w,b.h);
  }
 }
 if(full||overlays||kind==='name'||kind==='texts'){const name=await inkImage(item.id,v.ink);drawMaskedName(ctx,name,strip,nameGeometry(item,v));}
 if(full||overlays||kind==='icons')await exportSuit(ctx,item.id,loadImage);
 const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw Error('Export failed');return withDPI(blob);
}
const openExportOptions=createExportOptions({render:exportCard,download});
$('#export').onclick=()=>{if(current)openExportOptions(current,{...crop});};
let gesture=null;function point(e){const r=$('#stage').getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}}
function begin(e,corner){
 if(e.button!==0)return;if(!corner){layer=layerAt(e,$('#stage'),current,crop);render();}
 e.preventDefault();e.stopPropagation();remember();
 const p=point(e),[xkey,ykey]=layerKeys(),cx=layer==='body'?BODY.cx:W/2,cy=layer==='body'?BODY.cy:layer==='name'?210:H/2;
 const center={x:cx+crop[xkey],y:cy+crop[ykey]};
 const n=layer==='body'?bodyGeometry(crop):nameGeometry(current,crop);
 const bounds=layer==='artwork'?{cx:W/2,cy:H/2,w:W,h:H}:n;
 const anchor=corner?{x:corner.includes('w')?bounds.cx+bounds.w/2:corner.includes('e')?bounds.cx-bounds.w/2:center.x,
 y:corner.includes('n')?bounds.cy+bounds.h/2:corner.includes('s')?bounds.cy-bounds.h/2:center.y}:null;
 gesture={pointer:e.pointerId,start:p,crop:{...crop},corner,anchor,center,layer};e.currentTarget.setPointerCapture(e.pointerId);
}
function move(e){
 if(!gesture||gesture.pointer!==e.pointerId)return;
 const p=point(e),g=gesture,ns=g.layer!=='artwork',[xkey,ykey,zkey]=layerKeys(g.layer);
 if(!g.corner){change({...g.crop,[xkey]:g.crop[xkey]+p.x-g.start.x,[ykey]:g.crop[ykey]+p.y-g.start.y});return;}
 const a=e.altKey?g.center:g.anchor,dx=g.start.x-a.x,dy=g.start.y-a.y;
 let ratio;
 if(g.corner==='e'||g.corner==='w')ratio=Math.abs(dx)>.001?(p.x-a.x)/dx:1;
 else if(g.corner==='n'||g.corner==='s')ratio=Math.abs(dy)>.001?(p.y-a.y)/dy:1;
 else ratio=((p.x-a.x)*dx+(p.y-a.y)*dy)/Math.max(.000001,dx*dx+dy*dy);
 const z=Math.max(ns?.25:1,Math.min(maxZoom(g.layer),g.crop[zkey]*ratio));ratio=z/g.crop[zkey];
 const cx=g.layer==='body'?BODY.cx:W/2,cy=g.layer==='body'?BODY.cy:ns?210:H/2;
 // One zoom scalar controls both dimensions; Alt retains the original center.
 change({...g.crop,[zkey]:z,[xkey]:e.altKey?g.crop[xkey]:a.x+(cx+g.crop[xkey]-a.x)*ratio-cx,
 [ykey]:e.altKey?g.crop[ykey]:a.y+(cy+g.crop[ykey]-a.y)*ratio-cy});
}

function end(e){if(gesture&&e.pointerId===gesture.pointer){gesture=null;persist().catch(()=>{})}}
for(const edge of ['n','e','s','w']){
 const handle=document.createElement('button');handle.className='handle '+edge;handle.dataset.corner=edge;
 handle.setAttribute('aria-label','Resize artwork from '+({n:'top',e:'right',s:'bottom',w:'left'}[edge])+' edge');stageWrap.append(handle);
}
bodyFrame.addEventListener('pointerdown',e=>begin(e,null));bodyFrame.addEventListener('pointermove',move);bodyFrame.addEventListener('pointerup',end);bodyFrame.addEventListener('pointercancel',end);nameFrame.addEventListener('pointerdown',e=>begin(e,null));nameFrame.addEventListener('pointermove',move);nameFrame.addEventListener('pointerup',end);nameFrame.addEventListener('pointercancel',end);const stage=$('#stage');stage.addEventListener('pointerdown',e=>begin(e,null));stage.addEventListener('pointermove',move);stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);document.querySelectorAll('#stageWrap > .handle, .name-frame .handle, .body-frame .handle').forEach(h=>{h.addEventListener('pointerdown',e=>begin(e,h.dataset.corner));h.addEventListener('pointermove',move);h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end)});
stage.addEventListener('wheel',e=>{e.preventDefault();remember();const key=layerKeys()[2];change({[key]:crop[key]*Math.exp(-e.deltaY*.0015)})},{passive:false});
document.addEventListener('keydown',e=>{if(document.querySelector('#exportOptions[open]'))return;
 if(!current||e.altKey||!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z')return;
 const target=e.target,typing=target.isContentEditable||target.tagName==='TEXTAREA'||(target.tagName==='INPUT'&&!['range','checkbox'].includes(target.type));
 if(typing)return;
 e.preventDefault();if(e.shiftKey)redo();else undo();
});
document.addEventListener('keydown',e=>{if(document.querySelector('#exportOptions[open]'))return;if(!current||['INPUT','TEXTAREA','BUTTON','SELECT'].includes(e.target.tagName))return;const d=e.shiftKey?20:4;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();remember();const [x,y]=layerKeys();change({[x]:crop[x]+(e.key==='ArrowLeft'?-d:e.key==='ArrowRight'?d:0),[y]:crop[y]+(e.key==='ArrowUp'?-d:e.key==='ArrowDown'?d:0)})}});
window.addEventListener('beforeunload',e=>{if(pending.size){e.preventDefault();e.returnValue='Your draft has not finished saving.'}});
const sharedButton=document.createElement('button');sharedButton.id='useShared';sharedButton.textContent='Load saved version';sharedButton.hidden=true;saveGroup.append(sharedButton);sharedButton.onclick=()=>{if(!current)return;const id=current.id,v=conflicts.get(id);if(!v)return;conflicts.delete(id);pending.delete(id);edits[id]=v;revisions[id]=v._revision||0;crop=clamp(current,v);entryCrop={...crop};history=[];future=[];render();refreshTile();sharedButton.hidden=true;$('#error').textContent='';$('#saveStatus').textContent='Loaded saved version'};
const syncLabel=document.createElement('span');syncLabel.className='sync-label';syncLabel.textContent='Connecting…';document.querySelector('.tools').prepend(syncLabel);
Promise.all([studioRequest('/api/collection').then(r=>{if(!r.ok)throw Error();return r.json()}),studioRequest('/api/edits').then(r=>{if(!r.ok)throw Error();return r.json()})]).then(([items,saved])=>{collection=items;startSuits(items);edits=saved;for(const [id,v] of Object.entries(saved))revisions[id]=v._revision||0;drawGrid();syncLabel.textContent='Synced for everyone';subscribeEdits(refreshShared)}).catch(()=>{$('#count').textContent='Unable to load the studio. Refresh to try again.';syncLabel.textContent='Connection unavailable'});
if(document.modelContext?.registerTool){const lifecycle=new AbortController();for(const tool of [{name:'read_card_crop',description:'Read saved artwork crop for a card number.',inputSchema:{type:'object',properties:{id:{type:'integer'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:true},execute:({id})=>{const item=collection.find(i=>i.id===id);if(!item)throw Error('Unknown card');return {id,name:item.name,available:item.available,crop:edits[id]||defaults()}}},{name:'set_card_crop',description:'Open a card and save its artwork crop. Zoom is proportional from 1 to 5; x and y are offsets in export pixels.',inputSchema:{type:'object',properties:{id:{type:'integer'},zoom:{type:'number',minimum:1,maximum:5},x:{type:'number'},y:{type:'number'}},required:['id','zoom','x','y'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async({id,zoom,x,y})=>{if(!collection.find(i=>i.id===id&&i.available)||![zoom,x,y].every(Number.isFinite)||zoom<1||zoom>5)throw Error('Invalid card or crop');await open(id);remember();change({...crop,zoom,x,y});await persist();return {id,crop}}}]){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort())}

// Backups remain compatible; imports use shared revision checks.
$('#import').onclick=()=>$('#importFile').click();
$('#importFile').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 const button=$('#import');button.disabled=true;
 try{
  if(pending.size){await persist();await saveChain;if(pending.size)throw Error('Save or resolve your pending edits before importing.')}
  const data=JSON.parse(await file.text());
  const r=await post('/api/import',{...data,revisions});edits=await r.json();
  revisions={};for(const [id,v] of Object.entries(edits))revisions[id]=v._revision||0;
  conflicts.clear();pending.clear();if(current){parkEditor();current=null;toolbar.hidden=true}
  drawGrid();syncLabel.textContent='Edits shared with everyone';
 }catch(error){syncLabel.textContent=error.message}
 finally{button.disabled=false;e.target.value=''}
};


function layerAt(event,element,item,value){
 const r=element.getBoundingClientRect(),x=(event.clientX-r.left)/r.width*W,y=(event.clientY-r.top)/r.height*H;
 const inside=b=>x>=b.cx-b.w/2&&x<=b.cx+b.w/2&&y>=b.cy-b.h/2&&y<=b.cy+b.h/2;
 if(inside(nameGeometry(item,value)))return 'name';
 if(value.body&&inside(bodyGeometry(value)))return 'body';
 return 'artwork';
}
const guideToggle=$('#guideToggle');
const cursorGuides=document.createElement('div');
cursorGuides.className='cursor-guides';cursorGuides.hidden=true;
cursorGuides.setAttribute('aria-hidden','true');document.body.append(cursorGuides);
let guidesEnabled=false,guidePosition=null;
function updateCursorGuides(event){
 if(event.pointerType==='touch')return;
 guidePosition={x:event.clientX,y:event.clientY};
 if(!guidesEnabled)return;
 cursorGuides.style.setProperty('--guide-x',guidePosition.x+'px');
 cursorGuides.style.setProperty('--guide-y',guidePosition.y+'px');
 cursorGuides.hidden=false;
}
guideToggle.onclick=()=>{
 guidesEnabled=!guidesEnabled;
 guideToggle.setAttribute('aria-pressed',String(guidesEnabled));
 cursorGuides.hidden=true;
 if(guidesEnabled&&guidePosition)updateCursorGuides({clientX:guidePosition.x,clientY:guidePosition.y});
};
document.addEventListener('pointermove',updateCursorGuides,{passive:true,capture:true});
document.addEventListener('pointerdown',updateCursorGuides,{passive:true,capture:true});
function hideCursorGuides(){cursorGuides.hidden=true;guidePosition=null;}
document.documentElement.addEventListener('pointerleave',hideCursorGuides);
window.addEventListener('blur',hideCursorGuides);

const viewToggle=$('#viewToggle'),carouselNav=$('#carouselNav');
let carousel=false;
const galleryZoom=document.createElement('div');galleryZoom.className='gallery-zoom';galleryZoom.setAttribute('role','group');galleryZoom.setAttribute('aria-label','Gallery zoom');
const zoomOut=document.createElement('button'),zoomIn=document.createElement('button');
zoomOut.textContent='−';zoomIn.textContent='+';
zoomOut.setAttribute('aria-label','Zoom out gallery');zoomIn.setAttribute('aria-label','Zoom in gallery');
galleryZoom.append(zoomOut,zoomIn);viewToggle.before(galleryZoom);
let galleryColumns=null;
function currentColumns(){return galleryColumns??Math.max(2,Math.min(12,getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length));}
function updateGalleryZoom(){const count=currentColumns();zoomOut.disabled=count>=12;zoomIn.disabled=count<=2;zoomOut.title=`Zoom out · ${Math.min(12,count+1)} columns`;zoomIn.title=`Zoom in · ${Math.max(2,count-1)} columns`;}
function galleryVisibleBounds(){
 const top=document.querySelector('header').getBoundingClientRect().bottom+12;
 const bottom=Math.min(window.innerHeight,toolbar.hidden?window.innerHeight:toolbar.getBoundingClientRect().top)-12;
 return {top,bottom};
}
function changeGalleryColumns(delta){
 const card=!carousel&&current?grid.querySelector(`[data-id="${current.id}"] .card`):null;
 const before=card?.getBoundingClientRect(),bounds=galleryVisibleBounds();
 const keepVisible=before&&before.bottom>bounds.top&&before.top<bounds.bottom&&before.right>0&&before.left<window.innerWidth;
 galleryColumns=Math.max(2,Math.min(12,currentColumns()+delta));
 grid.style.setProperty('--gallery-columns',galleryColumns);grid.classList.add('custom-columns');
 updateGalleryZoom();
 // Fit captions before measuring: hiding long names changes every row's height.
 cancelAnimationFrame(captionFitFrame);fitCaptions();queueCarouselLayout();
 if(keepVisible){
  const after=card.getBoundingClientRect(),visible=galleryVisibleBounds();
  const target=Math.max(visible.top,Math.min(before.top,visible.bottom-after.height));
  window.scrollBy({top:after.top-target,behavior:'instant'});
 }
}
zoomOut.onclick=()=>changeGalleryColumns(1);zoomIn.onclick=()=>changeGalleryColumns(-1);
requestAnimationFrame(updateGalleryZoom);window.addEventListener('resize',updateGalleryZoom);

function centerCarouselCard(id,behavior=matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'){
 const card=grid.querySelector(`[data-id="${id}"]`);if(!carousel||!card)return;
 const bounds=grid.getBoundingClientRect(),rect=card.getBoundingClientRect();
 grid.scrollTo({left:grid.scrollLeft+rect.left+rect.width/2-bounds.left-grid.clientWidth/2,behavior});
 updateCarouselNav();
}
function updateCarouselNav(){
 const list=filtered.filter(item=>item.available),index=current?list.findIndex(item=>item.id===current.id):-1;
 $('#carouselPrev').disabled=index>=0?index===0:!list.length||grid.scrollLeft<2;
 $('#carouselNext').disabled=index>=0?index===list.length-1:!list.length||grid.scrollLeft>=grid.scrollWidth-grid.clientWidth-2;
}
viewToggle.onclick=()=>{
 carousel=!carousel;document.body.classList.toggle('carousel-view',carousel);
 viewToggle.setAttribute('aria-pressed',carousel);viewToggle.setAttribute('aria-label',carousel?'Show gallery grid':'Show horizontal gallery');
 carouselNav.hidden=!carousel;galleryZoom.hidden=carousel;queueCaptionFit();if(!carousel)requestAnimationFrame(updateGalleryZoom);
 requestAnimationFrame(()=>{if(carousel&&current)centerCarouselCard(current.id,'instant');updateCarouselNav();});
};
function scrollCards(direction){
 const list=filtered.filter(item=>item.available);if(!list.length)return;
 let index=current?list.findIndex(item=>item.id===current.id):-1;
 if(index<0){
  const bounds=grid.getBoundingClientRect(),center=bounds.left+grid.clientWidth/2;
  let distance=Infinity;
  list.forEach((item,i)=>{const card=grid.querySelector(`[data-id="${item.id}"]`);if(!card)return;const r=card.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-center);if(d<distance){distance=d;index=i;}});
 }
 const next=Math.max(0,Math.min(list.length-1,index+direction));
 open(list[next].id);updateCarouselNav();
}
$('#carouselPrev').onclick=()=>scrollCards(-1);$('#carouselNext').onclick=()=>scrollCards(1);
grid.addEventListener('scroll',updateCarouselNav,{passive:true});
grid.addEventListener('wheel',event=>{if(!carousel||current||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;event.preventDefault();grid.scrollLeft+=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?grid.clientWidth:1);},{passive:false});
window.addEventListener('resize',updateCarouselNav);

let carouselLayoutFrame=0;
function updateCarouselLayout(){
 const main=document.querySelector('main'),header=document.querySelector('header');
 document.documentElement.style.setProperty('--studio-header-height',header.getBoundingClientRect().height+'px');
 const row=grid.getBoundingClientRect(),navTop=row.bottom+12;
 const dock=carousel&&!toolbar.hidden&&navTop+44>toolbar.getBoundingClientRect().top-8;
 const parent=dock?toolbar:main;
 if(carouselNav.parentElement!==parent){if(dock)toolbar.prepend(carouselNav);else main.insertBefore(carouselNav,$('#empty'));}
 main.style.setProperty('--carousel-nav-top',(navTop-main.getBoundingClientRect().top)+'px');
}
function queueCarouselLayout(){cancelAnimationFrame(carouselLayoutFrame);carouselLayoutFrame=requestAnimationFrame(updateCarouselLayout);}
const carouselLayoutObserver=new ResizeObserver(queueCarouselLayout);
[grid,toolbar,document.querySelector('header')].forEach(element=>carouselLayoutObserver.observe(element));
new MutationObserver(queueCarouselLayout).observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',queueCarouselLayout);

let refreshingShared=false,sharedAgain=false;
async function refreshShared(){
 metadataSidebar.refresh();
 if(refreshingShared){sharedAgain=true;return;}refreshingShared=true;
 try{
  await saveChain.catch(()=>{});
  const response=await studioRequest('/api/edits');if(!response.ok)throw Error('Sync unavailable');
  const saved=await response.json();let changed=false;
  for(const [id,v] of Object.entries(saved)){
   if((v._revision||0)<=(revisions[id]||0))continue;
   if(pending.has(+id)||current?.id===+id){
    conflicts.set(+id,v);
    if(current?.id===+id){sharedButton.hidden=false;$('#error').textContent='Another user updated this card. Your draft is preserved; load the saved version to continue.';}
    continue;
   }
   edits[id]=v;revisions[id]=v._revision||0;changed=true;
   if(current){const old=grid.querySelector(`[data-id="${id}"]`),item=collection.find(c=>c.id===+id);if(old&&item)old.replaceWith(tile(item));}
  }
  if(changed&&!current)drawGrid();syncLabel.textContent='Synced for everyone';
 }catch{syncLabel.textContent='Sync interrupted — reconnecting';setTimeout(refreshShared,5000);}
 finally{refreshingShared=false;if(sharedAgain){sharedAgain=false;refreshShared();}}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&collection.length)refreshShared();});

// Measure with captions visible so zooming back in can restore them.
let captionFitFrame=0,captionGridWidth=-1;
function fitCaptions(){
 grid.classList.remove('hide-card-names');
 if(carousel)return;
 const labels=grid.querySelectorAll('.caption .label');
 const tooTall=Array.from(labels).some(label=>{
  const lineHeight=parseFloat(getComputedStyle(label).lineHeight);
  return lineHeight>0&&label.getBoundingClientRect().height>lineHeight*4+1;
 });
 grid.classList.toggle('hide-card-names',tooTall);
}
function queueCaptionFit(){cancelAnimationFrame(captionFitFrame);captionFitFrame=requestAnimationFrame(fitCaptions);}
new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(Math.abs(width-captionGridWidth)>.5){captionGridWidth=width;queueCaptionFit();}}).observe(grid);
new MutationObserver(queueCaptionFit).observe(grid,{childList:true});
document.fonts.ready.then(queueCaptionFit);

const quickPending=new Set();
function updateQuickTags(){
 document.body.classList.toggle('quick-tag-mode',tagFilter.quick);
 for(const tile of grid.children){const id=Number(tile.dataset.id);tile.classList.toggle('quick-tag-selected',tagFilter.quick&&!!tagFilter.quickTag&&tagFilter.hasTag(id));tile.setAttribute('aria-busy',String(quickPending.has(id)));if(tagFilter.quick)tile.setAttribute('aria-pressed',String(tagFilter.hasTag(id)));else tile.removeAttribute('aria-pressed');}
}
async function quickToggle(tile){
 const id=Number(tile.dataset.id),tag=tagFilter.quickTag;if(!tag){syncLabel.textContent='Choose a tag in Quick tag mode';return;}if(quickPending.has(id))return;
 const selected=!tagFilter.hasTag(id);quickPending.add(id);updateQuickTags();
 try{const response=await post('/api/tags',{id,tag,selected});tagFilter.update(await response.json());syncLabel.textContent='Tag saved for everyone';metadataSidebar.refresh();}
 catch(error){syncLabel.textContent='Tag not saved: '+error.message;}
 finally{quickPending.delete(id);updateQuickTags();}
}
grid.addEventListener('click',event=>{if(!tagFilter.quick)return;const tile=event.target.closest('.tile');if(!tile)return;event.preventDefault();event.stopImmediatePropagation();quickToggle(tile);},true);
grid.addEventListener('keydown',event=>{if(!tagFilter.quick||!['Enter',' '].includes(event.key))return;const tile=event.target.closest('.tile');if(!tile)return;event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)quickToggle(tile);},true);
window.addEventListener('beforeunload',event=>{if(quickPending.size){event.preventDefault();event.returnValue='Tags are still saving.';}});

createSuitsControls();
