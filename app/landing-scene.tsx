"use client";

import { Component, useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Machine, Sparks } from "./landing-machine";
import { ScrapPile } from "./landing-scrap-pile";
import { landingConfig, type LandingMotion } from "./landing-config";

// Three.js owns these mutable objects outside React's declarative state.
function resizeCamera(camera: THREE.Camera, width: number, mobile: boolean) {
  const orthographic = camera as THREE.OrthographicCamera;
  orthographic.zoom = width / (mobile ? 10 : 16);
  orthographic.updateProjectionMatrix();
}
function setEnvironment(scene: THREE.Scene, texture: THREE.Texture | null) {
  scene.environment = texture;
  scene.environmentIntensity = 1.6;
}

type SceneProps = {
  motion: React.RefObject<LandingMotion>;
  mobile: boolean;
  playing: boolean;
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

function World({ motion, mobile, playing, onReady, onError }: SceneProps) {
  const { gl, scene, camera, size, invalidate } = useThree();
  const ready = useRef(false);
  useLayoutEffect(() => {
    resizeCamera(camera, size.width, mobile);
    invalidate();
  }, [camera, size.width, size.height, mobile, invalidate]);
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const environment = generator.fromScene(room, 0.04);
    setEnvironment(scene, environment.texture);
    room.dispose(); generator.dispose();
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
    // so completion/skip always paints the final pose before going idle.
    const frame = requestAnimationFrame(() => invalidate());
    return () => cancelAnimationFrame(frame);
  }, [playing, invalidate]);
  // Camera width is fixed in world units; keep the pile anchored to the viewport bottom.
  const height = (mobile ? 10 : 16) * size.height / Math.max(1, size.width);
  const floor = -height / 2 + 0.35;
  return <>
    <ambientLight intensity={0.3} />
    <directionalLight position={[-6, 6, 8]} intensity={3.5} color="#dce5ec" />
    <directionalLight position={[6, -3, 5]} intensity={5} color="#ff8c42" />
    <pointLight position={[-3, floor + 0.4, 2]} intensity={28} color="#ff6c23" distance={12} decay={2} />
    <Machine motion={motion} floor={floor} />
    <ScrapPile motion={motion} mobile={mobile} floor={floor} />
    <Sparks motion={motion} mobile={mobile} />
    <mesh position={[0, floor - 0.5, -2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[40, 12]} /><meshStandardMaterial color="#090a0a" metalness={0.6} roughness={0.5} /></mesh>
    <fog attach="fog" args={[landingConfig.colors.background, 20, 40]} />
  </>;
}

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export default function Scene(props: SceneProps) {
  const tabVisible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, () => true);
  const config = props.mobile ? landingConfig.mobile : landingConfig.desktop;
  return <SceneBoundary onError={props.onError}>
    <Canvas orthographic camera={{ position: [0, 0, 18], zoom: 80, near: 0.1, far: 60 }}
      dpr={[1, config.pixelRatio]} frameloop={props.playing && props.visible && tabVisible ? "always" : "demand"}
      gl={{ antialias: !props.mobile, alpha: true, powerPreference: "high-performance" }}
      fallback={<span>3D is unavailable. The finished material is shown as a still image.</span>} style={{ pointerEvents: "none" }}>
      <World {...props} />
    </Canvas>
  </SceneBoundary>;
}
