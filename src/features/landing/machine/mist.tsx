"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { seededRandom } from "../landing-geometry";
import { latheConfig, latheDuration, sampleLathe } from "../process-config";
import type { MotionProps } from "./primitives";

/** Oil mist and dust lit by the work lamp: soft additive points, drifting slowly. Desktop only. */
export function Mist({ motion }: Pick<MotionProps, "motion">) {
  const count = latheConfig.desktop.mist;
  const dpr = useThree(state => state.viewport.dpr), points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const r = seededRandom(2024), base = new Float32Array(count * 3), phase = new Float32Array(count);
    for (let i = 0; i < count; i++) { base.set([-2.4 + r() * 5, -0.8 + r() * 2.4, -1 + r() * 2.2], i * 3); phase[i] = r() * 100; }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(base, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    return g;
  }, [count]);
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLevel: { value: 0.3 }, uScale: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aPhase; uniform float uTime; uniform float uScale; varying float vFade;
      void main() {
        vec3 p = position + vec3(sin(uTime * 0.21 + aPhase) * 0.35, mod(uTime * ${latheConfig.effects.mistDrift.toFixed(3)} + aPhase, 2.4) - 1.2, cos(uTime * 0.17 + aPhase) * 0.25);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFade = 0.5 + 0.5 * sin(uTime * 0.6 + aPhase * 3.0);
        gl_PointSize = uScale * (4.0 + mod(aPhase, 1.0) * 6.0) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float uLevel; varying float vFade;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * uLevel * (0.4 + vFade * 0.6);
        gl_FragColor = vec4(1.0, 0.8, 0.62, a * 0.16); }`,
  }), []);
  useLayoutEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame(() => {
    // Mist thickens while coolant runs; dust alone remains faintly visible.
    const p = sampleLathe(motion.current.time, motion.current.cycle), shader = points.current?.material as THREE.ShaderMaterial | undefined;
    if (!shader) return;
    shader.uniforms.uTime.value = motion.current.cycle * latheDuration + motion.current.time;
    shader.uniforms.uLevel.value = 0.35 + p.coolant * 0.65 + p.drip * 0.3;
    shader.uniforms.uScale.value = dpr * 10;
  });
  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
