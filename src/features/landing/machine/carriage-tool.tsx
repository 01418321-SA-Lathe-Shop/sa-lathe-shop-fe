"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { latheConfig, sampleLathe } from "../process-config";
import { Metal, Paint, palette } from "../process-materials";
import { Box, Fasteners, TOOL_ANGLE, toolDirection, type MotionProps } from "./primitives";

/** Tool-local frame: origin at the cutting tip, +Y away from the spindle, +Z up-and-toward the viewer. */
const toolTangent = new THREE.Vector3(0, Math.cos(TOOL_ANGLE), Math.sin(TOOL_ANGLE));
export function toolFramePoint(toolX: number, toolR: number, local: readonly [number, number, number], target = new THREE.Vector3()) {
  return target.set(toolX + local[0], 0, 0).addScaledVector(toolDirection, toolR + local[1]).addScaledVector(toolTangent, local[2]);
}
export const NOZZLE_TIP = [0.16, 0.24, 0.3] as const;
/** The nozzle's long axis points from its tip at the cutting edge. */
const nozzleAim = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...NOZZLE_TIP).normalize());
const hosePath = [[0.42, 0.95, 0.42], [0.4, 0.72, 0.58], [0.3, 0.46, 0.52], [0.2, 0.3, 0.36]] as const;

/** 80° rhombic insert, tip at the origin, lying in the rake plane (thickness along Z). */
function insertGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(0.12, 0.045); shape.lineTo(0.14, 0.19); shape.lineTo(0.02, 0.145); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.036, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 1 });
  geometry.translate(0, 0, -0.018);
  return geometry;
}

export function CarriageTool({ motion }: Pick<MotionProps, "motion">) {
  const tool = useRef<THREE.Group>(null), saddle = useRef<THREE.Group>(null), glow = useRef<THREE.PointLight>(null);
  const insert = useMemo(() => insertGeometry(), []);
  const beads = useMemo(() => new THREE.CatmullRomCurve3(hosePath.map(p => new THREE.Vector3(...p))).getSpacedPoints(13), []);
  const beadMesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    beads.forEach((bead, i) => { dummy.position.copy(bead); dummy.updateMatrix(); beadMesh.current?.setMatrixAt(i, dummy.matrix); });
    if (beadMesh.current) beadMesh.current.instanceMatrix.needsUpdate = true;
    return () => insert.dispose();
  }, [beads, insert]);
  useFrame(() => {
    const p = sampleLathe(motion.current.time, motion.current.cycle);
    if (tool.current) { tool.current.position.set(p.toolX, 0, 0).addScaledVector(toolDirection, p.toolR); }
    if (saddle.current) saddle.current.position.x = p.toolX;
    // A faint warm bloom at the cut, scaled by contact; aluminium never glows red-hot.
    if (glow.current) glow.current.intensity = p.cutting * latheConfig.effects.cutGlow * (0.85 + Math.sin(motion.current.time * 41) * 0.15);
  });
  return <group>
    <group ref={tool} rotation={[-TOOL_ANGLE, 0, 0]}>
      <mesh geometry={insert} castShadow><meshStandardMaterial color={palette.insert} metalness={1} roughness={0.28} /></mesh>
      <mesh position={[0.11, 0.3, 0]} castShadow><boxGeometry args={[0.24, 0.5, 0.15]} /><Metal color={palette.blackOxide} roughness={0.8} /></mesh>
      <mesh position={[0.08, 0.12, 0.04]} castShadow><boxGeometry args={[0.12, 0.1, 0.07]} /><Metal color={palette.blackOxide} roughness={0.7} /></mesh>
      <Fasteners points={[[0.08, 0.15, 0.08]]} radius={0.025} />
      {/* Octagonal turret with neighbouring tool stations. */}
      <mesh position={[0.15, 0.98, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow><cylinderGeometry args={[0.52, 0.52, 0.55, 8]} /><Metal color={palette.darkSteel} roughness={0.6} /></mesh>
      <mesh position={[-0.13, 0.98, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.3, 0.3, 0.02, 32]} /><Metal color={palette.steel} roughness={0.35} /></mesh>
      {[1, 2, 6, 7].map(i => { const a = (i * Math.PI) / 4; return <mesh key={i} position={[0.15, 0.98 - Math.cos(a) * 0.6, Math.sin(a) * 0.6]} rotation={[a, 0, 0]} castShadow><boxGeometry args={[0.22, 0.22, 0.14]} /><Metal color={palette.blackOxide} roughness={0.8} /></mesh>; })}
      <mesh position={[0.15, 1.9, 0]} castShadow receiveShadow><boxGeometry args={[0.95, 0.8, 0.95]} /><Paint color={palette.casting} /></mesh>
      {/* Segmented coolant hose and nozzle aimed at the tip. */}
      <instancedMesh ref={beadMesh} args={[undefined, undefined, beads.length]} castShadow><sphereGeometry args={[0.038, 12, 8]} /><meshStandardMaterial color={palette.hose} roughness={0.45} /></instancedMesh>
      <mesh position={[...NOZZLE_TIP]} quaternion={nozzleAim}><cylinderGeometry args={[0.03, 0.016, 0.09, 12]} /><meshStandardMaterial color={palette.hose} roughness={0.4} /></mesh>
      <mesh position={[0.42, 0.98, 0.45]}><boxGeometry args={[0.14, 0.14, 0.14]} /><Metal color={palette.steel} roughness={0.4} /></mesh>
      <pointLight ref={glow} position={[0.02, 0.06, 0.2]} color="#ff8f45" distance={1.6} decay={2} intensity={0} />
    </group>
    {/* Saddle on the slant ways: mostly above frame, but its shadow and reflections read. */}
    <group ref={saddle}>
      <Box at={[0, toolDirection.y * 2.75, toolDirection.z * 2.75]} size={[1.5, 0.35, 1.9]} rotation={[-TOOL_ANGLE, 0, 0]} color={palette.casting} />
    </group>
  </group>;
}
