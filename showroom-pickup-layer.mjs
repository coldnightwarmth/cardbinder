// Draw a moving binder after the world with a fresh depth buffer. Its own
// covers/pages still depth-test normally, unlike disabling depth on materials.
export function createShowroomPickupLayer({ scene, renderer, lights }) {
  const foreground = scene.clone(false);
  foreground.background = null;
  const lighting = lights.map(source => {
    const copy = source.clone();
    foreground.add(copy);
    if (copy.target) foreground.add(copy.target);
    return { source, copy };
  });
  let moving = null;
  return {
    begin(object) {
      if (moving) throw new Error('A binder pickup is already active');
      const parent = object.parent;
      foreground.attach(object);
      moving = object;
      let finished = false;
      return () => {
        if (finished) return;
        finished = true;
        if (parent) parent.attach(object);
        else foreground.remove(object);
        moving = null;
      };
    },
    render(drawWorld, camera) {
      drawWorld();
      if (!moving?.visible) return;
      foreground.environment = scene.environment;
      foreground.fog = scene.fog;
      for (const { source, copy } of lighting) {
        copy.color.copy(source.color);
        copy.intensity = source.intensity;
        if (copy.groundColor) copy.groundColor.copy(source.groundColor);
      }
      const autoClear = renderer.autoClear;
      try {
        renderer.autoClear = false;
        // Keep the finished room color, discard table depth and doorway stencil.
        renderer.clear(false, true, true);
        renderer.render(foreground, camera);
      } finally {
        renderer.autoClear = autoClear;
      }
    },
  };
}
