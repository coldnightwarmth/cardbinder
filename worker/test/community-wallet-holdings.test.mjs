import assert from 'node:assert/strict';
import test from 'node:test';
import { GODSOFDESTINY_CARDS } from '../../godsofdestiny-data.js';
import { REFLECTION2_CARDS } from '../../reflection2-data.js';
import { countSupportedWalletCards, fetchLiveWalletHoldings } from '../src/live-data.js';

for (const [name,cards] of [['Valkyrie Order',GODSOFDESTINY_CARDS],['Reflection2',REFLECTION2_CARDS]]) {
 test(`${name} mints are recognized as wallet binder cards`,()=>{
  for(const card of cards) for(const mint of new Set([card.mint,...(card.mints || [])])) {
   if(!mint)continue;
   assert.equal(countSupportedWalletCards({mints:[mint]}),1,`${card.title}: ${mint}`);
  }
 });
}

test('a wallet holding only Valkyrie Order is eligible for a public binder',async()=>{
 const mint=GODSOFDESTINY_CARDS[0].mint;
 const original=globalThis.fetch;
 globalThis.fetch=async(_url,options)=>{
  const request=JSON.parse(options.body || '{}');
  if(request.method==='getAssetsByOwner')return Response.json({result:{items:[{id:mint}],total:1}});
  return Response.json({result:{value:[]}});
 };
 try {
  const holdings=await fetchLiveWalletHoldings('test-wallet',{HELIUS_RPC_URL:'https://rpc.test'});
  assert(holdings.mints.includes(mint));
  assert.equal(holdings.supportedCardCount,1);
 }finally {globalThis.fetch=original;}
});
