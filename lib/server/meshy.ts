import {
  getAppUrl,
  getMeshyApiKey,
  getMeshyBaseUrl,
  getMeshyModel,
  getMeshyUseMock,
} from "./env";

type MeshyCreateTaskResponse = {
  result: string;
};

export type MeshyTask = {
  id: string;
  prompt?: string;
  progress?: number;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED";
  thumbnail_url?: string;
  model_urls?: {
    glb?: string;
    stl?: string;
    obj?: string;
    fbx?: string;
    usdz?: string;
  };
  task_error?: {
    message?: string;
  };
};

const MOCK_PREVIEW_DURATION_MS = 5_000;
const MOCK_REFINE_DURATION_MS = 5_000;

function buildMockTaskId(mode: "preview" | "refine") {
  return `mock-meshy-${mode}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseMockTaskId(taskId: string) {
  const match = /^mock-meshy-(preview|refine)-(\d+)-[a-z0-9]+$/.exec(taskId);
  if (!match) {
    return null;
  }

  return {
    mode: match[1] as "preview" | "refine",
    createdAt: Number(match[2]),
  };
}

function buildMockThumbnailUrl(taskId: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#155e75" />
        </linearGradient>
      </defs>
      <rect width="640" height="480" fill="url(#bg)" rx="32" />
      <g fill="none" stroke="#67e8f9" stroke-width="16" opacity="0.9">
        <path d="M172 332 320 92l148 240Z" />
        <path d="M172 332h296" />
      </g>
      <text
        x="320"
        y="414"
        fill="#e2e8f0"
        font-family="ui-sans-serif, system-ui, sans-serif"
        font-size="30"
        text-anchor="middle"
      >
        Mock Meshy Asset
      </text>
      <text
        x="320"
        y="448"
        fill="#a5f3fc"
        font-family="ui-monospace, monospace"
        font-size="16"
        text-anchor="middle"
      >
        ${taskId}
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function buildMockAssetUrl(taskId: string, asset: "model.gltf" | "model.stl") {
  return `${getAppUrl()}/api/mock-meshy/assets/${taskId}/${asset}`;
}

function buildMockTask(taskId: string): MeshyTask {
  const parsed = parseMockTaskId(taskId);
  if (!parsed) {
    throw new Error(`Unknown mock Meshy task: ${taskId}`);
  }

  const durationMs =
    parsed.mode === "preview" ? MOCK_PREVIEW_DURATION_MS : MOCK_REFINE_DURATION_MS;
  const elapsedMs = Math.max(Date.now() - parsed.createdAt, 0);

  if (elapsedMs < 1_500) {
    return {
      id: taskId,
      status: "PENDING",
      progress: 5,
    };
  }

  if (elapsedMs < durationMs) {
    const completion = elapsedMs / durationMs;
    return {
      id: taskId,
      status: "IN_PROGRESS",
      progress: Math.min(95, Math.round(10 + completion * 80)),
      thumbnail_url: buildMockThumbnailUrl(taskId),
    };
  }

  return {
    id: taskId,
    status: "SUCCEEDED",
    progress: 100,
    thumbnail_url: buildMockThumbnailUrl(taskId),
    model_urls: {
      glb: buildMockAssetUrl(taskId, "model.gltf"),
      stl: buildMockAssetUrl(taskId, "model.stl"),
    },
  };
}

async function meshyRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${getMeshyBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getMeshyApiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meshy request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

export async function createMeshyPreviewTask(prompt: string) {
  if (getMeshyUseMock()) {
    return buildMockTaskId("preview");
  }

  const response = await meshyRequest<MeshyCreateTaskResponse>("/openapi/v2/text-to-3d", {
    method: "POST",
    body: JSON.stringify({
      mode: "preview",
      prompt,
      ai_model: getMeshyModel(),
      should_remesh: false,
      auto_size: true,
      target_formats: ["glb", "stl"],
    }),
  });

  return response.result;
}

export async function getMeshyTask(taskId: string) {
  if (getMeshyUseMock()) {
    return buildMockTask(taskId);
  }

  return meshyRequest<MeshyTask>(`/openapi/v2/text-to-3d/${taskId}`);
}
