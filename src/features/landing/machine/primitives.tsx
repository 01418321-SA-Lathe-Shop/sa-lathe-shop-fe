"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { ProcessMotion } from "../process-config";
import { Metal, Paint, palette } from "../process-materials";

export type MotionProps = { motion: RefObject<ProcessMotion>; mobile: boolean };
type Vec3 = [number, number, number];

/** The turret approaches from up-and-behind the spindle (slant bed), 35° above horizontal. */
export const TOOL_ANGLE = (35 * Math.PI) / 180;
export const toolDirection = new THREE.Vector3(0, Math.sin(TOOL_ANGLE), -Math.cos(TOOL_ANGLE));
/** World point at axial x and radial distance r along the tool direction. */
export function alongTool(x: number, r: number, target = new THREE.Vector3()) {
  return target.set(x, toolDirection.y * r, toolDirection.z * r);
}

export function Box({ at, size, color = palette.casting, finish = "paint", rotation, roughness }: {
  at: Vec3; size: Vec3; color?: string; finish?: "paint" | "metal"; rotation?: Vec3; roughness?: number;
}) {
  const [width, height, depth] = size;
  const geometry = useMemo(() => new RoundedBoxGeometry(width, height, depth, 2, Math.min(0.04, width / 5, height / 5, depth / 5)), [width, height, depth]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh position={at} rotation={rotation} geometry={geometry} castShadow receiveShadow>
    {finish === "metal" ? <Metal color={color} roughness={roughness} /> : <Paint color={color} roughness={roughness} />}
  </mesh>;
}

/** Socket-head cap screws, instanced. `axis` is the direction the heads face. */
export function Fasteners({ points, radius = 0.035, axis = "z" }: { points: Vec3[]; radius?: number; axis?: "x" | "y" | "z" }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    points.forEach((point, index) => {
      dummy.position.set(...point);
      dummy.rotation.set(axis === "z" ? Math.PI / 2 : 0, 0, axis === "x" ? Math.PI / 2 : 0);
      dummy.updateMatrix(); mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [points, axis]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, points.length]} castShadow>
    <cylinderGeometry args={[radius, radius, 0.03, 12]} /><Metal color={palette.darkSteel} roughness={0.7} />
  </instancedMesh>;
}
