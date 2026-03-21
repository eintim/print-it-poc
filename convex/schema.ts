import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  numbers: defineTable({
    value: v.number(),
  }),
  refinementSessions: defineTable({
    userId: v.id("users"),
    title: v.string(),
    originalPrompt: v.string(),
    latestPrompt: v.string(),
    canonicalPrompt: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("ready"),
      v.literal("generating"),
      v.literal("generated"),
    ),
    lastMessageAt: v.number(),
  }).index("by_user", ["userId"]),
  refinementMessages: defineTable({
    sessionId: v.id("refinementSessions"),
    userId: v.id("users"),
    role: v.union(
      v.literal("system"),
      v.literal("user"),
      v.literal("assistant"),
    ),
    content: v.string(),
    attachmentStorageId: v.optional(v.id("_storage")),
    attachmentContentType: v.optional(v.string()),
    readyToGenerate: v.optional(v.boolean()),
    canonicalPrompt: v.optional(v.string()),
    tips: v.optional(v.array(v.string())),
  })
    .index("by_session", ["sessionId"])
    .index("by_user_and_session", ["userId", "sessionId"]),
  generationJobs: defineTable({
    userId: v.id("users"),
    sessionId: v.id("refinementSessions"),
    prompt: v.string(),
    previewTaskId: v.string(),
    refineTaskId: v.optional(v.string()),
    status: v.union(
      v.literal("preview_pending"),
      v.literal("refine_pending"),
      v.literal("succeeded"),
      v.literal("failed"),
    ),
    progress: v.number(),
    errorMessage: v.optional(v.string()),
    glbUrl: v.optional(v.string()),
    stlUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    generatedModelId: v.optional(v.id("generatedModels")),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_preview_task_id", ["previewTaskId"])
    .index("by_refine_task_id", ["refineTaskId"]),
  generatedModels: defineTable({
    userId: v.id("users"),
    sessionId: v.id("refinementSessions"),
    generationJobId: v.id("generationJobs"),
    prompt: v.string(),
    glbUrl: v.string(),
    stlUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    providerTaskId: v.string(),
    status: v.union(v.literal("ready"), v.literal("ordered")),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_generation_job_id", ["generationJobId"]),
  printOrders: defineTable({
    userId: v.id("users"),
    sessionId: v.id("refinementSessions"),
    generatedModelId: v.id("generatedModels"),
    size: v.union(
      v.literal("small"),
      v.literal("medium"),
      v.literal("large"),
    ),
    targetHeightMm: v.number(),
    contactName: v.string(),
    email: v.string(),
    shippingAddress: v.string(),
    notes: v.optional(v.string()),
    status: v.union(v.literal("requested")),
  })
    .index("by_user", ["userId"])
    .index("by_generated_model_id", ["generatedModelId"])
    .index("by_session", ["sessionId"]),
});
