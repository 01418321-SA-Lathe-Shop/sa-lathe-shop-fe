"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo,useRef,type RefObject } from "react";
import * as THREE from "three";
import { bracketGeometry } from "../landing-geometry";
import { sampleProcess,type ProcessMotion } from "../process-config";
import { Metal } from "../process-materials";

import { Box,orange } from './primitives';


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
  const cold = useMemo(() => new THREE.Color("#929c9f"), []), hot = useMemo(() => new THREE.Color(orange), []);
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
      ingot.current.rotation.y = p.ingotRotation;
      finishedMaterial.current.color.copy(cold).lerp(hot, p.ingotHeat);
      finishedMaterial.current.emissiveIntensity = p.ingotHeat * 2;
      finishedMaterial.current.opacity = p.ingotOpacity;
    }
  });
  return <>
    <mesh castShadow receiveShadow ref={scrap} geometry={bracket} scale={0.66} rotation={[0.2, 0.25, -0.22]}><Metal ref={rawMaterial} color="#858785" metalness={0.92} roughness={0.55} transparent /></mesh>
    <mesh castShadow receiveShadow ref={ingot} geometry={finished}><Metal ref={finishedMaterial} color={cold} emissive={orange} emissiveIntensity={0} metalness={0.96} roughness={0.34} transparent /></mesh>
    <Box at={[-5.7, -0.98, 0]} size={[1.1, 0.45, 0.95]} />
  </>;
}
