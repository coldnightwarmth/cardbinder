// Card models retain their own animation/matrix updates. Only GPU preparation
// is serialized: one texture upload or shader submission per animation frame,
// with the destination room's lights/environment used for compilation.
export function createDisplayPreparer({renderer,camera,scene,nextFrame=()=>new Promise(resolve=>{
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(resolve);else resolve();
})}) {
  const uploaded=new WeakMap();
  let queue=Promise.resolve();
  return (display,isCurrent=()=>true)=>{
    const prepare=queue.catch(()=>{}).then(async()=>{
      if(!isCurrent())return false;
      const textures=new Set();
      display.group.traverse(object=>{
        for(const material of [].concat(object.material||[])) {
          for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
          for(const uniform of Object.values(material.uniforms||{}))if(uniform.value?.isTexture)textures.add(uniform.value);
        }
      });
      for(const texture of textures) {
        if(uploaded.get(texture)===texture.version)continue;
        await nextFrame();if(!isCurrent())return false;
        if(uploaded.get(texture)!==texture.version){renderer.initTexture?.(texture);uploaded.set(texture,texture.version);}
      }
      await nextFrame();if(!isCurrent())return false;
      await renderer.compileAsync?.(display.group,camera,scene);
      return isCurrent();
    });
    queue=prepare;return prepare;
  };
}
