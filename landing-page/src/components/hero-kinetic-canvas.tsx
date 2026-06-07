"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const IMAGE_SRC = "/images/velora/header-1.png";

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uImageResolution;
uniform vec2 uMouse;
uniform vec2 uVelocity;
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

float circleMask(vec2 uv, vec2 center, float radius, float softness) {
  float distanceToCenter = distance(uv, center);
  return 1.0 - smoothstep(radius - softness, radius, distanceToCenter);
}

void main() {
  vec2 uv = vUv;
  vec2 mouse = vec2(uMouse.x, 1.0 - uMouse.y);
  vec2 imageUv = coverUv(uv, uResolution, uImageResolution);
  vec2 velocity = vec2(uVelocity.x, -uVelocity.y);
  float speed = clamp(length(velocity), 0.0, 1.0);

  float reveal = circleMask(uv, mouse, 0.34, 0.22);
  float core = circleMask(uv, mouse, 0.12, 0.07);
  float ring = smoothstep(0.15, 0.0, abs(distance(uv, mouse) - 0.185));

  vec2 direction = normalize(velocity + vec2(0.0001));
  vec2 fromMouse = uv - mouse;
  float ripple =
    sin((length(fromMouse) * 58.0) - (uTime * 4.0) - dot(fromMouse, direction) * 20.0);
  float wake =
    sin((uv.y * 52.0) + (uTime * 1.4) + (uv.x * 8.0));

  vec2 displacement =
    (-velocity * 0.026 * reveal) +
    (normalize(fromMouse + vec2(0.0001)) * ripple * (0.005 + speed * 0.009) * reveal) +
    (vec2(wake, -wake) * 0.0025 * reveal);

  vec2 displacedUv = imageUv + displacement;
  vec2 rgbShift = direction * (0.0025 + speed * 0.008) * reveal;

  vec3 base = texture2D(uTexture, imageUv).rgb;
  vec3 displaced;
  displaced.r = texture2D(uTexture, displacedUv + rgbShift).r;
  displaced.g = texture2D(uTexture, displacedUv).g;
  displaced.b = texture2D(uTexture, displacedUv - rgbShift).b;

  vec3 darkBase = base * vec3(0.20, 0.22, 0.23);
  vec3 revealColor = displaced * vec3(0.78, 0.80, 0.78);
  revealColor += vec3(0.08, 0.075, 0.055) * core;
  revealColor += vec3(0.09, 0.09, 0.08) * ring * reveal;

  vec3 color = mix(darkBase, revealColor, reveal);
  color *= 1.0 - smoothstep(0.36, 0.92, distance(uv, mouse)) * 0.56;

  gl_FragColor = vec4(color, 1.0);
}
`;

export function HeroKineticCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x06070a, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const geometry = new THREE.PlaneGeometry(2, 2);
    const loader = new THREE.TextureLoader();
    const texture = loader.load(IMAGE_SRC);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const uniforms = {
      uTexture: { value: texture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uImageResolution: { value: new THREE.Vector2(1920, 1080) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uVelocity: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const pointer = {
      x: 0.5,
      y: 0.5,
      targetX: 0.5,
      targetY: 0.5,
      velocityX: 0,
      velocityY: 0,
    };

    let frame = 0;
    let disposed = false;

    const resize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(width, height);
    };

    const resizeObserver = new ResizeObserver(resize);

    const handlePointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.targetX = (event.clientX - rect.left) / rect.width;
      pointer.targetY = (event.clientY - rect.top) / rect.height;
      pointer.velocityX = event.movementX / rect.width;
      pointer.velocityY = event.movementY / rect.height;
    };

    const render = (time: number) => {
      if (disposed) return;

      pointer.x += (pointer.targetX - pointer.x) * 0.18;
      pointer.y += (pointer.targetY - pointer.y) * 0.18;
      pointer.velocityX *= 0.78;
      pointer.velocityY *= 0.78;

      uniforms.uMouse.value.set(pointer.x, pointer.y);
      uniforms.uVelocity.value.set(pointer.velocityX, pointer.velocityY);
      uniforms.uTime.value = time * 0.001;

      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };

    resize();
    resizeObserver.observe(container);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    frame = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="hero-kinetic-canvas" ref={containerRef} aria-hidden="true" />;
}
