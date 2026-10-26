"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { gsap } from "gsap";
import { landingConfig, landingStages, type LandingMotion, type StageId } from "./landing-config";
import { coilGeometry, finishedRodGeometry, seededRandom } from "./landing-geometry";

const eases = Object.fromEntries(Object.entries(landingStages).map(([id, stage]) => [id, gsap.parseEase(stage.ease)]));
export function phase(time: number, id: StageId) {
  const stage = landingStages[id];
  return eases[id](THREE.MathUtils.clamp((time - stage.start) / stage.duration, 0, 1));
}

function Cylinder({ y, radius, height, color, roughness = 0.24 }: { y: number; radius: number; height: number; color: string; roughness?: number }) {
  return <mesh position={[0, y, 0]}><cylinderGeometry args={[radius, radius, height, 48]} /><meshStandardMaterial color={color} metalness={0.95} roughness={roughness} /></mesh>;
}

export function Machine({ motion, floor }: { motion: React.RefObject<LandingMotion>; floor: number }) {
  const head = useRef<THREE.Group>(null);
  const jaws = useRef<THREE.Group>(null);
  const raw = useRef<THREE.Mesh>(null);
  const rod = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const coil = useMemo(() => coilGeometry(), []);
  const finished = useMemo(() => finishedRodGeometry(), []);
  useEffect(() => () => { coil.dispose(); finished.dispose(); }, [coil, finished]);

  useFrame(() => {
    const t = motion.current.time;
    const enter = phase(t, "enter"), feed = phase(t, "feed"), process = phase(t, "process"), output = phase(t, "output");
    if (head.current) {
      head.current.position.set(0.7, THREE.MathUtils.lerp(10, 1.05, enter) - Math.sin(feed * Math.PI) * Math.max(0.6, 1.05 - floor - 2.1), -0.6);
      head.current.rotation.z = THREE.MathUtils.lerp(-0.05, 0, enter);
    }
    if (jaws.current) jaws.current.children.forEach((jaw, i) => {
      const angle = i * Math.PI * 2 / 3;
      const radius = 0.33 + Math.sin(feed * Math.PI) * 0.3;
      jaw.position.set(Math.cos(angle) * radius, -0.72, Math.sin(angle) * radius);
    });
    if (raw.current) {
      raw.current.visible = t < landingStages.process.end;
      raw.current.position.set(0.7, THREE.MathUtils.lerp(floor + 0.35, -0.1, feed), 0);
      raw.current.rotation.z = THREE.MathUtils.lerp(-1.2, 0, feed);
      raw.current.scale.y = Math.max(0.01, 1 - process);
    }
    if (ring.current) ring.current.rotation.y = process * Math.PI * 22;
    const energy = t >= landingStages.process.start && t < landingStages.process.end ? Math.sin(process * Math.PI) : 0;
    if (glow.current) glow.current.emissiveIntensity = 0.25 + energy * 3.5;
    if (light.current) light.current.intensity = energy * 8;
    if (rod.current) {
      rod.current.visible = output > 0;
      rod.current.position.set(0.7 + output * 0.65, -0.7 - output * 0.9, 1.15);
      rod.current.rotation.set(0.25 * output, 0.18 * output, -Math.PI * 0.39 * output);
      rod.current.scale.setScalar(0.5 + output * 0.5);
    }
  });

  return <>
    <group ref={head} position={[0.7, 10, -0.6]}>
      <Cylinder y={3.5} radius={0.16} height={6} color="#454e52" />
      <Cylinder y={1.8} radius={0.46} height={2.3} color={landingConfig.colors.darkMetal} />
      <Cylinder y={1.8} radius={0.47} height={1.35} color={landingConfig.colors.steel} roughness={0.19} />
      <Cylinder y={2.95} radius={0.59} height={0.16} color="#a4adb2" />
      <Cylinder y={0.66} radius={0.58} height={0.16} color="#a4adb2" />
      <Cylinder y={0.35} radius={0.46} height={0.48} color="#1a1e21" />
      <Cylinder y={0.02} radius={0.62} height={0.18} color="#596266" />
      <Cylinder y={-0.29} radius={0.45} height={0.44} color="#1c2124" />
      <mesh position={[0.76, 0.5, 0]} geometry={coil}><meshStandardMaterial color={landingConfig.colors.copper} metalness={0.88} roughness={0.23} /></mesh>
      <mesh position={[0, 1.8, 0.475]}><boxGeometry args={[0.055, 1.75, 0.018]} /><meshStandardMaterial color="#ffa455" emissive="#ff7623" emissiveIntensity={1.2} /></mesh>
      <group ref={ring} position={[0, -0.52, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.46, 0.055, 8, 48]} /><meshStandardMaterial ref={glow} color={landingConfig.colors.orange} emissive={landingConfig.colors.orange} metalness={0.8} roughness={0.25} /></mesh>
        {[0, 1, 2, 3].map(i => <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 0.45, 0, Math.sin(i * Math.PI / 2) * 0.45]}><boxGeometry args={[0.16, 0.13, 0.17]} /><meshStandardMaterial color="#9fa5a4" metalness={1} roughness={0.24} /></mesh>)}
      </group>
      <group ref={jaws}>{[0, 1, 2].map(i => <mesh key={i}><boxGeometry args={[0.18, 0.46, 0.17]} /><meshStandardMaterial color="#b1b6b5" metalness={0.98} roughness={0.24} /></mesh>)}</group>
      <pointLight ref={light} position={[0, -0.8, 0.5]} color="#ff721c" intensity={0} distance={5} />
    </group>
    <mesh ref={raw}><cylinderGeometry args={[0.33, 0.37, 1.8, 12]} /><meshStandardMaterial color="#6d6054" metalness={0.9} roughness={0.6} /></mesh>
    <group ref={rod} visible={false}>
      <mesh geometry={finished}><meshStandardMaterial color="#c3cdd2" metalness={1} roughness={0.19} /></mesh>
      {[-1.55, -1.42, -1.29, 1.29, 1.42, 1.55].map(y => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.283, 0.009, 4, 48]} /><meshStandardMaterial color="#4b555b" metalness={1} roughness={0.22} /></mesh>)}
    </group>
  </>;
}

export function Sparks({ motion, mobile }: { motion: React.RefObject<LandingMotion>; mobile: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = mobile ? landingConfig.mobile.sparks : landingConfig.desktop.sparks;
  const data = useMemo(() => { const rand = seededRandom(73); return Array.from({ length: count }, () => ({ angle: rand() * Math.PI * 2, speed: 0.8 + rand() * 2, offset: rand() })); }, [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!mesh.current) return;
    const t = motion.current.time;
    const active = t > landingStages.process.start && t < landingStages.process.end;
    mesh.current.visible = active;
    if (!active) return;
    data.forEach((spark, i) => {
      const life = ((t - landingStages.process.start) * 1.8 + spark.offset) % 1;
      dummy.position.set(0.7 + Math.cos(spark.angle) * life * spark.speed, 0.25 + Math.sin(spark.angle) * life * spark.speed - life * life * 2.5, 0.2 + life);
      dummy.scale.set(0.014, 0.06 * (1 - life), 0.014);
      dummy.rotation.z = -spark.angle;
      dummy.updateMatrix(); mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}><boxGeometry /><meshBasicMaterial color="#ffc58c" toneMapped={false} /></instancedMesh>;
}
