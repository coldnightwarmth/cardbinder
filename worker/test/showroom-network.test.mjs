import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../../showroom-network.js', import.meta.url), 'utf8');
const {connectShowroom} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function fixture(t) {
 const names = ['WebSocket', 'window', 'document', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'];
 const originals = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
 let clock = 100000, nextTimer = 0;
 const timers = new Map(), sockets = [], states = [], statuses = [], poses = [], chats = [];
 const now = Date.now, random = Math.random;
 Date.now = () => clock; Math.random = () => 0.5;
 function target() {
  const listeners = new Map();
  return {
   listeners,
   addEventListener(type, handler) { listeners.set(type, handler); },
   removeEventListener(type, handler) { if (listeners.get(type) === handler) listeners.delete(type); },
   dispatch(type, event = {}) { listeners.get(type)?.(event); },
  };
 }
 globalThis.window = target(); globalThis.document = {...target(), hidden: false};
 globalThis.setTimeout = (fn, delay) => { const id = ++nextTimer; timers.set(id, {fn, at: clock + delay}); return id; };
 globalThis.clearTimeout = id => timers.delete(id);
 globalThis.setInterval = (fn, delay) => { const id = ++nextTimer; timers.set(id, {fn, at: clock + delay, interval: delay}); return id; };
 globalThis.clearInterval = globalThis.clearTimeout;
 globalThis.WebSocket = class {
  constructor(url) { this.url = url; this.readyState = 0; this.bufferedAmount = 0; this.sent = []; this.closes = 0; sockets.push(this); }
  send(data) { if (this.failSend) throw Error('Broken connection'); this.sent.push(data); }
  close() { this.readyState = 3; this.closes++; this.onclose?.(); }
  open() { this.readyState = 1; this.onopen?.(); }
  receive(message) { this.onmessage?.({data: typeof message === 'string' ? message : JSON.stringify(message)}); }
 };
 const client = connectShowroom({url: 'wss://example.test/connect', onState: m => states.push(m), onStatus: s => statuses.push(s), onPose: p => poses.push(p), onChat: c => chats.push(c)});
 function tick(ms) {
  const until = clock + ms;
  for (;;) {
   const [id, timer] = [...timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0] || [];
   if (!timer) break;
   clock = timer.at;
   if (timer.interval) timer.at += timer.interval; else timers.delete(id);
   timer.fn();
  }
  clock = until;
 }
 function ready(ws = sockets.at(-1)) {
  ws.open(); ws.receive({type: 'welcome', id: 'player'});
  ws.receive({type: 'state', room: {revision: 1}, now: clock}); return ws;
 }
 t.after(() => {
  client.close(); Date.now = now; Math.random = random;
  for (const name of names) {
   if (originals[name]) Object.defineProperty(globalThis, name, originals[name]); else delete globalThis[name];
  }
 });
 return {client, sockets, timers, states, statuses, poses, chats, tick, ready};
}

test('leaving while reconnect is pending cannot reopen a room or retain input listeners', t => {
 const {client, ready, sockets, tick, timers, statuses} = fixture(t);
 ready().close(); assert.equal(statuses.at(-1), 'Reconnecting');
 client.close(); tick(120000);
 assert.equal(sockets.length, 1); assert.equal(timers.size, 0);
 assert.equal(window.listeners.size, 0); assert.equal(document.listeners.size, 0);
 assert.equal(client.online, false);
});

test('reconnection ignores late events and requires a fresh room snapshot', t => {
 const {client, ready, sockets, tick, states, chats, statuses} = fixture(t);
 const old = ready(); old.close(); tick(1000);
 const next = sockets[1]; next.open();
 assert.equal(client.online, false);
 const before = statuses.length;
 old.receive({type: 'state', room: {revision: 99}, now: Date.now()});
 old.receive({type: 'chat', text: 'stale'}); old.onerror(); old.onopen();
 assert.equal(states.length, 1); assert.equal(chats.length, 0); assert.equal(statuses.length, before);
 ready(next); assert.equal(client.online, true); assert.equal(sockets.length, 2);
});

test('heartbeat recovers a silent connection but healthy pongs preserve it', t => {
 const {ready, sockets, tick} = fixture(t);
 const ws = ready(); tick(25000); assert.equal(ws.sent.at(-1), 'ping');
 ws.receive('pong'); tick(25000); assert.equal(ws.closes, 0);
 tick(15000); assert.equal(ws.closes, 1);
 tick(1000); assert.equal(sockets.length, 2);
 assert.equal(new URL(sockets[1].url).search, new URL(ws.url).search);
});

test('background suspension does not falsely disconnect before a fresh foreground probe', t => {
 const {ready, sockets, tick} = fixture(t);
 const ws = ready(); tick(25000); document.hidden = true; tick(15000);
 assert.equal(ws.closes, 0);
 document.hidden = false; document.dispatch('visibilitychange');
 ws.receive('pong'); tick(9000);
 assert.equal(sockets.length, 1); assert.equal(ws.closes, 0);
});

test('congested movement retains only the latest pose and sends it when the buffer drains', t => {
 const {client, ready, tick} = fixture(t); const ws = ready();
 ws.bufferedAmount = 100000;
 for (let x = 0; x < 100; x++) client.send({type: 'pose', pose: {x}});
 tick(500); assert.equal(ws.sent.length, 0);
 ws.bufferedAmount = 0; tick(100);
 assert.deepEqual(ws.sent.map(JSON.parse), [{type: 'pose', pose: {x: 99}}]);
});

test('actions and chat are preserved and ordered after the latest queued position', async t => {
 const {client, ready} = fixture(t); const ws = ready(); ws.bufferedAmount = 100000;
 client.send({type: 'pose', pose: {x: 1}}); client.send({type: 'pose', pose: {x: 2}});
 client.send({type: 'chat', text: 'hello'});
 client.send({type: 'pose', pose: {x: 3}});
 const action = client.action({type: 'grab', slot: 1});
 const messages = ws.sent.map(JSON.parse);
 assert.deepEqual(messages.slice(0, 3), [{type: 'pose', pose: {x: 2}}, {type: 'chat', text: 'hello'}, {type: 'pose', pose: {x: 3}}]);
 assert.equal(messages[3].type, 'action');
 ws.receive({type: 'ack', requestId: messages[3].requestId, result: {id: 'card'}});
 assert.deepEqual(await action, {id: 'card'});
});

test('pending actions reject immediately on close and late acknowledgements do not settle them', async t => {
 const {client, ready, tick} = fixture(t); const ws = ready();
 const action = client.action({type: 'ritual'}), request = JSON.parse(ws.sent.at(-1));
 const rejection = assert.rejects(action, /Showroom closed/);
 client.close(); ws.receive({type: 'ack', requestId: request.requestId, result: {}}); tick(20000);
 await rejection;
});

test('a send failure rejects an action and schedules only one replacement connection', async t => {
 const {client, ready, sockets, tick} = fixture(t); const ws = ready(); ws.failSend = true;
 await assert.rejects(client.action({type: 'ritual'}), /Connection interrupted/);
 ws.onerror(); ws.onclose(); tick(1000);
 assert.equal(sockets.length, 2);
});

test('malformed packets are ignored without interrupting subsequent valid updates', t => {
 const {ready, poses, chats} = fixture(t); const ws = ready();
 ws.receive('not json'); ws.receive('null'); ws.receive({type: 'pose', id: 'peer', pose: {x: 1}});
 ws.receive({type: 'chat', id: 'peer', text: 'hello'});
 assert.equal(poses.length, 1); assert.equal(chats.length, 1);
});
