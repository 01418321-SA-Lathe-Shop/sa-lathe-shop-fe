"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo,useRef } from "react";
import * as THREE from "three";
import { seededRandom } from "../landing-geometry";
import { processConfig,sampleProcess } from "../process-config";
import { Metal } from "../process-materials";

import { Box,Fasteners,orange,steel,type MotionProps } from './primitives';


export function Furnace({ motion, mobile }: MotionProps) {
  const interior = useRef<THREE.MeshStandardMaterial>(null), lamp = useRef<THREE.PointLight>(null), stream = useRef<THREE.Mesh>(null), pool = useRef<THREE.Mesh>(null), sparks = useRef<THREE.InstancedMesh>(null);
  const count = (mobile ? processConfig.mobile : processConfig.desktop).sparks;
  const particles = useMemo(() => { const rand = seededRandom(321); return Array.from({ length: count }, () => ({ seed: rand(), vx: (rand() - 0.25) * 1.5, vy: 0.4 + rand() * 1.4 })); }, [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const shimmer = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 }, energy: { value: 0 } }), []);
  useFrame(() => {
    const p = sampleProcess(motion.current.time, motion.current.cycle);
    if (interior.current) interior.current.emissiveIntensity = p.glow * 0.65;
    if (lamp.current) lamp.current.intensity = p.glow * 7;
    if (stream.current) { stream.current.visible = p.pour > 0.01; stream.current.scale.x = stream.current.scale.z = 0.65 + p.pour * 0.35; }
    if (pool.current) { pool.current.visible = p.melt > 0.2 && p.output === 0; pool.current.scale.y = Math.max(0.01, p.melt); }
    if (shimmer.current) { shimmer.current.uniforms.time.value = motion.current.time; shimmer.current.uniforms.energy.value = p.heat; }
    particles.forEach((particle, i) => {
      const age = (p.melt * 2.5 + particle.seed) % 1;
      dummy.position.set(3.7 + particle.vx * age, 0.15 + particle.vy * age - 1.3 * age * age, 0.2 + particle.seed * 0.6);
      dummy.rotation.set(0, 0, -particle.vx); dummy.scale.set(0.018, 0.09 * (1 - age), 0.018); dummy.scale.multiplyScalar(p.heat); dummy.updateMatrix();
      sparks.current?.setMatrixAt(i, dummy.matrix);
    });
    if (sparks.current) sparks.current.instanceMatrix.needsUpdate = true;
  });
  return <group>
    <Box at={[1.9, -1.1, -0.1]} size={[3.35, 0.5, 1.8]} />
    <Box at={[1.9, 1.35, -0.1]} size={[3.35, 0.3, 1.8]} />
    <Box at={[1.9, 0.2, -0.9]} size={[3.35, 2.2, 0.2]} />
    <Box at={[1.9, 0.54, 0.82]} size={[3.35, 1.4, 0.18]} />
    <Box at={[1.9, -0.75, 0.82]} size={[3.35, 0.36, 0.18]} />
    {/* Side openings remain physically open; the front fascia hides scrap during melting. */}
    {[0.25, 3.55].map(x => <group key={x}>
      {[-0.78, 0.78].map(z => <Box key={z} at={[x, 0.2, z]} size={[0.18, 2.1, 0.16]} color={steel} />)}
      <Box at={[x, 0.7, 0]} size={[0.2, 0.75, 1.55]} />
    </group>)}
    <mesh position={[1.9, -0.45, -0.69]}><boxGeometry args={[3.1, 0.65, 0.08]} /><Metal ref={interior} color="#b14e19" emissive={orange} emissiveIntensity={2} /></mesh>
    <pointLight ref={lamp} position={[3.7, -0.1, 0.25]} color={orange} distance={5} decay={2} />
    <Box at={[1.9, 1.76, -0.25]} size={[0.75, 0.55, 0.7]} />
    <Box at={[1.9, 2.06, -0.25]} size={[1.05, 0.08, 0.95]} />
    <Box at={[1.9, 0.64, 0.95]} size={[2.65, 0.94, 0.09]} color="#20282c" />
    <Fasteners points={[[0.46,1.12,0.96],[3.32,1.12,0.96],[0.46,0.02,0.96],[3.32,0.02,0.96],[0.65,0.98,1.02],[3.15,0.98,1.02],[0.65,0.32,1.02],[3.15,0.32,1.02]]} />
    <Box at={[1.9, -0.83, 0.95]} size={[2.95, 0.16, 0.08]} color="#111719" />
    <Box at={[3.87, 0.92, -0.25]} size={[0.4, 0.78, 0.58]} color="#1d2528" />
    {[0.67,0.83,0.99,1.15].map(y => <Box key={y} at={[3.87,y,0.06]} size={[0.28,0.04,0.025]} color="#090c0d" />)}
    <mesh position={[3.53, 1.3, -0.25]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.06,0.06,0.7,16]} /><Metal color="#7b4e30" metalness={0.85} roughness={0.42} /></mesh>
    {Array.from({ length: 7 }, (_, i) => <Box key={i} at={[0.85 + i * 0.35, 0.65, 1.02]} size={[0.055, 0.52, 0.035]} color="#0c0e0e" />)}
    <mesh position={[1.9, 0.11, 0.93]}><boxGeometry args={[2.5, 0.035, 0.02]} /><meshBasicMaterial color={orange} /></mesh>
    <Box at={[3.9, 0.04, 0]} size={[0.8, 0.12, 0.35]} />
    {[-0.2,0.2].map(z => <Box key={z} at={[3.9,0.13,z]} size={[0.8,0.15,0.045]} color={steel} />)}
    <mesh ref={stream} position={[4.2, -0.2, 0]}><cylinderGeometry args={[0.055, 0.09, 0.5, 16]} /><Metal color={orange} emissive={orange} emissiveIntensity={3} /></mesh>
    <Box at={[4.2, -0.75, 0]} size={[1.9, 0.15, 1]} />
    <mesh ref={pool} position={[4.2, -0.58, 0]}><boxGeometry args={[1.6, 0.18, 0.7]} /><Metal color={orange} emissive={orange} emissiveIntensity={2} /></mesh>
    <instancedMesh ref={sparks} args={[undefined, undefined, count]} frustumCulled={false}><boxGeometry /><meshBasicMaterial color="#ffb06a" toneMapped={false} /></instancedMesh>
    <mesh position={[3.65, 0.28, 0.95]}><planeGeometry args={[1.2, 1.5]} /><shaderMaterial ref={shimmer} uniforms={uniforms} transparent depthWrite={false}
      vertexShader="varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
      fragmentShader="varying vec2 vUv; uniform float time; uniform float energy; void main(){float wave=sin(vUv.y*21.0-time*9.0)*0.08; float w=pow(max(0.0,1.0-abs(vUv.x-0.5+wave)*2.0),8.0); float a=w*sin(vUv.y*3.14159)*energy*0.16;gl_FragColor=vec4(1.0,0.36,0.08,a);}" /></mesh>
  </group>;
}
