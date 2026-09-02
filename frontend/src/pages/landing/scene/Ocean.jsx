/* Ocean — a cold, calm Antarctic sea.

   A single plane with a small custom shader: three summed sine waves in
   the vertex stage, fresnel + a low sun glint in the fragment stage. One
   draw call, no reflection probes, no normal-map textures. Calm enough to
   read as workable water for a research vessel rather than open storm. */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DoubleSide } from 'three';

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying float vWave;

  float wave(vec2 p, vec2 dir, float freq, float speed, float amp, float t) {
    return sin(dot(p, dir) * freq + t * speed) * amp;
  }

  void main() {
    vec3 pos = position;
    vec2 p = pos.xy;

    float h  = wave(p, normalize(vec2( 1.0, 0.35)), 0.020, 0.9, 1.9, uTime);
    h       += wave(p, normalize(vec2(-0.5, 1.00)), 0.034, 1.3, 1.1, uTime);
    h       += wave(p, normalize(vec2( 0.8,-0.60)), 0.062, 1.9, 0.45, uTime);

    pos.z += h;
    vWave = h;

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uSun;
  varying vec3 vWorld;
  varying float vWave;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorld);
    // Cheap fresnel against a flat-ish surface
    float fres = pow(1.0 - clamp(viewDir.y, 0.0, 1.0), 2.4);

    float crest = smoothstep(0.6, 2.6, vWave);
    vec3 col = mix(uDeep, uShallow, clamp(vWave * 0.18 + 0.5, 0.0, 1.0));
    col = mix(col, uShallow, fres * 0.55);
    col += uSun * crest * 0.20;

    // Fade the far field into the fog colour so the horizon reads soft
    float dist = length(vWorld.xz);
    float haze = smoothstep(500.0, 1500.0, dist);
    col = mix(col, vec3(0.90, 0.94, 0.97), haze);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function Ocean({ quality = 'high' }) {
  const matRef = useRef(null);
  const seg = quality === 'low' ? 64 : 150;

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uShallow: { value: new Color('#bcd8ec') },
    uDeep: { value: new Color('#6f9dc0') },
    uSun: { value: new Color('#ffffff') },
  }), []);

  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={false}>
      <planeGeometry args={[3000, 3000, seg, seg]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={DoubleSide}
      />
    </mesh>
  );
}
