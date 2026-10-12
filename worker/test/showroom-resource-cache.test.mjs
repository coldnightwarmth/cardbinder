import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedResourceCache,createSharedResourceBundleCache} from '../../showroom-resource-cache.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
test('resource leases deduplicate pending work, bound concurrency and never evict visible resources',async()=>{
 const gates=new Map(),loads=[],disposed=[];let running=0,peak=0;
 const acquire=createSharedResourceCache(async key=>{loads.push(key);running++;peak=Math.max(peak,running);const gate=deferred();gates.set(key,gate);try{return await gate.promise;}finally{running--;}}
  ,{capacity:2,concurrency:2,dispose:value=>disposed.push(value)});
 const a=acquire('a'),a2=acquire('a'),b=acquire('b'),c=acquire('c');await tick();assert.deepEqual(loads,['a','b']);
 const resourceA={key:'a'},resourceB={key:'b'},resourceC={key:'c'};gates.get('a').resolve(resourceA);const [leaseA,leaseA2]=await Promise.all([a,a2]);
 await tick();assert.deepEqual(loads,['a','b','c']);assert.equal(peak,2);assert.equal(leaseA.value,leaseA2.value);
 gates.get('b').resolve(resourceB);gates.get('c').resolve(resourceC);const [leaseB,leaseC]=await Promise.all([b,c]);
 assert.equal(disposed.length,0,'capacity may temporarily exceed its idle budget while all resources are visible');
 leaseA.release();assert.equal(disposed.length,0);leaseA.release();assert.equal(disposed.length,0,'double release cannot consume another card lease');
 leaseA2.release();assert.deepEqual(disposed,[resourceA]);
 const reused=await acquire('b');assert.equal(reused.value,resourceB);assert.equal(loads.length,3);
 reused.release();leaseB.release();leaseC.release();assert.deepEqual(disposed,[resourceA]);
});
test('failed loads release queue slots, reject every waiter and are retryable',async()=>{
 const failed=deferred(),loads=[];
 const acquire=createSharedResourceCache(key=>{loads.push(key);if(key==='a'&&loads.filter(x=>x==='a').length===1)return failed.promise;return {key};},{capacity:1,concurrency:1});
 const first=acquire('a'),same=acquire('a'),next=acquire('b');const r1=assert.rejects(first,/failed/),r2=assert.rejects(same,/failed/);
 await tick();assert.deepEqual(loads,['a']);failed.reject(new Error('failed'));await Promise.all([r1,r2]);
 const second=await next;assert.equal(second.value.key,'b');second.release();const retry=await acquire('a');assert.equal(retry.value.key,'a');retry.release();
 assert.deepEqual(loads,['a','b','a']);
});

test('24 distinct remote cards share one back while preserving front/back order',async()=>{
 const loads=[],disposed=[];
 const acquire=createSharedResourceBundleCache(async key=>{loads.push(key);return {key};},{capacity:0,dispose:value=>disposed.push(value.key)});
 const cards=await Promise.all(Array.from({length:24},(_,index)=>acquire([`front-${index}`,'back'])));
 assert.equal(loads.length,25,'24 fronts and one back need 25 textures instead of 48');
 assert.equal(loads.filter(key=>key==='back').length,1);
 for(let index=0;index<cards.length;index++){
  assert.deepEqual(cards[index].value.map(value=>value.key),[`front-${index}`,'back']);
  assert.equal(cards[index].value[1],cards[0].value[1]);
 }
 for(const card of cards.slice(0,-1))card.release();
 assert.equal(disposed.includes('back'),false,'the final hand still owns the common back');
 cards.at(-1).release();cards.at(-1).release();
 assert.equal(disposed.filter(key=>key==='back').length,1);
 assert.equal(disposed.length,25);
});

test('failed texture bundles release late successful faces and allow a retry',async()=>{
 const front=deferred(),back=deferred(),disposed=[],loads=[];
 const acquire=createSharedResourceBundleCache(key=>{
  loads.push(key);
  if(loads.filter(value=>value===key).length===1)return key==='front'?front.promise:back.promise;
  return {key};
 },{capacity:0,dispose:value=>disposed.push(value.key)});
 const first=acquire(['front','back']);const rejected=assert.rejects(first,/back failed/);
 await tick();back.reject(new Error('back failed'));await tick();
 front.resolve({key:'front'});await rejected;
 assert.deepEqual(disposed,['front'],'a front that completed after the back failed is not leaked');
 const second=await acquire(['front','back']);
 assert.deepEqual(second.value.map(value=>value.key),['front','back']);second.release();
 assert.deepEqual(loads,['front','back','front','back']);
 assert.deepEqual(disposed,['front','front','back']);
});

test('repeated bundle keys preserve slots and have exactly one underlying lease',async()=>{
 const loads=[],disposed=[];
 const acquire=createSharedResourceBundleCache(async key=>{loads.push(key);return {key};},{capacity:0,dispose:value=>disposed.push(value.key)});
 const bundle=await acquire(['same','same']);
 assert.equal(bundle.value[0],bundle.value[1]);assert.deepEqual(loads,['same']);
 bundle.release();bundle.release();assert.deepEqual(disposed,['same']);
});
