"use client";

import type { ModelPrintMetrics } from "@/lib/app-config";
import { computeMeshPrintStats } from "@/lib/mesh-print-stats";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const LOADER_WHIMSY = [
  "Building your dreams",
  "Sketching your ideas",
  "Turning pixels into something solid",
  "Teaching triangles to behave",
  "Extruding the impossible",
  "Your idea, gaining depth",
  "Summoning vertices (politely)",
  "From flat to phwoar",
  "Clay of the mind, bits of the GPU",
  "Almost definitely not magic",
  "Giving your sketch a spine",
  "Waking up the mesh gremlins",
] as const;

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
  onPrintMetricsChange,
  isGenerating = false,
  loadingLabel = "Generating 3D preview",
  progress,
  layout = "workspace",
}: {
  modelUrl: string | null;
  onPrintMetricsChange?: (metrics: ModelPrintMetrics) => void;
  isGenerating?: boolean;
  loadingLabel?: string;
  progress?: number | null;
  /** `embed`: fills a parent with fixed aspect (e.g. showcase cards); `workspace`: full preview panel; `checkout`: short strip, no min-height (respects parent). */
  layout?: "workspace" | "embed" | "checkout";
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [errorState, setErrorState] = useState<{
    modelUrl: string;
    message: string;
  } | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [whimsyIndex, setWhimsyIndex] = useState(0);

  useEffect(() => {
    setIsModelLoading(Boolean(modelUrl));
  }, [modelUrl]);

  const shouldShowLoader = isGenerating || isModelLoading;

  useEffect(() => {
    if (!isGenerating) {
      return;
    }
    setWhimsyIndex(Math.floor(Math.random() * LOADER_WHIMSY.length));
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating || !shouldShowLoader) {
      return;
    }
    const id = window.setInterval(() => {
      setWhimsyIndex((i) => (i + 1) % LOADER_WHIMSY.length);
    }, 3600);
    return () => window.clearInterval(id);
  }, [isGenerating, shouldShowLoader]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !modelUrl) {
      onPrintMetricsChange?.(null);
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

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#eadbc9",
      roughness: 0.92,
      metalness: 0.02,
      depthWrite: true,
    });
    /** Unit circle in XZ; scale after load so the disk sits just under the model footprint. */
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      floorMaterial,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;

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
    if (MeshoptDecoder.supported) {
      loader.setMeshoptDecoder(MeshoptDecoder);
    }
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

        const placedBox = new THREE.Box3().setFromObject(root);
        const placedSize = placedBox.getSize(new THREE.Vector3());
        const groundGap = Math.max(placedSize.y, 1) * 0.004;
        floor.position.y = placedBox.min.y - groundGap;
        const footprintRadius =
          0.55 * Math.hypot(placedSize.x, placedSize.z) + groundGap;
        floor.scale.setScalar(Math.max(1.2, footprintRadius));

        scene.add(floor);

        // Use real bounds only — `Math.max(..., 1)` made tiny GLBs (common exports) sit
        // at a camera distance meant for ~1m meshes, so they looked like specks.
        const maxDim = Math.max(placedSize.x, placedSize.y, placedSize.z, 1e-5);
        const placedCenter = placedBox.getCenter(new THREE.Vector3());
        // Orbit around the placed model's true center (not the base). The old target
        // (0, size.y * 0.15, 0) sat near the floor while geometry extends upward, which
        // pushed the mesh low in the viewport.
        const prevTarget = new THREE.Vector3(0, size.y * 0.15, 0);
        const prevCam = new THREE.Vector3(
          maxDim * 1.8,
          maxDim * 1.2,
          maxDim * 1.8,
        );
        let camOffset = prevCam.clone().sub(prevTarget);
        if (layout === "embed") {
          camOffset.multiplyScalar(1.12);
        }
        controls.target.copy(placedCenter);
        camera.position.copy(placedCenter).add(camOffset);
        controls.minDistance = Math.max(1e-4, maxDim * 0.25);
        controls.maxDistance = Math.max(1.5, maxDim * 12);
        controls.update();

        if (layout === "checkout") {
          const aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
          const distanceMult = 1 + Math.min(0.2, Math.max(0, aspect - 1) * 0.1);
          const fromCenter = camera.position.clone().sub(placedCenter).multiplyScalar(distanceMult);
          camera.position.copy(placedCenter).add(fromCenter);
          controls.update();
        }

        if (layout === "workspace" || layout === "checkout") {
          const { triangleCount, solidVolumeModelUnits3 } =
            computeMeshPrintStats(root);

          onPrintMetricsChange?.({
            width: size.x,
            height: size.y,
            depth: size.z,
            triangleCount,
            solidVolumeModelUnits3,
          });
        }

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
        onPrintMetricsChange?.(null);
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
      floor.geometry.dispose();
      floorMaterial.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      mount.innerHTML = "";
    };
  }, [layout, modelUrl, onPrintMetricsChange]);

  if (!modelUrl && !shouldShowLoader) {
    if (layout === "embed") {
      return null;
    }
    if (layout === "checkout") {
      return (
        <div className="flex h-full min-h-[96px] w-full items-center justify-center bg-gradient-to-b from-[var(--cream)] to-[var(--panel)] px-4 text-center text-xs text-[var(--muted)]">
          Model preview will appear here.
        </div>
      );
    }
    return (
      <div className="flex min-h-[460px] flex-1 items-center justify-center rounded-2xl bg-gradient-to-b from-[var(--cream)] to-[var(--panel)] px-8 text-center text-sm text-[var(--muted)]">
        Generate a model to preview it here.
      </div>
    );
  }

  const shellClass =
    layout === "embed" || layout === "checkout"
      ? "relative h-full min-h-0 w-full overflow-hidden bg-gradient-to-b from-[var(--cream)] to-[var(--panel)]"
      : "relative h-full min-h-[460px] overflow-hidden rounded-2xl bg-gradient-to-b from-[var(--cream)] to-[var(--panel)]";

  return (
    <div className={shellClass}>
      {modelUrl ? <div ref={mountRef} className="h-full w-full" /> : null}
      {!modelUrl ? (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(253,125,104,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(71,102,82,0.12),transparent_32%),linear-gradient(180deg,#fffdf9,#f6ede3)]" />
      ) : null}
      {shouldShowLoader ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-[var(--cream)]/92 px-6 backdrop-blur-md"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div
            className="relative flex h-[5.75rem] w-[5.75rem] items-center justify-center"
            aria-hidden
          >
            <div className="model-viewer-loader-glow pointer-events-none absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,rgba(194,65,12,0.14)_0%,rgba(22,101,52,0.06)_45%,transparent_68%)]" />
            <div className="pointer-events-none absolute inset-0 rounded-full border border-[var(--line)]/50 bg-[var(--paper)]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]" />
            <div
              className="model-viewer-loader-orbit pointer-events-none absolute inset-[3px] rounded-full border-2 border-transparent border-t-[color-mix(in_srgb,var(--accent)_88%,transparent)] border-r-[color-mix(in_srgb,var(--accent-soft)_45%,transparent)]"
              style={{ animationDuration: "2.6s" }}
            />
            <div
              className="model-viewer-loader-orbit-reverse pointer-events-none absolute inset-[14px] rounded-full border-2 border-transparent border-b-[color-mix(in_srgb,var(--sage)_75%,transparent)] border-l-[color-mix(in_srgb,var(--sage)_35%,transparent)]"
              style={{ animationDuration: "1.95s" }}
            />
            <div className="model-viewer-loader-core pointer-events-none absolute inset-[26px] rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.95),rgba(250,243,235,0.5)_42%,rgba(194,65,12,0.12)_100%)] shadow-[0_4px_24px_rgba(194,65,12,0.15),inset_0_-2px_8px_rgba(28,24,21,0.04)]" />
            <div className="pointer-events-none absolute inset-[34px] rounded-full border border-[var(--accent)]/20" />
          </div>
          <div className="max-w-[15.5rem] space-y-2.5 text-center">
            <p className="font-serif text-base font-semibold leading-snug text-[var(--foreground)]">
              {loadingLabel}
            </p>
            {isGenerating ? (
              <>
                <p
                  key={whimsyIndex}
                  className="model-viewer-whimsy-text mx-auto max-w-[15rem] text-[0.8125rem] font-normal leading-relaxed text-[var(--muted)]"
                >
                  {LOADER_WHIMSY[whimsyIndex]}
                </p>
                <p className="text-[0.6875rem] leading-snug tracking-wide text-[var(--muted)]">
                  ~1 min · preview appears here
                </p>
              </>
            ) : null}
            {progress !== null && progress !== undefined ? (
              <p className="rounded-full border border-[var(--line)]/60 bg-[var(--paper)]/50 px-2.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums tracking-wide text-[var(--accent)]">
                {Math.max(progress, 0)}%
              </p>
            ) : !isGenerating ? (
              <p className="text-[0.6875rem] font-medium tracking-wide text-[var(--muted)]">Loading…</p>
            ) : null}
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
