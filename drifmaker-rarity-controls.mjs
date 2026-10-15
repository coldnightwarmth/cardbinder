import {RARITY_GROUPS,MAX_WEIGHT,validWeight,traitWeight,traitChances,loadRarity,saveRarity,normalizeRarity} from './drifmaker-rarity.mjs?v=11';

// Inputs are siblings of selection buttons, so editing a weight never selects
// the trait or triggers a look-history action. All odds update as a group.
export function createRarityEditor({onError}){
 let rarity=loadRarity();const fields=[];
 function persist(){try{rarity=saveRarity(rarity);}catch{onError('Rarity applies now, but could not be saved in this browser.');}}
 function refresh(category){
  const chances=new Map();
  for(const field of fields){
   if(category&&field.category!==category)continue;
   if(!chances.has(field.category))chances.set(field.category,traitChances(rarity,field.category));
   const chance=chances.get(field.category)[field.id];
   field.output.textContent=chance>0&&chance<.0001?'<0.01%':`${Number((chance*100).toFixed(2))}%`;
   field.output.title=chance===0?'Excluded from randomization':'Randomization chance in this category';
   field.tile.dataset.excluded=String(traitWeight(rarity,field.category,field.id)===0);
  }
 }
 return {
  get value(){return rarity;},
  mount(button,category,id){
   const option=RARITY_GROUPS[category]?.options.find(option=>option.id===id);if(!option)throw Error(`Unknown rarity trait: ${category}/${id}`);
   const tile=document.createElement('div');tile.className='trait-tile';button.replaceWith(tile);tile.append(button);
   const control=document.createElement('label');control.className='tile-rarity';control.title='Randomization weight: higher is more common; 0 disables this trait.';
   const input=document.createElement('input');input.type='number';input.min='0';input.max=String(MAX_WEIGHT);input.step='1';input.inputMode='numeric';input.value=traitWeight(rarity,category,id);input.setAttribute('aria-label',`${option.label} ${RARITY_GROUPS[category].label.toLowerCase()} weight`);
   const output=document.createElement('output');output.setAttribute('aria-label',`${option.label} chance`);
   const caption=document.createElement('span');caption.className='sr-only';caption.textContent='Randomization weight';control.append(caption,input,output);tile.append(control);
   fields.push({category,id,input,output,tile});
   input.oninput=()=>{if(!input.value.trim()||!validWeight(input.valueAsNumber))return;rarity[category]={...rarity[category],[id]:input.valueAsNumber};persist();refresh(category);};
   input.onchange=()=>{input.value=traitWeight(rarity,category,id);};
   refresh(category);
  },
  replace(value){rarity=normalizeRarity(value);persist();for(const field of fields)field.input.value=traitWeight(rarity,field.category,field.id);refresh();},
 };
}
