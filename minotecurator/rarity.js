import {buildCardMetadata} from './metadata-export.js';
import {iconTags} from './icon-options.js?v=3';
import {appearanceTags} from './appearance-tags.js';

const derivedTags=new Set([...iconTags,...appearanceTags]);
const appearanceTypes=new Set(['body text','name','icon type','icon color']);
const traitCountKey='meta_trait:trait_count';
const closeScores=(a,b)=>Math.abs(a-b)<=1e-9*Math.max(Math.abs(a),Math.abs(b));

// OpenRarity expects one value per attribute. Each subject tag is therefore a
// separate, present-or-missing attribute, preserving multiple tags per category.
export function cardRarityTraits(item,metadata,edits){
 const exported=buildCardMetadata(item,metadata,edits);
 const attributes=new Map(exported.attributes.filter(a=>appearanceTypes.has(a.trait_type)).map(a=>[a.trait_type,a.value]));
 for(const tag of [...new Set(metadata.cards[item.id])].sort()){
  if(!derivedTags.has(tag))attributes.set('tag:'+tag,'true');
 }
 return attributes;
}

// Information content, implicit nulls, trait-count meta attribute, and unique
// attribute priority follow https://github.com/OpenRarity/open-rarity.
export function rankTraitRows(rows){
 if(!rows.length)return new Map();
 const size=rows.length,frequencies=new Map();
 const tokens=rows.map(({id,attributes},sequence)=>{
  const values=new Map(attributes);
  const traitCount=[...values.values()].filter(value=>!['none',''].includes(value)).length;
  values.set(traitCountKey,String(traitCount));
  for(const [key,value] of values){
   if(!frequencies.has(key))frequencies.set(key,new Map());
   const counts=frequencies.get(key);counts.set(value,(counts.get(value)||0)+1);
  }
  return {id,values,traitCount,sequence};
 });
 let entropy=0;
 for(const counts of frequencies.values()){
  const missing=size-[...counts.values()].reduce((a,b)=>a+b,0);
  if(missing)counts.set(null,missing);
  for(const count of counts.values()){const p=count/size;entropy-=p*Math.log2(p);}
 }
 const ranked=tokens.map(({values,...token})=>{
  let information=0,uniqueTraits=0;
  for(const [key,counts] of frequencies){
   const count=counts.get(values.get(key)??null);
   information+=Math.log2(size/count);
   // Implicit missing traits contribute information, but are not unique traits.
   if(values.has(key)&&count===1)uniqueTraits++;
  }
  return {...token,score:information/(entropy||1),uniqueTraits};
 }).sort((a,b)=>b.uniqueTraits-a.uniqueTraits||b.score-a.score||a.sequence-b.sequence);
 let previous;
 ranked.forEach((rating,index)=>{
  rating.rank=previous&&closeScores(rating.score,previous.score)?previous.rank:index+1;
  rating.order=index;previous=rating;
 });
 return new Map(ranked.map(rating=>[rating.id,rating]));
}

export function calculateRarities(collection,metadata,edits){
 return rankTraitRows(collection.map(item=>({id:item.id,attributes:cardRarityTraits(item,metadata,edits)})));
}

export function sortGalleryCards(items,collection,ratings,rarestFirst){
 const sequence=new Map(collection.map((item,index)=>[item.id,index]));
 return [...items].sort((a,b)=>(rarestFirst?ratings.get(a.id)?.order-ratings.get(b.id)?.order:0)||sequence.get(a.id)-sequence.get(b.id));
}
