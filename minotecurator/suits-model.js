export const suitDefaults={visible:true,side:'right',orientation:'vertical',size:110,spacingX:60,spacingY:60,iconSpacing:18,seed:1729,stroke:false,strokeColor:"white",strokeWidth:2,shadow:false,shadowColor:"black",shadowSize:5,shadowOpacity:40,revision:0};
export function validateSuits(value){
 const out={...suitDefaults,...value,spacingX:value?.spacingX??value?.spacing??suitDefaults.spacingX,spacingY:value?.spacingY??value?.spacing??suitDefaults.spacingY};
 if(typeof out.visible!=='boolean'||!['left','right'].includes(out.side)||!['vertical','horizontal'].includes(out.orientation))throw Error('Invalid suit settings');
 for(const key of ['stroke','shadow'])if(typeof out[key]!=='boolean')throw Error('Invalid '+key);
 for(const key of ['strokeColor','shadowColor'])if(!['white','black'].includes(out[key]))throw Error('Invalid '+key);
 for(const [k,min,max] of [['strokeWidth',0,10],['shadowSize',0,20],['shadowOpacity',0,100],['size',40,400],['spacingX',0,300],['spacingY',0,300],['iconSpacing',0,60],['seed',0,4294967295]])if(!Number.isInteger(out[k])||out[k]<min||out[k]>max)throw Error('Invalid '+k);
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
export function suitBoxes(id,settings){settings=validateSuits(settings);const count=suitIconCount(id),size=settings.size,gap=size*settings.iconSpacing/100;return Array.from({length:count},(_,i)=>{const dx=settings.orientation==='horizontal'?i*(size+gap):0,dy=settings.orientation==='vertical'?i*(size+gap):0;return {x:settings.side==='left'?settings.spacingX+dx:2000-settings.spacingX-size-dx,y:2800-settings.spacingY-size-dy,size};});}
