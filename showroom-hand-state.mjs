export function showroomBinderKey(entry) {
  return entry?.walletAddress ? `wallet:${entry.walletAddress}`
    : entry?.collectionId ? `collection:${entry.collectionId}` : '';
}

// A card is borrowed from one particular binder, not removed from the catalog.
export function createShowroomHandState() {
  const cards = new Map();
  let selected = null;
  const keyFor = (origin, stableId) => JSON.stringify([showroomBinderKey(origin), stableId]);
  return {
    get cards() { return [...cards.values()]; },
    get selected() { return cards.get(selected) || null; },
    has(origin, stableId) { return cards.has(keyFor(origin, stableId)); },
    add(origin, card) {
      if (!showroomBinderKey(origin) || !card?.stableId) throw new Error('Missing card source');
      const key = keyFor(origin, card.stableId);
      if (!cards.has(key)) cards.set(key, { ...card, key, origin: { ...origin } });
      return cards.get(key);
    },
    select(key) {
      if (key !== null && !cards.has(key)) throw new Error('Card is no longer in hand');
      selected = key;
      return cards.get(key) || null;
    },
    adjacent(direction) {
      const values = [...cards.values()];
      if (!values.length) return null;
      const index = Math.max(0, values.findIndex(card => card.key === selected));
      return values[(index + Math.sign(direction) + values.length) % values.length];
    },
    remove(key) {
      const card = cards.get(key);
      cards.delete(key);
      if (selected === key) selected = null;
      return card;
    },
  };
}
