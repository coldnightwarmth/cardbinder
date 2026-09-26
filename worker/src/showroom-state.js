// Authoritative room transitions. No wallet holdings are changed by this state.
export const RITUAL_MS = 6350;
export function freshRoom() { return {revision:0, cards:{}, slots:[null,null,null], ritual:null, seats:[]}; }
export function descriptor(value) {
  if(!value || typeof value.stableId!=='string' || value.stableId.length>160 || !/^[a-z0-9_-]+:[a-zA-Z0-9:_-]+$/.test(value.stableId))throw Error('Invalid card');
  const origin=value.origin;
  if(!origin || !(typeof origin.collectionId==='string' && /^[a-z0-9_-]{1,40}$/.test(origin.collectionId)) && !(typeof origin.walletAddress==='string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(origin.walletAddress)))throw Error('Invalid binder');
  return {stableId:value.stableId,origin:origin.walletAddress?{walletAddress:origin.walletAddress}:{collectionId:origin.collectionId}};
}
export function finishRitual(state,now) {
  if(!state.ritual || now<state.ritual.startedAt+RITUAL_MS)return false;
  for(const id of state.slots)delete state.cards[id];
  state.slots=[null,null,null];state.ritual=null;state.revision++;return true;
}
export function applyAction(state,player,action,now=Date.now()) {
  finishRitual(state,now);
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
    state.ritual={startedAt:now};
  } else throw Error('Unknown action');
  state.revision++;return result;
}
export function publicPlayer(p) {return {id:p.id,pose:p.pose};}
