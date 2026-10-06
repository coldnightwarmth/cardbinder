import {bodySource} from '../minotecurator/body-source.js';
import {maskName} from '../minotecurator/title-mask.js';
import {applySuit} from '../minotecurator/suits.js?v=3';
const W=2000,H=2800;
const defaults=()=>({zoom:1,x:0,y:0,nameZoom:1,nameX:0,nameY:0,ink:'original',body:false,bodyZoom:1,bodyX:0,bodyY:0});
function geometry(item,v){const s=Math.max(W/item.width,H/item.height)*v.zoom;return {w:item.width*s,h:item.height*s}}

function position(img,item,v){const g=geometry(item,v);img.style.width=g.w/W*100+'%';img.style.height=g.h/H*100+'%';img.style.left=((W-g.w)/2+v.x)/W*100+'%';img.style.top=((H-g.h)/2+v.y)/H*100+'%'}
const BODY={w:1053/1466*W,h:386/2052*H,cx:749.5/1466*W,cy:1795/2052*H};
function bodyGeometry(v){return {w:BODY.w*(v.bodyZoom??1),h:BODY.h*(v.bodyZoom??1),cx:BODY.cx+(v.bodyX??0),cy:BODY.cy+(v.bodyY??0)}}
function bodyPosition(el,v){const b=bodyGeometry(v);el.style.width=b.w/W*100+'%';el.style.height=b.h/H*100+'%';el.style.left=(b.cx-b.w/2)/W*100+'%';el.style.top=(b.cy-b.h/2)/H*100+'%'}

function nameGeometry(item,v){const scale=Math.min(1,1440/item.nameWidth,176/item.nameHeight)*.9*(v.nameZoom??1);return {w:item.nameWidth*scale,h:item.nameHeight*scale,cx:W/2+(v.nameX??0),cy:210+(v.nameY??0)}}
function namePosition(img,item,v=defaults()){const n=nameGeometry(item,v);img.style.width=n.w/W*100+'%';img.style.height=n.h/H*100+'%';img.style.left=(n.cx-n.w/2)/W*100+'%';img.style.top=(n.cy-n.h/2)/H*100+'%'}
function nameSource(item,v){return `/api/name/${item.id}/${v.ink||'original'}.png?v=bold3`}
const palettes={rainbow:['#d40b3f','#dd5300','#ba9000','#148438','#008cb6','#244bc9','#9521b6'],prism:['#621bb3','#084ee0','#009c95','#719500','#de7200','#df1260','#671bbe'],aurora:['#332aa8','#087cd0','#009577','#4e9835','#067da5','#7725ba'],sunset:['#6d169c','#c3137d','#e72b45','#d26d00','#ba9300','#c82b68'],electric:['#1534c7','#7e1acb','#d70e91','#194cdd','#008e9d','#1a36b5']};
Object.assign(palettes,{"rosewood": ["#6b2445", "#b34269", "#d78076", "#8e3c58"], "ocean": ["#193b80", "#167a9b", "#249a96", "#285488"], "forest": ["#244d3b", "#537a32", "#a08228", "#356455"], "copper": ["#6b3428", "#b45e32", "#d39545", "#864335"], "berry": ["#422466", "#85428d", "#bc497c", "#633488"], "ribbon": ["#275b9a", "#b74479", "#275b9a", "#b74479", "#275b9a", "#b74479", "#275b9a"]});
const imageCache=new Map(),tintCache=new Map();function loadImage(src){if(imageCache.size>40)imageCache.delete(imageCache.keys().next().value);if(!imageCache.has(src))imageCache.set(src,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>{imageCache.delete(src);reject(Error('Artwork could not load. Please try again.'))};im.src=src}));return imageCache.get(src)}
async function inkImage(id,ink){if(tintCache.size>80)tintCache.delete(tintCache.keys().next().value);const key=id+'/'+ink;if(!tintCache.has(key))tintCache.set(key,(async()=>{const source=await loadImage(`/minotecurator/assets/names/${id}.webp?v=trim3`);if(ink==='original')return source;const c=document.createElement('canvas');c.width=source.width;c.height=source.height;const ctx=c.getContext('2d');ctx.drawImage(source,0,0);ctx.globalCompositeOperation='source-in';const g=ctx.createLinearGradient(0,0,c.width,0);palettes[ink].forEach((color,i)=>g.addColorStop(i/(palettes[ink].length-1),color));ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);return loadImage(c.toDataURL())})().catch(e=>{tintCache.delete(key);throw e}));return tintCache.get(key)}

export function renderCard(item,edit={},full=false){
 const value={...defaults(),...edit},card=document.createElement('div');card.className='card';
 function image(src,cls){const img=new Image();img.className=cls;img.alt='';img.loading=full?'eager':'lazy';img.decoding='async';img.draggable=false;img.src=src;card.append(img);return img;}
 position(image(`/minotecurator/assets/${full?'originals':'thumbs'}/${item.id}.webp`,'art'),item,value);
 image('/minotecurator/assets/strip.png','strip');
 if(value.body)bodyPosition(image(bodySource(item.id),'body'),value);
 const name=image(`/minotecurator/assets/names/${item.id}.webp?v=trim3`,'name');namePosition(name,item,value);maskName(name);
 if(value.ink!=='original'){
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();inkImage(item.id,value.ink).then(img=>{name.src=img.src;}).catch(()=>{});}});
  observer.observe(card);card.dispose=()=>observer.disconnect();
 }
 applySuit(card,item.id);return card;
}
