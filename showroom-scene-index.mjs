// Track membership when the graph changes, rather than recursively walking it
// for every portal/reflection pass. Materials are read at draw time because
// exhibit LODs temporarily replace them without changing graph membership.
export function createSceneIndex(root, onAdd = () => {}) {
  const objects = new Set(), renderables = new Set(), reflectionExcluded = new Set();
  function added(event) { register(event.child); }
  function removed(event) { unregister(event.child); }
  function register(object) {
    if (objects.has(object)) return;
    objects.add(object);
    if (object.isMesh || object.isLine || object.isPoints || object.isSprite || object.material) renderables.add(object);
    if (object.userData.excludeFloorReflection) reflectionExcluded.add(object);
    object.addEventListener('childadded', added);
    object.addEventListener('childremoved', removed);
    onAdd(object);
    for (const child of object.children) register(child);
  }
  function unregister(object) {
    if (!objects.delete(object)) return;
    renderables.delete(object); reflectionExcluded.delete(object);
    object.removeEventListener('childadded', added);
    object.removeEventListener('childremoved', removed);
    for (const child of object.children) unregister(child);
  }
  register(root);
  return { objects, renderables, reflectionExcluded, dispose() { unregister(root); } };
}
