import {removedTags,mergedTags} from './tag-cleanup.js';
export function normalizeTag(value){
 if(typeof value!=='string')throw Error('Enter a tag name.');
 const tag=value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
 if(!tag||tag.length>48||!/^\p{L}[\p{L}\p{M}\p{N} -]*$/u.test(tag))throw Error('Use a tag of up to 48 letters, numbers, spaces or hyphens, starting with a letter.');
 if(removedTags.has(tag))throw Error('This tag has been removed from the collection.');
 return (Object.hasOwn(mergedTags,tag)?mergedTags[tag]:tag);
}
export function updateMetadata(metadata,{id,tag,selected}){
 tag=normalizeTag(tag);
 if(typeof selected!=='boolean')throw Error('Invalid tag selection.');
 if(!Object.hasOwn(metadata.cards,String(id)))throw Error('Invalid card.');
 if(!metadata.tags.includes(tag)){
  if(!selected)throw Error('Unknown tag.');
  if(metadata.tags.length>=2000)throw Error('The collection has reached its tag limit.');
  metadata.tags.push(tag);metadata.tags.sort();
 }
 const tags=new Set(metadata.cards[id]);
 if(selected)tags.add(tag);else tags.delete(tag);
 metadata.cards[id]=[...tags].sort();metadata.revision++;
 return metadata;
}
export function orderedTags(tags,selected){
 const active=new Set(selected);
 return [...tags].sort((a,b)=>Number(active.has(b))-Number(active.has(a))||a.localeCompare(b));
}

export function countTags(metadata){
 const counts=new Map(metadata.tags.map(tag=>[tag,0]));
 for(const tags of Object.values(metadata.cards))for(const tag of new Set(tags))if(counts.has(tag))counts.set(tag,counts.get(tag)+1);
 return counts;
}
export function matchesTags(cardTags,selected,excluded=new Set()){return !cardTags.some(tag=>excluded.has(tag))&&(!selected.size||cardTags.some(tag=>selected.has(tag)));}
