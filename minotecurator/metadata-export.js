import {pokemonSpecies} from './pokemon-species.js';
import {iconTags} from './icon-options.js?v=3';
import {createZipWriter} from './zip-writer.js';

export const metadataCategories={
 type:'alien, aura, baby, christmas, clown, computer, cult, darklady, death, drifella, everyday, fbi, forest, galaxy, halloween, harrypotterobamasonic, individual, mcdonalds, metal, mog, mountain, oni, scream, shadow, shiny, wor, world, zombie'.split(', '),
 class:'alchemist, angel, cowboy, demon, devil, employee, fool, gnome, jul, knight, mage, maid, monster, nun, pastor, pilgrim, reaper, saint, soldier, witch, wizard'.split(', '),
 clothing:'cloak, hoodie, niqab, nobody, raincoat, goosebumps, skin'.split(', '),
 head:'beanie, bonnet, cap, crown, dubai, eyepatch, mask, partyhat, santa, ushanka'.split(', '),
 rep:'amy, apu, asuka, bubble, pokemon, calcifer, creeper, domo, fumo, gir, hellokitty, kirby, knuckles, konata, kuriboh, kuro, lain, lil org, link, luce, mario, mifella, pepe, rad, rei, remicat, remilia, rudolph, shy, sonic, toro, yoshi, yugioh, zim'.split(', '),
 creature:'ape, bear, cat, dog, duck, frog, hamster, horse, lawbster, mouse, panda, penguin, rabbit, seal, shark, unicorn'.split(', '),
 misc:'apple, bandage, bell, bomb, book, bread, burger, cake, candle, cigarette, cross, crying, egg, gun, heart, lighter, milk, mushroom, potion, pumpkin, scythe, sneed, spear, stars, strawberry, sword, tattoo'.split(', '),
 effects:'bkgtext, blood, pixel, closeup, fullbody, sketch, ui'.split(', '),
};
const categoryFor=new Map(Object.entries(metadataCategories).flatMap(([category,tags])=>tags.map(tag=>[tag,category])));
for(const species of pokemonSpecies)categoryFor.set(species,'creature');
const derivedTags=new Set([...iconTags,'body box','colored name']);
const iconColorNames={'cherry-red':'cherry','cobalt-blue':'cobalt'};

export function buildCardMetadata(item,metadata,edits){
 if(!Object.hasOwn(metadata.cards,item.id))throw Error(`Missing metadata for card ${item.id}.`);
 const icon=metadata.icons?.[item.id];
 if(!icon)throw Error(`Missing icon settings for card ${item.id}.`);
 const values=new Set(metadata.cards[item.id]),attributes=[];
 for(const category of Object.keys(metadataCategories)){
  for(const tag of [...values].filter(tag=>categoryFor.get(tag)===category).sort())attributes.push({trait_type:category,value:tag});
 }
 const edit=edits[item.id]??{};
 attributes.push(
  {trait_type:'body text',value:edit.body===true?'true':'none'},
  {trait_type:'name',value:!edit.ink||edit.ink==='original'?'black':edit.ink},
  {trait_type:'icon type',value:icon.hidden?'none':icon.type},
  {trait_type:'icon color',value:icon.hidden?'none':iconColorNames[icon.color]??icon.color},
 );
 const image=`mi-note-${String(item.id).padStart(4,'0')}-full.png`;
 return {
  name:`mi note card #${item.id}`,
  description:'mi note cards',
  image,
  external_url:'https://cards.art/minotecards/',
  attributes,
  properties:{files:[{uri:image,type:'image/png'}],category:'image'},
 };
}

// A matching metadata revision brackets the edits read, so one ZIP never mixes
// name/body settings from one revision with tags and icons from another.
export async function loadMetadataSnapshot(request){
 const read=async path=>{const response=await request(path);if(!response.ok)throw Error('Could not load current card metadata. Please try again.');return response.json();};
 for(let attempt=0;attempt<3;attempt++){
  const {revision}=await read('/api/metadata');
  const edits=await read('/api/edits');
  const metadata=await read('/api/metadata');
  if(revision===metadata.revision)return {metadata,edits};
 }
 throw Error('Cards changed while preparing the export. Please try again.');
}

export async function createMetadataArchive(collection,{metadata,edits}){
 if(!collection.length)throw Error('The collection is still loading. Please try again.');
 const zip=createZipWriter(),unmapped=new Set();
 try{
  for(const item of collection){
   const card=buildCardMetadata(item,metadata,edits);
   for(const tag of metadata.cards[item.id])if(!categoryFor.has(tag)&&!derivedTags.has(tag))unmapped.add(tag);
   await zip.add(`mi-note-${String(item.id).padStart(4,'0')}.json`,new Blob([JSON.stringify(card,null,2)+'\n'],{type:'application/json'}));
  }
  return {blob:await zip.finish(),count:collection.length,unmappedTags:[...unmapped].sort()};
 }catch(error){await zip.abort();throw error;}
}
