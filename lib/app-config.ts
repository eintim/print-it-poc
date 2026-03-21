export const MODEL_SIZE_OPTIONS = [
  {
    id: "small",
    label: "Small",
    targetHeightMm: 60,
    description: "Desk-sized sample print.",
    basePriceUsd: 18,
  },
  {
    id: "medium",
    label: "Medium",
    targetHeightMm: 100,
    description: "Balanced detail and print cost.",
    basePriceUsd: 28,
  },
  {
    id: "large",
    label: "Large",
    targetHeightMm: 140,
    description: "Display-sized print with more presence.",
    basePriceUsd: 42,
  },
] as const;

export type ModelSizeId = (typeof MODEL_SIZE_OPTIONS)[number]["id"];

/** Bounds + mesh stats from the GLB viewer (same length unit as bounding box). */
export type ModelPrintMetrics = {
  width: number;
  height: number;
  depth: number;
  triangleCount: number;
  solidVolumeModelUnits3: number;
} | null;

/** Tunable retail-facing estimate (not slicer-accurate). */
const PRINT_ESTIMATE = {
  /** PLA-like equivalent for FDM proxy (g/cm³). */
  fdmDensityGPerCm3: 1.24,
  /** Effective solid fraction after infill + shells + supports buffer. */
  fdmVolumeToFilamentFactor: 0.22,
  /** Minimum assumed filament (g) so tiny models don’t under-quote. */
  fdmMinFilamentG: 4,
  /** Retail allocation per gram of filament (material + machine amortization). */
  fdmRetailUsdPerGram: 1.15,

  /** Typical hollow + cup + loss for resin proxy. */
  resinVolumeToMlFactor: 0.38,
  /** Extra resin for waste/wash/cure. */
  resinWasteMultiplier: 1.22,
  /** Retail allocation per ml resin. */
  resinRetailUsdPerMl: 0.85,

  /** Triangles per mm³ of scaled bounding box above → resin-class detail. */
  resinDetailTriPerMm3: 0.01,
  /** Absolute triangle count that suggests SLA/MSLA. */
  resinMinTriangles: 120_000,

  /** Markup on variable (material) portion on top of tier base. */
  variableMarkup: 1.35,
  /** Log-scaled complexity add before markup (USD, pre-markup). */
  complexityLogScale: 3.2,
  complexityTriDivisor: 6000,

  /** When mesh volume is missing or absurd, assume bbox is this “full” (5–25%). */
  bboxFallbackFillRatio: 0.16,
  /** Clamp solid/bbox fill ratio for stability. */
  fillRatioMin: 0.04,
  fillRatioMax: 0.98,
} as const;

export function getModelSizeOption(sizeId: ModelSizeId) {
  return MODEL_SIZE_OPTIONS.find((option) => option.id === sizeId) ?? MODEL_SIZE_OPTIONS[1];
}

export function getScaledModelDimensions(
  modelBounds: ModelPrintMetrics,
  targetHeightMm: number,
) {
  if (!modelBounds || modelBounds.height <= 0) {
    return null;
  }

  const scale = targetHeightMm / modelBounds.height;
  return {
    widthMm: Math.round(modelBounds.width * scale),
    heightMm: Math.round(modelBounds.height * scale),
    depthMm: Math.round(modelBounds.depth * scale),
  };
}

function roundToHalfUsd(value: number): number {
  return Math.round(value * 2) / 2;
}

function prefersResinEstimate(
  triangleCount: number,
  scaledBboxVolumeMm3: number,
): boolean {
  if (triangleCount >= PRINT_ESTIMATE.resinMinTriangles) {
    return true;
  }
  if (scaledBboxVolumeMm3 <= 0) {
    return false;
  }
  return triangleCount / scaledBboxVolumeMm3 >= PRINT_ESTIMATE.resinDetailTriPerMm3;
}

/**
 * Estimates print price from size tier, scaled bbox, mesh volume, and triangle count.
 * Uses FDM vs resin heuristics and applies markup on the material portion.
 */
export function estimatePrintPriceUsd(
  sizeId: ModelSizeId,
  metrics: ModelPrintMetrics,
): number {
  const option = getModelSizeOption(sizeId);
  const scaledDimensions = getScaledModelDimensions(
    metrics,
    option.targetHeightMm,
  );

  if (!scaledDimensions || !metrics) {
    return option.basePriceUsd;
  }

  const scale = option.targetHeightMm / metrics.height;
  const scaledBboxVolumeMm3 =
    scaledDimensions.widthMm *
    scaledDimensions.heightMm *
    scaledDimensions.depthMm;

  const solidScaledMm3 =
    metrics.solidVolumeModelUnits3 > 0
      ? metrics.solidVolumeModelUnits3 * scale ** 3
      : scaledBboxVolumeMm3 * PRINT_ESTIMATE.bboxFallbackFillRatio;

  const fillRatioRaw =
    scaledBboxVolumeMm3 > 0 ? solidScaledMm3 / scaledBboxVolumeMm3 : PRINT_ESTIMATE.fillRatioMax;

  const fillRatio = Math.min(
    PRINT_ESTIMATE.fillRatioMax,
    Math.max(PRINT_ESTIMATE.fillRatioMin, fillRatioRaw),
  );

  const useResin = prefersResinEstimate(metrics.triangleCount, scaledBboxVolumeMm3);

  const volumeCm3 = solidScaledMm3 / 1000;
  let materialComponentUsd: number;

  if (useResin) {
    const ml =
      volumeCm3 *
      PRINT_ESTIMATE.resinVolumeToMlFactor *
      PRINT_ESTIMATE.resinWasteMultiplier;
    materialComponentUsd = ml * PRINT_ESTIMATE.resinRetailUsdPerMl;
  } else {
    let grams =
      volumeCm3 *
      PRINT_ESTIMATE.fdmDensityGPerCm3 *
      PRINT_ESTIMATE.fdmVolumeToFilamentFactor;
    grams = Math.max(grams, PRINT_ESTIMATE.fdmMinFilamentG);
    materialComponentUsd = grams * PRINT_ESTIMATE.fdmRetailUsdPerGram;
  }

  const complexityPreMarkup =
    Math.log(1 + metrics.triangleCount / PRINT_ESTIMATE.complexityTriDivisor) *
    PRINT_ESTIMATE.complexityLogScale;

  const detailMultiplier = 0.85 + 0.35 * fillRatio;

  const variableUsd =
    (materialComponentUsd + complexityPreMarkup) *
    detailMultiplier *
    PRINT_ESTIMATE.variableMarkup;

  const rawPrice = option.basePriceUsd + variableUsd;
  return Math.max(option.basePriceUsd, roundToHalfUsd(rawPrice));
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}
