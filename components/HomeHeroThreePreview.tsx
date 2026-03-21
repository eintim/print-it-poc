"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

/** Written by `npm run showcase:fetch-meshy` — matches the moon-jar hero sketch. */
const HOME_HERO_GLB_URL = "/showcase/home-hero_opti.glb";

type HomeHeroThreePreviewProps = {
  className?: string;
};

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const mats = mesh.material;
      if (Array.isArray(mats)) {
        for (const m of mats) m.dispose();
      } else if (mats) {
        mats.dispose();
      }
    }
  });
}

/**
 * Home hero 3D: loads Meshy preview GLB (meshopt) when present; otherwise a shaded TorusKnot.
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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI - 0.45;
    controls.minDistance = 1.85;
    controls.maxDistance = 5.8;
    controls.target.set(0, 0, 0);

    let raf = 0;
    let disposed = false;
    /** Mesh or loaded root we spin each frame */
    let spinTarget: THREE.Object3D | null = null;
    let spinTorusStyle = false;

    const ro = new ResizeObserver(() => {
      const w = width();
      const h = height();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    const tick = () => {
      if (disposed) return;
      if (spinTarget) {
        if (spinTorusStyle) {
          spinTarget.rotation.y += 0.0055;
          spinTarget.rotation.x += 0.0012;
        } else {
          spinTarget.rotation.y += 0.0045;
        }
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    function applyFramedCamera(root: THREE.Object3D) {
      const box = new THREE.Box3().setFromObject(root);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      root.position.sub(center);
      root.position.y = -size.y / 2 + 0.05;

      const placed = new THREE.Box3().setFromObject(root);
      const placedCenter = placed.getCenter(new THREE.Vector3());
      const placedSize = placed.getSize(new THREE.Vector3());
      const maxDim = Math.max(placedSize.x, placedSize.y, placedSize.z, 0.01);

      controls.target.copy(placedCenter);
      const offset = new THREE.Vector3(maxDim * 1.25, maxDim * 0.88, maxDim * 1.42);
      camera.position.copy(placedCenter).add(offset);
      controls.minDistance = Math.max(0.8, maxDim * 1.05);
      controls.maxDistance = Math.max(4.5, maxDim * 5.5);
      controls.update();
    }

    function startProceduralTorus() {
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
      spinTarget = mesh;
      spinTorusStyle = true;
      camera.position.set(0.12, 0.28, 3.05);
      controls.target.set(0, 0, 0);
      controls.minDistance = 1.85;
      controls.maxDistance = 5.8;
      controls.update();
    }

    const loader = new GLTFLoader();
    if (MeshoptDecoder.supported) {
      loader.setMeshoptDecoder(MeshoptDecoder);
    }

    loader.load(
      HOME_HERO_GLB_URL,
      (gltf) => {
        if (disposed) {
          disposeObject3D(gltf.scene);
          return;
        }
        const root = gltf.scene;
        scene.add(root);
        applyFramedCamera(root);
        spinTarget = root;
        spinTorusStyle = false;
        raf = requestAnimationFrame(tick);
      },
      undefined,
      () => {
        if (disposed) return;
        startProceduralTorus();
        raf = requestAnimationFrame(tick);
      },
    );

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      for (const child of [...scene.children]) {
        if (child === ambient || child === key || child === fill || child === copper) {
          continue;
        }
        scene.remove(child);
        disposeObject3D(child);
      }
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
