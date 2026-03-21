#!/usr/bin/env node
/**
 * Fetches text-to-3D preview models from Meshy using the same API settings as
 * `createMeshyPreviewTask` in lib/server/meshy.ts, downloads GLBs, runs gltf-transform
 * optimize (meshopt, matches ModelViewer), and writes to public/showcase/*_opti.glb.
 *
 * Includes:
 * - `home-hero_opti.glb` — home page hero (`HomeHeroThreePreview`), prompt aligned with the moon-jar sketch.
 * - Four showcase card models (`ShowcasePage`).
 *
 * Requires: MESHY_API_KEY in .env.local (or env). Set MESHY_USE_MOCK=false.
 * Preview mesh density follows the same env vars as the app (`MESHY_PREVIEW_*` — see .env.example).
 *
 * Usage: npm run showcase:fetch-meshy
 */

import { config } from "dotenv";
import { execFileSync } from "node:child_process";
import { createWriteStream, mkdirSync, unlinkSync } from "node:fs";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SHOWCASE_DIR = join(ROOT, "public", "showcase");

config({ path: join(ROOT, ".env.local") });
config({ path: join(ROOT, ".env") });

const MESHY_BASE_URL = process.env.MESHY_BASE_URL ?? "https://api.meshy.ai";
const MESHY_MODEL = process.env.MESHY_MODEL ?? "meshy-5";
const MESHY_API_KEY = process.env.MESHY_API_KEY;
const USE_MOCK = process.env.MESHY_USE_MOCK === "true";

/** Same rules as `getMeshyPreviewGeometryOptions` in lib/server/env.ts */
function meshyPreviewGeometryBody() {
  const modelType = (process.env.MESHY_PREVIEW_MODEL_TYPE ?? "").trim().toLowerCase();
  if (modelType === "lowpoly") {
    return { model_type: "lowpoly" };
  }
  const shouldRemesh = process.env.MESHY_PREVIEW_SHOULD_REMESH !== "false";
  const out = { should_remesh: shouldRemesh };
  if (shouldRemesh) {
    out.topology = process.env.MESHY_PREVIEW_TOPOLOGY === "quad" ? "quad" : "triangle";
    const raw = process.env.MESHY_PREVIEW_TARGET_POLYCOUNT;
    const parsed = raw !== undefined && raw !== "" ? Number(raw) : 25_000;
    const n = Number.isFinite(parsed) ? Math.round(parsed) : 25_000;
    out.target_polycount = Math.min(300_000, Math.max(100, n));
  }
  return out;
}

/** @type {{ id: string; prompt: string }[]} */
const EXAMPLES = [
  {
    id: "home-hero",
    prompt:
      "A decorative ceramic moon jar vase with a snug rounded lid and small knob, smooth matte glaze, subtle foot ring, Korean moon jar inspired studio pottery, desk ornament size",
  },
  {
    id: "dragon-planter",
    prompt:
      "A tiny dragon curled around a succulent planter, with scales that double as drainage holes",
  },
  {
    id: "geometric-lamp",
    prompt:
      "Geometric lampshade inspired by Voronoi patterns, casts organic shadow patterns on the wall",
  },
  {
    id: "sketch-robot",
    prompt:
      "A small friendly robot toy with chunky rounded limbs and a doodle-like silhouette, desk companion size",
  },
  {
    id: "chess-piece",
    prompt: "A chess knight piece but it's a corgi wearing a tiny helmet, about 6cm tall",
  },
];

const POLL_MS = 4_000;
const MAX_WAIT_MS = 45 * 60 * 1000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function meshyFetch(path, init = {}) {
  const res = await fetch(`${MESHY_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${MESHY_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Meshy ${path} failed (${res.status}): ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

/** Same body as createMeshyPreviewTask (preview mode). */
async function createPreviewTask(prompt) {
  const data = await meshyFetch("/openapi/v2/text-to-3d", {
    method: "POST",
    body: JSON.stringify({
      mode: "preview",
      prompt,
      ai_model: MESHY_MODEL,
      auto_size: true,
      target_formats: ["glb", "stl"],
      ...meshyPreviewGeometryBody(),
    }),
  });
  if (!data.result) {
    throw new Error(`Meshy create: missing result: ${JSON.stringify(data)}`);
  }
  return data.result;
}

/** @param {string} taskId */
async function getTask(taskId) {
  return meshyFetch(`/openapi/v2/text-to-3d/${taskId}`);
}

/** @param {string} taskId */
async function waitForSucceeded(taskId) {
  const start = Date.now();
  for (;;) {
    if (Date.now() - start > MAX_WAIT_MS) {
      throw new Error(`Timeout waiting for Meshy task ${taskId}`);
    }
    const task = await getTask(taskId);
    if (task.status === "SUCCEEDED") {
      return task;
    }
    if (task.status === "FAILED") {
      const msg = task.task_error?.message ?? JSON.stringify(task.task_error ?? {});
      throw new Error(`Meshy task failed: ${msg}`);
    }
    const p = task.progress != null ? ` ${task.progress}%` : "";
    console.log(`  … ${task.status}${p}`);
    await sleep(POLL_MS);
  }
}

/** @param {string} url @param {string} destPath */
async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}): ${url}`);
  }
  if (!res.body) {
    throw new Error(`No body for ${url}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
}

function optimizeGlb(inputPath, outputPath) {
  const cliJs = join(ROOT, "node_modules", "@gltf-transform", "cli", "bin", "cli.js");
  execFileSync(
    process.execPath,
    [
      cliJs,
      "optimize",
      inputPath,
      outputPath,
      "--compress",
      "meshopt",
      "--simplify",
      "false",
    ],
    { stdio: "inherit", cwd: ROOT },
  );
}

async function main() {
  if (USE_MOCK) {
    console.error("Set MESHY_USE_MOCK=false (or unset) to call the real Meshy API.");
    process.exit(1);
  }
  if (!MESHY_API_KEY) {
    console.error("MESHY_API_KEY is required (e.g. in .env.local).");
    process.exit(1);
  }

  const cliJs = join(ROOT, "node_modules", "@gltf-transform", "cli", "bin", "cli.js");
  try {
    await access(cliJs);
  } catch {
    console.error("Run npm install (missing @gltf-transform/cli).");
    process.exit(1);
  }

  mkdirSync(SHOWCASE_DIR, { recursive: true });
  const tmpBase = await mkdtemp(join(tmpdir(), "showcase-meshy-"));

  try {
    for (const ex of EXAMPLES) {
      console.log(`\n→ ${ex.id}: creating Meshy preview task…`);
      const taskId = await createPreviewTask(ex.prompt);
      console.log(`  task ${taskId}, waiting…`);
      const task = await waitForSucceeded(taskId);
      const glbUrl = task.model_urls?.glb;
      if (!glbUrl) {
        throw new Error(`No GLB URL in succeeded task for ${ex.id}`);
      }

      const rawPath = join(tmpBase, `${ex.id}.glb`);
      const outPath = join(SHOWCASE_DIR, `${ex.id}_opti.glb`);

      console.log(`  downloading GLB…`);
      await downloadFile(glbUrl, rawPath);

      console.log(`  optimizing (meshopt) → ${outPath}`);
      optimizeGlb(rawPath, outPath);
      unlinkSync(rawPath);

      console.log(`  done.`);
    }

    console.log(
      `\nAll ${EXAMPLES.length} models saved under public/showcase/*_opti.glb (home hero: home-hero_opti.glb).`,
    );
  } finally {
    await rm(tmpBase, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
