const MESHY_DEFAULT_BASE_URL = "https://api.meshy.ai";
const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

/** API key for refinement chat (OpenAI-compatible `/v1/chat/completions`). */
export function getOpenAIApiKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return key;
}

/** Base URL including `/v1` (e.g. OpenAI, OpenRouter, Gemini OpenAI compat). */
export function getOpenAIBaseURL() {
  return process.env.OPENAI_BASE_URL?.trim() || OPENAI_DEFAULT_BASE_URL;
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export function getMeshyApiKey() {
  return required("MESHY_API_KEY");
}

export function getMeshyBaseUrl() {
  return process.env.MESHY_BASE_URL ?? MESHY_DEFAULT_BASE_URL;
}

export function getMeshyModel() {
  return process.env.MESHY_MODEL ?? "meshy-5";
}

export function getMeshyUseMock() {
  return process.env.MESHY_USE_MOCK === "true";
}

/**
 * Meshy preview geometry: defaults to high-detail `standard` mesh with remesh off (full-precision
 * output per Meshy docs). Set `MESHY_PREVIEW_SHOULD_REMESH=true` to cap polycount for smaller files.
 * @see https://docs.meshy.ai/en/api/text-to-3d
 */
export function getMeshyPreviewGeometryOptions(): Record<string, string | number | boolean> {
  const modelType = (process.env.MESHY_PREVIEW_MODEL_TYPE ?? "").trim().toLowerCase();
  if (modelType === "lowpoly") {
    return { model_type: "lowpoly" };
  }

  const remeshEnv = process.env.MESHY_PREVIEW_SHOULD_REMESH?.trim().toLowerCase();
  const shouldRemesh = remeshEnv === "true";

  const out: Record<string, string | number | boolean> = {
    model_type: "standard",
    should_remesh: shouldRemesh,
  };
  if (shouldRemesh) {
    out.topology = process.env.MESHY_PREVIEW_TOPOLOGY === "quad" ? "quad" : "triangle";
    const raw = process.env.MESHY_PREVIEW_TARGET_POLYCOUNT;
    const parsed = raw !== undefined && raw !== "" ? Number(raw) : 120_000;
    const n = Number.isFinite(parsed) ? Math.round(parsed) : 120_000;
    out.target_polycount = Math.min(300_000, Math.max(100, n));
  }
  return out;
}

export function getAppTitle() {
  return "Print It 2";
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
