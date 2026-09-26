import {createChatBubble} from './showroom-chat.js?v=1';
import {createShowroomAvatar} from './showroom-avatar.js?v=2';
import {createPoseBuffer,remoteHandPose} from './showroom-motion.mjs?v=3';
import * as THREE from 'three';
import {connectShowroom} from './showroom-network.js?v=3';
export function createShowroomMultiplayer({scene,room,camera,portal,bridge,columns,ripples,onDirty,onRoomState}) {
 let hand=null,lastSent=0,lastPose='',settlePackets=0,state=null,epoch=0,lastSnapshot=null,retryTimer=null;
 const peers=new Map();
 const socketPosition=new THREE.Vector3();
 function peer(id){
  if(id===network.id)return null;
  if(!peers.has(id)){
   const group=new THREE.Group();group.userData.excludeFloorReflection=true;
   const cardsRoot=new THREE.Group();group.add(cardsRoot);scene.add(group);
   const p={group,cardsRoot,cards:new Map(),room:null,motion:createPoseBuffer(),avatar:null,lastUpdate:0,previous:null,holding:false};peers.set(id,p);
   const load=()=>createShowroomAvatar().then(avatar=>{if(peers.get(id)!==p){avatar.dispose();return;}p.avatar=avatar;group.add(avatar.model);onDirty();}).catch(error=>{console.warn('Player character unavailable',error);if(peers.get(id)===p)p.retry=setTimeout(load,5000);});load();
  }
  return peers.get(id);
 }
 function pose(id,p,time){const node=peer(id);if(!node)return;
  const parent=p.room==='cube'?room:scene;if(node.group.parent!==parent||node.room===null){parent.add(node.group);node.group.position.set(p.x,p.y,p.z);}
  if(node.room!==p.room)ripples.forget(id);node.motion.push(p,performance.now(),time);if(node.room!==p.room)node.previous=null;node.room=p.room;
 }
 function layoutCard(display,index,count){const p=remoteHandPose(index,count);display.group.position.set(p.x,p.y+.57,p.z+.49);display.group.rotation.set(p.rx,p.ry,p.rz);}

 function remove(id){const p=peers.get(id);if(!p)return;clearTimeout(p.retry);p.bubble?.dispose();p.avatar?.dispose();p.group.removeFromParent();ripples.forget(id);for(const d of p.cards.values())d.dispose?.();peers.delete(id);}
 async function refresh(message){state=message.room;onRoomState?.(state,network.id,message.now);const token=++epoch;const live=new Set(message.players.map(p=>p.id));for(const id of peers.keys())if(!live.has(id))remove(id);for(const p of message.players)pose(p.id,p.pose,p.poseTime||message.now);
 await hand?.syncShared(state,network.id,bridge.resolveSharedCard).catch(console.warn);
 if(token!==epoch)return;
 await columns.syncShared(state,network.now());
 if(token!==epoch)return;
 for(const [id,p] of peers){const cards=Object.values(state.cards).filter(c=>c.holder===id).slice(0,24),wanted=new Set(cards.map(c=>c.id));p.holding=cards.length>0;
 for(const [key,d] of p.cards)if(!wanted.has(key)){d.group?.removeFromParent();d.dispose?.();p.cards.delete(key);}
 cards.forEach((card,index)=>{
  const existing=p.cards.get(card.id);if(existing?.group)layoutCard(existing,index,cards.length);if(existing)return;
  const loading={};p.cards.set(card.id,loading);
  bridge.createSharedHandCard(card).then(display=>{
   if(peers.get(id)!==p||p.cards.get(card.id)!==loading||state.cards[card.id]?.holder!==id){display.dispose();return;}
   p.cards.set(card.id,display);display.group.scale.multiplyScalar(.27);
   const held=Object.values(state.cards).filter(c=>c.holder===id).slice(0,24);
   layoutCard(display,held.findIndex(c=>c.id===card.id),held.length);p.cardsRoot.add(display.group);onDirty();
  }).catch(()=>{if(p.cards.get(card.id)===loading)p.cards.delete(card.id);});
 });
 }
 onDirty();}
 const network=connectShowroom({url:location.hostname==='localhost'&&new URLSearchParams(location.search).has('multiplayerLocal')?'ws://localhost:8788/connect':'wss://cards-art-showroom.kururuga-online-leaderboard.workers.dev/connect',onState:m=>{lastSnapshot=m;void refresh(m).catch(error=>{console.warn(error);clearTimeout(retryTimer);retryTimer=setTimeout(()=>{if(lastSnapshot)void refresh(lastSnapshot).catch(console.warn);},2000);});},onChat:m=>{const p=peers.get(m.id);if(!p)return;p.bubble?.dispose();p.bubble=createChatBubble(m.text);p.bubbleExpires=m.expiresAt;p.group.add(p.bubble.sprite);onDirty();},onPose:m=>{if(m.type==='leave')remove(m.id);else pose(m.id,m.pose,m.time);onDirty();},onStatus:status=>{if(status==='Online')lastPose='';}});
 columns.setNetwork(network);
 return {network,setHand(value){hand=value;hand.setNetwork(network);if(state)void hand.syncShared(state,network.id,bridge.resolveSharedCard);},
 update(now){if(now-lastSent>=1000/15){const p={x:+camera.position.x.toFixed(3),y:+camera.position.y.toFixed(3),z:+camera.position.z.toFixed(3),yaw:+camera.rotation.y.toFixed(3),pitch:+camera.rotation.x.toFixed(3),room:portal.inside?'cube':'showroom'};const serialized=JSON.stringify(p);if(serialized!==lastPose)settlePackets=3;if(serialized!==lastPose||settlePackets>0){network.send({type:'pose',pose:p});if(serialized===lastPose)settlePackets--;lastPose=serialized;}lastSent=now;}
 for(const [id,p] of peers){if(p.bubble&&network.now()>=p.bubbleExpires){p.bubble.dispose();p.bubble=null;}const sample=p.motion.sample(now);if(!sample)continue;
  const dt=Math.min(.1,Math.max(0,(now-(p.lastUpdate||now))/1000));p.lastUpdate=now;
  const velocity=p.previous&&dt>0?Math.hypot(sample.x-p.previous.x,sample.z-p.previous.z)/dt:0;p.previous=sample;
  p.group.position.set(sample.x,sample.y,sample.z);p.group.rotation.y=sample.yaw;
  if(p.avatar){
   p.avatar.update(dt,velocity,p.holding);p.group.updateWorldMatrix(true,true);
   if(p.avatar.socket){p.avatar.socket.getWorldPosition(socketPosition);p.group.worldToLocal(socketPosition);p.cardsRoot.position.copy(socketPosition);p.cardsRoot.position.y+=.09;p.cardsRoot.position.z-=.07;}
  }else p.cardsRoot.position.set(0,-.57,-.49);
  if(sample.room==='showroom')ripples.update(now,p.group,id);
 }


 },async registerSeats(addresses){
  const until=Date.now()+8000;
  while(!network.online && Date.now()<until)await new Promise(resolve=>setTimeout(resolve,100));
  network.send({type:'seats',addresses});
  while(addresses.some(address=>!state?.seats.includes(address)) && Date.now()<until)await new Promise(resolve=>setTimeout(resolve,100));
 },get seats(){return state?.seats||[];}};
}
