import * as THREE from 'three';

// One immutable buffer and one draw call. Wrapping happens outside the visible
// radius so walking across the floor never reveals a particle-field boundary.
export function createShowroomStars() {
  const count = 36000, span = 120;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  let state = 0x5a17;
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - .5) * span;
    positions[i * 3 + 1] = -2.5 - Math.pow(random(), 1.5) * 65;
    positions[i * 3 + 2] = (random() - .5) * span;
    seeds.set([random() * Math.PI * 2, .55 + random() * .8, .65 + random() * .8], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthTest: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: {
      time: { value: 0 }, center: { value: new THREE.Vector2() },
      pixelRatio: { value: 1 }, strength: { value: .7 },
    },
    vertexShader: `
      attribute vec3 seed;
      uniform float time, pixelRatio;
      uniform vec2 center;
      varying float glow;
      void main() {
        vec3 p = position;
        p.xz = mod(p.xz - center + 60., 120.) - 60. + center;
        float radius = length(p.xz - center);
        p.y += sin(time * .35 * seed.y + seed.x + p.x * .06) * .10;
        p.x += sin(time * .19 + seed.x) * .045;
        vec4 view = modelViewMatrix * vec4(p, 1.);
        float distance = -view.z;
        float pulse = .5 + .5 * sin(time * seed.y + seed.x);
        glow = (.24 + .66 * pow(pulse, 5.))
          * (1. - smoothstep(38., 55., radius))
          * smoothstep(.6, 2.3, distance);
        gl_PointSize = clamp(seed.z * 60. / max(distance, 1.), 2., 10.) * pixelRatio;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: `
      uniform float strength;
      varying float glow;
      void main() {
        vec2 p = gl_PointCoord * 2. - 1.;
        float r = length(p);
        float halo = exp(-r*r*6.) * .25;
        float core = exp(-r*r*42.);
        float rays = exp(-abs(p.x)*35.) * pow(max(0., 1.-abs(p.y)), 4.)
                   + exp(-abs(p.y)*35.) * pow(max(0., 1.-abs(p.x)), 4.);
        float alpha = (halo + core * .65 + rays * .19) * glow * strength;
        alpha *= 1. - smoothstep(.75, 1., r);
        if(alpha < .003) discard;
        gl_FragColor = vec4(1., 1., 1., alpha);
      }
    `,
  });
  const stars = new THREE.Points(geometry, material);
  stars.name = 'showroom-star-field';
  stars.frustumCulled = false;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  return {
    object: stars,
    update(now, camera, renderer) {
      material.uniforms.time.value = motion.matches ? 0 : now * .001;
      material.uniforms.center.value.set(camera.position.x, camera.position.z);
      material.uniforms.pixelRatio.value = Math.min(renderer.getPixelRatio(), 2);
    },
    theme(light) { material.uniforms.strength.value = light ? .95 : .7; },
  };
}
