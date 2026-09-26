import {SHOWROOM_CARD_IDS} from './showroom-catalog.js';
import {freshRoom,applyAction,finishRitual,RITUAL_MS,publicPlayer} from './showroom-state.js';
export const INACTIVE_MS=5*60*1000;
export default {
 async fetch(request,env) {
  const url=new URL(request.url);
  if(url.pathname==='/health')return Response.json({ok:true});
  const origin=request.headers.get('Origin');
  const allowed=['https://cards.art','https://www.cards.art'];
  if(env.ALLOW_LOCALHOST_ORIGINS==='true')allowed.push('http://localhost:8000','http://127.0.0.1:8000');
  if(!allowed.includes(origin))return new Response('Forbidden',{status:403});
  if(url.pathname!=='/connect'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:400});
  if(!/^[a-f0-9-]{36}$/.test(url.searchParams.get('session')||''))return new Response('Invalid session',{status:400});
  return env.SHOWROOM.get(env.SHOWROOM.idFromName('public-v1')).fetch(request);
 }
};
export class Showroom {
 constructor(ctx) {
  this.ctx=ctx;this.room=freshRoom();this.directoryCheckedAt=0;this.directory=new Set();
  ctx.blockConcurrencyWhile(async()=>{this.room=await ctx.storage.get('room')||freshRoom();if(finishRitual(this.room,Date.now()))await ctx.storage.put('room',this.room);await this.scheduleAlarm();});
  ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));
 }
 sockets(){return this.ctx.getWebSockets();}
 send(ws,message){try{ws.send(JSON.stringify(message));}catch{}}
 broadcast(message){for(const ws of this.sockets())this.send(ws,message);}
 snapshot(){return {type:'state',now:Date.now(),room:this.room,players:this.sockets().filter(ws=>!ws.deserializeAttachment()?.inactive).map(ws=>publicPlayer(ws.deserializeAttachment()))};}
 async scheduleAlarm(){
  const deadlines=this.sockets().map(ws=>ws.deserializeAttachment()).filter(p=>p&&!p.inactive).map(p=>(p.lastActive??p.lastMove??Date.now())+INACTIVE_MS);
  if(this.room.ritual)deadlines.push(this.room.ritual.startedAt+RITUAL_MS);
  if(deadlines.length)await this.ctx.storage.setAlarm(Math.max(Date.now()+1,Math.min(...deadlines)));
 }
 async activate(ws,player,now){const returning=player.inactive;player.lastActive=now;player.inactive=false;ws.serializeAttachment(player);if(returning){this.broadcast(this.snapshot());await this.scheduleAlarm();}}
 async fetch(request) {
  // Public avatar IDs must not expose the token that can resume a socket.
  const session=new URL(request.url).searchParams.get('session');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(session));
  const id=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  const existing=this.sockets().filter(ws=>ws.deserializeAttachment()?.id===id);
  if(this.sockets().length-existing.length>=24)return new Response('Room full',{status:503});
  for(const ws of existing){try{ws.close(1000,'Reconnected');}catch{}}
  const pair=new WebSocketPair(),client=pair[0],server=pair[1];
  this.ctx.acceptWebSocket(server);
  server.serializeAttachment({id,pose:{x:0,y:1.72,z:3.5,yaw:0,pitch:0,room:'showroom'},lastMove:0,lastAction:0,lastActive:Date.now(),inactive:false,seen:[]});
  await this.scheduleAlarm();
  this.send(server,{type:'welcome',id});
  this.broadcast(this.snapshot());
  return new Response(null,{status:101,webSocket:client});
 }
 async webSocketMessage(ws,data) {
  if(typeof data!=='string'||data.length>16384){ws.close(1009,'Message too large');return;}
  let message;try{message=JSON.parse(data);}catch{return;}
  const player=ws.deserializeAttachment(),now=Date.now();
  if(message.type==='activity'){if(now-(player.lastActivityPacket||0)<1000)return;player.lastActivityPacket=now;await this.activate(ws,player,now);return;}
  if(message.type==='pose') {
    if(now-player.lastMove<45)return;
    const p=message.pose;
    if(!p||!['showroom','cube'].includes(p.room)||!['x','y','z','yaw','pitch'].every(k=>Number.isFinite(p[k]))||Math.abs(p.x)>100||Math.abs(p.z)>20000||p.y<0||p.y>10)return;
    const changed=['x','y','z','yaw','pitch','room'].some(k=>p[k]!==player.pose[k]);
    player.pose={x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,room:p.room};player.lastMove=now;ws.serializeAttachment(player);
    if(changed)await this.activate(ws,player,now);
    if(player.inactive)return;
    this.broadcast({type:'pose',id:player.id,pose:player.pose,time:now});return;
  }
  if(message.type==='seats') {
    if(now-this.directoryCheckedAt>300000){
      this.directoryCheckedAt=now;
      try {
        let cursor='';const valid=new Set();
        do {
          const response=await fetch(`https://api.cards.art/api/binders?limit=60&v=2${cursor?'&cursor='+encodeURIComponent(cursor):''}`,{headers:{Origin:'https://cards.art'}});
          if(!response.ok)throw Error('Directory unavailable');
          const payload=await response.json();for(const entry of payload.binders||[])valid.add(entry.walletAddress);
          const next=payload.nextCursor||'';if(next===cursor)break;cursor=next;
        }while(cursor&&valid.size<10000);
        this.directory=valid;
      }catch{}
    }
    await this.ctx.blockConcurrencyWhile(async()=>{
    const addresses=Array.isArray(message.addresses)?message.addresses:[];
    const next=addresses.filter(a=>typeof a==='string'&&this.directory.has(a)&&!this.room.seats.includes(a)).slice(0,500);
    if(next.length && this.room.seats.length<1000){this.room.seats.push(...new Set(next));await this.ctx.storage.put('room',this.room);this.broadcast(this.snapshot());}
    });return;
  }
  if(message.type!=='action'||typeof message.requestId!=='string'||message.requestId.length>64)return;
  const prior=player.seen.find(entry=>entry.id===message.requestId);
  if(prior){this.send(ws,prior.reply);return;}
  if(now-player.lastAction<100){this.send(ws,{type:'ack',requestId:message.requestId,error:'Please try again'});return;}
  player.lastAction=now;
  // Serialize authoritative read/modify/write, including its storage await.
  await this.ctx.blockConcurrencyWhile(async()=>{
    let reply;
    try {
      if(['place','grab','ritual'].includes(message.action?.type)) {
        if(player.pose.room!=='cube')throw Error('Enter the cube room first');
        if(message.action.type==='ritual') {
          if(Math.hypot(player.pose.x+6.72,player.pose.z+8.4)>3)throw Error('Move closer to the ritual button');
        } else if(Math.hypot(player.pose.x-[-3.1,0,3.1][message.action.slot],player.pose.z+10.7)>3)throw Error('Move closer to the pedestal');
      }
      if(message.action?.type==='borrow'&&!SHOWROOM_CARD_IDS.has(message.action.card?.stableId))throw Error('Unknown card');
      const result=applyAction(this.room,player.id,message.action,now);
      await this.ctx.storage.put('room',this.room);
      await this.activate(ws,player,now);await this.scheduleAlarm();
      reply={type:'ack',requestId:message.requestId,result};this.broadcast(this.snapshot());
    }catch(error){reply={type:'ack',requestId:message.requestId,error:error.message};}
    player.seen.push({id:message.requestId,reply});player.seen=player.seen.slice(-24);ws.serializeAttachment(player);this.send(ws,reply);
  });
 }
 async alarm(){
  const now=Date.now();let changed=finishRitual(this.room,now);
  for(const ws of this.sockets()){
   const player=ws.deserializeAttachment();if(!player||player.inactive||now-(player.lastActive??player.lastMove??0)<INACTIVE_MS)continue;
   player.inactive=true;ws.serializeAttachment(player);
   for(const [id,card] of Object.entries(this.room.cards))if(card.holder===player.id)delete this.room.cards[id];
   this.broadcast({type:'leave',id:player.id});changed=true;
  }
  if(changed){this.room.revision++;await this.ctx.storage.put('room',this.room);this.broadcast(this.snapshot());}
  await this.scheduleAlarm();
 }
 async webSocketClose(ws){await this.depart(ws);}
 async webSocketError(ws){try{ws.close(1011,'Connection interrupted');}catch{}await this.depart(ws);}
 async depart(ws){
  const id=ws.deserializeAttachment()?.id;
  if(this.sockets().some(other=>other!==ws&&other.deserializeAttachment()?.id===id))return;
  await this.ctx.blockConcurrencyWhile(async()=>{
  // Placed cards remain available to everyone. Unattended hands return to binders.
  for(const [key,card] of Object.entries(this.room.cards))if(card.holder===id)delete this.room.cards[key];
  this.room.revision++;await this.ctx.storage.put('room',this.room);
  this.broadcast({type:'leave',id});this.broadcast(this.snapshot());
  });
 }
}
