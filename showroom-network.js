const POSE_BUFFER_LIMIT = 64 * 1024;
const POSE_RETRY_MS = 100;
const HEARTBEAT_MS = 25000;
const PONG_TIMEOUT_MS = 15000;

export function connectShowroom({url, onState, onPose, onStatus, onChat}) {
 const session = crypto.randomUUID();
 const pending = new Map();
 let id = null, socket, closed = false, delay = 1000, room = null, offset = 0;
 let reconnectTimer, poseTimer, pongTimer, queuedPose = null, synchronized = false;
 let lastActivity = 0;

 function rejectPending(message) {
  for (const p of pending.values()) { clearTimeout(p.timer); p.reject(Error(message)); }
  pending.clear();
 }
 function clearConnectionWork() {
  clearTimeout(poseTimer); poseTimer = undefined; queuedPose = null;
  clearTimeout(pongTimer); pongTimer = undefined;
  synchronized = false;
 }
 function retry() {
  if (closed || reconnectTimer !== undefined) return;
  onStatus('Reconnecting');
  // Spread reconnects after an outage instead of waking the entire room together.
  const wait = delay * (0.8 + Math.random() * 0.4);
  delay = Math.min(delay * 1.5, 15000);
  reconnectTimer = setTimeout(() => { reconnectTimer = undefined; connect(); }, wait);
 }
 function disconnect(current) {
  if (closed || current !== socket) return;
  clearConnectionWork();
  rejectPending('Connection interrupted. Please try again.');
  // Detach before closing: browsers may deliver late events from this socket.
  socket = undefined;
  try { current.close(); } catch {}
  retry();
 }
 function transmit(data) {
  if (closed || socket?.readyState !== 1) return false;
  const current = socket;
  try { current.send(data); return true; }
  catch { disconnect(current); return false; }
 }
 function flushPose(force = false) {
  clearTimeout(poseTimer); poseTimer = undefined;
  if (!queuedPose || closed || socket?.readyState !== 1) return;
  if (!force && socket.bufferedAmount > POSE_BUFFER_LIMIT) {
   poseTimer = setTimeout(() => flushPose(), POSE_RETRY_MS);
   return;
  }
  const data = queuedPose; queuedPose = null;
  transmit(data);
 }
 function heartbeat() {
  if (closed || socket?.readyState !== 1 || pongTimer !== undefined) return;
  const current = socket;
  if (!transmit('ping')) return;
  pongTimer = setTimeout(() => {
   pongTimer = undefined;
   // Background tabs can suspend their message/timer delivery. Probe afresh on return.
   if (!document.hidden) disconnect(current);
  }, PONG_TIMEOUT_MS);
 }
 function visibility() {
  if (document.hidden) return;
  clearTimeout(pongTimer); pongTimer = undefined;
  heartbeat();
 }
 function connect() {
  if (closed) return;
  onStatus('Connecting');
  let current;
  try { current = new WebSocket(`${url}?session=${session}`); }
  catch { retry(); return; }
  socket = current;
  current.onopen = () => {
   if (closed || current !== socket) return;
   onStatus('Online');
  };
  current.onmessage = event => {
   if (closed || current !== socket) return;
   if (event.data === 'pong') { clearTimeout(pongTimer); pongTimer = undefined; return; }
   let m; try { m = JSON.parse(event.data); } catch { return; }
   if (!m || typeof m !== 'object') return;
   if (m.type === 'welcome') id = m.id;
   else if (m.type === 'state') {
    room = m.room; offset = m.now - Date.now(); synchronized = true; delay = 1000;
    onState(m, id);
   }
   else if (m.type === 'pose' || m.type === 'leave') onPose(m);
   else if (m.type === 'chat') onChat?.(m);
   else if (m.type === 'ack') {
    const p = pending.get(m.requestId);
    if (p) {
     clearTimeout(p.timer); pending.delete(m.requestId);
     m.error ? p.reject(Error(m.error)) : p.resolve(m.result);
    }
   }
  };
  current.onclose = () => disconnect(current);
  current.onerror = () => disconnect(current);
 }
 function activity(event) {
  if (!event.isTrusted || document.hidden || Date.now() - lastActivity < 10000) return;
  lastActivity = Date.now(); transmit(JSON.stringify({type: 'activity'}));
 }
 const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'wheel'];
 for (const type of activityEvents) window.addEventListener(type, activity, {passive: true});
 document.addEventListener('visibilitychange', visibility);
 const heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
 connect();
 return {
  get id() { return id; }, get room() { return room; },
  get online() { return !closed && socket?.readyState === 1 && synchronized; },
  now: () => Date.now() + offset,
  send(message) {
   if (closed || socket?.readyState !== 1) return;
   if (message.type === 'pose') {
    // Poses describe current state: retain only the latest while a connection drains.
    queuedPose = JSON.stringify(message); flushPose();
   } else {
    // Reliable events stay ordered after the latest position (important for proximity checks).
    flushPose(true); transmit(JSON.stringify(message));
   }
  },
  action(action) {
   return new Promise((resolve, reject) => {
    if (closed || socket?.readyState !== 1) return reject(Error('Showroom is reconnecting. Please try again.'));
    flushPose(true);
    const requestId = crypto.randomUUID();
    const timer = setTimeout(() => {
     pending.delete(requestId); reject(Error('Request timed out. Please try again.'));
    }, 10000);
    pending.set(requestId, {resolve, reject, timer});
    if (!transmit(JSON.stringify({type: 'action', requestId, action}))) {
     clearTimeout(timer); pending.delete(requestId);
     reject(Error('Connection interrupted. Please try again.'));
    }
   });
  },
  close() {
   if (closed) return;
   closed = true;
   for (const type of activityEvents) window.removeEventListener(type, activity);
   document.removeEventListener('visibilitychange', visibility);
   clearInterval(heartbeatTimer); clearTimeout(reconnectTimer); reconnectTimer = undefined;
   clearConnectionWork(); rejectPending('Showroom closed.');
   const current = socket; socket = undefined;
   try { current?.close(); } catch {}
  }
 };
}
