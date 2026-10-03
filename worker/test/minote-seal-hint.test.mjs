import test from 'node:test';
import assert from 'node:assert/strict';
import {createSealHint} from '../../minotewip/seal-hint.js';
test('hint requires two taps and ignores cooldown taps before a fresh pair',()=>{
 const element={style:{}},hint=createSealHint(element);
 hint.tap(0);assert.equal(hint.active,false);
 hint.tap(100);hint.update(300,100,100,false,false);assert.equal(element.style.opacity,'1');
 hint.tap(1000);hint.update(2300,100,100,false,false);assert.equal(hint.active,false);
 hint.tap(5000);assert.equal(hint.active,false);
 hint.tap(5200);assert.equal(hint.active,false);
 hint.tap(5300);assert.equal(hint.active,true);
});
test('flip dismissal fades immediately and finishes within 140ms',()=>{
 const element={style:{}},hint=createSealHint(element);
 hint.tap(0);hint.tap(100);hint.update(400,100,100,false,false);
 hint.dismiss(400);hint.update(470,100,100,false,false);assert.equal(element.style.opacity,'0.5');
 hint.update(540,100,100,false,false);assert.equal(element.style.opacity,'0');assert.equal(hint.active,false);
});
