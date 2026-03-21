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

type ModelBounds = {
  width: number;
  height: number;
  depth: number;
} | null;

export function getModelSizeOption(sizeId: ModelSizeId) {
  return MODEL_SIZE_OPTIONS.find((option) => option.id === sizeId) ?? MODEL_SIZE_OPTIONS[1];
}

export function getScaledModelDimensions(
  modelBounds: ModelBounds,
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

export function estimatePrintPriceUsd(
  sizeId: ModelSizeId,
  modelBounds: ModelBounds,
) {
  const option = getModelSizeOption(sizeId);
  const scaledDimensions = getScaledModelDimensions(
    modelBounds,
    option.targetHeightMm,
  );

  if (!scaledDimensions) {
    return option.basePriceUsd;
  }

  const volumeScore =
    (scaledDimensions.widthMm *
      scaledDimensions.heightMm *
      scaledDimensions.depthMm) /
    250000;
  const rawPrice = option.basePriceUsd + volumeScore * 6;
  return Math.max(option.basePriceUsd, Math.round(rawPrice * 2) / 2);
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}
