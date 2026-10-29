"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { latheConfig, sampleLathe, type ProcessMotion } from "./process-config";

/** Desktop-only depth of field whose focus follows the cutting tip with a damped lag. */
export function DepthOfField({ motion }: { motion: RefObject<ProcessMotion> }) {
  const { gl, scene, camera, size } = useThree();
  const pipeline = useRef<{ composer: EffectComposer; bokeh: BokehPass } | null>(null);
  const focus = useRef<Vector3 | null>(null);
  useEffect(() => {
    const { aperture, maxBlur } = latheConfig.camera;
    const composer = new EffectComposer(gl);
    const render = new RenderPass(scene, camera);
    const bokeh = new BokehPass(scene, camera as PerspectiveCamera, { focus: camera.position.length(), aperture, maxblur: maxBlur });
    // Three's stock BokehPass forces an opaque output. Retain alpha for the page's horizon.
    bokeh.materialBokeh.fragmentShader = bokeh.materialBokeh.fragmentShader.replace("gl_FragColor.a = 1.0;", "gl_FragColor.a = col.a / 41.0;");
    const output = new OutputPass();
    composer.addPass(render); composer.addPass(bokeh); composer.addPass(output);
    pipeline.current = { composer, bokeh };
    return () => { pipeline.current = null; render.dispose(); bokeh.dispose(); output.dispose(); composer.dispose(); };
  }, [gl, scene, camera]);
  useEffect(() => { pipeline.current?.composer.setSize(size.width, size.height); }, [size.width, size.height]);
  useFrame((state, delta) => {
    if (!pipeline.current) { state.gl.render(state.scene, state.camera); return; }
    const p = sampleLathe(motion.current.time, motion.current.cycle);
    const target = new Vector3(p.focusX, 0, 0);
    // Frame-rate independent exponential follow: the focus pulls, it never snaps.
    if (!focus.current) focus.current = target.clone();
    else focus.current.lerp(target, 1 - Math.exp(-Math.min(delta, 0.1) / latheConfig.camera.focusLag));
    (pipeline.current.bokeh.uniforms as Record<string, { value: number }>).focus.value = state.camera.position.distanceTo(focus.current);
    pipeline.current.composer.render(delta);
  }, 1);
  return null;
}
