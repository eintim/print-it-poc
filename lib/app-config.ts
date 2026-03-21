export const MODEL_SIZE_OPTIONS = [
  {
    id: "small",
    label: "Small",
    targetHeightMm: 60,
    description: "Desk-sized sample print.",
  },
  {
    id: "medium",
    label: "Medium",
    targetHeightMm: 100,
    description: "Balanced detail and print cost.",
  },
  {
    id: "large",
    label: "Large",
    targetHeightMm: 140,
    description: "Display-sized print with more presence.",
  },
] as const;

export type ModelSizeId = (typeof MODEL_SIZE_OPTIONS)[number]["id"];
