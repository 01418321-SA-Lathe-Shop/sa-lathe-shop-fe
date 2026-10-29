"use client";

import { Component, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CarriageTool, Chips, Coolant, HeadstockChuck, LatheBed, Mist, Workpiece } from "./process-machine";
import { DepthOfField } from "./process-effects";
import { latheConfig, latheDuration, type ProcessMotion } from "./process-config";
import { MachineFinish } from "./process-materials";

const { camera: cameraConfig } = latheConfig;
const target = new THREE.Vector3(...cameraConfig.target);
const base = new THREE.Vector3(...cameraConfig.position);

// Three.js owns these mutable objects outside React's declarative state.
function resizeCamera(camera: THREE.Camera, width: number, height: number, mobile: boolean) {
  const perspective = camera as THREE.PerspectiveCamera;
  perspective.aspect = width / Math.max(1, height);
  const distance = perspective.position.distanceTo(target);
  const worldHeight = Math.max(cameraConfig.minWorldHeight, (mobile ? cameraConfig.mobileWorldWidth : cameraConfig.worldWidth) / perspective.aspect);
  perspective.fov = THREE.MathUtils.radToDeg(2 * Math.atan(worldHeight / 2 / distance));
  perspective.lookAt(target);
  perspective.updateProjectionMatrix();
}

/**
 * Procedural dark machine bay for reflections: dim walls, cool high-bay strips, one warm work lamp
 * and a low warm horizon. Metal needs something to reflect; a white studio room makes it look like plastic.
 */
function darkShopEnvironment(gl: THREE.WebGLRenderer) {
  const scene = new THREE.Scene(), disposables: { dispose(): void }[] = [];
  const add = (geometry: THREE.BufferGeometry, rgb: [number, number, number], at: [number, number, number], side: THREE.Side = THREE.FrontSide) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), side });
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); scene.add(mesh);
    disposables.push(geometry, material);
  };
  add(new THREE.BoxGeometry(40, 16, 40), [0.018, 0.02, 0.022], [0, 5, 0], THREE.BackSide);
  [-8, 0, 8].forEach(x => add(new THREE.BoxGeometry(1, 0.2, 18), [2.1, 2.3, 2.6], [x, 11, -2]));
  add(new THREE.BoxGeometry(3.5, 2.2, 0.2), [6, 3.1, 1.3], [-6, 5, 8]);
  add(new THREE.BoxGeometry(34, 1.6, 0.2), [1.4, 0.55, 0.18], [0, -1.5, -16]);
  add(new THREE.BoxGeometry(6, 4, 0.2), [0.7, 0.8, 0.95], [11, 4, -12]);
  add(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), [0.035, 0.03, 0.028], [0, -3, 0]);
  const generator = new THREE.PMREMGenerator(gl);
  const target = generator.fromScene(scene, 0.035);
  generator.dispose(); disposables.forEach(item => item.dispose());
  return target;
}

function setEnvironment(scene: THREE.Scene, texture: THREE.Texture | null) {
  scene.environment = texture;
  scene.environmentIntensity = 0.9;
}

type SceneProps = {
  motion: React.RefObject<ProcessMotion>;
  mobile: boolean;
  playing: boolean;
  frameState: string;
  visible: boolean;
  onReady: () => void;
  onError: () => void;
};

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Slow, seamless drift: one sine period per process cycle, so the loop seam never jumps. */
function CameraDrift({ motion, mobile }: { motion: React.RefObject<ProcessMotion>; mobile: boolean }) {
  useFrame(({ camera }) => {
    if (mobile) return;
    const phase = (motion.current.time / latheDuration) * Math.PI * 2;
    camera.position.set(base.x + cameraConfig.drift[0] * Math.sin(phase), base.y + cameraConfig.drift[1] * Math.sin(phase + 1.2), base.z);
    camera.lookAt(target);
  });
  return null;
}

function World({ motion, mobile, playing, frameState, onReady, onError }: SceneProps) {
  const { gl, scene, camera, size, invalidate } = useThree();
  const ready = useRef(false);
  const budget = mobile ? latheConfig.mobile : latheConfig.desktop;
  const keyTarget = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    resizeCamera(camera, size.width, size.height, mobile);
    invalidate();
  }, [camera, size.width, size.height, mobile, invalidate]);
  useEffect(() => {
    const environment = darkShopEnvironment(gl);
    setEnvironment(scene, environment.texture);
    const lost = (event: Event) => { event.preventDefault(); onError(); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    const frame = requestAnimationFrame(() => {
      invalidate();
      if (!ready.current) { ready.current = true; onReady(); }
    });
    return () => {
      cancelAnimationFrame(frame);
      gl.domElement.removeEventListener("webglcontextlost", lost);
      setEnvironment(scene, null);
      environment.dispose();
    };
  }, [gl, scene, onReady, onError, invalidate]);
  useEffect(() => {
    // Canvas reconfigures its render loop asynchronously. Invalidate afterwards,
    // so pause/complete always paints the current pose before going idle.
    const frame = requestAnimationFrame(() => invalidate());
    return () => cancelAnimationFrame(frame);
  }, [playing, frameState, invalidate]);
  return <>
    <hemisphereLight args={["#3b4652", "#0c0a08", 0.35]} />
    {/* Warm work lamp over the chuck: the key light and the only shadow caster. */}
    <primitive object={keyTarget} position={[-0.4, -0.3, 0]} />
    <spotLight position={[-1.6, 5.6, 3.6]} target={keyTarget} angle={0.55} penumbra={0.85} intensity={38} decay={2} color="#ffd6b0" castShadow
      shadow-mapSize={[budget.shadowMap, budget.shadowMap]} shadow-bias={-0.0002} shadow-normalBias={0.02} shadow-camera-near={2} shadow-camera-far={14} />
    <directionalLight position={[4, 4, -7]} intensity={1.7} color="#9fb9d8" />
    <directionalLight position={[2, 2.5, 10]} intensity={0.45} color="#d9d4cc" />
    <pointLight position={[1.5, -1.25, 2.6]} intensity={2.4} color="#ff8a3d" distance={6} decay={2} />
    <MachineFinish>
      <LatheBed />
      <HeadstockChuck motion={motion} mobile={mobile} />
      <CarriageTool motion={motion} />
      <Workpiece motion={motion} mobile={mobile} />
      <Chips motion={motion} mobile={mobile} />
      <Coolant motion={motion} mobile={mobile} />
      {budget.mist > 0 && <Mist motion={motion} />}
    </MachineFinish>
    <CameraDrift motion={motion} mobile={mobile} />
    {budget.depthOfField && <DepthOfField motion={motion} />}
  </>;
}

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export default function Scene(props: SceneProps) {
  const tabVisible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, () => true);
  const budget = props.mobile ? latheConfig.mobile : latheConfig.desktop;
  return <SceneBoundary onError={props.onError}>
    <Canvas shadows={{ type: THREE.PCFShadowMap }} camera={{ position: [...cameraConfig.position], fov: 20, near: 0.5, far: 60 }}
      dpr={[1, budget.pixelRatio]} frameloop={props.playing && props.visible && tabVisible ? "always" : "demand"}
      gl={{ antialias: !props.mobile, alpha: true, powerPreference: "high-performance" }}
      fallback={<span>ไม่สามารถแสดงภาพสามมิติได้ จึงแสดงภาพชิ้นงานสำเร็จแทน</span>} style={{ pointerEvents: "none" }}>
      <World {...props} />
    </Canvas>
  </SceneBoundary>;
}
