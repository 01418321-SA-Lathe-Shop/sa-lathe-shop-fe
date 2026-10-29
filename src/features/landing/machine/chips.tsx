"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { seededRandom } from "../landing-geometry";
import { latheConfig, latheStages, sampleLathe } from "../process-config";
import { alongTool, toolDirection, TOOL_ANGLE, type MotionProps } from "./primitives";

export const TROUGH_FLOOR = -1.46, TROUGH_FRONT = 0.84, GRAVITY = 9;
const tangent = new THREE.Vector3(0, Math.cos(TOOL_ANGLE), Math.sin(TOOL_ANGLE));

/** A short curled "6"-shaped chip: a helical ribbon that tightens toward its end. */
function chipGeometry() {
  const steps = 22, positions: number[] = [], index: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const s = i / steps, phi = s * Math.PI * 2.4, radius = 0.034 - s * 0.014;
    const c = new THREE.Vector3(Math.cos(phi) * radius, s * 0.03, Math.sin(phi) * radius);
    positions.push(c.x, c.y - 0.007, c.z, c.x, c.y + 0.007, c.z);
    if (i < steps) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index); geometry.computeVertexNormals();
  return geometry;
}

/** Deterministic chip flight: emitted at the tip while cutting, ballistic, then resting on the trough floor. */
export function Chips({ motion, mobile }: MotionProps) {
  const count = (mobile ? latheConfig.mobile : latheConfig.desktop).chips;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => chipGeometry(), []);
  const seeds = useMemo(() => { const r = seededRandom(733); return Array.from({ length: count }, () => [r(), r(), r(), r(), r(), r()]); }, [count]);
  const scratch = useMemo(() => ({ dummy: new THREE.Object3D(), contact: new THREE.Vector3(), velocity: new THREE.Vector3() }), []);
  useLayoutEffect(() => {
    // Mostly bright aluminium with a few straw-tinted chips that ran hotter.
    const color = new THREE.Color();
    seeds.forEach((seed, i) => mesh.current?.setColorAt(i, seed[5] > 0.84 ? color.set("#c8a56c") : color.setScalar(0.72 + seed[5] * 0.3)));
    if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    return () => geometry.dispose();
  }, [seeds, geometry]);
  useFrame(() => {
    if (!mesh.current) return;
    const time = motion.current.time, life = latheConfig.effects.chipLifetime, { dummy, contact, velocity } = scratch;
    seeds.forEach(([a, b, c, d, e], i) => {
      const age = (((time - (i / count) * life) % life) + life) % life, born = time - age;
      const q = born >= latheStages.turn.start && born < latheStages.retract.start ? sampleLathe(born) : null;
      if (!q || !q.cutting) { dummy.scale.setScalar(0); dummy.updateMatrix(); mesh.current!.setMatrixAt(i, dummy.matrix); return; }
      alongTool(q.toolX, q.toolR, contact);
      velocity.copy(tangent).multiplyScalar(1.1 + a * 1.3).addScaledVector(toolDirection, 0.2 + b * 0.5);
      velocity.x += (c - 0.25) * 0.9;
      const land = (velocity.y + Math.sqrt(velocity.y ** 2 + 2 * GRAVITY * (contact.y - TROUGH_FLOOR))) / GRAVITY;
      const flight = Math.min(age, land);
      dummy.position.copy(contact).addScaledVector(velocity, flight);
      dummy.position.y -= 0.5 * GRAVITY * flight * flight;
      dummy.position.z = Math.min(TROUGH_FRONT, dummy.position.z);
      dummy.rotation.set(flight * (9 + d * 14), flight * (6 + e * 10), flight * 11);
      // Shrink only at the very end of life, as if the chip slid under the pile.
      dummy.scale.setScalar((1.4 + e * 0.9) * Math.min(1, (life - age) / (life * 0.15)));
      dummy.updateMatrix(); mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false} castShadow>
    <meshStandardMaterial metalness={1} roughness={0.28} side={THREE.DoubleSide} />
  </instancedMesh>;
}
