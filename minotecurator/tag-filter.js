import {countTags,matchesTags} from './metadata-model.js?v=2';

export function createTagFilter(onChange){
 const button=document.createElement('button');button.type='button';button.id='tagFilterToggle';button.textContent='Tags';button.disabled=true;
 button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','tagFilterPanel');button.setAttribute('aria-haspopup','dialog');button.title='Filter by tags';
 document.querySelector('.search').after(button);
 const panel=document.createElement('div');panel.id='tagFilterPanel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Filter cards by tags');
 const heading=document.createElement('div');heading.className='tag-filter-heading';
 const title=document.createElement('span');title.textContent='Match any selected tag';
 const clear=document.createElement('button');clear.type='button';clear.textContent='Clear';clear.onclick=()=>{selected.clear();render();onChange();};heading.append(title,clear);
 const list=document.createElement('div');list.className='tag-filter-options';panel.append(heading,list);document.body.append(panel);
 const selected=new Set();let metadata=null;
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
  button.disabled=!metadata;button.textContent=selected.size?`Tags (${selected.size})`:'Tags';button.classList.toggle('is-active',selected.size>0);clear.disabled=!selected.size;
  const counts=metadata?countTags(metadata):new Map();
  for(const [tag,option] of options)if(!counts.has(tag)){option.row.remove();options.delete(tag);}
  const sorted=[...counts.keys()].sort((a,b)=>a.localeCompare(b));
  for(const [index,tag] of sorted.entries()){
   let option=options.get(tag);
   if(!option){
    const row=document.createElement('label'),input=document.createElement('input'),name=document.createElement('span'),count=document.createElement('span');
    row.className='tag-filter-option';input.type='checkbox';name.textContent=tag;count.className='tag-filter-count';
    input.onchange=()=>{if(input.checked)selected.add(tag);else selected.delete(tag);render();onChange();};
    row.append(input,name,count);option={row,input,count};options.set(tag,option);
   }
   option.input.checked=selected.has(tag);option.count.textContent=`(${counts.get(tag).toLocaleString()})`;
   // Preserve keyboard focus while counts or selections change.
   const previous=list.children[index];
   if(previous!==option.row)list.insertBefore(option.row,previous??null);
  }
 }
 return {
  get active(){return selected.size>0;},
  matches(id){return matchesTags(metadata?.cards[id]??[],selected);},
  update(next){metadata=next;for(const tag of selected)if(!next.tags.includes(tag))selected.delete(tag);render();}
 };
}
