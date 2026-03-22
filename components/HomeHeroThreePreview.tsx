"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

/** Written by `npm run showcase:fetch-meshy` — matches the hero sketch PNG. */
const HOME_HERO_GLB_URL = "/showcase/sketch-robot_opti.glb";

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
    scene.background = new THREE.Color("#f8efe4");

    const camera = new THREE.PerspectiveCamera(45, width() / height(), 0.1, 1000);
    camera.position.set(0.12, 0.28, 3.05);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width(), height());
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight("#fff7f1", 1.9);
    const keyLight = new THREE.DirectionalLight("#ffffff", 2.8);
    keyLight.position.set(6, 8, 4);
    const fillLight = new THREE.DirectionalLight("#ffd3c5", 1.6);
    fillLight.position.set(-4, 3, -6);
    const rimLight = new THREE.DirectionalLight("#efe8df", 1.05);
    rimLight.position.set(0, 5, -8);
    scene.add(ambient, keyLight, fillLight, rimLight);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#eadbc9",
      roughness: 0.92,
      metalness: 0.02,
      depthWrite: true,
    });
    let floor: THREE.Mesh | null = null;

    function attachFloorUnder(root: THREE.Object3D) {
      if (floor) {
        scene.remove(floor);
        floor.geometry.dispose();
        floor = null;
      }
      const placedBox = new THREE.Box3().setFromObject(root);
      const placedSize = placedBox.getSize(new THREE.Vector3());
      const groundGap = Math.max(placedSize.y, 1) * 0.004;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 64), floorMaterial);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = placedBox.min.y - groundGap;
      const footprintRadius =
        0.55 * Math.hypot(placedSize.x, placedSize.z) + groundGap;
      disc.scale.setScalar(Math.max(1.2, footprintRadius));
      scene.add(disc);
      floor = disc;
    }

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

      /** Fit the model’s screen projection; GLB scale varies, so use FOV math not fixed multiples of maxDim. */
      const vFovRad = THREE.MathUtils.degToRad(camera.fov);
      const aspect = Math.max(camera.aspect, 0.01);
      const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
      const halfH = placedSize.y / 2;
      const halfW = placedSize.x / 2;
      const distForHeight = halfH / Math.tan(vFovRad / 2);
      const distForWidth = halfW / Math.tan(hFovRad / 2);
      /** Slightly tighter than full-frame so the hero preview feels substantial (~76% of the shorter view axis). */
      const viewFill = 0.76;
      const distance =
        Math.max(distForHeight, distForWidth, maxDim * 0.25) / viewFill;

      const dir = new THREE.Vector3(0.48, 0.34, 1).normalize();
      camera.position.copy(placedCenter).addScaledVector(dir, distance);

      controls.minDistance = Math.max(maxDim * 0.08, distance * 0.28);
      controls.maxDistance = Math.max(distance * 3.5, maxDim * 6);
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
      attachFloorUnder(mesh);
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
        attachFloorUnder(root);
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
      if (floor) {
        scene.remove(floor);
        floor.geometry.dispose();
        floor = null;
      }
      floorMaterial.dispose();
      for (const child of [...scene.children]) {
        if (
          child === ambient ||
          child === keyLight ||
          child === fillLight ||
          child === rimLight
        ) {
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
