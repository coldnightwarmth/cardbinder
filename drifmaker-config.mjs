import {NEW_TRAITS} from './drifmaker-expansion.mjs?v=4';
// Shared by the browser and the showroom worker: only these small, validated
// appearance values cross the network. Models and materials always stay local.
// Drifella 2 collection inspiration: https://www.tensor.trade/trade/drifella_2
// Its 3DRIFELLABODY traits inform mint plush, plush pink, plush lilac, yellow
// and orange cream plush. Eye cues include sleppy, pixelady star and spiral;
// clothing and accessories are independently modeled adaptations for this rig.
const options=items=>Object.freeze(items.map(item=>Object.freeze(item)));
const ORIGINAL_CATEGORIES=Object.freeze({
 eyes:options([
  {id:'classic',label:'Classic',description:'Bright glossy eyes.'},
  {id:'sleepy',label:'Sleepy',description:'A half-lidded expression inspired by the collection’s sleppy eyes.'},
  {id:'star',label:'Starry',description:'Sculpted star eyes inspired by pixelady star.'},
  {id:'spiral',label:'Spiral',description:'A hypnotic pair of sculpted spiral eyes.'},
  {id:'hearts',label:'Heart eyes',description:'A pair of hearts for your favorite things.'},
  {id:'buttons',label:'Button eyes',description:'Stitched button eyes for a plush expression.'},
  {id:'wink',label:'Wink',description:'One eye open, one eye winking.'},
  {id:'angry',label:'Angry',description:'A sharp, determined stare.'},
  {id:'bored',label:'Bored',description:'An unimpressed, half-lidded gaze.'},
  {id:'tears',label:'Teary',description:'A pair of eyes with sculpted tears.'},
  {id:'dead',label:'X eyes',description:'Crossed-out cartoon eyes.'},
  {id:'cyclops',label:'Cyclops',description:'One large eye at the center of the face.'},
  {id:'pixel',label:'Pixel eyes',description:'Blocky eyes with a pixel-art silhouette.'},
  {id:'lashes',label:'Lashes',description:'Expressive eyes framed by long lashes.'},
 ]),
 mouth:options([
  {id:'original',label:'Original',description:'The original Drifella mouth.'},
  {id:'smile',label:'Smile',description:'A simple, cheerful smile.'},
  {id:'sidesmile',label:'Side smile',description:'A crooked smile with a little attitude.'},
  {id:'fangs',label:'Fangs',description:'A smile with pointed fangs.'},
  {id:'goldgrill',label:'Gold grill',description:'A bright gold grin.'},
  {id:'braces',label:'Braces',description:'A toothy smile with braces.'},
  {id:'tongue',label:'Tongue out',description:'A playful tongue-out expression.'},
  {id:'cat',label:'Cat smile',description:'A small feline smile.'},
  {id:'drool',label:'Drool',description:'A relaxed mouth with a drop of drool.'},
  {id:'skull',label:'Skull teeth',description:'A row of exposed skeletal teeth.'},
  {id:'grin',label:'Big grin',description:'An oversized toothy grin.'},
 ]),
 shirt:options([
  {id:'original',label:'Original hoodie',description:'The signature illustrated hoodie.'},
  {id:'denim',label:'Denim jacket',description:'A blue denim jacket with pockets and contrasting seams.'},
  {id:'bomber',label:'Cream bomber',description:'An off-white bomber with a zip front and ribbed trim.'},
  {id:'jersey',label:'Jersey',description:'A sporty jersey for the show floor.'},
  {id:'tiedye',label:'Tie dye',description:'A colorful tie-dye top.'},
  {id:'skeleton',label:'Skeleton top',description:'A dark top with a sculpted rib cage.'},
  {id:'cloud',label:'Cloud top',description:'A soft sky-inspired top with clouds.'},
  {id:'cloak',label:'Cloak',description:'A draped cloak for a mysterious look.'},
  {id:'suit',label:'Suit jacket',description:'A tailored jacket for a dressed-up Drifella.'},
  {id:'raincoat',label:'Raincoat',description:'A bright coat for rainy days.'},
  {id:'puffer',label:'Puffer',description:'A padded jacket with quilted sections.'},
  {id:'rugby',label:'Rugby shirt',description:'A collared shirt with bold stripes.'},
  {id:'armor',label:'Armor',description:'A set of sculpted armor plates.'},
 ]),
 legs:options([
  {id:'original',label:'Original legs',description:'The original trousers and shoes.'},
  {id:'denim',label:'Jeans',description:'A pair of denim trousers.'},
  {id:'cargo',label:'Cargo pants',description:'Roomy trousers with cargo pockets.'},
  {id:'shorts',label:'Shorts',description:'A casual pair of shorts.'},
  {id:'striped',label:'Striped pants',description:'Bold stripes from waist to ankle.'},
  {id:'patched',label:'Patched pants',description:'Trousers with contrasting patches.'},
  {id:'tech',label:'Tech pants',description:'Utility trousers with technical details.'},
  {id:'skeleton',label:'Skeleton legs',description:'Dark legs with a sculpted bone motif.'},
  {id:'plush',label:'Plush pants',description:'Soft-looking trousers for a plush silhouette.'},
  {id:'boots',label:'Tall boots',description:'A pair of tall boots.'},
  {id:'joggers',label:'Joggers',description:'Relaxed joggers with cuffed ankles.'},
 ]),
 hat:options([
  {id:'none',label:'No hat',description:'Let those fins breathe.'},
  {id:'cap',label:'Teal cap',description:'A dark teal cap with a sculpted brim.'},
  {id:'beanie',label:'Black beanie',description:'A black beanie with a rolled cuff.'},
  {id:'party',label:'Party hat',description:'A rainbow party cone inspired by the Drifella 2 collection.'},
  {id:'tophat',label:'Top hat',description:'A tall hat with a broad brim.'},
  {id:'wizard',label:'Wizard hat',description:'A pointed hat for a little magic.'},
  {id:'crown',label:'Crown',description:'A crown fit for the show floor.'},
  {id:'antlers',label:'Antlers',description:'A pair of branching antlers.'},
  {id:'bunny',label:'Bunny ears',description:'Two long rabbit ears.'},
  {id:'spinner',label:'Spinner cap',description:'A playful cap with a propeller.'},
  {id:'officer',label:'Officer cap',description:'A structured cap with a peaked brim.'},
  {id:'bucket',label:'Bucket hat',description:'A soft hat with a sloping brim.'},
  {id:'horns',label:'Horns',description:'A pair of curved horns.'},
  {id:'halo',label:'Halo',description:'A floating halo above your Drifella.'},
 ]),
 accessory:options([
  {id:'none',label:'No accessory',description:'Keep the silhouette simple.'},
  {id:'original',label:'Crossbody bag',description:'The original black crossbody bag.'},
  {id:'headphones',label:'Headphones',description:'Dark over-ear headphones with sculpted spikes.'},
  {id:'necklace',label:'Ball necklace',description:'A necklace with red-and-white ball beads.'},
  {id:'backpack',label:'Plush backpack',description:'A soft teal companion to carry on your back.'},
  {id:'scarf',label:'Scarf',description:'A cozy scarf wrapped around the neck.'},
  {id:'medallion',label:'Medallion',description:'A statement pendant on a chain.'},
  {id:'wings',label:'Wings',description:'A pair of wings worn on the back.'},
  {id:'bowtie',label:'Bow tie',description:'A neat bow tie for a formal look.'},
  {id:'satchel',label:'Satchel',description:'A side bag with a shoulder strap.'},
  {id:'camera',label:'Camera',description:'A small camera carried on a strap.'},
  {id:'skateboard',label:'Skateboard',description:'A board carried along for the ride.'},
  {id:'flower',label:'Flower',description:'A flower to finish the outfit.'},
  {id:'cassette',label:'Cassette',description:'A wearable cassette player.'},
  {id:'keychain',label:'Keychain',description:'A dangling charm and key ring.'},
 ]),
});
export const CATEGORIES=Object.freeze(Object.fromEntries([...new Set([...Object.keys(ORIGINAL_CATEGORIES),...Object.keys(NEW_TRAITS)])].map(category=>[category,options([...(ORIGINAL_CATEGORIES[category]||[]),...(NEW_TRAITS[category]||[])])])));
export const GOLD_COLOR='#e2ad32';
export const BODY_STYLES=options([{id:'solid',label:'Solid',description:'The familiar sculpted finish.'},{id:'ghost',label:'Ghost aura',description:'Clear, translucent skin with soft luminous fibers.'},{id:'gold',label:'Gold',description:'Polished gold across the whole body and face.'}]);
export const BODY_COLORS=options([
 {id:'plasma',label:'Plasma purple',hex:'#c109ff'},
 {id:'papaya',label:'Papaya',hex:'#ff582e'},
 {id:'arctic',label:'Arctic blue',hex:'#63fff2'},
 {id:'metallicgold',label:'Metallic gold',hex:GOLD_COLOR,style:'gold'},
 {id:'azure',label:'Azure',hex:'#1d5dea'},
 {id:'mint',label:'Mint',hex:'#a4d8bd'},
 {id:'plush-pink',label:'Plush pink',hex:'#e8b4cd'},
 {id:'plush-lilac',label:'Plush lilac',hex:'#c4b0e2'},
 {id:'yellow',label:'Yellow',hex:'#f0d66f'},
 {id:'orange-cream',label:'Orange cream',hex:'#efbc94'},
 {id:'scarlet',label:'Scarlet',hex:'#f52b35'},
 {id:'tangerine',label:'Tangerine',hex:'#ff730f'},
 {id:'acid',label:'Acid green',hex:'#b5f522'},
 {id:'emerald',label:'Emerald',hex:'#13cf79'},
 {id:'cyan',label:'Electric cyan',hex:'#00ccef'},
 {id:'cobalt',label:'Cobalt',hex:'#2345f7'},
 {id:'violet',label:'Vivid violet',hex:'#8734f5'},
 {id:'fuchsia',label:'Fuchsia',hex:'#f02cce'},
 {id:'hotpink',label:'Hot pink',hex:'#ff3d8b'},
 {id:'phantom',label:'Phantom ice',hex:'#c0f7ff'},
 {id:'ultraviolet',label:'Ultraviolet',hex:'#5b00ff'},
 {id:'laserpink',label:'Laser pink',hex:'#ff00b8'},
 {id:'cherry',label:'Cherry',hex:'#d50a48'},
 {id:'bloodorange',label:'Blood orange',hex:'#f03a12'},
 {id:'electricgold',label:'Electric gold',hex:'#ffcc00'},
 {id:'lemon',label:'Lemon',hex:'#edff28'},
 {id:'slime',label:'Slime',hex:'#47ed09'},
 {id:'jade',label:'Jade',hex:'#00a98b'},
 {id:'turquoise',label:'Turquoise',hex:'#00edb4'},
 {id:'lagoon',label:'Lagoon',hex:'#009fae'},
 {id:'cerulean',label:'Cerulean',hex:'#008eff'},
 {id:'indigo',label:'Indigo',hex:'#4020c4'},
 {id:'grape',label:'Grape',hex:'#ab24da'},
 {id:'orchid',label:'Orchid',hex:'#e35bff'},
 {id:'coral',label:'Coral',hex:'#ff7971'},
 {id:'butter',label:'Butter',hex:'#ffe8a3'},
 {id:'pistachio',label:'Pistachio',hex:'#c4e4a5'},
 {id:'periwinkle',label:'Periwinkle',hex:'#8c9bff'},
 {id:'charcoal',label:'Charcoal',hex:'#303344'},
 {id:'porcelain',label:'Porcelain',hex:'#f5f0e7'},
]);
export const PORTRAIT_BACKGROUNDS=options([
 {label:'Plasma',hex:'#b20fff'},{label:'Papaya',hex:'#ff6c43'},{label:'Arctic',hex:'#5be8e8'},
 {label:'Silver',hex:'#dedfe5'},{label:'Cream',hex:'#e8dfcf'},{label:'Rose',hex:'#dfc6cf'},{label:'Sage',hex:'#c6d1c4'},{label:'Midnight',hex:'#252a35'},
 {label:'Electric blue',hex:'#087ef5'},{label:'Ultramarine',hex:'#3213d5'},{label:'Cyan',hex:'#16cbe7'},{label:'Turquoise',hex:'#0dc7a0'},
 {label:'Emerald',hex:'#1fc36c'},{label:'Lime',hex:'#7fde1a'},{label:'Acid yellow',hex:'#d6ee16'},{label:'Goldenrod',hex:'#dfa51a'},
 {label:'Tangerine',hex:'#ff7d25'},{label:'Vermilion',hex:'#e74322'},{label:'Crimson',hex:'#cd144d'},{label:'Hot pink',hex:'#e62f99'},
 {label:'Magenta',hex:'#e867df'},{label:'Violet',hex:'#9c43e5'},{label:'Grape',hex:'#7025b5'},{label:'Lavender',hex:'#b6a1ed'},
 {label:'Periwinkle',hex:'#8999e0'},{label:'Powder blue',hex:'#a4d5ed'},{label:'Mint',hex:'#a0eccb'},{label:'Peach',hex:'#f4b08c'},
 {label:'Pale lemon',hex:'#f1e3a0'},{label:'Ink',hex:'#131520'},{label:'Paper',hex:'#f4f0e6'},
]);
export const DEFAULT_APPEARANCE=Object.freeze({bodyColor:'#1d5dea',eyes:'classic',mouth:'original',shirt:'original',legs:'original',hat:'none',accessory:'original',head:'original',extra:'none',nose:'original',ears:'original',tattoo:'none',brows:'original',bodyStyle:'solid'});
// Keep the storage key: normalization supplies defaults for new categories
// without resetting any existing selections in older saved looks.
export const APPEARANCE_STORAGE_KEY='cards-art:drifmaker:appearance:v1';
export const APPEARANCE_EVENT='drifmaker:appearance';
export function normalizeAppearance(value){
 const input=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const result={bodyColor:typeof input.bodyColor==='string'&&/^#[0-9a-f]{6}$/i.test(input.bodyColor)?input.bodyColor.toLowerCase():DEFAULT_APPEARANCE.bodyColor};
 result.bodyStyle=BODY_STYLES.some(item=>item.id===input.bodyStyle)?input.bodyStyle:'solid';
 if(result.bodyStyle==='gold')result.bodyColor=GOLD_COLOR;
 for(const [category,items] of Object.entries(CATEGORIES))result[category]=items.some(item=>item.id===input[category])?input[category]:DEFAULT_APPEARANCE[category];
 return result;
}
export function appearanceKey(value){return JSON.stringify(normalizeAppearance(value));}
function browserStorage(){return globalThis.localStorage;}
export function loadAppearance(storage){
 try{return normalizeAppearance(JSON.parse((storage??browserStorage())?.getItem(APPEARANCE_STORAGE_KEY)||'null'));}
 catch{return {...DEFAULT_APPEARANCE};}
}
export function saveAppearance(value,storage){
 const appearance=normalizeAppearance(value),target=storage??browserStorage();
 if(!target?.setItem)throw Error('This browser cannot save your character. Allow local storage and try again.');
 target.setItem(APPEARANCE_STORAGE_KEY,JSON.stringify(appearance));
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(APPEARANCE_EVENT,{detail:{...appearance}}));
 return appearance;
}
export function subscribeAppearance(listener){
 if(typeof window==='undefined')return ()=>{};
 const updated=event=>listener(normalizeAppearance(event.detail));
 const stored=event=>{if(event.key===APPEARANCE_STORAGE_KEY||event.key===null)listener(loadAppearance());};
 window.addEventListener(APPEARANCE_EVENT,updated);window.addEventListener('storage',stored);
 return ()=>{window.removeEventListener(APPEARANCE_EVENT,updated);window.removeEventListener('storage',stored);};
}
