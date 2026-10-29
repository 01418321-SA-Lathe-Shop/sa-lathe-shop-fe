"use client";

import { useLayoutEffect,useMemo,useRef,type RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { type ProcessMotion } from "../process-config";
import { Metal } from "../process-materials";



export type MotionProps = { motion: RefObject<ProcessMotion>; mobile: boolean };

export const steel = "#879398", casing = "#171f23", orange = "#ff852e";

export function Box({ at, size, color = casing }: { at: [number, number, number]; size: [number, number, number]; color?: string }) {
  const [width, height, depth] = size;
  const geometry = useMemo(() => new RoundedBoxGeometry(width, height, depth, 2, Math.min(0.045, width / 5, height / 5, depth / 5)), [width, height, depth]);
  return <mesh position={at} geometry={geometry} castShadow receiveShadow><Metal color={color} metalness={0.85} roughness={0.3} /></mesh>;
}

export function Joint({ at, radius = 0.22 }: { at: [number, number, number]; radius?: number }) {
  return <group position={at}>
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[radius, radius, 0.46, 32]} /><Metal color={steel} metalness={0.95} roughness={0.3} /></mesh>
    <mesh position={[0, 0, 0.25]}><torusGeometry args={[radius * 0.72, 0.025, 8, 32]} /><Metal color="#151a1c" metalness={0.75} roughness={0.5} /></mesh>
    <Fasteners points={Array.from({ length: 6 }, (_, i) => [Math.cos(i * Math.PI / 3) * radius * 0.72, Math.sin(i * Math.PI / 3) * radius * 0.72, 0.28] as [number, number, number])} radius={0.028} />
  </group>;
}


export function Fasteners({ points, radius = 0.045 }: { points: [number, number, number][]; radius?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    points.forEach((point, index) => {
      dummy.position.set(...point); dummy.rotation.x = Math.PI / 2; dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [points]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, points.length]} castShadow>
    <cylinderGeometry args={[radius, radius, 0.04, 6]} /><Metal color="#9da5a5" metalness={0.95} roughness={0.35} />
  </instancedMesh>;
}
