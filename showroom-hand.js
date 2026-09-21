import { createShowroomHandState } from './showroom-hand-state.mjs';

export function createShowroomHand(adapter) {
  const state = createShowroomHandState();
  const tray = document.createElement('div');
  tray.id = 'showroomHand'; tray.hidden = true;
  tray.setAttribute('role', 'group'); tray.setAttribute('aria-label', 'Cards in your hand');
  const announcement = document.createElement('div');
  announcement.id = 'showroomHandStatus'; announcement.setAttribute('role', 'status');
  const returnZone = document.createElement('div');
  returnZone.id = 'showroomHandReturnZone'; returnZone.hidden = true;
  returnZone.textContent = 'Return to Binder';
  document.body.append(tray, announcement, returnZone);
  const button = document.createElement('button');
  button.id = 'showroomHandButton'; button.className = 'icon-button'; button.type = 'button';
  button.innerHTML = document.querySelector('#binderOpenCardButton').innerHTML;
  document.querySelector('#favoriteButton').after(button);
  let busy = false, drag = null, choice = null;
  const placed = new Set();
  const available = () => state.cards.filter(card => !placed.has(card.key));
  function finishChoice(){const previous=choice;choice=null;document.body.classList.remove('showroom-hand-choosing');previous?.cancel();if(previous&&!previous.resumed)previous.resume?.();refresh();}
  let swallowBackgroundClick=false;
  document.addEventListener('pointerdown',event=>{
    swallowBackgroundClick=false;
    if(!choice || busy || event.target.closest('button,a,input,select,textarea,[role="button"],.showroom-hand-card'))return;
    // Consume the whole gesture so cancelling over a column cannot also open
    // that now-empty column again when the corresponding click arrives.
    swallowBackgroundClick=true;event.preventDefault();event.stopImmediatePropagation();finishChoice();
  },true);
  document.addEventListener('click',event=>{
    if(!swallowBackgroundClick)return;
    swallowBackgroundClick=false;event.preventDefault();event.stopImmediatePropagation();
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&choice&&!busy){event.preventDefault();finishChoice();}});
  async function chooseCard(card) {
    if(!choice)return;
    choice.resume?.();choice.resumed=true;
    let destination;
    try {destination=await choice.place(card);}
    catch(error){choice.resumed=false;document.exitPointerLock?.();throw error;}
    const node=nodes.get(card.key);
    node.style.visibility='hidden';
    try {await fly(card,node.getBoundingClientRect(),destination.rect);destination.commit();placed.add(card.key);finishChoice();}
    catch(error){destination.cancel();throw error;}
    finally{node.style.visibility='';}
  }
  const nodes = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function refresh() {
    button.setAttribute('aria-label', state.selected ? 'Put card back in its binder' : 'Take card into your hand');
    button.title = button.getAttribute('aria-label');
    button.disabled = busy || !adapter.currentCard();
    document.querySelector('#cardBinderReturnButton').setAttribute('aria-label', state.selected ? 'Return card to your hand' : 'Back to binder position');
    document.body.classList.toggle('showroom-hand-interactive', !document.pointerLockElement);
    document.body.classList.toggle('showroom-hand-view', Boolean(state.selected));
    tray.hidden = available().length === 0;
    const keys = new Set(available().map(card => card.key));
    for (const [key, node] of nodes) if (!keys.has(key)) { node.remove(); nodes.delete(key); }
    const count = available().length;
    const step = Math.min(choice ? 150 : 62, Math.max(8, (innerWidth - 190) / Math.max(1, count - 1)));
    available().forEach((card, index) => {
      let node = nodes.get(card.key);
      if (!node) {
        node = document.createElement('button'); node.type = 'button'; node.className = 'showroom-hand-card';
        node.dataset.handKey = card.key;
        node.setAttribute('aria-label', `View ${card.title} from ${card.origin.label || 'binder'}`);
        const image = document.createElement('img'); image.src = card.image; image.alt = card.title;
        image.draggable = false; image.decoding = 'async'; node.append(image);
        node.addEventListener('pointerdown', event => beginDrag(event, card, node));
        node.addEventListener('click', event => { if(choice) void run(()=>chooseCard(card)); else if (event.detail === 0) void run(() => show(card)); });
        nodes.set(card.key, node); tray.append(node);
      }
      const offset = index - (count - 1) / 2;
      node.style.setProperty('--hand-x', `${offset * step}px`);
      node.style.setProperty('--hand-angle', `${Math.max(-16, Math.min(16, offset * 4))}deg`);
      node.style.setProperty('--hand-order', index + 1);
      node.disabled = busy;
    });
  }

  async function run(action) {
    if (busy || adapter.transitioning()) return;
    busy = true; adapter.controlsDisabled(true); refresh();
    try { await action(); }
    catch (error) { announcement.textContent = 'Could not move this card. Please try again.'; console.warn(error); }
    finally {
      busy = false; document.body.classList.remove('showroom-hand-transfer');
      adapter.controlsDisabled(false); refresh();
    }
  }

  async function fly(card, from, to, fade = false) {
    if (!from?.width || !to?.width || reduced.matches) return;
    const image = document.createElement('img'); image.className = 'showroom-hand-flight';
    image.src = card.image; image.alt = '';
    Object.assign(image.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
    document.body.append(image);
    try {
      await image.animate([
        { transform: 'translate(0,0) scale(1,1)', opacity: 1 },
        { transform: `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${to.width / from.width},${to.height / from.height})`, opacity: fade ? 0 : 1 },
      ], { duration: 420, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'forwards' }).finished;
    } finally { image.remove(); }
  }

  async function take() {
    const card = adapter.currentCard(), origin = adapter.binder();
    if (!card || !origin || state.has(origin, card.stableId)) return;
    const from = adapter.cardRect();
    const held = state.add(origin, card); refresh();
    document.body.classList.add('showroom-hand-transfer');
    const node = nodes.get(held.key), to = node.getBoundingClientRect();
    node.style.visibility = 'hidden';
    try {
      await Promise.all([adapter.take(), fly(held, from, to)]);
      announcement.textContent = `${held.title} added to your hand.`;
    } catch (error) { state.remove(held.key); throw error; }
    finally { node.style.visibility = ''; adapter.slotsChanged(); }
  }

  async function show(card, from = nodes.get(card.key)?.getBoundingClientRect()) {
    const previous = state.selected;
    state.select(card.key);
    try {
      await adapter.open(card);
      document.body.classList.add('showroom-hand-transfer');
      await fly(card, from, adapter.cardRect());
    } catch (error) {
      state.select(previous?.key || null);
      if (!previous) await adapter.close();
      throw error;
    }
  }

  async function returnToHand() {
    const card = state.selected;
    if (!card) return;
    const from = adapter.cardRect();
    document.body.classList.add('showroom-hand-transfer');
    const to = nodes.get(card.key).getBoundingClientRect();
    await Promise.all([adapter.close(), fly(card, from, to)]);
    state.select(null);
  }

  async function putBack() {
    const card = state.selected;
    if (!card) return;
    const from = adapter.cardRect();
    document.body.classList.add('showroom-hand-transfer');
    await Promise.all([adapter.close(), fly(card, from,
      { left: innerWidth / 2 - 15, top: innerHeight * .6, width: 30, height: 42 }, true)]);
    state.remove(card.key); adapter.slotsChanged();
    announcement.textContent = `${card.title} returned to its binder.`;
  }

  function beginDrag(event, card, node) {
    if (choice) return;
    if (busy || adapter.transitioning() || event.button > 0 || document.pointerLockElement) return;
    event.preventDefault(); event.stopPropagation();
    const rect = node.getBoundingClientRect();
    const preview = document.createElement('img'); preview.className = 'showroom-hand-flight';
    preview.src = card.image; preview.alt = '';
    Object.assign(preview.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    document.body.append(preview); node.style.visibility = 'hidden';
    drag = { pointerId: event.pointerId, card, node, preview, rect, x: event.clientX, y: event.clientY, moved: false };
    returnZone.hidden = false;
    node.setPointerCapture(event.pointerId);
  }
  tray.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    drag.moved ||= Math.hypot(dx, dy) > 8;
    drag.preview.style.transform = `translate(${dx}px,${dy}px)`;
    returnZone.classList.toggle('is-over', overReturnZone(event));
    event.preventDefault();
  });
  function overReturnZone(event) {
    const rect = returnZone.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
  }
  async function dropBack(finished, from) {
    finished.node.style.visibility = 'hidden';
    try {
      await fly(finished.card, from, from, true);
      state.remove(finished.card.key); adapter.slotsChanged();
      announcement.textContent = `${finished.card.title} returned to its binder.`;
    } finally { finished.node.style.visibility = ''; }
  }
  function endDrag(event, cancelled = false) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const finished = drag; drag = null;
    const from = finished.preview.getBoundingClientRect();
    const returning = !cancelled && finished.moved && overReturnZone(event);
    returnZone.hidden = true; returnZone.classList.remove('is-over');
    finished.preview.remove(); finished.node.style.visibility = '';
    if (finished.node.hasPointerCapture(event.pointerId)) finished.node.releasePointerCapture(event.pointerId);
    if (returning) {
      void run(() => dropBack(finished, from));
    } else if (!cancelled && (!finished.moved || event.clientY < innerHeight - Math.min(150, innerHeight * .2))) {
      void run(() => show(finished.card, from));
    }
    event.preventDefault(); event.stopPropagation();
  }
  tray.addEventListener('pointerup', event => endDrag(event));
  tray.addEventListener('pointercancel', event => endDrag(event, true));
  tray.addEventListener('lostpointercapture', event => endDrag(event, true));
  button.onclick = () => void run(state.selected ? putBack : take);
  document.addEventListener('pointerlockchange', refresh);
  window.addEventListener('resize', refresh);
  refresh();
  return {
    get viewing() { return state.selected; },
    get busy() { return busy; },
    has: (origin, stableId) => state.has(origin, stableId),
    get cards() { return available(); },
    choose(place,cancel,resume){if(busy)return;announcement.textContent='Choose a card from your hand to place on the column.';choice={place,cancel,resume,resumed:false};document.body.classList.add('showroom-hand-choosing');refresh();},
    restore(key){placed.delete(key);refresh();},
    returnToBinders(keys){
      for(const key of keys)if(placed.has(key)){placed.delete(key);state.remove(key);}
      adapter.slotsChanged();refresh();announcement.textContent='The ritual is complete. All three cards have returned to their binders.';
    },
    refresh,
    close: () => run(returnToHand),
    navigate: direction => run(async () => {
      const cards=available();
      const index=cards.indexOf(state.selected);
      const next=cards[(index+Math.sign(direction)+cards.length)%cards.length];
      if (next && next !== state.selected) await show(next, null);
    }),
  };
}
