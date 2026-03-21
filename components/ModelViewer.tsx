"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Bounds = {
  width: number;
  height: number;
  depth: number;
};

export default function ModelViewer({
  modelUrl,
  onBoundsChange,
}: {
  modelUrl: string | null;
  onBoundsChange?: (bounds: Bounds | null) => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [errorState, setErrorState] = useState<{
    modelUrl: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !modelUrl) {
      onBoundsChange?.(null);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b1020");

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      1000,
    );
    camera.position.set(2.5, 2.5, 3.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const ambient = new THREE.AmbientLight("#ffffff", 1.4);
    const keyLight = new THREE.DirectionalLight("#ffffff", 2.4);
    keyLight.position.set(6, 8, 4);
    const fillLight = new THREE.DirectionalLight("#8ec5ff", 1.2);
    fillLight.position.set(-4, 3, -6);
    scene.add(ambient, keyLight, fillLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 64),
      new THREE.MeshStandardMaterial({
        color: "#131c31",
        roughness: 0.85,
        metalness: 0.05,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.2;
    scene.add(floor);

    let frameId = 0;
    let disposed = false;

    const resizeObserver = new ResizeObserver(() => {
      if (!mount) {
        return;
      }
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(mount);

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) {
          return;
        }

        setErrorState(null);
        const root = gltf.scene;
        scene.add(root);

        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        root.position.sub(center);
        root.position.y = -size.y / 2 + 0.05;

        const maxDim = Math.max(size.x, size.y, size.z, 1);
        camera.position.set(maxDim * 1.8, maxDim * 1.2, maxDim * 1.8);
        controls.target.set(0, size.y * 0.15, 0);
        controls.update();

        onBoundsChange?.({
          width: size.x,
          height: size.y,
          depth: size.z,
        });

        const render = () => {
          frameId = window.requestAnimationFrame(render);
          controls.update();
          renderer.render(scene, camera);
        };
        render();
      },
      undefined,
      (loadError) => {
        setErrorState({
          modelUrl,
          message:
            loadError instanceof Error
              ? loadError.message
              : "Could not load the generated model.",
        });
        onBoundsChange?.(null);
      },
    );

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.dispose();
      mount.innerHTML = "";
    };
  }, [modelUrl, onBoundsChange]);

  if (!modelUrl) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-3xl border border-white/10 bg-slate-950/70 text-center text-sm text-slate-400">
        Generate a model to preview it here.
      </div>
    );
  }

  return (
    <div className="relative h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
      <div ref={mountRef} className="h-full w-full" />
      {errorState?.modelUrl === modelUrl ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 p-6 text-center text-sm text-rose-300">
          {errorState.message}
        </div>
      ) : null}
    </div>
  );
}
