"use client";

import { Component, useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RobotArm, Conveyor, Furnace, ScrapAndIngot } from "./process-machine";
import { DepthOfField } from "./process-effects";
import { processConfig, type ProcessMotion } from "./process-config";

// Three.js owns these mutable objects outside React's declarative state.
function resizeCamera(camera: THREE.Camera, width: number, height: number) {
  const perspective = camera as THREE.PerspectiveCamera;
  perspective.aspect = width / Math.max(1, height);
  const worldHeight = Math.max(4.6, 17.2 / perspective.aspect);
  perspective.fov = THREE.MathUtils.radToDeg(2 * Math.atan(worldHeight / 36));
  perspective.lookAt(0, 0.1, 0);
  perspective.updateProjectionMatrix();
}
function setEnvironment(scene: THREE.Scene, texture: THREE.Texture | null) {
  scene.environment = texture;
  scene.environmentIntensity = 1.6;
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

function World({ motion, mobile, playing, frameState, onReady, onError }: SceneProps) {
  const { gl, scene, camera, size, invalidate } = useThree();
  const ready = useRef(false);
  useLayoutEffect(() => {
    resizeCamera(camera, size.width, size.height);
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
  }, [playing, frameState, invalidate]);
  return <>
    <ambientLight intensity={0.35} />
    <directionalLight position={[-4, 7, 5]} intensity={3} color="#f1eee7" />
    <directionalLight position={[5, 3, -4]} intensity={4} color="#ffe6d0" />
    <pointLight position={[2, -0.5, 3]} intensity={15} color="#ff852e" distance={10} decay={2} />
    <RobotArm motion={motion} mobile={mobile} />
    <Conveyor motion={motion} /><Conveyor motion={motion} output />
    <Furnace motion={motion} mobile={mobile} /><ScrapAndIngot motion={motion} />
    <mesh position={[0, -1.48, -1]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[24, 10]} /><shaderMaterial transparent depthWrite={false}
      vertexShader="varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
      fragmentShader="varying vec2 vUv;void main(){float a=smoothstep(0.0,0.25,vUv.x)*smoothstep(1.0,0.75,vUv.x)*sin(vUv.y*3.14159);gl_FragColor=vec4(0.008,0.009,0.009,a*0.75);}" /></mesh>
    {(mobile ? processConfig.mobile : processConfig.desktop).depthOfField && <DepthOfField />}
  </>;
}

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export default function Scene(props: SceneProps) {
  const tabVisible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, () => true);
  const config = props.mobile ? processConfig.mobile : processConfig.desktop;
  return <SceneBoundary onError={props.onError}>
    <Canvas camera={{ position: [0, 2.6, 18], fov: 20, near: 0.1, far: 60 }}
      dpr={[1, config.pixelRatio]} frameloop={props.playing && props.visible && tabVisible ? "always" : "demand"}
      gl={{ antialias: !props.mobile, alpha: true, powerPreference: "high-performance" }}
      fallback={<span>3D is unavailable. The finished material is shown as a still image.</span>} style={{ pointerEvents: "none" }}>
      <World {...props} />
    </Canvas>
  </SceneBoundary>;
}
