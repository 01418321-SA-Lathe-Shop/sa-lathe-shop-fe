"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo,useRef,type RefObject } from "react";
import * as THREE from "three";
import { processConfig,sampleProcess,type ProcessMotion } from "../process-config";
import { Metal } from "../process-materials";

import { Box,Fasteners,steel } from './primitives';


export function Conveyor({ motion, output = false }: { motion: RefObject<ProcessMotion>; output?: boolean }) {
  const rollers = useRef<THREE.InstancedMesh>(null), slats = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const start = output ? 3.65 : -4.8, length = output ? 3.8 : 5.3;
  const count = output ? 12 : 17;
  useFrame(() => {
    const travel = sampleProcess(motion.current.time, motion.current.cycle).belt * (4.75 / processConfig.durations.feed);
    for (let i = 0; i < count; i++) {
      dummy.position.set(start + i * length / (count - 1), -0.84, 0);
      dummy.rotation.set(Math.PI / 2, travel / 0.18, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
      rollers.current?.setMatrixAt(i, dummy.matrix);
    }
    if (rollers.current) rollers.current.instanceMatrix.needsUpdate = true;
    if (!output && slats.current) {
      for (let i = 0; i < 36; i++) {
        dummy.position.set(start + (i * length / 36 + travel) % length, -0.635, 0);
        dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); slats.current.setMatrixAt(i, dummy.matrix);
      }
      slats.current.instanceMatrix.needsUpdate = true;
    }
  });
  return <group>
    <instancedMesh castShadow receiveShadow ref={rollers} args={[undefined, undefined, count]} frustumCulled={false}><cylinderGeometry args={[0.18, 0.18, 1.14, 32]} /><Metal color={steel} metalness={0.9} roughness={0.32} /></instancedMesh>
    {!output && <instancedMesh castShadow receiveShadow ref={slats} args={[undefined, undefined, 36]} frustumCulled={false}><boxGeometry args={[0.11, 0.04, 1.06]} /><Metal color="#303334" metalness={0.45} roughness={0.7} /></instancedMesh>}
    {[-0.63, 0.63].map(z => <Box key={z} at={[start + length / 2, -0.96, z]} size={[length + 0.35, 0.22, 0.13]} />)}
    <Fasteners points={Array.from({ length: 8 }, (_, i) => [start + 0.12 + i * (length - 0.24) / 7, -0.95, 0.71] as [number, number, number])} />
    {[start + 0.25, start + length - 0.25].map(x => <group key={x}>
      <Box at={[x, -1.2, 0]} size={[0.16, 0.48, 1.05]} />
      <Box at={[x, -1.43, 0.38]} size={[0.5, 0.09, 0.36]} color="#343b3c" />
    </group>)}
  </group>;
}
