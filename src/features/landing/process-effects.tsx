"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/** A restrained desktop-only focus plane; mobile uses the direct renderer. */
export function DepthOfField() {
  const { gl, scene, camera, size } = useThree();
  const pipeline = useRef<EffectComposer | null>(null);
  useEffect(() => {
    const composer = new EffectComposer(gl);
    const render = new RenderPass(scene, camera);
    const bokeh = new BokehPass(scene, camera as PerspectiveCamera, { focus: 18.1, aperture: 0.0006, maxblur: 0.004 });
    // Three's stock BokehPass forces an opaque output. Retain alpha for the page's horizon.
    bokeh.materialBokeh.fragmentShader = bokeh.materialBokeh.fragmentShader.replace("gl_FragColor.a = 1.0;", "gl_FragColor.a = col.a / 41.0;");
    const output = new OutputPass();
    composer.addPass(render); composer.addPass(bokeh); composer.addPass(output);
    pipeline.current = composer;
    return () => { pipeline.current = null; render.dispose(); bokeh.dispose(); output.dispose(); composer.dispose(); };
  }, [gl, scene, camera]);
  useEffect(() => { pipeline.current?.setSize(size.width, size.height); }, [size.width, size.height]);
  useFrame((state, delta) => {
    if (pipeline.current) pipeline.current.render(delta);
    else state.gl.render(state.scene, state.camera);
  }, 1);
  return null;
}
