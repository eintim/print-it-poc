const FEATHERLESS_DEFAULT_BASE_URL = "https://api.featherless.ai/v1";
const MESHY_DEFAULT_BASE_URL = "https://api.meshy.ai";

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export function getFeatherlessApiKey() {
  return required("FEATHERLESS_API_KEY");
}

export function getFeatherlessBaseUrl() {
  return process.env.FEATHERLESS_BASE_URL ?? FEATHERLESS_DEFAULT_BASE_URL;
}

export function getFeatherlessModel() {
  return process.env.FEATHERLESS_MODEL ?? "Qwen/Qwen2.5-72B-Instruct";
}

export function getMeshyApiKey() {
  return required("MESHY_API_KEY");
}

export function getMeshyBaseUrl() {
  return process.env.MESHY_BASE_URL ?? MESHY_DEFAULT_BASE_URL;
}

export function getMeshyModel() {
  return process.env.MESHY_MODEL ?? "latest";
}

export function getAppTitle() {
  return "Print It 2";
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
