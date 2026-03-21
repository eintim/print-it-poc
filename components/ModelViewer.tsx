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
  isGenerating = false,
  loadingLabel = "Generating 3D preview",
  progress,
}: {
  modelUrl: string | null;
  onBoundsChange?: (bounds: Bounds | null) => void;
  isGenerating?: boolean;
  loadingLabel?: string;
  progress?: number | null;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [errorState, setErrorState] = useState<{
    modelUrl: string;
    message: string;
  } | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);

  useEffect(() => {
    setIsModelLoading(Boolean(modelUrl));
  }, [modelUrl]);

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
        setIsModelLoading(false);
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
        setIsModelLoading(false);
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

  const shouldShowLoader = isGenerating || isModelLoading;

  if (!modelUrl && !shouldShowLoader) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-3xl border border-white/10 bg-slate-950/70 text-center text-sm text-slate-400">
        Generate a model to preview it here.
      </div>
    );
  }

  return (
    <div className="relative h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
      {modelUrl ? <div ref={mountRef} className="h-full w-full" /> : null}
      {!modelUrl ? (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))]" />
      ) : null}
      {shouldShowLoader ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-slate-950/72 backdrop-blur-sm">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <div className="absolute h-24 w-24 rounded-full border border-cyan-300/20" />
            <div className="absolute h-24 w-24 animate-ping rounded-full border border-cyan-300/30" />
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-cyan-300/25 border-t-cyan-300 shadow-[0_0_32px_rgba(34,211,238,0.35)]" />
            <div className="absolute h-4 w-4 rounded-full bg-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.9)]" />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-sm font-medium tracking-[0.22em] text-cyan-100 uppercase">
              {loadingLabel}
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.3s]" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-cyan-200 [animation-delay:-0.15s]" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-cyan-100" />
            </div>
            <p className="text-xs text-slate-300">
              {progress !== null && progress !== undefined
                ? `${Math.max(progress, 0)}% complete`
                : "Preparing the viewer..."}
            </p>
          </div>
        </div>
      ) : null}
      {errorState?.modelUrl === modelUrl ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 p-6 text-center text-sm text-rose-300">
          {errorState.message}
        </div>
      ) : null}
    </div>
  );
}
