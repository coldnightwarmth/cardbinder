import {iconTypes,iconColors,iconAsset} from './icon-options.js';
import {updateCardIcons} from './suits.js?v=6';
import {studioRequest} from './storage.js?v=3';
import {normalizeTag,orderedTags} from './metadata-model.js?v=2';

export function createMetadataSidebar(sidebar,getCard,onChange=()=>{}){
 const textPanel=document.createElement('div');textPanel.id='textPanel';textPanel.setAttribute('role','tabpanel');textPanel.setAttribute('aria-labelledby','textTab');
 textPanel.append(...sidebar.childNodes);
 const tabs=document.createElement('div');tabs.className='sidebar-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Card settings');
 const metadataPanel=document.createElement('div');metadataPanel.id='metadataPanel';metadataPanel.hidden=true;metadataPanel.setAttribute('role','tabpanel');metadataPanel.setAttribute('aria-labelledby','metadataTab');
 for(const [name,panel] of [['Text',textPanel],['Metadata',metadataPanel]]){
  const button=document.createElement('button');button.type='button';button.id=name.toLowerCase()+'Tab';button.textContent=name;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);
  button.setAttribute('aria-selected',String(name==='Text'));button.tabIndex=name==='Text'?0:-1;
  button.onclick=()=>{
   for(const tab of tabs.children){const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
   textPanel.hidden=panel!==textPanel;metadataPanel.hidden=panel!==metadataPanel;
  };
  button.onkeydown=event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();const index=event.key==='Home'?0:event.key==='End'?1:button===tabs.firstElementChild?1:0;
   tabs.children[index].click();tabs.children[index].focus();
  };
  tabs.append(button);
 }
 sidebar.append(tabs,textPanel,metadataPanel);
 const list=document.createElement('div');list.className='metadata-tags';list.setAttribute('aria-label','Card tags');
 const add=document.createElement('button');add.type='button';add.className='metadata-tag add-tag';add.textContent='+';add.setAttribute('aria-label','Add a new tag');
 const form=document.createElement('form');form.className='metadata-add-form';form.hidden=true;
 const input=document.createElement('input');input.type='text';input.maxLength=48;input.placeholder='New tag';input.setAttribute('aria-label','New tag name');input.autocomplete='off';
 const submit=document.createElement('button');submit.type='submit';submit.textContent='Add';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.onclick=()=>{form.hidden=true;input.value='';add.focus();};
 form.append(input,submit,cancel);
 const status=document.createElement('p');status.className='metadata-status';status.setAttribute('role','status');
 const retry=document.createElement('button');retry.type='button';retry.textContent='Retry loading tags';retry.hidden=true;retry.onclick=()=>refresh();
 metadataPanel.append(list,form,status,retry);
 let metadata=null,busy=false,loading=false,refreshAgain=false,lastCard=null;
 let search='';
 const iconControls=document.createElement('div');iconControls.className='card-icon-controls';
 for(const [key,title,values] of [['type','Icon',iconTypes],['color','Icon color',iconColors]]){const heading=document.createElement('div');heading.className='ink-heading';heading.textContent=title;const row=document.createElement('div');row.className='ink-options';for(const value of values){const button=document.createElement('button');button.dataset.iconKey=key;button.dataset.iconValue=value;button.textContent=value.replaceAll('-',' ');const preview=document.createElement('img');preview.alt='';preview.width=24;preview.height=24;preview.src='/minotecurator/assets/suits/'+iconAsset({type:key==='type'?value:'star',color:key==='color'?value:'cobalt-blue'})+'.svg';button.prepend(preview);button.onclick=()=>saveIcon({[key]:value});row.append(button);}iconControls.append(heading,row);}
 textPanel.querySelector('.ink-options').after(iconControls);
 function filterTags(){for(const [tag,button] of buttons)button.hidden=!!search&&!tag.includes(search);list.querySelectorAll('.metadata-divider').forEach(d=>d.hidden=!!search);}
 document.addEventListener('click',()=>{search='';filterTags();});
 document.addEventListener('keydown',event=>{if(sidebar.hidden||metadataPanel.hidden||!getCard()||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||event.target.isContentEditable||event.target.matches('input,textarea,select')||document.querySelector('dialog[open]'))return;if(event.key==='Backspace'||event.key.length===1&&/[a-z ]/i.test(event.key)){event.preventDefault();event.stopImmediatePropagation();search=event.key==='Backspace'?search.slice(0,-1):search+event.key.toLowerCase();filterTags();}},true);
 async function saveIcon(icon){const id=getCard()?.id;if(busy||!metadata||id===undefined)return;busy=true;render();status.textContent='Saving icon…';try{const response=await studioRequest('/api/icon',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,icon})});const result=await response.json();if(!response.ok)throw Error(result.error||'Could not save icon');metadata=result;updateCardIcons(metadata);onChange(metadata);status.textContent='Saved';}catch(error){status.textContent=error.message;}finally{busy=false;render();}}
 const emptyTags=[];let lastMetadata,lastTags,lastBusy;
 const buttons=new Map();
 function render(){
  const id=getCard()?.id,changedCard=id!==lastCard;
  const active=metadata?.cards[id]??emptyTags;
  if(!changedCard&&metadata===lastMetadata&&active===lastTags&&busy===lastBusy)return;
  lastCard=id;lastMetadata=metadata;lastTags=active;lastBusy=busy;
  if(changedCard){form.hidden=true;input.value='';search='';}
  for(const button of iconControls.querySelectorAll('button')){button.disabled=busy||!metadata;button.setAttribute('aria-pressed',String(metadata?.icons?.[id]?.[button.dataset.iconKey]===button.dataset.iconValue));}
  for(const [tag,button] of buttons)if(metadata&&!metadata.tags.includes(tag)){button.remove();buttons.delete(tag);}
  const focused=document.activeElement;
  const positions=new Map();list.querySelector('.metadata-divider')?.remove();let separated=false;
  if(!changedCard&&!metadataPanel.hidden)for(const [tag,button] of buttons)positions.set(tag,button.getBoundingClientRect());
  for(const tag of orderedTags(metadata?.tags??[],active)){
   if(active.length&&!active.includes(tag)&&!separated){const divider=document.createElement('div');divider.className='metadata-divider';divider.setAttribute('role','separator');list.append(divider);separated=true;}
   let button=buttons.get(tag);
   if(!button){button=document.createElement('button');button.type='button';button.className='metadata-tag';button.textContent=tag;button.onclick=()=>save(tag,!(metadata?.cards[getCard()?.id]??[]).includes(tag));buttons.set(tag,button);}
   button.setAttribute('aria-pressed',String(active.includes(tag)));button.disabled=busy||id===undefined;
   list.append(button);
  }
  add.disabled=busy||!metadata||id===undefined;submit.disabled=busy;input.disabled=busy;cancel.disabled=busy;list.append(add);
  filterTags();
  if(focused&&list.contains(focused))focused.focus({preventScroll:true});
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const [tag,before] of positions){
   const button=buttons.get(tag),after=button.getBoundingClientRect();
   if(before.width&&after.width&&(before.x!==after.x||before.y!==after.y)){
    button.getAnimations().forEach(animation=>animation.cancel());
    button.animate([{transform:`translate(${before.x-after.x}px,${before.y-after.y}px)`},{transform:'translate(0,0)'}],{duration:220,easing:'ease-out'});
   }
  }
 }
 async function refresh(){
  if(loading||busy){refreshAgain=true;return;}loading=true;refreshAgain=false;
  if(!metadata)status.textContent='Loading tags…';
  try{
   const response=await studioRequest('/api/metadata');if(!response.ok)throw Error('Could not load tags.');
   const next=await response.json();
   if(!busy&&(!metadata||next.revision>metadata.revision)){metadata=next;status.textContent='';retry.hidden=true;render();updateCardIcons(metadata);onChange(metadata);}
  }catch(error){status.textContent=error.message;retry.hidden=false;}
  finally{loading=false;if(refreshAgain&&!busy)refresh();}
 }
 async function save(rawTag,selected){
  const id=getCard()?.id;if(busy||!metadata||id===undefined)return;
  let tag;try{tag=normalizeTag(rawTag);}catch(error){status.textContent=error.message;return;}
  const previous=structuredClone(metadata);busy=true;retry.hidden=true;
  if(!metadata.tags.includes(tag))metadata.tags.push(tag);
  const selectedTags=new Set(metadata.cards[id]);if(selected)selectedTags.add(tag);else selectedTags.delete(tag);metadata.cards[id]=[...selectedTags];
  status.textContent='Saving…';render();
  try{
   const response=await studioRequest('/api/tags',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,tag,selected})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Could not save tag.');
   metadata=result;status.textContent='Saved';form.hidden=true;input.value='';
  }catch(error){metadata=previous;status.textContent=error.message+' Try again.';}
  finally{
   busy=false;
   // Remove a failed new tag from the catalog as well as its selection.
   for(const [tag,button] of buttons)if(!metadata.tags.includes(tag)){button.remove();buttons.delete(tag);}
   render();updateCardIcons(metadata);onChange(metadata);if(refreshAgain)refresh();
  }
 }
 window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='Tags are still saving.';}});
 add.onclick=()=>{form.hidden=false;input.focus();};
 form.onsubmit=event=>{event.preventDefault();save(input.value,true);};
 render();refresh();
 return {render,refresh};
}
