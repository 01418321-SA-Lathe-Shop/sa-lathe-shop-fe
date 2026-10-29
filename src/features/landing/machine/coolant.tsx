"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { seededRandom } from "../landing-geometry";
import { latheConfig, latheDuration, latheStages, sampleLathe } from "../process-config";
import { NOZZLE_TIP, toolFramePoint } from "./carriage-tool";
import { GRAVITY, TROUGH_FLOOR, TROUGH_FRONT } from "./chips";
import { alongTool, TOOL_ANGLE, type MotionProps } from "./primitives";

const up = new THREE.Vector3(0, 1, 0);
const tangent = new THREE.Vector3(0, Math.cos(TOOL_ANGLE), Math.sin(TOOL_ANGLE));
const STREAM_SHARE = 0.14;

/** Coolant: a continuous jet from the nozzle, droplets flung off the spinning part, and drips after shut-off. */
export function Coolant({ motion, mobile }: MotionProps) {
  const count = (mobile ? latheConfig.mobile : latheConfig.desktop).coolant;
  const drops = useRef<THREE.InstancedMesh>(null), jet = useRef<THREE.Mesh>(null), jetMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const seeds = useMemo(() => { const r = seededRandom(5150); return Array.from({ length: count }, () => [r(), r(), r(), r(), r()]); }, [count]);
  const scratch = useMemo(() => ({ dummy: new THREE.Object3D(), nozzle: new THREE.Vector3(), contact: new THREE.Vector3(), velocity: new THREE.Vector3(), dir: new THREE.Vector3() }), []);
  useFrame(() => {
    const time = motion.current.time, { dummy, nozzle, contact, velocity, dir } = scratch;
    const now = sampleLathe(time);
    if (jet.current && jetMaterial.current) {
      // Jet: a thin cylinder stretched between nozzle and tip, thickening with valve opening.
      toolFramePoint(now.toolX, now.toolR, NOZZLE_TIP, nozzle); alongTool(now.toolX, now.toolR, contact);
      dir.subVectors(contact, nozzle);
      jet.current.visible = now.coolant > 0.02;
      jet.current.position.lerpVectors(nozzle, contact, 0.5);
      const length = dir.length();
      jet.current.quaternion.setFromUnitVectors(up, dir.normalize());
      jet.current.scale.set(0.4 + now.coolant * 0.6, length, 0.4 + now.coolant * 0.6);
      jetMaterial.current.opacity = now.coolant * 0.45;
    }
    if (!drops.current) return;
    const life = latheConfig.effects.coolantLifetime;
    seeds.forEach(([a, b, c, d, e], i) => {
      const lifespan = e < 0.12 ? life * 1.6 : life;
      const age = (((time - (i / count) * lifespan) % lifespan) + lifespan) % lifespan, born = time - age;
      const q = born >= 0 && born <= latheDuration ? sampleLathe(born) : null;
      let size = 0;
      if (q && q.coolant > a * 0.98) {
        alongTool(q.toolX, q.toolR, contact);
        if (age < lifespan * STREAM_SHARE) {
          toolFramePoint(q.toolX, q.toolR, NOZZLE_TIP, nozzle);
          dummy.position.lerpVectors(nozzle, contact, age / (lifespan * STREAM_SHARE));
          velocity.subVectors(contact, nozzle).multiplyScalar(5);
        } else {
          // Splash: flung tangentially by the part, spread sideways, then gravity.
          const t = age - lifespan * STREAM_SHARE;
          velocity.copy(tangent).multiplyScalar(0.5 + b * 1.6);
          velocity.x += (c - 0.5) * 1.8; velocity.y += d * 0.7;
          dummy.position.copy(contact).addScaledVector(velocity, t);
          dummy.position.y -= 0.5 * GRAVITY * t * t; velocity.y -= GRAVITY * t;
          dummy.position.z = Math.min(TROUGH_FRONT, dummy.position.z);
        }
        size = dummy.position.y > TROUGH_FLOOR ? 1 : 0;
      } else if (q && born >= latheStages.retract.start && q.drip > e * 6 && e < 0.12) {
        // Drips: fall straight from where the nozzle was when they formed.
        toolFramePoint(q.toolX, q.toolR, NOZZLE_TIP, dummy.position);
        dummy.position.y -= 0.5 * GRAVITY * age * age;
        velocity.set(0, -GRAVITY * age, 0);
        size = dummy.position.y > TROUGH_FLOOR ? 0.8 : 0;
      }
      const speed = velocity.length();
      if (size > 0 && speed > 1e-4) dummy.quaternion.setFromUnitVectors(up, velocity.normalize());
      dummy.scale.set(0.0045 * size, (0.0045 + Math.min(speed, 3) * 0.01) * size, 0.0045 * size);
      dummy.updateMatrix(); drops.current!.setMatrixAt(i, dummy.matrix);
    });
    drops.current.instanceMatrix.needsUpdate = true;
  });
  return <>
    <instancedMesh ref={drops} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial color="#e3ece8" metalness={0} roughness={0.04} transparent opacity={0.62} envMapIntensity={2.2} />
    </instancedMesh>
    <mesh ref={jet} visible={false}>
      <cylinderGeometry args={[0.012, 0.016, 1, 10, 1, true]} />
      <meshStandardMaterial ref={jetMaterial} color="#e3ece8" metalness={0} roughness={0.03} transparent opacity={0} envMapIntensity={2.4} depthWrite={false} />
    </mesh>
  </>;
}
