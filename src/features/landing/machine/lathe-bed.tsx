"use client";

import { CHUCK_X } from "../process-config";
import { Metal, palette } from "../process-materials";
import { Box, Fasteners, TOOL_ANGLE, toolDirection } from "./primitives";

const slant = toolDirection.clone().multiplyScalar(3.1);
const way = (offset: number) => toolDirection.clone().multiplyScalar(2.93).add({ x: 0, y: Math.cos(TOOL_ANGLE) * offset, z: Math.sin(TOOL_ANGLE) * offset });

/** Base cabinet, chip/part trough, slant bed with ground ways and the rear splash guard. */
export function LatheBed() {
  const trough = { from: CHUCK_X - 0.5, to: 4.4 };
  const troughLength = trough.to - trough.from, troughX = (trough.from + trough.to) / 2;
  return <group>
    <Box at={[-0.35, -2.05, -0.15]} size={[10.5, 1.1, 3.1]} color={palette.castingDark} />
    <Box at={[-0.35, -1.56, 1.36]} size={[10.4, 0.12, 0.08]} color={palette.casting} />
    {/* Status strip: the only saturated accent on the machine body. */}
    <mesh position={[-3.9, -1.75, 1.41]}><boxGeometry args={[0.9, 0.025, 0.01]} /><meshBasicMaterial color={palette.accent} toneMapped={false} /></mesh>
    <Fasteners points={[-5.3, -4.2, -3.1, 2.2, 3.3, 4.4].map(x => [x, -1.82, 1.41] as [number, number, number])} />

    {/* Trough: an oily, slightly reflective floor between low sheet walls. */}
    <mesh position={[troughX, -1.495, 0]} receiveShadow><boxGeometry args={[troughLength, 0.05, 1.8]} /><Metal color="#3b4042" roughness={0.75} /></mesh>
    <Box at={[troughX, -1.32, 0.92]} size={[troughLength, 0.36, 0.06]} color={palette.sheet} />
    <Box at={[troughX, -1.32, -0.92]} size={[troughLength, 0.36, 0.06]} color={palette.sheet} />

    {/* Slant bed and ground ways carry the turret saddle, mostly above frame. */}
    <Box at={[2.1, slant.y, slant.z]} size={[6.6, 0.3, 2.3]} rotation={[-TOOL_ANGLE, 0, 0]} color={palette.casting} />
    {[-0.7, 0.7].map(offset => { const p = way(offset); return <Box key={offset} at={[2.1, p.y, p.z]} size={[6.6, 0.1, 0.2]} rotation={[-TOOL_ANGLE, 0, 0]} finish="metal" color={palette.steel} roughness={0.45} />; })}

    {/* Rear splash guard with folded seams. */}
    <Box at={[1.5, -0.55, -2.15]} size={[6.8, 1.9, 0.06]} color={palette.sheet} />
    {[-1.2, 0.7, 2.6, 4.5].map(x => <Box key={x} at={[x, -0.55, -2.1]} size={[0.05, 1.9, 0.05]} color="#2d3335" />)}

    <Tailstock />
    {/* Enclosure pillar at the right edge gives the bay depth. */}
    <Box at={[4.75, 0.2, 1.05]} size={[0.28, 3.4, 0.28]} color={palette.casting} />
  </group>;
}

/** Retracted tailstock at the far end: context only, it never engages the bar-fed part. */
function Tailstock() {
  return <group>
    <Box at={[4.0, -0.55, -0.1]} size={[0.9, 1.9, 1.3]} color={palette.casting} />
    <Box at={[4.0, 0.33, -0.1]} size={[0.95, 0.12, 1.0]} color={palette.castingDark} />
    <mesh position={[3.33, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.24, 0.24, 0.5, 48]} /><Metal color={palette.steel} roughness={0.35} /></mesh>
    <mesh position={[2.98, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.02, 0.17, 0.22, 48]} /><Metal color={palette.steel} roughness={0.25} /></mesh>
    <Fasteners points={[[3.72, 0.1, 0.56], [4.28, 0.1, 0.56], [3.72, -1.2, 0.56], [4.28, -1.2, 0.56]]} />
  </group>;
}
