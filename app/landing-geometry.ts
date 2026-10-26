import * as THREE from "three";

/** Deterministic shapes and placement: no physics engine or downloaded assets. */
export function seededRandom(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function bracketGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.4);
  shape.lineTo(0.45, -0.4);
  shape.lineTo(0.45, -0.22);
  shape.lineTo(-0.28, -0.22);
  shape.lineTo(-0.28, 0.5);
  shape.lineTo(-0.5, 0.5);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.025, bevelThickness: 0.025 });
}
