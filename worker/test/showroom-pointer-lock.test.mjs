import test from 'node:test';
import assert from 'node:assert/strict';
import {createShowroomPointerLock} from '../../showroom-pointer-lock.mjs';
function fixture(){
 const handlers={},requests=[],changes=[];let exits=0;
 const element={requestPointerLock(){return new Promise((resolve,reject)=>requests.push({resolve,reject}));}};
 const document={pointerLockElement:null,addEventListener:(name,fn)=>handlers[name]=fn,exitPointerLock(){exits++;document.pointerLockElement=null;}};
 const control=createShowroomPointerLock({element,document,onChange:(...args)=>changes.push(args)});
 return {control,requests,changes,get exits(){return exits;},capture(){document.pointerLockElement=element;handlers.pointerlockchange();},unlock(){document.pointerLockElement=null;handlers.pointerlockchange();}};
}
test('capture failures remain retryable and concurrent requests coalesce',async()=>{
 const f=fixture();f.control.request();f.control.request();assert.equal(f.requests.length,1);
 f.requests[0].reject({name:'SecurityError'});await Promise.resolve();
 assert.deepEqual(f.changes.at(-1),[false,'error']);
 f.control.request();assert.equal(f.requests.length,2);f.capture();
 assert.deepEqual(f.changes.at(-1),[true,'capture']);
 f.unlock();assert.deepEqual(f.changes.at(-1),[false,'native']);
 f.control.request();assert.equal(f.requests.length,3);
});
test('a late capture after opening chat is released',()=>{
 const f=fixture();f.control.request();f.control.release();f.capture();assert.equal(f.exits,1);
});
test('latest capture intent survives a queued release and stale rejection',async()=>{
 const f=fixture();f.control.request();f.control.release();f.control.request();f.unlock();f.capture();
 assert.equal(f.exits,0);assert.deepEqual(f.changes.at(-1),[true,'capture']);
 f.unlock();f.control.request();f.requests[0].reject(new Error('stale'));await Promise.resolve();
 f.capture();assert.deepEqual(f.changes.at(-1),[true,'capture']);assert.equal(f.exits,0);
});
test('resume waits for an asynchronous unlock before requesting capture again',()=>{
 const handlers={},changes=[];let requests=0;
 const element={requestPointerLock(){requests++;}};
 const document={pointerLockElement:element,addEventListener:(n,f)=>handlers[n]=f,exitPointerLock(){}};
 const c=createShowroomPointerLock({element,document,onChange:(...args)=>changes.push(args)});
 c.release();c.request();assert.equal(requests,0);
 document.pointerLockElement=null;handlers.pointerlockchange();assert.equal(requests,1);
 document.pointerLockElement=element;handlers.pointerlockchange();
 assert.deepEqual(changes.at(-1),[true,'capture']);
});
