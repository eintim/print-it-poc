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

function disposeMaterial(material: THREE.Material) {
  const textureKeys = [
    "map",
    "alphaMap",
    "aoMap",
    "bumpMap",
    "displacementMap",
    "emissiveMap",
    "envMap",
    "lightMap",
    "metalnessMap",
    "normalMap",
    "roughnessMap",
  ] as const;
  const materialWithTextures = material as THREE.Material &
    Partial<Record<(typeof textureKeys)[number], THREE.Texture | null>>;

  for (const key of textureKeys) {
    const texture = materialWithTextures[key];
    if (texture instanceof THREE.Texture) {
      texture.dispose();
    }
  }

  material.dispose();
}

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
    scene.background = new THREE.Color("#f8efe4");

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

    const ambient = new THREE.AmbientLight("#fff7f1", 1.9);
    const keyLight = new THREE.DirectionalLight("#ffffff", 2.8);
    keyLight.position.set(6, 8, 4);
    const fillLight = new THREE.DirectionalLight("#ffd3c5", 1.6);
    fillLight.position.set(-4, 3, -6);
    const rimLight = new THREE.DirectionalLight("#d4ead7", 1.2);
    rimLight.position.set(0, 5, -8);
    scene.add(ambient, keyLight, fillLight, rimLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 64),
      new THREE.MeshStandardMaterial({
        color: "#eadbc9",
        roughness: 0.92,
        metalness: 0.02,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.2;
    scene.add(floor);

    let frameId = 0;
    let disposed = false;
    let loadedRoot: THREE.Object3D | null = null;

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
        loadedRoot = root;
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
      if (loadedRoot) {
        loadedRoot.traverse((object) => {
          const mesh = object as THREE.Mesh;
          mesh.geometry?.dispose();

          if (Array.isArray(mesh.material)) {
            for (const material of mesh.material) {
              disposeMaterial(material);
            }
          } else if (mesh.material) {
            disposeMaterial(mesh.material);
          }
        });
      }
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      mount.innerHTML = "";
    };
  }, [modelUrl, onBoundsChange]);

  const shouldShowLoader = isGenerating || isModelLoading;

  if (!modelUrl && !shouldShowLoader) {
    return (
      <div className="flex min-h-[460px] flex-1 items-center justify-center rounded-2xl bg-gradient-to-b from-[var(--cream)] to-[var(--panel)] px-8 text-center text-sm text-[var(--muted)]">
        Generate a model to preview it here.
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[460px] overflow-hidden rounded-2xl bg-gradient-to-b from-[var(--cream)] to-[var(--panel)]">
      {modelUrl ? <div ref={mountRef} className="h-full w-full" /> : null}
      {!modelUrl ? (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(253,125,104,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(71,102,82,0.12),transparent_32%),linear-gradient(180deg,#fffdf9,#f6ede3)]" />
      ) : null}
      {shouldShowLoader ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[var(--cream)]/90 backdrop-blur-sm">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <div className="absolute h-24 w-24 rounded-full border border-[var(--accent-soft)]/20" />
            <div className="absolute h-24 w-24 animate-ping rounded-full border border-[var(--accent-soft)]/35" />
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--accent)]/15 border-t-[var(--accent)] shadow-[0_0_32px_rgba(165,60,44,0.18)]" />
            <div className="absolute h-4 w-4 rounded-full bg-[var(--accent-soft)] shadow-[0_0_24px_rgba(253,125,104,0.7)]" />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-sm font-semibold tracking-[0.22em] text-[var(--accent)] uppercase">
              {loadingLabel}
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.3s]" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--accent-soft)] [animation-delay:-0.15s]" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--sage)]" />
            </div>
            <p className="text-xs text-[var(--muted)]">
              {progress !== null && progress !== undefined
                ? `${Math.max(progress, 0)}% complete`
                : "Preparing the viewer..."}
            </p>
          </div>
        </div>
      ) : null}
      {errorState?.modelUrl === modelUrl ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--cream)]/95 p-6 text-center text-sm text-red-600">
          {errorState.message}
        </div>
      ) : null}
    </div>
  );
}
