"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { seededRandom } from "./landing-geometry";

type Finishes = { ground: THREE.DataTexture; paint: THREE.DataTexture; turned: THREE.DataTexture };
const FinishContext = createContext<Finishes | null>(null);

/** Linear grayscale data texture; `stroke(x, y)` returns 0–255. No downloaded image. */
function dataTexture(width: number, height: number, seed: number, stroke: (x: number, y: number, random: () => number) => number) {
  const data = new Uint8Array(width * height * 4), random = seededRandom(seed);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, value = Math.max(0, Math.min(255, Math.round(stroke(x, y, random))));
    data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

/** Ground ways and steel: long grinding streaks along U. */
function groundFinish() {
  const rows = Array.from({ length: 128 }, (_, i) => 120 + Math.sin(i * 1.9) * 18);
  return dataTexture(256, 128, 1827, (x, y, random) => rows[y] + (random() - 0.5) * 22 + Math.sin(x * 0.03) * 6);
}
/** Machine paint: soft orange-peel mottling, no direction. */
function paintFinish() {
  return dataTexture(128, 128, 4417, (x, y, random) => 150 + Math.sin(x * 0.21 + Math.sin(y * 0.17) * 2) * 12 + Math.cos(y * 0.23) * 10 + (random() - 0.5) * 16);
}
/** Turning marks: fine feed rings across U, constant around the circumference. */
function turnedFinish() {
  const columns = seededRandom(90);
  const ring = Array.from({ length: 256 }, (_, i) => 105 + (i % 4 < 2 ? 18 : -10) + (columns() - 0.5) * 30);
  return dataTexture(256, 16, 91, (x, _y, random) => ring[x] + (random() - 0.5) * 6);
}

export function MachineFinish({ children }: { children: ReactNode }) {
  const finishes = useMemo(() => ({ ground: groundFinish(), paint: paintFinish(), turned: turnedFinish() }), []);
  useEffect(() => () => Object.values(finishes).forEach(texture => texture.dispose()), [finishes]);
  return <FinishContext.Provider value={finishes}>{children}</FinishContext.Provider>;
}
export function useFinishes() {
  const finishes = useContext(FinishContext);
  if (!finishes) throw new Error("MachineFinish provider is missing");
  return finishes;
}

/** Bare steel. Real metals keep metalness 1; roughness × the ~0.5 grind map carries the finish. */
export function Metal(props: ThreeElements["meshStandardMaterial"]) {
  const { ground } = useFinishes();
  return <meshStandardMaterial metalness={1} roughness={0.55} roughnessMap={ground} {...props} />;
}
/** Painted castings and sheet metal: dielectric, so reflections stay dim and broad. */
export function Paint(props: ThreeElements["meshStandardMaterial"]) {
  const { paint } = useFinishes();
  return <meshStandardMaterial metalness={0.05} roughness={1.2} roughnessMap={paint} bumpMap={paint} bumpScale={0.004} {...props} />;
}

export const palette = {
  casting: "#36403c", castingDark: "#1f2524", sheet: "#232829", steel: "#b9bfc2", darkSteel: "#5f6669",
  blackOxide: "#1d1f21", insert: "#c9a24a", accent: "#ff923f", hose: "#c4561c", aluminium: "#c4c9cb",
} as const;
