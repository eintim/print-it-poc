"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type HomeHeroThreePreviewProps = {
  className?: string;
};

/**
 * Lightweight WebGL hero: a real shaded mesh users can orbit — no GLTF fetch.
 */
export default function HomeHeroThreePreview({
  className = "",
}: HomeHeroThreePreviewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = () => mount.clientWidth;
    const height = () => Math.max(mount.clientHeight, 1);

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(48, width() / height(), 0.1, 100);
    camera.position.set(0.12, 0.28, 3.05);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width(), height());
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xd8f0e4, 0.58);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(4, 5.5, 3);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xa7f3d0, 0.55);
    fill.position.set(-3.5, 0.5, 2);
    scene.add(fill);

    const copper = new THREE.PointLight(0xfdba74, 1.45, 14, 2);
    copper.position.set(-1.8, -2.2, 3.5);
    scene.add(copper);

    const geo = new THREE.TorusKnotGeometry(0.82, 0.26, 140, 18, 2, 3);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.38,
      roughness: 0.34,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.12,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = 0.35;
    scene.add(mesh);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI - 0.45;
    controls.minDistance = 1.85;
    controls.maxDistance = 5.8;
    controls.target.set(0, 0, 0);

    let raf = 0;
    const tick = () => {
      mesh.rotation.y += 0.0055;
      mesh.rotation.x += 0.0012;
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      const w = width();
      const h = height();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative min-h-[12rem] w-full cursor-grab touch-none active:cursor-grabbing ${className}`}
      aria-label="Interactive 3D preview: drag to orbit the model"
    />
  );
}
