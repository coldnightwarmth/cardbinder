// Clear-card studio highlights are local to the material: they do not light
// the white room, add shadow passes, or depend on which portal camera renders.
export function applyPedestalResinLighting(material, THREE) {
  if (!material.isMeshPhysicalMaterial || !material.transmission || material.userData.pedestalResinLighting) return;
  material.userData.pedestalResinLighting = true;
  // The individual canvas stores unscaled highlight RGB alongside its
  // translucent alpha. Reproduce that composition in the room framebuffer.
  material.transparent = true;
  material.blending = THREE.CustomBlending;
  material.blendSrc = THREE.OneFactor;
  material.blendDst = THREE.OneMinusSrcAlphaFactor;
  material.blendEquation = THREE.AddEquation;
  const previousCompile = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = function(shader, renderer) {
    previousCompile.call(this, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      `#include <lights_fragment_begin>
#if defined( RE_Direct )
      // Same key/rim directions and center irradiance as the individual
      // viewer's 17-intensity point and 110-intensity spot lights. Use view
      // space so rotating a pedestal card reveals its sculpted highlights.
      IncidentLight resinStudioLight;
      resinStudioLight.visible = true;
      resinStudioLight.direction = normalize(vec3(-3.9, 5.5, 3.0));
      resinStudioLight.color = vec3(17.0 / pow(length(vec3(-3.9, 5.5, 3.0)), 0.4));
      RE_Direct(resinStudioLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
      resinStudioLight.direction = normalize(vec3(-3.0, 4.0, 4.0));
      resinStudioLight.color = vec3(0.57758, 0.72306, 1.0) * (110.0 / 41.0);
      RE_Direct(resinStudioLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
#endif`,
    ).replace(
      '#include <transmission_pars_fragment>',
      THREE.ShaderChunk.transmission_pars_fragment.replace(
        'return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );',
        // Slightly lighter than the viewer backdrop (#1f1f1f instead of #191919);
        // retain its alpha and the existing highlight composition.
        'return vec4(vec3(0.013702083), 0.3);',
      ),
    );
  };
  material.customProgramCacheKey = () => `${previousKey}|pedestal-resin-composite-5`;
  material.needsUpdate = true;
}
