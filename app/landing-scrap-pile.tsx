"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { gsap } from "gsap";
import { landingConfig, landingStages, type LandingMotion } from "./landing-config";
import { bracketGeometry, seededRandom } from "./landing-geometry";

const tumbleEase = gsap.parseEase(landingStages.captions.ease);
const settleEase = gsap.parseEase(landingStages.settle.ease);

export function ScrapPile({ motion, floor, mobile }: { motion: React.RefObject<LandingMotion>; floor: number; mobile: boolean }) {
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const config = mobile ? landingConfig.mobile : landingConfig.desktop;
  const shapes = useMemo(() => [
    new THREE.BoxGeometry(1.5, 0.15, 0.65), bracketGeometry(),
    new THREE.CylinderGeometry(0.26, 0.26, 0.85, 16),
    new THREE.TorusGeometry(0.26, 0.055, 6, 16, Math.PI * 1.7),
    new THREE.CylinderGeometry(0.22, 0.22, 0.2, 6),
  ], []);
  const groups = useMemo(() => {
    const random = seededRandom(421);
    return shapes.map((_, shape) => Array.from({ length: Math.ceil(config.scraps / shapes.length) }, (_, i) => ({
      x: (random() - 0.5) * (mobile ? 10 : 17), y: random() * 0.7, z: random() * 2.2,
      rx: random() * Math.PI, ry: random() * Math.PI, rz: (random() - 0.5) * 1.5,
      scale: 0.65 + random() * 0.8, delay: random() * 0.9,
      startX: (random() - 0.5) * 22, startY: 7 + random() * 6, spin: (random() - 0.5) * 12,
      color: new THREE.Color((i + shape) % 5 === 0 ? "#986340" : (i + shape) % 3 === 0 ? "#626d74" : "#9ba6aa"),
    })));
  }, [config.scraps, mobile, shapes]);
  const chips = useMemo(() => {
    const random = seededRandom(912);
    return Array.from({ length: config.chips }, () => ({ x: (random() - 0.5) * 17, y: random() * 0.42, z: random() * 3, r: random() * 6, s: 0.04 + random() * 0.09 }));
  }, [config.chips]);
  const chipMesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    groups.forEach((items, shape) => {
      items.forEach((item, i) => meshes.current[shape]?.setColorAt(i, item.color));
      if (meshes.current[shape]?.instanceColor) meshes.current[shape]!.instanceColor!.needsUpdate = true;
    });
  }, [groups]);
  useEffect(() => () => shapes.forEach(geometry => geometry.dispose()), [shapes]);
  useFrame(() => {
    const t = motion.current.time;
    groups.forEach((items, shape) => {
      const mesh = meshes.current[shape];
      if (!mesh) return;
      items.forEach((item, i) => {
        const p = THREE.MathUtils.clamp((t - landingStages.captions.start - item.delay) / (landingStages.settle.end - landingStages.captions.start - item.delay), 0, 1);
        const fall = t < landingStages.settle.start
          ? 0.94 * tumbleEase(THREE.MathUtils.clamp((t - landingStages.captions.start - item.delay) / (landingStages.settle.start - landingStages.captions.start - item.delay), 0, 1))
          : 0.94 + 0.06 * settleEase(THREE.MathUtils.clamp((t - landingStages.settle.start) / landingStages.settle.duration, 0, 1));
        const bounce = Math.sin(p * Math.PI * 5) * Math.pow(p, 4) * (1 - p) * 1.8;
        dummy.position.set(THREE.MathUtils.lerp(item.startX, item.x, fall), THREE.MathUtils.lerp(item.startY, floor + item.y, fall) + bounce, item.z);
        dummy.rotation.set(item.rx + item.spin * (1 - fall), item.ry + item.spin * (1 - fall), item.rz + item.spin * (1 - fall));
        dummy.scale.setScalar(item.scale); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
    if (chipMesh.current) {
      const p = THREE.MathUtils.clamp(t / landingStages.settle.end, 0, 1);
      chips.forEach((chip, i) => {
        dummy.position.set(chip.x, floor + chip.y + (1 - p) * (5 + chip.z), chip.z);
        dummy.rotation.set(chip.r, chip.r + (1 - p) * 8, chip.r);
        dummy.scale.setScalar(chip.s); dummy.updateMatrix(); chipMesh.current!.setMatrixAt(i, dummy.matrix);
      });
      chipMesh.current.instanceMatrix.needsUpdate = true;
    }
  });
  return <>
    {groups.map((items, shape) => <instancedMesh key={shape} ref={mesh => { meshes.current[shape] = mesh; }} args={[shapes[shape], undefined, items.length]} frustumCulled={false} dispose={null}><meshStandardMaterial color="white" metalness={0.92} roughness={shape === 1 ? 0.45 : 0.32} /></instancedMesh>)}
    <instancedMesh ref={chipMesh} args={[undefined, undefined, chips.length]} frustumCulled={false}><torusGeometry args={[1, 0.2, 4, 9, 4.6]} /><meshStandardMaterial color="#879196" metalness={0.95} roughness={0.28} /></instancedMesh>
  </>;
}
