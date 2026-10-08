import {createZipWriter} from './zip-writer.js';
// PNGs are already compressed; ZIP STORE avoids a second costly compression pass.
export function zipFiles(files){
 const chunks=[],directory=[];let offset=0;
 const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
 for(const {name,data} of files){const filename=new TextEncoder().encode(name),sum=crc(data),header=new Uint8Array(30+filename.length),h=new DataView(header.buffer);h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint32(14,sum,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,filename.length,true);header.set(filename,30);chunks.push(header,data);
 const entry=new Uint8Array(46+filename.length),d=new DataView(entry.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint32(16,sum,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,filename.length,true);d.setUint32(42,offset,true);entry.set(filename,46);directory.push(entry);offset+=header.length+data.length;}
 const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,directory.reduce((sum,v)=>sum+v.length,0),true);e.setUint32(16,offset,true);return new Blob([...chunks,...directory,end],{type:'application/zip'});
}
const options=[['full','Full card art'],['art','Original art (with current crop)'],['name-box','Name box'],['body-box','Body box'],['boxes','Both boxes together'],['name','Name'],['body-text','Body text'],['texts','Both texts together'],['icons','Icons'],['overlays','Everything except original art']];
export function createExportOptions({render,download,prepare=()=>undefined}){
 const dialog=document.createElement('dialog');dialog.id='exportOptions';dialog.setAttribute('aria-labelledby','exportOptionsTitle');
 dialog.innerHTML='<h2 id="exportOptionsTitle">Download card layers</h2><p>Each PNG is 2000 × 2800 px, using the current edits and transparency where applicable.</p><div class="export-choices"></div><p class="export-note">Body text is extracted from the supplied printed artwork. Hidden body boxes and icons export as transparent layers.</p><progress max="100" value="0" hidden></progress><p class="export-status" role="status" aria-live="polite"></p><div class="export-actions"><button type="button" class="export-cancel">Cancel</button><button type="button" class="primary export-confirm">Confirm download</button></div>';
 const choices=dialog.querySelector('.export-choices');for(const [key,label]of options){const row=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=key;input.checked=key==='full';row.append(input,document.createTextNode(label));choices.append(row);}
 document.body.append(dialog);let current,busy=false,cancelled=false;const confirm=dialog.querySelector('.export-confirm'),cancel=dialog.querySelector('.export-cancel'),progress=dialog.querySelector('progress'),status=dialog.querySelector('.export-status');
 choices.onchange=()=>confirm.disabled=!choices.querySelector('input:checked');cancel.onclick=()=>{if(busy){cancelled=true;status.textContent='Cancelling…';}else dialog.close();};dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});dialog.addEventListener('click',e=>{if(e.target===dialog&&!busy){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 confirm.onclick=async()=>{if(busy)return;busy=true;cancelled=false;const selected=[...choices.querySelectorAll('input:checked')].map(i=>i.value);if(!selected.length){busy=false;return;}confirm.disabled=true;choices.querySelectorAll('input').forEach(i=>i.disabled=true);progress.hidden=false;progress.value=0;dialog.setAttribute('aria-busy','true');
 const filename=current.collection?'mi-note-collection.zip':`mi-note-${String(current.items[0].item.id).padStart(4,'0')}-layers.zip`;let zip;
 try{let stream=null;if(current.collection&&typeof window.showSaveFilePicker==='function'){const handle=await window.showSaveFilePicker({suggestedName:filename,types:[{description:'ZIP archive',accept:{'application/zip':['.zip']}}]});stream=await handle.createWritable();}zip=createZipWriter(stream);const context=prepare(),total=current.items.length*selected.length;let done=0;
 for(const {item,edits}of current.items)for(const key of selected){if(cancelled)throw new DOMException('Export cancelled','AbortError');status.textContent=`Card ${item.id} · ${options.find(o=>o[0]===key)[1]} · ${done+1}/${total}`;await new Promise(resolve=>setTimeout(resolve,0));const blob=await render(item,edits,key,context);if(cancelled)throw new DOMException('Export cancelled','AbortError');const prefix=`mi-note-${String(item.id).padStart(4,'0')}`;await zip.add(current.collection&&selected.length>1?`${prefix}/${key}.png`:`${prefix}-${key}.png`,blob);progress.value=++done/(total+1)*100;}
 status.textContent='Finishing ZIP…';const blob=await zip.finish();if(blob)download(blob,filename);progress.value=100;status.textContent=`Exported ${total} PNG${total===1?'':'s'} in one ZIP.`;cancel.textContent='Close';
 }catch(e){await zip?.abort().catch(()=>{});status.textContent=e.name==='AbortError'?'Export cancelled.':'Download failed: '+e.message;}finally{busy=false;confirm.disabled=false;cancel.disabled=false;choices.querySelectorAll('input').forEach(i=>i.disabled=false);dialog.removeAttribute('aria-busy');}};
 return (item,edits)=>{const collection=Array.isArray(item);current={collection,items:collection?item.map(i=>({item:i,edits:{...edits[i.id]}})):[{item,edits:{...edits}}]};dialog.querySelector('h2').textContent=collection?`Download collection · ${item.length} cards`:'Download card layers';progress.hidden=true;progress.value=0;status.textContent='';cancel.textContent='Cancel';dialog.showModal();};
}
export function createCollectionDownload({art,edits,metadata}){
 const dialog=document.createElement('dialog');dialog.id='collectionDownload';dialog.setAttribute('aria-label','Download collection');
 dialog.innerHTML='<h2>Download collection</h2><div class="export-actions"><button type="button" data-art>Full collection art</button><button type="button" data-edits>Edits</button><button type="button" data-metadata>Metadata (.json ZIP)</button></div><p class="export-status" role="status" aria-live="polite"></p><button type="button" data-close>Cancel</button>';
 document.body.append(dialog);let busy=false;
 const status=dialog.querySelector('.export-status'),close=dialog.querySelector('[data-close]');
 dialog.querySelector('[data-art]').onclick=()=>{dialog.close();art();};
 dialog.querySelector('[data-edits]').onclick=()=>{dialog.close();edits();};
 dialog.querySelector('[data-metadata]').onclick=async()=>{
  if(busy)return;busy=true;dialog.setAttribute('aria-busy','true');status.textContent='Preparing metadata for all cards…';
  dialog.querySelectorAll('button').forEach(button=>button.disabled=true);
  try{
   const result=await metadata();
   status.textContent=`Downloaded ${result.count} metadata JSON files in one ZIP.`;
   if(result.unmappedTags.length)status.textContent+=` Tags outside the export categories: ${result.unmappedTags.join(', ')}.`;
   close.textContent='Close';
  }catch(error){status.textContent='Download failed: '+error.message;}
  finally{busy=false;dialog.removeAttribute('aria-busy');dialog.querySelectorAll('button').forEach(button=>button.disabled=false);}
 };
 close.onclick=()=>dialog.close();dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 return ()=>{status.textContent='';close.textContent='Cancel';dialog.showModal();};
}
