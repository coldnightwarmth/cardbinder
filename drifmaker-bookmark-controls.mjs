import {readBookmarkFiles} from './drifmaker-bookmark-import.mjs?v=8';
import {backgroundCSS} from './drifmaker-background.mjs?v=4';
import {MAX_BOOKMARKS,createBookmarkStore,lookKey,exportBookmarkZip} from './drifmaker-bookmarks.mjs?v=19';

export function createBookmarkControls({panel,saveButton,getLook,loadLook,render,download,toast}){
 let storage;try{storage=localStorage;}catch{storage={getItem(){throw Error();},setItem(){throw Error();}};}
 const store=createBookmarkStore(storage,{onError:message=>setTimeout(()=>toast(message),0)});
 const urls=new Map(),pending=new Set();let disposed=false,removed=null,exportController,importing=false;
 panel.innerHTML='<div class="bookmark-toolbar"><button class="randomize-button" data-save>Save current</button><button class="randomize-button" data-import>Import folder</button><input type="file" data-import-files accept=".json,application/json" webkitdirectory multiple hidden><button class="randomize-button" data-zip disabled>Download ZIP</button></div><div class="bookmark-status-row"><span data-status role="status">Saved on this device</span><button class="text-button" data-cancel hidden>Cancel</button><button class="text-button" data-restore hidden>Restore removed</button></div><details class="bookmark-import-report" data-import-report hidden><summary>Skipped files</summary><pre></pre></details><p class="bookmarks-empty">No bookmarks yet.</p><div class="bookmark-grid"></div>';
 const $=selector=>panel.querySelector(selector),grid=$('.bookmark-grid');
 const savedStatus=()=>`${store.entries.length} / ${MAX_BOOKMARKS} saved`;
 // Only render previews near the viewport, so a 500-look gallery does not
 // queue hundreds of offscreen renders ahead of saves and ZIP exports.
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);preview(entry.target.dataset.bookmarkId);}
 },{rootMargin:'200px'});
 function preview(id){
  const item=store.entries.find(entry=>entry.id===id);
  if(!item||urls.has(id)||pending.has(id)||disposed)return;
  pending.add(id);
  render(item.look,{thumbnail:true}).then(blob=>{
   if(disposed||!store.entries.some(entry=>entry.id===id))return;
   const url=URL.createObjectURL(blob);urls.set(id,url);const target=grid.querySelector(`[data-bookmark-id="${CSS.escape(id)}"] img`);if(target)target.src=url;
  }).catch(error=>{if(!disposed){console.error(error);toast('A bookmark preview could not load. Reopen Bookmarks to retry.');}}).finally(()=>pending.delete(id));
 }
 function updateActive(){const key=lookKey(getLook());for(const item of store.entries)grid.querySelector(`[data-bookmark-id="${CSS.escape(item.id)}"]`)?.setAttribute('aria-pressed',String(key===lookKey(item.look)));}
 function refresh(){
  const entries=store.entries,ids=new Set(entries.map(item=>item.id));
  for(const [id,url] of urls)if(!ids.has(id)){URL.revokeObjectURL(url);urls.delete(id);}
  observer.disconnect();grid.replaceChildren();$('.bookmarks-empty').hidden=entries.length>0;$('[data-zip]').disabled=!entries.length||!!exportController||importing;$('[data-restore]').hidden=!removed;if(!exportController)$('[data-status]').textContent=savedStatus();
  for(const item of entries){
   const card=document.createElement('div');card.className='bookmark-card';
   const button=document.createElement('button');button.className='bookmark-look';button.dataset.bookmarkId=item.id;button.setAttribute('aria-label',`Load ${item.name}`);button.onclick=()=>loadLook(item.look);
   const img=document.createElement('img');img.alt='';img.width=240;img.height=259;img.style.background=backgroundCSS(item.look.portrait.background);
   if(urls.has(item.id))img.src=urls.get(item.id);
   const label=document.createElement('span');label.textContent=item.name;button.append(img,label);
   const remove=document.createElement('button');remove.className='bookmark-remove';remove.textContent='×';remove.setAttribute('aria-label',`Remove ${item.name}`);remove.onclick=()=>{try{removed=store.remove(item.id);refresh();}catch(error){toast(error.message);}};
   card.append(button,remove);grid.append(card);
   if(!urls.has(item.id))observer.observe(button);
  }
  updateActive();
 }
 function save(){try{const {duplicate}=store.add(getLook());refresh();if(!duplicate)panel.scrollTop=0;toast(duplicate?'Already bookmarked.':'Bookmarked.');}catch(error){toast(error.message);}}
 saveButton.onclick=save;$('[data-save]').onclick=save;
 const importInput=$('[data-import-files]'),importButton=$('[data-import]');
 if(!('webkitdirectory' in importInput)){importInput.removeAttribute('webkitdirectory');importButton.textContent='Import JSONs';}
 importButton.onclick=()=>importInput.click();
 importInput.onchange=async()=>{
  const files=Array.from(importInput.files||[]);importInput.value='';if(!files.length||importing)return;
  importing=true;importButton.disabled=true;$('[data-zip]').disabled=true;$('[data-import-report]').hidden=true;
  try{
   const result=await readBookmarkFiles(files,{onProgress:(i,n)=>{if(!disposed)$('[data-status]').textContent=`Reading ${i} / ${n}`;}});
   if(disposed)return;
   const saved=store.addMany(result.records);refresh();panel.scrollTop=0;
   const message=result.files?`${saved.added} imported · ${saved.duplicates} duplicate${saved.duplicates===1?'':'s'} · ${result.errors.length+saved.full} skipped`:'No JSON files found.';
   $('[data-status]').textContent=message;toast(message);
   if(result.errors.length||saved.full){
    const report=$('[data-import-report]');report.hidden=false;
    report.querySelector('pre').textContent=[...result.errors.slice(0,50).map(error=>`${error.file}: ${error.reason}`),...(result.errors.length>50?[`…and ${result.errors.length-50} more invalid files.`]:[]),...(saved.full?[`${saved.full} looks exceeded the ${MAX_BOOKMARKS}-bookmark limit.`]:[])].join('\n');
   }
  }catch(error){if(!disposed){$('[data-status]').textContent=savedStatus();toast(error.message);}}
  finally{importing=false;if(!disposed){importButton.disabled=!!exportController;$('[data-zip]').disabled=!store.entries.length||!!exportController;}}
 };
 $('[data-restore]').onclick=()=>{try{store.restore(removed);removed=null;refresh();}catch(error){toast(error.message);}};
 $('[data-cancel]').onclick=()=>exportController?.abort();
 $('[data-zip]').onclick=async()=>{
  if(exportController||importing)return;exportController=new AbortController();importButton.disabled=true;$('[data-zip]').disabled=true;$('[data-cancel]').hidden=false;
  try{const blob=await exportBookmarkZip(store.entries,{render,signal:exportController.signal,onProgress:(index,count)=>$('[data-status]').textContent=`Rendering ${index} / ${count}`});if(!disposed){download(blob,'drifella-bookmarks.zip');toast('Portrait ZIP downloaded.');}}
  catch(error){if(!disposed)toast(error.name==='AbortError'?'Export canceled.':error.message);}
  finally{exportController=null;if(!disposed){importButton.disabled=importing;$('[data-cancel]').hidden=true;$('[data-status]').textContent=savedStatus();$('[data-zip]').disabled=!store.entries.length;}}
 };
 return {refresh,updateActive,dispose(){disposed=true;observer.disconnect();exportController?.abort();for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();}};
}
