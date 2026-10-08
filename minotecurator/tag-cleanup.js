import {pokemonTags} from './pokemon-tags.js';
export const removedTags=new Set(['hoodie','beanie','ancestral','armor','ball','crystal','dark','die','elsewhere','eye','eyed','eyes','girl','guardian','hat','head','helm','hood','kid','life','magic','magician','monday','morning','never','night','painted','part','shirt','signals','skull','soft','start','watercolor']);
export const mergedTags={king:'crown',sad:'crying',babies:'baby',catlady:'cat',catty:'cat',froggy:'frog',shadows:'shadow',tears:'crying',time:'part-time'};
export function cleanTags(tags){return [...new Set(tags.filter(tag=>!removedTags.has(tag)).map(tag=>(Object.hasOwn(mergedTags,tag)?mergedTags[tag]:tag)))].sort();}
export function migrateMetadata(metadata){
 if((metadata.schemaVersion??0)>=3)return false;
 metadata.tags=cleanTags(metadata.tags);
 for(const id of Object.keys(metadata.cards))metadata.cards[id]=cleanTags(metadata.cards[id]);
 if((metadata.schemaVersion??0)<2)for(const [tag,ids] of Object.entries(pokemonTags)){
  if(!metadata.tags.includes(tag))metadata.tags.push(tag);
  for(const id of ids)if(Object.hasOwn(metadata.cards,id))metadata.cards[id]=[...new Set([...metadata.cards[id],tag])].sort();
 }
 metadata.tags.sort();
 metadata.schemaVersion=3;metadata.revision++;return true;
}
