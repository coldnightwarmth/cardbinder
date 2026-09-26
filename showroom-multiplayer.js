import * as THREE from 'three';
import {connectShowroom} from './showroom-network.js?v=1';
export function createShowroomMultiplayer({scene,room,camera,portal,bridge,columns,onDirty}) {
 let hand=null,lastSent=0,lastPose='',state=null,epoch=0,lastSnapshot=null,retryTimer=null;
 const peers=new Map(),geometry=new THREE.CapsuleGeometry(.23,1.05,4,8),material=new THREE.MeshStandardMaterial({color:0x8794b6,roughness:.8});
 const badge=document.createElement('span');badge.id='showroomOnline';Object.assign(badge.style,{position:'fixed',top:'14px',left:'16px',fontSize:'11px',opacity:'.7',pointerEvents:'none',zIndex:30});document.body.append(badge);
 function peer(id){if(id===network.id)return null;if(!peers.has(id)){const group=new THREE.Group(),body=new THREE.Mesh(geometry,material);body.position.y=-.965;group.add(body);scene.add(group);peers.set(id,{group,target:new THREE.Vector3(),yaw:0,cards:new Map(),room:null});}return peers.get(id);}
 function pose(id,p){const node=peer(id);if(!node)return;const parent=p.room==='cube'?room:scene;if(node.group.parent!==parent){parent.add(node.group);node.group.position.set(p.x,p.y,p.z);}node.target.set(p.x,p.y,p.z);node.yaw=p.yaw;node.room=p.room;}
 function remove(id){const p=peers.get(id);if(!p)return;p.group.removeFromParent();for(const d of p.cards.values())d.dispose?.();peers.delete(id);}
 async function refresh(message){state=message.room;const token=++epoch;const live=new Set(message.players.map(p=>p.id));for(const id of peers.keys())if(!live.has(id))remove(id);for(const p of message.players)pose(p.id,p.pose);
 await hand?.syncShared(state,network.id,bridge.resolveSharedCard).catch(console.warn);
 if(token!==epoch)return;
 await columns.syncShared(state,network.now());
 if(token!==epoch)return;
 for(const [id,p] of peers){const cards=Object.values(state.cards).filter(c=>c.holder===id).slice(0,24),wanted=new Set(cards.map(c=>c.id));
 for(const [key,d] of p.cards)if(!wanted.has(key)){d.group?.removeFromParent();d.dispose?.();p.cards.delete(key);}
 cards.forEach((card,index)=>{const existing=p.cards.get(card.id);if(existing?.group){existing.group.position.x=(index-(cards.length-1)/2)*.055;existing.group.rotation.z=(index-(cards.length-1)/2)*-.07;}if(existing)return;const loading={};p.cards.set(card.id,loading);bridge.createSharedHandCard(card).then(display=>{if(peers.get(id)!==p||p.cards.get(card.id)!==loading||!state.cards[card.id]||state.cards[card.id].holder!==id){display.dispose();return;}p.cards.set(card.id,display);display.group.scale.multiplyScalar(.27);display.group.position.set((index-(cards.length-1)/2)*.055,-.58,-.46);display.group.rotation.set(-.25,Math.PI,(index-(cards.length-1)/2)*-.07);p.group.add(display.group);onDirty();}).catch(()=>{if(p.cards.get(card.id)===loading)p.cards.delete(card.id);});});
 }
 onDirty();}
 const network=connectShowroom({url:location.hostname==='localhost'&&new URLSearchParams(location.search).has('multiplayerLocal')?'ws://localhost:8788/connect':'wss://cards-art-showroom.kururuga-online-leaderboard.workers.dev/connect',onState:m=>{lastSnapshot=m;void refresh(m).catch(error=>{console.warn(error);clearTimeout(retryTimer);retryTimer=setTimeout(()=>{if(lastSnapshot)void refresh(lastSnapshot).catch(console.warn);},2000);});},onPose:m=>{if(m.type==='leave')remove(m.id);else pose(m.id,m.pose);onDirty();},onStatus:status=>{if(status==='Online')lastPose='';badge.textContent=`Showroom · ${status}`;}});
 columns.setNetwork(network);
 return {network,setHand(value){hand=value;hand.setNetwork(network);if(state)void hand.syncShared(state,network.id,bridge.resolveSharedCard);},
 update(now){if(now-lastSent>100){const p={x:+camera.position.x.toFixed(3),y:+camera.position.y.toFixed(3),z:+camera.position.z.toFixed(3),yaw:+camera.rotation.y.toFixed(3),pitch:+camera.rotation.x.toFixed(3),room:portal.inside?'cube':'showroom'};const serialized=JSON.stringify(p);if(serialized!==lastPose){network.send({type:'pose',pose:p});lastPose=serialized;}lastSent=now;}
 for(const p of peers.values()){p.group.position.lerp(p.target,.25);p.group.rotation.y+=Math.atan2(Math.sin(p.yaw-p.group.rotation.y),Math.cos(p.yaw-p.group.rotation.y))*.25;}
 },async registerSeats(addresses){
  const until=Date.now()+8000;
  while(!network.online && Date.now()<until)await new Promise(resolve=>setTimeout(resolve,100));
  network.send({type:'seats',addresses});
  while(addresses.some(address=>!state?.seats.includes(address)) && Date.now()<until)await new Promise(resolve=>setTimeout(resolve,100));
 },get seats(){return state?.seats||[];}};
}
