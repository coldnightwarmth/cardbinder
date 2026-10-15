import {RARITY_GROUPS,MAX_WEIGHT,validWeight,traitWeight,traitChances,loadRarity,saveRarity,normalizeRarity} from './drifmaker-rarity.mjs?v=1';

export function createRarityEditor({activeCategory,onError}){
 const $=selector=>document.querySelector(selector),dialog=$('#rarityDialog'),group=$('#rarityCategory'),rows=$('#rarityRows'),note=$('#rarityNote');
 let rarity=loadRarity();
 for(const [key,{label}] of Object.entries(RARITY_GROUPS)){const option=document.createElement('option');option.value=key;option.textContent=label;group.append(option);}
 function persist(){try{rarity=saveRarity(rarity);$('#raritySaveState').textContent='Saved on this device';}catch{$('#raritySaveState').textContent='Not saved — current session only';onError('Rarity applies now, but could not be saved in this browser.');}}
 function updateChances(){
  const chances=traitChances(rarity,group.value),enabled=Object.values(chances).some(chance=>chance>0);
  for(const row of rows.children){const chance=chances[row.dataset.trait];row.querySelector('output').textContent=chance>0&&chance<.0001?'<0.01%':`${Number((chance*100).toFixed(2))}%`;}
  const hints={bodyColor:'Gold finish uses its own color.',pose:'Used when portrait Poses is enabled.'};
  note.textContent=enabled?(hints[group.value]||''):'All off — current selection kept.';note.hidden=!note.textContent;
 }
 function render(){
  rows.replaceChildren();
  for(const option of RARITY_GROUPS[group.value].options){
   const row=document.createElement('tr');row.dataset.trait=option.id;
   const name=document.createElement('th');name.scope='row';const label=document.createElement('label');label.htmlFor=`rarity-${group.value}-${option.id}`;
   if(option.hex){const swatch=document.createElement('span');swatch.className='rarity-swatch';swatch.style.background=option.hex;swatch.setAttribute('aria-hidden','true');label.append(swatch);}
   label.append(option.label);name.append(label);
   const control=document.createElement('td'),input=document.createElement('input');input.type='number';input.min='0';input.max=String(MAX_WEIGHT);input.step='1';input.inputMode='numeric';input.id=label.htmlFor;input.value=traitWeight(rarity,group.value,option.id);input.setAttribute('aria-label',`${option.label} weight`);input.setAttribute('aria-describedby','rarityHelp');
   input.oninput=()=>{if(!input.value.trim()||!validWeight(input.valueAsNumber))return;rarity[group.value]={...rarity[group.value],[option.id]:input.valueAsNumber};persist();updateChances();};
   input.onchange=()=>{input.value=traitWeight(rarity,group.value,option.id);};
   control.append(input);const chance=document.createElement('td');chance.append(document.createElement('output'));row.append(name,control,chance);rows.append(row);
  }
  $('.rarity-table-scroll').scrollTop=0;
  updateChances();
 }
 $('#editRarity').onclick=()=>{group.value=activeCategory()==='body'?'bodyColor':activeCategory();render();dialog.showModal();};
 $('#closeRarity').onclick=()=>dialog.close();group.onchange=render;
 $('#resetRarityCategory').onclick=()=>{delete rarity[group.value];persist();render();};
 $('#resetAllRarity').onclick=()=>{rarity={};persist();render();};
 return {get value(){return rarity;},replace(value){rarity=normalizeRarity(value);persist();if(dialog.open)render();}};
}
