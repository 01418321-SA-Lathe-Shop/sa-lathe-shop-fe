"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { bracketGeometry, seededRandom } from "./landing-geometry";
import { processConfig, sampleProcess, type ProcessMotion } from "./process-config";

type MotionProps = { motion: RefObject<ProcessMotion>; mobile: boolean };
const steel = "#919b9e", casing = "#242a2c", orange = "#ff852e";
function Box({ at, size, color = casing }: { at: [number, number, number]; size: [number, number, number]; color?: string }) {
  return <mesh position={at}><boxGeometry args={size} /><meshStandardMaterial color={color} metalness={0.85} roughness={0.3} /></mesh>;
}
function Joint({ at, radius = 0.22 }: { at: [number, number, number]; radius?: number }) {
  return <mesh position={at} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[radius, radius, 0.46, 24]} /><meshStandardMaterial color={steel} metalness={0.95} roughness={0.23} /></mesh>;
}
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
    <mesh><boxGeometry args={[0.65, 0.2, 0.5]} /><meshStandardMaterial color={steel} metalness={0.9} roughness={0.24} transparent={!!delay} opacity={delay ? 0.09 : 1} depthWrite={!delay} /></mesh>
    <mesh ref={left} position={[0, -0.24, 0]}><boxGeometry args={[0.1, 0.4, 0.32]} /><meshStandardMaterial color={steel} metalness={0.95} roughness={0.2} transparent={!!delay} opacity={delay ? 0.07 : 1} depthWrite={!delay} /></mesh>
    <mesh ref={right} position={[0, -0.24, 0]}><boxGeometry args={[0.1, 0.4, 0.32]} /><meshStandardMaterial color={steel} metalness={0.95} roughness={0.2} transparent={!!delay} opacity={delay ? 0.07 : 1} depthWrite={!delay} /></mesh>
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
    <Box at={[-6.85, -0.62, 0]} size={[0.44, 0.6, 0.5]} />
    <Joint at={[-6.85, -0.1, 0]} radius={0.3} />
    <mesh ref={upper}><boxGeometry args={[0.3, 1, 0.3]} /><meshStandardMaterial color={casing} metalness={0.92} roughness={0.25} /></mesh>
    <mesh ref={lower}><boxGeometry args={[0.22, 1, 0.3]} /><meshStandardMaterial color={steel} metalness={0.92} roughness={0.25} /></mesh>
    <group ref={elbow}><Joint at={[0, 0, 0]} /><mesh position={[0, 0, 0.25]}><circleGeometry args={[0.105, 24]} /><meshStandardMaterial color={orange} emissive={orange} emissiveIntensity={0.3} /></mesh></group>
    <Gripper motion={motion} />
    {budget.motionTrails && <><Gripper motion={motion} delay={0.018} /><Gripper motion={motion} delay={0.036} /></>}
  </group>;
}

export function Conveyor({ motion, output = false }: { motion: RefObject<ProcessMotion>; output?: boolean }) {
  const rollers = useRef<THREE.InstancedMesh>(null), slats = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const start = output ? 3.65 : -4.8, length = output ? 3.8 : 5.3;
  const count = output ? 12 : 17;
  useFrame(() => {
    const travel = sampleProcess(motion.current.time, motion.current.cycle).belt * 1.8;
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
    <instancedMesh ref={rollers} args={[undefined, undefined, count]} frustumCulled={false}><cylinderGeometry args={[0.18, 0.18, 1.14, 16]} /><meshStandardMaterial color={steel} metalness={0.9} roughness={0.28} /></instancedMesh>
    {!output && <instancedMesh ref={slats} args={[undefined, undefined, 36]} frustumCulled={false}><boxGeometry args={[0.11, 0.04, 1.06]} /><meshStandardMaterial color="#303334" metalness={0.45} roughness={0.7} /></instancedMesh>}
    {[-0.63, 0.63].map(z => <Box key={z} at={[start + length / 2, -0.96, z]} size={[length + 0.35, 0.22, 0.13]} />)}
    {[start + 0.25, start + length - 0.25].map(x => <Box key={x} at={[x, -1.2, 0]} size={[0.16, 0.48, 1.05]} />)}
  </group>;
}

function ingotGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.85, -0.2); shape.lineTo(0.85, -0.2); shape.lineTo(0.68, 0.23); shape.lineTo(-0.68, 0.23); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.72, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.045, bevelThickness: 0.035 });
  geometry.translate(0, 0, -0.36); return geometry;
}

export function ScrapAndIngot({ motion }: { motion: RefObject<ProcessMotion> }) {
  const scrap = useRef<THREE.Mesh>(null), ingot = useRef<THREE.Mesh>(null);
  const rawMaterial = useRef<THREE.MeshStandardMaterial>(null), finishedMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const bracket = useMemo(() => bracketGeometry(), []), finished = useMemo(() => ingotGeometry(), []);
  const cold = useMemo(() => new THREE.Color("#bdc5c7"), []), hot = useMemo(() => new THREE.Color(orange), []);
  useFrame(() => {
    const p = sampleProcess(motion.current.time, motion.current.cycle);
    if (scrap.current && rawMaterial.current) {
      scrap.current.position.set(p.scrapX, p.scrapY, 0);
      scrap.current.visible = p.scrapVisible;
      rawMaterial.current.opacity = p.scrapOpacity;
    }
    if (ingot.current && finishedMaterial.current) {
      ingot.current.visible = p.ingotOpacity > 0;
      ingot.current.position.set(p.ingotX, -0.4, 0);
      ingot.current.rotation.y = -0.15 * p.output;
      finishedMaterial.current.color.copy(cold).lerp(hot, p.ingotHeat);
      finishedMaterial.current.emissiveIntensity = p.ingotHeat * 2;
      finishedMaterial.current.opacity = p.ingotOpacity;
    }
  });
  return <>
    <mesh ref={scrap} geometry={bracket} scale={0.66} rotation={[0.2, 0.25, -0.22]}><meshStandardMaterial ref={rawMaterial} color="#858785" metalness={0.92} roughness={0.55} transparent /></mesh>
    <mesh ref={ingot} geometry={finished}><meshStandardMaterial ref={finishedMaterial} color={cold} emissive={orange} emissiveIntensity={0} metalness={0.92} roughness={0.2} transparent /></mesh>
    <Box at={[-5.7, -0.98, 0]} size={[1.1, 0.45, 0.95]} />
  </>;
}

export function Furnace({ motion, mobile }: MotionProps) {
  const interior = useRef<THREE.MeshStandardMaterial>(null), lamp = useRef<THREE.PointLight>(null), stream = useRef<THREE.Mesh>(null), pool = useRef<THREE.Mesh>(null), sparks = useRef<THREE.InstancedMesh>(null);
  const count = (mobile ? processConfig.mobile : processConfig.desktop).sparks;
  const particles = useMemo(() => { const rand = seededRandom(321); return Array.from({ length: count }, () => ({ seed: rand(), vx: (rand() - 0.25) * 1.5, vy: 0.4 + rand() * 1.4 })); }, [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const shimmer = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 }, energy: { value: 0 } }), []);
  useFrame(() => {
    const p = sampleProcess(motion.current.time, motion.current.cycle);
    if (interior.current) interior.current.emissiveIntensity = p.glow;
    if (lamp.current) lamp.current.intensity = p.glow * 9;
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
    <mesh position={[1.9, -0.45, -0.69]}><boxGeometry args={[3.1, 0.65, 0.08]} /><meshStandardMaterial ref={interior} color="#b14e19" emissive={orange} emissiveIntensity={2} /></mesh>
    <pointLight ref={lamp} position={[3.7, -0.1, 0.25]} color={orange} distance={5} decay={2} />
    <Box at={[1.9, 1.76, -0.25]} size={[0.75, 0.55, 0.7]} />
    {Array.from({ length: 7 }, (_, i) => <Box key={i} at={[0.85 + i * 0.35, 0.65, 0.93]} size={[0.055, 0.52, 0.035]} color="#0c0e0e" />)}
    <mesh position={[1.9, 0.11, 0.93]}><boxGeometry args={[2.5, 0.035, 0.02]} /><meshBasicMaterial color={orange} /></mesh>
    <Box at={[3.9, 0.04, 0]} size={[0.8, 0.12, 0.35]} />
    <mesh ref={stream} position={[4.2, -0.2, 0]}><cylinderGeometry args={[0.065, 0.1, 0.5, 10]} /><meshStandardMaterial color={orange} emissive={orange} emissiveIntensity={3} /></mesh>
    <Box at={[4.2, -0.75, 0]} size={[1.9, 0.15, 1]} />
    <mesh ref={pool} position={[4.2, -0.58, 0]}><boxGeometry args={[1.6, 0.18, 0.7]} /><meshStandardMaterial color={orange} emissive={orange} emissiveIntensity={2} /></mesh>
    <instancedMesh ref={sparks} args={[undefined, undefined, count]} frustumCulled={false}><boxGeometry /><meshBasicMaterial color="#ffb06a" toneMapped={false} /></instancedMesh>
    <mesh position={[3.65, 0.28, 0.95]}><planeGeometry args={[1.2, 1.5]} /><shaderMaterial ref={shimmer} uniforms={uniforms} transparent depthWrite={false}
      vertexShader="varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
      fragmentShader="varying vec2 vUv; uniform float time; uniform float energy; void main(){float wave=sin(vUv.y*21.0-time*9.0)*0.08; float w=pow(max(0.0,1.0-abs(vUv.x-0.5+wave)*2.0),8.0); float a=w*sin(vUv.y*3.14159)*energy*0.16;gl_FragColor=vec4(1.0,0.36,0.08,a);}" /></mesh>
  </group>;
}
