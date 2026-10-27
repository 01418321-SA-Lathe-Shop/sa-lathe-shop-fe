"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { seededRandom } from "./landing-geometry";

const FinishContext = createContext<THREE.DataTexture | null>(null);

/** Shared, seeded machining marks. Linear data, not a downloaded color texture. */
function brushedFinish() {
  const width = 256, height = 128, data = new Uint8Array(width * height * 4);
  const random = seededRandom(1827);
  for (let y = 0; y < height; y++) {
    const stroke = 145 + random() * 65;
    for (let x = 0; x < width; x++) {
      const value = Math.round(stroke + (random() - 0.5) * 18 + Math.sin(x * 0.045) * 8);
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

export function MachineFinish({ children }: { children: ReactNode }) {
  const finish = useMemo(() => brushedFinish(), []);
  useEffect(() => () => finish.dispose(), [finish]);
  return <FinishContext.Provider value={finish}>{children}</FinishContext.Provider>;
}

export function Metal(props: ThreeElements["meshStandardMaterial"]) {
  const finish = useContext(FinishContext);
  return <meshStandardMaterial roughnessMap={finish} bumpMap={finish} bumpScale={0.012} {...props} />;
}
