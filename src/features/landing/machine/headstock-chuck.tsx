"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CHUCK_X, latheConfig, sampleLathe } from "../process-config";
import { Metal, palette } from "../process-materials";
import { Box, Fasteners, type MotionProps } from "./primitives";

const JAW_REACH = 0.28, JAW_HEIGHT = 0.42, JAW_WIDTH = 0.2;

/** Chuck face with radial UVs, so anisotropy produces the radial streak of a turned face. */
function faceGeometry(segments: number) {
  const geometry = new THREE.RingGeometry(0.16, 0.885, segments, 6);
  const position = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i);
    uv.setXY(i, Math.hypot(x, y) * 4, (Math.atan2(y, x) / (2 * Math.PI) + 1) % 1);
  }
  return geometry;
}
/** Chuck body: turned OD with a chamfered front edge, revolved around the spindle axis. */
function bodyGeometry(segments: number) {
  const profile = [[0.6, -0.36], [0.92, -0.34], [0.92, -0.035], [0.885, 0], [0.16, 0]].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(profile, segments);
}
/** Hollow annulus swept by the closed jaws; it stands in for motion blur at speed. */
function sweepGeometry(segments: number) {
  const r0 = latheConfig.motion.jawClosed, r1 = r0 + JAW_HEIGHT;
  const profile = [[r0, 0], [r1, 0], [r1, JAW_REACH * 0.55], [r0 + 0.12, JAW_REACH * 0.55], [r0 + 0.12, JAW_REACH], [r0, JAW_REACH], [r0, 0]].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(profile, segments);
}

export function HeadstockChuck({ motion, mobile }: MotionProps) {
  const spindle = useRef<THREE.Group>(null), sweep = useRef<THREE.MeshStandardMaterial>(null);
  const jaws = useRef<(THREE.Group | null)[]>([]), jawMesh = useRef<THREE.Mesh>(null);
  const jawMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: palette.darkSteel, metalness: 1, roughness: 0.42, transparent: true }), []);
  const segments = (mobile ? latheConfig.mobile : latheConfig.desktop).segments;
  const face = useMemo(() => faceGeometry(segments), [segments]);
  const body = useMemo(() => bodyGeometry(segments), [segments]);
  const swept = useMemo(() => sweepGeometry(segments), [segments]);
  useLayoutEffect(() => () => { face.dispose(); body.dispose(); swept.dispose(); jawMaterial.dispose(); }, [face, body, swept, jawMaterial]);
  useFrame(() => {
    const p = sampleLathe(motion.current.time, motion.current.cycle);
    if (spindle.current) spindle.current.rotation.x = p.visibleAngle;
    jaws.current.forEach(jaw => { if (jaw) jaw.position.y = p.jaw; });
    // Jaws dissolve into their swept band as speed rises; edges never vanish completely.
    const shared = jawMesh.current?.material as THREE.MeshStandardMaterial | undefined;
    if (shared) { shared.opacity = 1 - p.blur * 0.82; shared.depthWrite = p.blur < 0.5; }
    if (sweep.current) { sweep.current.opacity = p.blur * 0.62; sweep.current.visible = p.blur > 0.01; }
  });
  return <group>
    {/* Headstock casting: extends off-frame left and hides the bar while it feeds. */}
    <Box at={[-3.75, -0.2, -0.1]} size={[3.8, 2.6, 2.3]} color={palette.casting} />
    <Box at={[-3.75, -0.25, 1.06]} size={[2.6, 1.6, 0.04]} color={palette.castingDark} />
    <mesh position={[-2.75, 0.42, 1.09]}><boxGeometry args={[0.36, 0.03, 0.01]} /><meshBasicMaterial color={palette.accent} toneMapped={false} /></mesh>
    <Fasteners points={[[-4.95, 0.45, 1.08], [-2.55, 0.45, 1.08], [-4.95, -0.95, 1.08], [-2.55, -0.95, 1.08]]} />
    <mesh position={[-1.81, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.68, 0.72, 0.08, segments]} /><Metal color={palette.darkSteel} roughness={0.6} /></mesh>

    <group ref={spindle} position={[CHUCK_X, 0, 0]}>
      <mesh geometry={body} rotation={[0, 0, -Math.PI / 2]} castShadow receiveShadow><Metal color={palette.steel} roughness={0.5} /></mesh>
      <mesh geometry={face} position={[0.001, 0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <meshPhysicalMaterial color={palette.steel} metalness={1} roughness={0.3} anisotropy={0.85} />
      </mesh>
      {[0, 1, 2].map(i => <group key={i} rotation={[(i * 2 * Math.PI) / 3, 0, 0]}>
        {/* Jaw guide slot and two face screws per sector. */}
        <mesh position={[0.003, 0.55, 0]}><boxGeometry args={[0.004, 0.7, JAW_WIDTH + 0.04]} /><meshStandardMaterial color="#0d0f10" roughness={0.9} /></mesh>
        <group rotation={[Math.PI / 3, 0, 0]}><Fasteners points={[[0.012, 0.42, 0], [0.012, 0.72, 0]]} axis="x" radius={0.045} /></group>
        <group ref={el => { jaws.current[i] = el; }} position={[0, latheConfig.motion.jawOpen, 0]}>
          {/* Hard stepped jaw: the step grips, the base rides in the slot. */}
          <mesh ref={i === 0 ? jawMesh : undefined} position={[JAW_REACH / 2, 0.06, 0]} material={jawMaterial} castShadow><boxGeometry args={[JAW_REACH, 0.12, JAW_WIDTH]} /></mesh>
          <mesh position={[JAW_REACH * 0.28, 0.27, 0]} material={jawMaterial} castShadow><boxGeometry args={[JAW_REACH * 0.55, 0.3, JAW_WIDTH]} /></mesh>
        </group>
      </group>)}
      <mesh geometry={swept} rotation={[0, 0, -Math.PI / 2]}><meshStandardMaterial ref={sweep} color="#7d8487" metalness={1} roughness={0.5} transparent depthWrite={false} /></mesh>
    </group>
  </group>;
}
