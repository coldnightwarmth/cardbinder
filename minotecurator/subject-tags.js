// Original subject assignments recovered from metadata-seed.js, before icon tags existed.
export const subjectTags=['candle','bell','heart','star','mushroom'];
export const originalSubjects={star:[119,217,225],mushroom:[105,184,347,818,1195]};
export function restoreSubjectTags(metadata){
 if(metadata.subjectTagsVersion===1)return false;
 // Persisted icon-derived names cannot be treated as evidence of subject tags.
 if(metadata.icons)for(const id of Object.keys(metadata.cards))metadata.cards[id]=metadata.cards[id].filter(tag=>!subjectTags.includes(tag));
 for(const [tag,ids] of Object.entries(originalSubjects))for(const id of ids)if(Object.hasOwn(metadata.cards,id)&&!metadata.cards[id].includes(tag))metadata.cards[id].push(tag);
 metadata.tags=[...new Set([...metadata.tags,...subjectTags])].sort();
 metadata.subjectTagsVersion=1;metadata.revision++;return true;
}
