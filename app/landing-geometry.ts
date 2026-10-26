import * as THREE from "three";

/** Deterministic shapes and placement: no physics engine or downloaded assets. */
export function seededRandom(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function coilGeometry() {
  const points = Array.from({ length: 201 }, (_, i) => {
    const t = i / 200;
    return new THREE.Vector3(Math.cos(t * Math.PI * 22) * 0.16, t * 2.65, Math.sin(t * Math.PI * 22) * 0.16);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 200, 0.038, 6, false);
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

export function finishedRodGeometry() {
  const profile: [number, number][] = [
    [0, -1.8], [0.22, -1.8], [0.28, -1.74], [0.28, -1.15],
    [0.4, -1.1], [0.4, -0.87], [0.32, -0.82], [0.32, 0.82],
    [0.4, 0.87], [0.4, 1.1], [0.28, 1.15], [0.28, 1.74], [0.22, 1.8], [0, 1.8],
  ];
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 64);
}
