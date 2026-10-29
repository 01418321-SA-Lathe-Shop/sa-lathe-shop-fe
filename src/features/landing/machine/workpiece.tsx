"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CHUCK_X, CUT_LENGTH, END_X, GRIP, RAW_R, finishedProfile, finishedRadius, latheConfig, latheDuration, sampleLathe } from "../process-config";
import { palette, useFinishes } from "../process-materials";
import type { MotionProps } from "./primitives";

const LEFT_X = CHUCK_X - GRIP;

/**
 * Unit-radius lathe surface with per-vertex raw/finished radii. The vertex shader picks the
 * radius by comparing x with the tool position, so the cut follows the tip exactly at no CPU cost.
 */
function workpieceGeometry(axial: number, radial: number) {
  const xs = new Set<number>();
  for (let i = 0; i <= axial; i++) xs.add(LEFT_X + (END_X - LEFT_X) * i / axial);
  finishedProfile.forEach(([d]) => xs.add(END_X - d));
  const side = [...xs].sort((a, b) => a - b);
  type Row = { x: number; raw: number; fin: number; slope: number; k: number; face: number };
  const rows: Row[] = [];
  const faceRows = (x: number, fin: number, face: number) => [0, 0.55, 0.85, 1].map(k => ({ x, raw: RAW_R, fin, slope: 0, k, face }));
  rows.push(...faceRows(LEFT_X, RAW_R, -1));
  side.forEach((x, i) => {
    const a = side[Math.max(0, i - 1)], b = side[Math.min(side.length - 1, i + 1)];
    rows.push({ x, raw: RAW_R, fin: finishedRadius(x), slope: (finishedRadius(b) - finishedRadius(a)) / Math.max(1e-6, b - a), k: 1, face: 0 });
  });
  rows.push(...faceRows(END_X, finishedRadius(END_X), 1).reverse());

  const count = rows.length * (radial + 1);
  const position = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  const attrs = { aRaw: new Float32Array(count), aFin: new Float32Array(count), aSlope: new Float32Array(count), aK: new Float32Array(count), aFace: new Float32Array(count) };
  rows.forEach((row, i) => {
    for (let j = 0; j <= radial; j++) {
      const v = i * (radial + 1) + j, angle = (j / radial) * Math.PI * 2;
      position.set([row.x, Math.cos(angle), Math.sin(angle)], v * 3);
      uv.set([row.x * 3, j / radial], v * 2);
      attrs.aRaw[v] = row.raw; attrs.aFin[v] = row.fin; attrs.aSlope[v] = row.slope; attrs.aK[v] = row.k; attrs.aFace[v] = row.face;
    }
  });
  const index: number[] = [];
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    index.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  Object.entries(attrs).forEach(([name, data]) => geometry.setAttribute(name, new THREE.BufferAttribute(data, 1)));
  // Positions are unit-radius placeholders; bounds must cover the displaced surface.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3((LEFT_X + END_X) / 2, 0, 0), (END_X - LEFT_X) / 2 + RAW_R);
  return geometry;
}

const vertexHeader = `
attribute float aRaw; attribute float aFin; attribute float aSlope; attribute float aK; attribute float aFace;
uniform float uCut; uniform float uBand;
varying float vMachined; varying float vAxial;
float machinedAt(float x) { return smoothstep(uCut - uBand, uCut + uBand, x); }
`;
const radiusChunk = `
float cutMix = machinedAt(position.x);
float sideRadius = mix(aRaw, aFin, cutMix);
float ds = 6.0 * cutMix * (1.0 - cutMix) / (2.0 * uBand);
float drdx = (aFin - aRaw) * ds + cutMix * aSlope;
vec3 sideNormal = normalize(vec3(-drdx, position.y, position.z));
vMachined = cutMix; vAxial = position.x;
`;
type Uniforms = { uCut: { value: number }; uBand: { value: number }; uCoolant: { value: number }; uRawColor: { value: THREE.Color } };

/** Physical turned-aluminium material plus a matching depth material so the shadow shrinks with the cut. */
function workpieceMaterials(turned: THREE.Texture) {
  const uniforms: Uniforms = { uCut: { value: END_X + 1 }, uBand: { value: 0.012 }, uCoolant: { value: 0 }, uRawColor: { value: new THREE.Color("#6b7173") } };
  const material = new THREE.MeshPhysicalMaterial({ color: palette.aluminium, metalness: 1, roughness: 0.55, roughnessMap: turned, anisotropy: 0.55 });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = vertexHeader + shader.vertexShader
      .replace("#include <beginnormal_vertex>", `${radiusChunk}\nvec3 objectNormal = aFace != 0.0 ? vec3(aFace, 0.0, 0.0) : sideNormal;\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif`)
      .replace("#include <begin_vertex>", "vec3 transformed = vec3(position.x, position.yz * sideRadius * aK);");
    shader.fragmentShader = "uniform float uCoolant; uniform vec3 uRawColor; varying float vMachined; varying float vAxial; uniform float uCut;\n" + shader.fragmentShader
      .replace("#include <color_fragment>", "#include <color_fragment>\n// Mill-finish bar is duller and darker than freshly turned stock.\ndiffuseColor.rgb = mix(uRawColor, diffuseColor.rgb, vMachined);")
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
// Coolant film right behind the tip reads as a wet, near-mirror band.
float wet = uCoolant * vMachined * exp(-max(vAxial - uCut, 0.0) / 0.6);
roughnessFactor = mix(roughnessFactor * 1.45, roughnessFactor * 0.42, vMachined);
roughnessFactor = mix(roughnessFactor, 0.06, wet * 0.75);`);
  };
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = vertexHeader + shader.vertexShader
      .replace("#include <begin_vertex>", `${radiusChunk}\nvec3 transformed = vec3(position.x, position.yz * sideRadius * aK);`);
  };
  material.userData.uniforms = uniforms;
  return { material, depth, uniforms };
}

export function Workpiece({ motion, mobile }: MotionProps) {
  const { turned } = useFinishes();
  const budget = mobile ? latheConfig.mobile : latheConfig.desktop;
  const geometry = useMemo(() => workpieceGeometry(mobile ? 160 : 280, budget.segments), [mobile, budget.segments]);
  const live = useMemo(() => workpieceMaterials(turned), [turned]);
  const finished = useMemo(() => { const m = workpieceMaterials(turned); m.uniforms.uCut.value = END_X - CUT_LENGTH - 1; return m; }, [turned]);
  const rest = useMemo(() => sampleLathe(latheDuration), []);
  useLayoutEffect(() => () => { geometry.dispose(); [live, finished].forEach(m => { m.material.dispose(); m.depth.dispose(); }); }, [geometry, live, finished]);
  const part = useRef<THREE.Mesh>(null), tray = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const p = sampleLathe(motion.current.time, motion.current.cycle);
    if (part.current) {
      const uniforms = (part.current.material as THREE.Material).userData.uniforms as Uniforms;
      uniforms.uCut.value = p.cutX; uniforms.uCoolant.value = Math.max(p.coolant, p.drip * 0.6);
      part.current.position.set(p.barX + p.partX, p.barY + p.partY, 0);
      part.current.rotation.set(p.visibleAngle, p.partTilt, 0, "YXZ");
      // Once landed, the tray copy (identical pose) takes over so the next bar can feed in.
      part.current.visible = !(p.landed && p.ejecting);
    }
    if (tray.current) tray.current.visible = p.trayPart;
  });
  return <>
    <mesh ref={part} geometry={geometry} material={live.material} customDepthMaterial={live.depth} castShadow receiveShadow />
    <mesh ref={tray} geometry={geometry} material={finished.material} customDepthMaterial={finished.depth} castShadow receiveShadow
      position={[rest.partX, rest.partY, 0]} rotation={[0.6, rest.partTilt, 0, "YXZ"]} visible={false} />
  </>;
}
