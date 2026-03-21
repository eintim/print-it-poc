const MESHY_DEFAULT_BASE_URL = "https://api.meshy.ai";

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export function getGeminiApiKey() {
  return required("GEMINI_API_KEY");
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
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
 * Extra Meshy preview fields to control mesh density (smaller files, faster downloads).
 * @see https://docs.meshy.ai/en/api/text-to-3d — `should_remesh: false` returns highest-precision
 * geometry and ignores `topology` / `target_polycount`.
 */
export function getMeshyPreviewGeometryOptions(): Record<string, string | number | boolean> {
  const modelType = (process.env.MESHY_PREVIEW_MODEL_TYPE ?? "").trim().toLowerCase();
  if (modelType === "lowpoly") {
    return { model_type: "lowpoly" };
  }

  const shouldRemesh = process.env.MESHY_PREVIEW_SHOULD_REMESH !== "false";
  const out: Record<string, string | number | boolean> = { should_remesh: shouldRemesh };
  if (shouldRemesh) {
    out.topology = process.env.MESHY_PREVIEW_TOPOLOGY === "quad" ? "quad" : "triangle";
    const raw = process.env.MESHY_PREVIEW_TARGET_POLYCOUNT;
    const parsed = raw !== undefined && raw !== "" ? Number(raw) : 25_000;
    const n = Number.isFinite(parsed) ? Math.round(parsed) : 25_000;
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
