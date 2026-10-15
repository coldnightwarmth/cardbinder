import {backgroundCSS} from './drifmaker-background.mjs?v=1';
import {createBookmarkStore,lookKey,exportBookmarkZip} from './drifmaker-bookmarks.mjs?v=3';

export function createBookmarkControls({panel,saveButton,getLook,loadLook,render,download,toast}){
 let storage;try{storage=localStorage;}catch{storage={getItem(){throw Error();},setItem(){throw Error();}};}
 const store=createBookmarkStore(storage,{onError:message=>setTimeout(()=>toast(message),0)});
 const urls=new Map(),pending=new Set();let disposed=false,removed=null,exportController;
 panel.innerHTML='<div class="bookmark-toolbar"><button class="randomize-button" data-save>Save current</button><button class="randomize-button" data-zip disabled>Download ZIP</button></div><div class="bookmark-status-row"><span data-status role="status">Saved on this device</span><button class="text-button" data-cancel hidden>Cancel</button><button class="text-button" data-restore hidden>Restore removed</button></div><p class="bookmarks-empty">No bookmarks yet.</p><div class="bookmark-grid"></div>';
 const $=selector=>panel.querySelector(selector),grid=$('.bookmark-grid');
 function updateActive(){const key=lookKey(getLook());for(const item of store.entries)grid.querySelector(`[data-bookmark-id="${CSS.escape(item.id)}"]`)?.setAttribute('aria-pressed',String(key===lookKey(item.look)));}
 function refresh(){
  const entries=store.entries,ids=new Set(entries.map(item=>item.id));
  for(const [id,url] of urls)if(!ids.has(id)){URL.revokeObjectURL(url);urls.delete(id);}
  grid.replaceChildren();$('.bookmarks-empty').hidden=entries.length>0;$('[data-zip]').disabled=!entries.length||!!exportController;$('[data-restore]').hidden=!removed;
  for(const item of entries){
   const card=document.createElement('div');card.className='bookmark-card';
   const button=document.createElement('button');button.className='bookmark-look';button.dataset.bookmarkId=item.id;button.setAttribute('aria-label',`Load ${item.name}`);button.onclick=()=>loadLook(item.look);
   const img=document.createElement('img');img.alt='';img.width=240;img.height=259;img.style.background=backgroundCSS(item.look.portrait.background);
   if(urls.has(item.id))img.src=urls.get(item.id);
   const label=document.createElement('span');label.textContent=item.name;button.append(img,label);
   const remove=document.createElement('button');remove.className='bookmark-remove';remove.textContent='×';remove.setAttribute('aria-label',`Remove ${item.name}`);remove.onclick=()=>{try{removed=store.remove(item.id);refresh();}catch(error){toast(error.message);}};
   card.append(button,remove);grid.append(card);
   if(!urls.has(item.id)&&!pending.has(item.id)){
    pending.add(item.id);
    render(item.look,{thumbnail:true}).then(blob=>{
     if(disposed||!store.entries.some(entry=>entry.id===item.id))return;
     const url=URL.createObjectURL(blob);urls.set(item.id,url);const target=grid.querySelector(`[data-bookmark-id="${CSS.escape(item.id)}"] img`);if(target)target.src=url;
    }).catch(error=>{if(!disposed){console.error(error);toast('A bookmark preview could not load. Reopen Bookmarks to retry.');}}).finally(()=>pending.delete(item.id));
   }
  }
  updateActive();
 }
 function save(){try{const {duplicate}=store.add(getLook());refresh();toast(duplicate?'Already bookmarked.':'Bookmarked.');}catch(error){toast(error.message);}}
 saveButton.onclick=save;$('[data-save]').onclick=save;
 $('[data-restore]').onclick=()=>{try{store.restore(removed);removed=null;refresh();}catch(error){toast(error.message);}};
 $('[data-cancel]').onclick=()=>exportController?.abort();
 $('[data-zip]').onclick=async()=>{
  if(exportController)return;exportController=new AbortController();$('[data-zip]').disabled=true;$('[data-cancel]').hidden=false;
  try{const blob=await exportBookmarkZip(store.entries,{render,signal:exportController.signal,onProgress:(index,count)=>$('[data-status]').textContent=`Rendering ${index} / ${count}`});if(!disposed){download(blob,'drifella-bookmarks.zip');toast('Portrait ZIP downloaded.');}}
  catch(error){if(!disposed)toast(error.name==='AbortError'?'Export canceled.':error.message);}
  finally{exportController=null;if(!disposed){$('[data-cancel]').hidden=true;$('[data-status]').textContent='Saved on this device';$('[data-zip]').disabled=!store.entries.length;}}
 };
 return {refresh,updateActive,dispose(){disposed=true;exportController?.abort();for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();}};
}
