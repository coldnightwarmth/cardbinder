export const iconTypes=['tear','candle','bell','heart','star','mushroom'];
export const iconColors=['cherry-red','marigold','cobalt-blue','emerald'];
export const iconTags=['special','so special',...iconTypes.map(t=>t==='tear'?t:t+' icon'),...iconColors.map(c=>c.replaceAll('-',' ')+' icon')];
export function splitIcon(asset){const color=iconColors.find(c=>asset.endsWith('-'+c));return {type:asset.slice(0,-color.length-1).replace('water-drop','tear'),color};}
export function iconAsset(icon){return (icon.type==='tear'?'water-drop':icon.type)+'-'+icon.color;}
export function validateIcon(icon){if(!iconTypes.includes(icon?.type)||!iconColors.includes(icon?.color))throw Error('Invalid icon');if(icon.hidden!==undefined&&typeof icon.hidden!=='boolean')throw Error('Invalid icon visibility');return {type:icon.type,color:icon.color,hidden:icon.hidden===true};}

export function tagsForIcon(icon){return icon.hidden?['special','so special']:[icon.type==='tear'?'tear':icon.type+' icon',icon.color.replaceAll('-',' ')+' icon'];}
export function selectIconTag(icon,tag){if(tag==='special'||tag==='so special')return {...icon,hidden:true};const type=iconTypes.find(t=>(t==='tear'?t:t+' icon')===tag);return type?{...icon,type,hidden:false}:{...icon,color:iconColors.find(c=>c.replaceAll('-',' ')+' icon'===tag),hidden:false};}
