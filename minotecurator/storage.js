const API='https://cards-art-minote.kururuga-online-leaderboard.workers.dev';
export async function studioRequest(url,options={}){
 if(url==='/api/collection')return fetch(new URL('collection.json',import.meta.url));
 return fetch(API+url,{...options,cache:'no-store',signal:AbortSignal.timeout(15000)});
}
export function subscribeEdits(onChange){
 let socket,retry,heartbeat,stopped=false;
 function connect(){
  socket=new WebSocket(API.replace('https:','wss:')+'/connect');
  socket.onopen=()=>{onChange();heartbeat=setInterval(()=>{if(socket.readyState===1)socket.send('ping');},30000);};
  socket.onmessage=e=>{if(e.data==='changed')onChange();};
  socket.onclose=()=>{clearInterval(heartbeat);if(!stopped)retry=setTimeout(connect,2500);};
  socket.onerror=()=>socket.close();
 }
 connect();
 return ()=>{stopped=true;clearTimeout(retry);clearInterval(heartbeat);socket?.close();};
}
