import {pokemonTags} from './pokemon-tags.js';
export const removedTags=new Set(['inu','neko','nekomimi','occult','child','bera','favorite','remilio','invader','chan','error','part-time','time','azure','black','blue','brown','green','orange','pink','purple','rainbow','red','sepia','white','yellow','secret','god','fallen','little','boy','emo','holy','light','hoodie','beanie','ancestral','armor','ball','crystal','dark','die','elsewhere','eye','eyed','eyes','girl','guardian','hat','head','helm','hood','kid','life','magic','magician','monday','morning','never','night','painted','part','shirt','signals','skull','soft','start','watercolor']);
export const mergedTags={network:'computer',online:'computer',desktop:'computer',internet:'computer',king:'crown',sad:'crying',babies:'baby',catlady:'cat',catty:'cat',froggy:'frog',shadows:'shadow',tears:'crying'};
export function cleanTags(tags){return [...new Set(tags.filter(tag=>!removedTags.has(tag)).map(tag=>(Object.hasOwn(mergedTags,tag)?mergedTags[tag]:tag)))].sort();}
export function migrateMetadata(metadata){
 const version=metadata.schemaVersion??0;
 if(version>=12)return false;
 // Do not repeat old removals after users have manually restored those traits.
 if(version<9){
  metadata.tags=cleanTags(metadata.tags);
  for(const id of Object.keys(metadata.cards))metadata.cards[id]=cleanTags(metadata.cards[id]);
  if(version<2)for(const [tag,ids] of Object.entries(pokemonTags)){
   if(!metadata.tags.includes(tag))metadata.tags.push(tag);
   for(const id of ids)if(Object.hasOwn(metadata.cards,id))metadata.cards[id]=[...new Set([...metadata.cards[id],tag])].sort();
  }
 }
 if(version<10){
  metadata.tags=metadata.tags.filter(tag=>tag!=='child'&&tag!=='bera');
  for(const id of Object.keys(metadata.cards))metadata.cards[id]=metadata.cards[id].filter(tag=>tag!=='child'&&tag!=='bera');
 }
 if(version<11){
  metadata.tags=metadata.tags.filter(tag=>tag!=='inu'&&tag!=='neko'&&tag!=='nekomimi'&&tag!=='occult');
  for(const id of Object.keys(metadata.cards))metadata.cards[id]=metadata.cards[id].filter(tag=>tag!=='inu'&&tag!=='neko'&&tag!=='nekomimi'&&tag!=='occult');
 }
 const rename=tags=>[...new Set(tags.map(tag=>tag==='star'?'stars':tag==='kigurumi'?'hoodie':tag))].sort();
 metadata.tags=rename(metadata.tags);
 for(const id of Object.keys(metadata.cards))metadata.cards[id]=rename(metadata.cards[id]);
 metadata.schemaVersion=12;metadata.revision++;return true;
}
