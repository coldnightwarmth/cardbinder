import {previewStore} from './preview-sync.js?v=2';
const API='https://cards-art-minote.kururuga-online-leaderboard.workers.dev';
let paused=false,ready,local;const inFlight=new Set(),listeners=new Set();
export const syncingPaused=()=>paused;
const network=(url,options={})=>fetch(API+url,{...options,cache:'no-store',signal:AbortSignal.timeout(15000)});
export async function pauseSync(){if(paused)return;paused=true;ready=(async()=>{await Promise.allSettled([...inFlight]);const responses=await Promise.all(['/api/edits','/api/metadata','/api/suits'].map(url=>network(url)));if(responses.some(r=>!r.ok))throw Error('Could not load a live snapshot. Try again.');local=previewStore(...await Promise.all(responses.map(r=>r.json())));})();try{await ready;}catch(error){paused=false;throw error;}}
export async function studioRequest(url,options={}){
 if(url==='/api/collection')return fetch(new URL('collection.json',import.meta.url));
 if(paused){await ready;try{const value=local(url,options);if(options.method==='POST')setTimeout(()=>listeners.forEach(fn=>fn()),0);return Response.json(value);}catch(e){return Response.json({error:e.message},{status:400});}}
 const request=network(url,options);inFlight.add(request);try{return await request;}finally{inFlight.delete(request);}
}
export function subscribeEdits(onChange){
 listeners.add(onChange);
 let socket,retry,heartbeat,stopped=false;
 function connect(){
  socket=new WebSocket(API.replace('https:','wss:')+'/connect');
  socket.onopen=()=>{if(!paused)onChange();heartbeat=setInterval(()=>{if(socket.readyState===1)socket.send('ping');},30000);};
  socket.onmessage=e=>{if(e.data==='changed')if(!paused)onChange();};
  socket.onclose=()=>{clearInterval(heartbeat);if(!stopped)retry=setTimeout(connect,2500);};
  socket.onerror=()=>socket.close();
 }
 connect();
 return ()=>{listeners.delete(onChange);stopped=true;clearTimeout(retry);clearInterval(heartbeat);socket?.close();};
}
