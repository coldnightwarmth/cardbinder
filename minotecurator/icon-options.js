export const iconTypes=['tear','candle','bell','heart','star','mushroom'];
export const iconColors=['cherry-red','marigold','cobalt-blue','emerald'];
export const iconTags=[...iconTypes,...iconColors.map(c=>c.replaceAll('-',' ')+' icon')];
export function splitIcon(asset){const color=iconColors.find(c=>asset.endsWith('-'+c));return {type:asset.slice(0,-color.length-1).replace('water-drop','tear'),color};}
export function iconAsset(icon){return (icon.type==='tear'?'water-drop':icon.type)+'-'+icon.color;}
export function validateIcon(icon){if(!iconTypes.includes(icon?.type)||!iconColors.includes(icon?.color))throw Error('Invalid icon');return {type:icon.type,color:icon.color};}
