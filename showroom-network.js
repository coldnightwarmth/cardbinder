export function connectShowroom({url,onState,onPose,onStatus}) {
 const session=crypto.randomUUID();let id=null,socket,closed=false,delay=1000,room=null,offset=0;const pending=new Map();
 function connect(){onStatus('Connecting');socket=new WebSocket(`${url}?session=${session}`);
 socket.onopen=()=>{delay=1000;onStatus('Online');};
 socket.onmessage=event=>{if(event.data==='pong')return;const m=JSON.parse(event.data);
 if(m.type==='welcome'){id=m.id;}
 else if(m.type==='state'){room=m.room;offset=m.now-Date.now();onState(m,id);}
 else if(m.type==='pose'||m.type==='leave')onPose(m);
 else if(m.type==='ack'){const p=pending.get(m.requestId);if(p){clearTimeout(p.timer);pending.delete(m.requestId);m.error?p.reject(Error(m.error)):p.resolve(m.result);}}};
 socket.onclose=()=>{onStatus('Reconnecting');for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Connection interrupted. Please try again.'));}pending.clear();if(!closed)setTimeout(connect,delay=Math.min(delay*1.5,15000));};socket.onerror=()=>socket.close();
 }
 const heartbeat=setInterval(()=>{if(socket?.readyState===1)socket.send('ping');},25000);connect();
 return {get id(){return id;},get room(){return room;},get online(){return socket?.readyState===1&&!!room;},now:()=>Date.now()+offset,
 send(message){if(socket?.readyState===1)socket.send(JSON.stringify(message));},
 action(action){return new Promise((resolve,reject)=>{if(socket?.readyState!==1)return reject(Error('Showroom is reconnecting. Please try again.'));const requestId=crypto.randomUUID();const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('Request timed out. Please try again.'));},10000);pending.set(requestId,{resolve,reject,timer});socket.send(JSON.stringify({type:'action',requestId,action}));});},
 close(){closed=true;clearInterval(heartbeat);socket?.close();}};
}
