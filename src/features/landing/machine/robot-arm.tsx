"use client";

import { useFrame } from "@react-three/fiber";
import { useRef,type RefObject } from "react";
import * as THREE from "three";
import { processConfig,sampleProcess,type ProcessMotion } from "../process-config";
import { Metal } from "../process-materials";

import { Box,casing,Fasteners,Joint,orange,steel,type MotionProps } from './primitives';


function setLink(mesh: THREE.Mesh, ax: number, ay: number, bx: number, by: number) {
  mesh.position.set((ax + bx) / 2, (ay + by) / 2, 0);
  mesh.rotation.z = -Math.atan2(bx - ax, by - ay);
  mesh.scale.y = Math.hypot(bx - ax, by - ay);
}


function Gripper({ motion, delay = 0 }: { motion: RefObject<ProcessMotion>; delay?: number }) {
  const group = useRef<THREE.Group>(null), left = useRef<THREE.Mesh>(null), right = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const p = sampleProcess(Math.max(0, motion.current.time - delay), motion.current.cycle);
    if (!group.current || !left.current || !right.current) return;
    group.current.position.set(p.armX, p.armY, 0);
    group.current.visible = !delay || (motion.current.time > 1.06 && motion.current.time < 1.8);
    left.current.position.x = -p.gap; right.current.position.x = p.gap;
  });
  return <group ref={group}>
    <mesh><boxGeometry args={[0.65, 0.2, 0.5]} /><Metal color={steel} metalness={0.9} roughness={0.24} transparent={!!delay} opacity={delay ? 0.09 : 1} depthWrite={!delay} /></mesh>
    <mesh ref={left} position={[0, -0.24, 0]}><boxGeometry args={[0.1, 0.4, 0.32]} /><Metal color={steel} metalness={0.95} roughness={0.2} transparent={!!delay} opacity={delay ? 0.07 : 1} depthWrite={!delay} /></mesh>
    <mesh ref={right} position={[0, -0.24, 0]}><boxGeometry args={[0.1, 0.4, 0.32]} /><Metal color={steel} metalness={0.95} roughness={0.2} transparent={!!delay} opacity={delay ? 0.07 : 1} depthWrite={!delay} /></mesh>
    {!delay && <mesh position={[0, 0.02, 0.26]}><boxGeometry args={[0.28, 0.035, 0.02]} /><meshBasicMaterial color={orange} /></mesh>}
  </group>;
}


export function RobotArm({ motion, mobile }: MotionProps) {
  const upper = useRef<THREE.Mesh>(null), lower = useRef<THREE.Mesh>(null), elbow = useRef<THREE.Group>(null);
  useFrame(() => {
    const { armX: x, armY: y } = sampleProcess(motion.current.time, motion.current.cycle);
    const sx = -6.85, sy = -0.1, dx = x - sx, dy = y - sy;
    const distance = Math.min(3.38, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx) + Math.acos(distance / 3.4);
    const ex = sx + Math.cos(angle) * 1.7, ey = sy + Math.sin(angle) * 1.7;
    if (upper.current && lower.current && elbow.current) {
      setLink(upper.current, sx, sy, ex, ey); setLink(lower.current, ex, ey, x, y);
      elbow.current.position.set(ex, ey, 0);
    }
  });
  const budget = mobile ? processConfig.mobile : processConfig.desktop;
  return <group>
    <Box at={[-6.85, -1.03, 0]} size={[1.2, 0.4, 1.1]} />
    <Fasteners points={[[-7.25, -0.96, 0.57], [-6.45, -0.96, 0.57]]} />
    <Box at={[-6.85, -0.62, 0]} size={[0.44, 0.6, 0.5]} />
    <Joint at={[-6.85, -0.1, 0]} radius={0.3} />
    <mesh ref={upper} castShadow><capsuleGeometry args={[0.17, 0.68, 4, 12]} /><Metal color={casing} metalness={0.82} roughness={0.44} />
      <mesh position={[0.19, 0, 0.03]}><cylinderGeometry args={[0.045, 0.045, 0.86, 12]} /><Metal color="#14191a" metalness={0.4} roughness={0.8} /></mesh>
      <mesh position={[0, 0, 0.18]}><boxGeometry args={[0.12, 0.65, 0.03]} /><Metal color={steel} metalness={0.85} roughness={0.38} /></mesh>
    </mesh>
    <mesh ref={lower} castShadow><capsuleGeometry args={[0.13, 0.74, 4, 12]} /><Metal color={steel} metalness={0.92} roughness={0.36} />
      <mesh position={[0.17, -0.12, 0]}><cylinderGeometry args={[0.08, 0.08, 0.55, 16]} /><Metal color={casing} metalness={0.88} roughness={0.35} /></mesh>
      <mesh position={[0.17, 0.25, 0]}><cylinderGeometry args={[0.035, 0.035, 0.32, 16]} /><Metal color="#ced2d0" metalness={1} roughness={0.18} /></mesh>
    </mesh>
    <group ref={elbow}><Joint at={[0, 0, 0]} /><mesh position={[0, 0, 0.25]}><circleGeometry args={[0.105, 24]} /><Metal color={orange} emissive={orange} emissiveIntensity={0.3} /></mesh></group>
    <Gripper motion={motion} />
    {budget.motionTrails && <><Gripper motion={motion} delay={0.018} /><Gripper motion={motion} delay={0.036} /></>}
  </group>;
}
