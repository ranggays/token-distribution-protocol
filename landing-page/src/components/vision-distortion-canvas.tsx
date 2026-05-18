"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import * as THREE from "three";

const IMAGE_ONE = "/images/velora/vision1.webp";
const IMAGE_TWO = "/images/velora/vision2.webp";
const DISPLACEMENT = "/images/velora/effects/cursor-displacement.jpg";

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform sampler2D uImageOne;
uniform sampler2D uImageTwo;
uniform sampler2D uDisplacement;
uniform vec2 uResolution;
uniform vec2 uImageOneResolution;
uniform vec2 uImageTwoResolution;
uniform float uProgress;
uniform float uTime;

varying vec2 vUv;

vec2 coverUv(vec2 uv, vec2 canvasResolution, vec2 imageResolution) {
  float canvasRatio = canvasResolution.x / canvasResolution.y;
  float imageRatio = imageResolution.x / imageResolution.y;
  vec2 scale = vec2(1.0);

  if (canvasRatio > imageRatio) {
    scale.y = imageRatio / canvasRatio;
  } else {
    scale.x = canvasRatio / imageRatio;
  }

  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 uv = vUv;
  vec2 imageOneUv = coverUv(uv, uResolution, uImageOneResolution);
  vec2 imageTwoUv = coverUv(uv, uResolution, uImageTwoResolution);
  vec4 displacement = texture2D(uDisplacement, uv + vec2(uTime * 0.012, 0.0));
  vec2 direction = normalize(vec2(1.0, -0.72));
  float map = displacement.r * 2.0 - 1.0;
  float strength = 0.12;
  float transitionProgress = smoothstep(0.0, 1.0, uProgress);
  float transitionDistortion = sin(transitionProgress * 3.14159265);
  transitionDistortion *= 1.0 - smoothstep(0.88, 0.99, transitionProgress);
  vec2 offset = direction * map * strength * transitionDistortion;

  vec4 imageOne = texture2D(uImageOne, imageOneUv + offset * 0.45);
  vec4 imageTwo = texture2D(uImageTwo, imageTwoUv - offset);
  vec3 color = mix(imageOne.rgb, imageTwo.rgb, smoothstep(0.0, 1.0, uProgress));

  color = color * 1.08 + vec3(0.025, 0.02, 0.012);
  color = mix(color, vec3(dot(color, vec3(0.299, 0.587, 0.114))), 0.08);

  gl_FragColor = vec4(color, 1.0);
}
`;

export function VisionDistortionCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x111318, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const geometry = new THREE.PlaneGeometry(2, 2);
    const loader = new THREE.TextureLoader();
    const textureOne = loader.load(IMAGE_ONE);
    const textureTwo = loader.load(IMAGE_TWO);
    const displacement = loader.load(DISPLACEMENT);

    [textureOne, textureTwo, displacement].forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.MirroredRepeatWrapping;
      texture.wrapT = THREE.MirroredRepeatWrapping;
    });

    const uniforms = {
      uImageOne: { value: textureOne },
      uImageTwo: { value: textureTwo },
      uDisplacement: { value: displacement },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uImageOneResolution: { value: new THREE.Vector2(4480, 6720) },
      uImageTwoResolution: { value: new THREE.Vector2(5220, 7827) },
      uProgress: { value: 0 },
      uTime: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    scene.add(new THREE.Mesh(geometry, material));

    const state = {
      target: 0,
      progress: 0,
    };

    let frame = 0;
    let disposed = false;

    const resize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(width, height);
    };

    const handlePointerEnter = () => {
      state.target = 1;
    };

    const handlePointerLeave = () => {
      state.target = 0;
    };

    const render = (time: number) => {
      if (disposed) return;

      state.progress += (state.target - state.progress) * 0.14;
      if (Math.abs(state.target - state.progress) < 0.002) {
        state.progress = state.target;
      }
      uniforms.uProgress.value = state.progress;
      uniforms.uTime.value = time * 0.001;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(resize);
    resize();
    window.setTimeout(resize, 80);
    window.setTimeout(resize, 700);
    resizeObserver.observe(container);
    window.addEventListener("resize", resize);
    container.addEventListener("pointerenter", handlePointerEnter);
    container.addEventListener("pointerleave", handlePointerLeave);
    frame = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      container.removeEventListener("pointerenter", handlePointerEnter);
      container.removeEventListener("pointerleave", handlePointerLeave);
      geometry.dispose();
      material.dispose();
      textureOne.dispose();
      textureTwo.dispose();
      displacement.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="vision-distortion-canvas" ref={containerRef}>
      <Image
        className="vision-distortion-image vision-distortion-image-primary"
        src={IMAGE_ONE}
        alt=""
        fill
        sizes="30vw"
        aria-hidden="true"
      />
      <Image
        className="vision-distortion-image vision-distortion-image-secondary"
        src={IMAGE_TWO}
        alt=""
        fill
        sizes="30vw"
        aria-hidden="true"
      />
    </div>
  );
}
