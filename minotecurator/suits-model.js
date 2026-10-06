export const suitDefaults={visible:true,side:'right',orientation:'vertical',size:110,spacing:60,seed:1729,revision:0};
export function validateSuits(value){
 const out={...suitDefaults,...value};
 if(typeof out.visible!=='boolean'||!['left','right'].includes(out.side)||!['vertical','horizontal'].includes(out.orientation))throw Error('Invalid suit settings');
 for(const [k,min,max] of [['size',40,400],['spacing',0,300],['seed',0,4294967295]])if(!Number.isInteger(out[k])||out[k]<min||out[k]>max)throw Error('Invalid '+k);
 return Object.fromEntries(Object.keys(suitDefaults).map(k=>[k,out[k]]));
}
export function suitAssignments(ids,seed){
 const suits=['water-drop','candle','bell','heart','star','mushroom'],colors=['cherry-red','marigold','cobalt-blue','emerald'];
 let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const order=[...ids].sort((a,b)=>a-b);for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 return new Map(order.map((id,i)=>[id,suits[i%6]+'-'+colors[Math.floor(random()*4)]]));
}

// Collection order: 166 Mi Note cards, then 1,116 Mi Note 2 cards.
export function suitIconCount(id){return id<=166?1:id<=1282?2:3;}
export function suitBoxes(id,settings){const count=suitIconCount(id),size=settings.size,gap=size*.18;return Array.from({length:count},(_,i)=>{const dx=settings.orientation==='horizontal'?i*(size+gap):0,dy=settings.orientation==='vertical'?i*(size+gap):0;return {x:settings.side==='left'?settings.spacing+dx:2000-settings.spacing-size-dx,y:2800-settings.spacing-size-dy,size};});}
