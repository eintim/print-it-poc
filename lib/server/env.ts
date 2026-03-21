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

export function getAppTitle() {
  return "Print It 2";
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
