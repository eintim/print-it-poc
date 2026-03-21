import { getMeshyApiKey, getMeshyBaseUrl, getMeshyModel } from "./env";

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
  const response = await meshyRequest<MeshyCreateTaskResponse>("/openapi/v2/text-to-3d", {
    method: "POST",
    body: JSON.stringify({
      mode: "preview",
      prompt,
      ai_model: getMeshyModel(),
      should_remesh: true,
      auto_size: true,
      topology: "triangle",
      target_formats: ["glb", "stl"],
    }),
  });

  return response.result;
}

export async function createMeshyRefineTask(previewTaskId: string) {
  const response = await meshyRequest<MeshyCreateTaskResponse>("/openapi/v2/text-to-3d", {
    method: "POST",
    body: JSON.stringify({
      mode: "refine",
      preview_task_id: previewTaskId,
    }),
  });

  return response.result;
}

export async function getMeshyTask(taskId: string) {
  return meshyRequest<MeshyTask>(`/openapi/v2/text-to-3d/${taskId}`);
}
