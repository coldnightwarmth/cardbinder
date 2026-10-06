import {startSuits} from '../minotecurator/suits.js?v=3';
import {studioRequest,subscribeEdits} from '../minotecurator/storage.js?v=3';
import {createTagFilter} from '../minotecurator/tag-filter.js?v=2';
import {renderCard} from './card-renderer.js?v=6';
const $=s=>document.querySelector(s),grid=$('#grid'),dialog=$('#expanded');
let collection=[],edits={},metadata,columns=innerWidth<600?2:4,horizontal=false,selected=null,refreshing=false,again=false;
const tagFilter=createTagFilter(draw);
function dispose(root){root.querySelectorAll('.card').forEach(c=>c.dispose?.());}
function draw(){
 const q=$('#search').value.trim().toLowerCase(),items=collection.filter(c=>c.available&&tagFilter.matches(c.id)&&(!q||c.name.toLowerCase().includes(q)||String(c.id).includes(q)));
 const left=grid.scrollLeft;dispose(grid);grid.replaceChildren(...items.map(item=>{const b=document.createElement('button');b.className='tile';b.setAttribute('aria-label',`View card ${item.id}: ${item.name}`);b.append(renderCard(item,edits[item.id]));b.onclick=()=>openCard(item);return b;}));grid.scrollLeft=left;
 $('#status').textContent=items.length?'':'No cards match.';$('#status').hidden=items.length>0;requestAnimationFrame(updateNavigation);
}
function openCard(item){selected=item;dispose($('#cardView'));$('#cardView').replaceChildren(renderCard(item,edits[item.id],true));dialog.setAttribute('aria-label',item.name);if(!dialog.open)dialog.showModal();}
function closeCard(){dialog.close();}
$('#close').onclick=closeCard;dialog.addEventListener('click',e=>{if(e.target===dialog)closeCard();});dialog.addEventListener('close',()=>{selected=null;dispose($('#cardView'));$('#cardView').replaceChildren();});
function zoom(delta=0){columns=Math.max(2,Math.min(12,columns+delta));grid.style.setProperty('--columns',columns);$('#minus').disabled=columns===12;$('#plus').disabled=columns===2;}
$('#minus').onclick=()=>zoom(1);$('#plus').onclick=()=>zoom(-1);zoom();
$('#search').oninput=draw;
$('#view').onclick=()=>{horizontal=!horizontal;document.body.classList.toggle('horizontal',horizontal);$('#view').setAttribute('aria-pressed',horizontal);$('#view').setAttribute('aria-label',horizontal?'Show vertical gallery':'Show horizontal gallery');$('#zoom').hidden=horizontal;$('#navigation').hidden=!horizontal;requestAnimationFrame(updateNavigation);};
function updateNavigation(){$('#previous').disabled=grid.scrollLeft<=1;$('#next').disabled=grid.scrollLeft>=grid.scrollWidth-grid.clientWidth-1;}
function scrollCards(direction){const tile=grid.querySelector('.tile');if(tile)grid.scrollBy({left:direction*(tile.getBoundingClientRect().width+22),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
$('#previous').onclick=()=>scrollCards(-1);$('#next').onclick=()=>scrollCards(1);grid.addEventListener('scroll',updateNavigation,{passive:true});window.addEventListener('resize',updateNavigation);
grid.addEventListener('wheel',e=>{if(horizontal&&Math.abs(e.deltaY)>Math.abs(e.deltaX)){e.preventDefault();grid.scrollLeft+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?grid.clientWidth:1);}},{passive:false});
async function read(path){const r=await studioRequest(path);if(!r.ok)throw Error('Unable to load cards');return r.json();}
async function refresh(){if(refreshing){again=true;return;}refreshing=true;try{const [next,tags]=await Promise.all([read('/api/edits'),read('/api/metadata')]);const changed=JSON.stringify(next)!==JSON.stringify(edits)||tags.revision!==metadata?.revision;edits=next;metadata=tags;tagFilter.update(tags);if(changed){draw();if(selected)openCard(selected);}}catch{if(!grid.children.length){$('#status').hidden=false;$('#status').textContent='Unable to load cards. Please refresh to try again.';}setTimeout(refresh,5000);}finally{refreshing=false;if(again){again=false;refresh();}}}
try{collection=await read('/api/collection');startSuits(collection);await refresh();subscribeEdits(refresh);}catch{$('#status').textContent='Unable to load cards. Please refresh to try again.';}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
