// Authoritative room transitions. No wallet holdings are changed by this state.
import {DRIFELLA_IDS,PIXEL_MOSAIC_IDS} from './showroom-ritual-catalog.js';
export const RITUAL_MS = 6350;
export const WALL_ART_MS = 60*60*1000;
export function freshRoom() { return {revision:0, cards:{}, slots:[null,null,null], ritual:null, seats:[],wallArt:null,lastRitualEffect:null}; }
export function ritualRecipe(cards) {
  if(cards.length!==3||cards.some(card=>!card?.stableId))return null;
  const ids=cards.map(card=>card.stableId);
  if(ids.every(id=>DRIFELLA_IDS.has(id)) || (DRIFELLA_IDS.has(ids[1]) && [ids[0],ids[2]].every(id=>/^cardnft[12]:/.test(id))))return 'drif-triptych';
  if(ids.every(id=>id.startsWith('clear:')))return 'native';
  if(ids.every(id=>PIXEL_MOSAIC_IDS.has(id)))return 'quarter';
  return null;
}
export function expireWallArt(state,now) {
  if(!state.wallArt||state.wallArt.expiresAt>now)return false;
  state.wallArt=null;state.revision++;return true;
}
export function descriptor(value) {
  if(!value || typeof value.stableId!=='string' || value.stableId.length>160 || !/^[a-z0-9_-]+:[a-zA-Z0-9:_-]+$/.test(value.stableId))throw Error('Invalid card');
  const origin=value.origin;
  if(!origin || !(typeof origin.collectionId==='string' && /^[a-z0-9_-]{1,40}$/.test(origin.collectionId)) && !(typeof origin.walletAddress==='string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(origin.walletAddress)))throw Error('Invalid binder');
  return {stableId:value.stableId,origin:origin.walletAddress?{walletAddress:origin.walletAddress}:{collectionId:origin.collectionId}};
}
export function finishRitual(state,now,players=[]) {
  if(!state.ritual || now<state.ritual.startedAt+RITUAL_MS)return false;
  const kind=state.ritual.kind;
  const completedAt=state.ritual.startedAt+RITUAL_MS;
  if(kind==='drif-triptych')state.wallArt={kind,expiresAt:completedAt+WALL_ART_MS};
  if(kind)state.lastRitualEffect={id:state.ritual.startedAt,kind,completedAt,
    recipients:players.filter(p=>!p.inactive&&p.pose?.room==='cube').map(p=>p.id)};
  for(const id of state.slots)delete state.cards[id];
  state.slots=[null,null,null];state.ritual=null;state.revision++;return true;
}
export function applyAction(state,player,action,now=Date.now(),players=[]) {
  finishRitual(state,now,players);
  const slot=action.slot;
  if(['place','grab'].includes(action.type) && (!Number.isInteger(slot)||slot<0||slot>2))throw Error('Invalid pedestal');
  if(['place','grab','ritual'].includes(action.type) && state.ritual)throw Error('Ritual in progress');
  let result=null;
  if(action.type==='borrow') {
    const card=descriptor(action.card);
    if(Object.values(state.cards).filter(c=>c.holder===player).length>=24)throw Error('Your hand is full');
    if(Object.values(state.cards).some(c=>c.borrower===player && c.stableId===card.stableId && JSON.stringify(c.origin)===JSON.stringify(card.origin)))throw Error('Card already borrowed');
    const id=crypto.randomUUID();state.cards[id]={...card,id,borrower:player,holder:player};result=state.cards[id];
  } else if(action.type==='return') {
    if(state.cards[action.id]?.holder!==player)throw Error('Card is not in your hand');
    delete state.cards[action.id];
  } else if(action.type==='place') {
    if(state.slots[slot])throw Error('Pedestal is occupied');
    const card=state.cards[action.id];if(!card || card.holder!==player)throw Error('Card is not in your hand');
    state.slots[slot]=card.id;card.holder=null;
  } else if(action.type==='grab') {
    const card=state.cards[state.slots[slot]];if(!card)throw Error('Pedestal is empty');
    if(Object.values(state.cards).filter(c=>c.holder===player).length>=24)throw Error('Your hand is full');
    state.slots[slot]=null;card.holder=player;result=card;
  } else if(action.type==='ritual') {
    if(state.slots.some(id=>!id))throw Error('Fill all three pedestals first');
    state.ritual={startedAt:now,kind:ritualRecipe(state.slots.map(id=>state.cards[id]))};
  } else throw Error('Unknown action');
  state.revision++;return result;
}
export function publicPlayer(p) {return {id:p.id,pose:p.pose,poseTime:p.lastMove||0};}
