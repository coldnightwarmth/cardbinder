import {countTags,matchesTags} from './metadata-model.js?v=3';

export function createTagFilter(onChange,{allowQuick=false}={}){
 const button=document.createElement('button');button.type='button';button.id='tagFilterToggle';button.textContent='Tags';button.disabled=true;
 button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','tagFilterPanel');button.setAttribute('aria-haspopup','dialog');button.title='Filter by tags';
 document.querySelector('.search').after(button);
 const panel=document.createElement('div');panel.id='tagFilterPanel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Filter cards by tags');
 const heading=document.createElement('div');heading.className='tag-filter-heading';
 const title=document.createElement('span');title.textContent='Click: include → exclude → clear';
 const clear=document.createElement('button');clear.type='button';clear.textContent='Clear';clear.onclick=()=>{selected.clear();excluded.clear();quickTag=null;render();onChange();};heading.append(title,clear);
 const list=document.createElement('div');list.className='tag-filter-options';panel.append(heading,list);document.body.append(panel);
 let quick=false,quickTag=null;
 const quickButton=document.createElement('button');quickButton.type='button';quickButton.className='quick-tag-toggle';quickButton.textContent='Quick tag mode';quickButton.setAttribute('aria-pressed','false');
 if(allowQuick)panel.prepend(quickButton);
 quickButton.onclick=()=>{quick=!quick;quickTag=null;selected.clear();excluded.clear();quickButton.setAttribute('aria-pressed',String(quick));render();onChange();};
 const selected=new Set(),excluded=new Set();let metadata=null;
 function position(){
  const rect=button.getBoundingClientRect(),width=Math.min(320,window.innerWidth-24);
  panel.style.width=width+'px';panel.style.left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12))+'px';
  panel.style.top=(rect.bottom+8)+'px';panel.style.maxHeight=Math.max(100,window.innerHeight-rect.bottom-24)+'px';
 }
 function close(focus=false){panel.hidden=true;button.setAttribute('aria-expanded','false');if(focus)button.focus();}
 button.onclick=()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){position();list.querySelector('input')?.focus({preventScroll:true});}};
 document.addEventListener('pointerdown',event=>{if(!panel.contains(event.target)&&!button.contains(event.target))close();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();close(true);}});
 document.addEventListener('focusin',event=>{if(!panel.hidden&&!panel.contains(event.target)&&event.target!==button)close();});
 window.addEventListener('resize',()=>{if(!panel.hidden)position();});
 const options=new Map();
 function render(){
  button.disabled=!metadata;button.textContent=(selected.size+excluded.size)?`Tags (${selected.size+excluded.size})`:'Tags';button.classList.toggle('is-active',selected.size+excluded.size>0);clear.disabled=!(selected.size+excluded.size||quickTag);title.textContent=quick?(quickTag?'Click cards to toggle '+quickTag:'Choose one tag, then click cards'):'Click: include → exclude → clear';
  const counts=metadata?countTags(metadata):new Map();
  for(const [tag,option] of options)if(!counts.has(tag)){option.row.remove();options.delete(tag);}
  const sorted=[...counts.keys()].sort((a,b)=>a.localeCompare(b));
  for(const [index,tag] of sorted.entries()){
   let option=options.get(tag);
   if(!option){
    const row=document.createElement('label'),input=document.createElement('input'),name=document.createElement('span'),count=document.createElement('span');
    row.className='tag-filter-option';input.type='checkbox';name.textContent=tag;count.className='tag-filter-count';
    input.onchange=()=>{if(quick){quickTag=tag;render();onChange();return;}if(selected.has(tag)){selected.delete(tag);excluded.add(tag);}else if(excluded.has(tag))excluded.delete(tag);else selected.add(tag);render();onChange();};
    row.append(input,name,count);option={row,input,count};options.set(tag,option);
   }
   option.input.checked=quick?quickTag===tag:selected.has(tag);option.input.indeterminate=excluded.has(tag);option.row.classList.toggle('excluded',excluded.has(tag));option.row.title=excluded.has(tag)?'Exclude '+tag:selected.has(tag)?'Include '+tag:'No filter';option.count.textContent=`(${counts.get(tag).toLocaleString()})`;
   // Preserve keyboard focus while counts or selections change.
   const previous=list.children[index];
   if(previous!==option.row)list.insertBefore(option.row,previous??null);
  }
 }
 return {
  get active(){return selected.size+excluded.size>0;},
  get quick(){return quick;},
  get quickTag(){return quickTag;},
  hasTag(id){return (metadata?.cards[id]??[]).includes(quickTag);},
  matches(id){if(quick)return true;return matchesTags(metadata?.cards[id]??[],selected,excluded);},
  update(next){if(metadata&&next.revision<metadata.revision)return;metadata=next;for(const tag of excluded)if(!next.tags.includes(tag))excluded.delete(tag);for(const tag of selected)if(!next.tags.includes(tag))selected.delete(tag);render();}
 };
}
