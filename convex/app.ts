import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

const sessionStatusValidator = v.union(
  v.literal("draft"),
  v.literal("ready"),
  v.literal("generating"),
  v.literal("generated"),
);

const generationStatusValidator = v.union(
  v.literal("preview_pending"),
  v.literal("refine_pending"),
  v.literal("succeeded"),
  v.literal("failed"),
);

const sizeValidator = v.union(
  v.literal("small"),
  v.literal("medium"),
  v.literal("large"),
);

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required.");
  }
  return userId;
}

function buildSessionTitle(prompt: string) {
  return prompt.trim().slice(0, 48) || "Untitled model";
}

const IMAGE_ONLY_PLACEHOLDER =
  "(Reference sketch or image attached — use it to infer shape, silhouette, and design intent.)";

/** Convex actions run in V8 without Node's `Buffer`. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

export const getWorkspace = query({
  args: {
    sessionId: v.union(v.id("refinementSessions"), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        viewer: null,
        sessions: [],
        selectedSession: null,
        selectedMessages: [],
        currentJob: null,
        currentModel: null,
        recentModels: [],
        recentOrders: [],
      };
    }

    const user = await ctx.db.get(userId);
    const sessions = await ctx.db
      .query("refinementSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(12);

    const selectedSessionId = args.sessionId ?? null;
    const selectedSession =
      selectedSessionId === null
        ? null
        : await ctx.db.get(selectedSessionId);

    if (selectedSession && selectedSession.userId !== userId) {
      throw new Error("Session not found.");
    }

    const selectedMessagesRaw =
      selectedSessionId === null
        ? []
        : (
            await ctx.db
              .query("refinementMessages")
              .withIndex("by_session", (q) => q.eq("sessionId", selectedSessionId))
              .order("desc")
              .take(40)
          ).reverse();

    const selectedMessages = await Promise.all(
      selectedMessagesRaw.map(async (message) => ({
        ...message,
        attachmentUrl:
          message.attachmentStorageId !== undefined
            ? await ctx.storage.getUrl(message.attachmentStorageId)
            : null,
      })),
    );

    const currentJob =
      selectedSessionId === null
        ? null
        : (
            await ctx.db
              .query("generationJobs")
              .withIndex("by_session", (q) => q.eq("sessionId", selectedSessionId))
              .order("desc")
              .take(1)
          )[0] ?? null;

    const currentModel =
      currentJob?.generatedModelId !== undefined
        ? await ctx.db.get(currentJob.generatedModelId)
        : selectedSessionId === null
          ? null
          : (
              await ctx.db
                .query("generatedModels")
                .withIndex("by_session", (q) => q.eq("sessionId", selectedSessionId))
                .order("desc")
                .take(1)
            )[0] ?? null;

    const recentModels = await ctx.db
      .query("generatedModels")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(6);

    const recentOrders = await ctx.db
      .query("printOrders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(6);

    return {
      viewer: user?.email ?? null,
      sessions,
      selectedSession,
      selectedMessages,
      currentJob,
      currentModel,
      recentModels,
      recentOrders,
    };
  },
});

export const getSessionForGeneration = query({
  args: {
    sessionId: v.id("refinementSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found.");
    }
    return session;
  },
});

export const getGenerationJob = query({
  args: {
    jobId: v.id("generationJobs"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== userId) {
      throw new Error("Generation job not found.");
    }
    const model =
      job.generatedModelId !== undefined
        ? await ctx.db.get(job.generatedModelId)
        : null;
    return {
      job,
      model,
    };
  },
});

export const getSessionConversation = query({
  args: {
    sessionId: v.id("refinementSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found.");
    }

    const messages = (
      await ctx.db
        .query("refinementMessages")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(40)
    ).reverse();

    return {
      session,
      messages,
    };
  },
});

export const listIdeas = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const paginated = await ctx.db
      .query("refinementSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    const pageWithThumbnails = await Promise.all(
      paginated.page.map(async (session) => {
        const latestModel = (
          await ctx.db
            .query("generatedModels")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .order("desc")
            .take(1)
        )[0];

        const latestJob = (
          await ctx.db
            .query("generationJobs")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .order("desc")
            .take(1)
        )[0];

        return {
          ...session,
          thumbnailUrl: latestModel?.thumbnailUrl ?? latestJob?.thumbnailUrl ?? null,
        };
      }),
    );

    return {
      ...paginated,
      page: pageWithThumbnails,
    };
  },
});

export const generateRefinementAttachmentUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return { uploadUrl: await ctx.storage.generateUploadUrl() };
  },
});

export const beginRefinementTurn = mutation({
  args: {
    sessionId: v.union(v.id("refinementSessions"), v.null()),
    message: v.string(),
    attachmentStorageId: v.optional(v.id("_storage")),
    attachmentContentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const now = Date.now();

    const hasText = args.message.trim().length > 0;
    if (!hasText && !args.attachmentStorageId) {
      throw new Error("Add a message or attach a reference image or sketch.");
    }

    const storedContent = hasText ? args.message.trim() : IMAGE_ONLY_PLACEHOLDER;
    const originalForSession = hasText ? args.message.trim() : "Sketch / reference image";

    let sessionId = args.sessionId;
    let session = sessionId ? await ctx.db.get(sessionId) : null;
    if (session && session.userId !== userId) {
      throw new Error("Session not found.");
    }

    if (!session) {
      sessionId = await ctx.db.insert("refinementSessions", {
        userId,
        title: buildSessionTitle(originalForSession),
        originalPrompt: originalForSession,
        latestPrompt: "",
        status: "draft",
        lastMessageAt: now,
      });
      session = await ctx.db.get(sessionId);
    } else {
      await ctx.db.patch(session._id, {
        lastMessageAt: now,
      });
    }

    await ctx.db.insert("refinementMessages", {
      sessionId: sessionId!,
      userId,
      role: "user",
      content: storedContent,
      attachmentStorageId: args.attachmentStorageId,
      attachmentContentType: args.attachmentContentType,
    });

    return {
      sessionId: sessionId!,
    };
  },
});

export const completeRefinementTurn = mutation({
  args: {
    sessionId: v.id("refinementSessions"),
    assistantMessage: v.string(),
    latestPrompt: v.string(),
    canonicalPrompt: v.union(v.string(), v.null()),
    readyToGenerate: v.boolean(),
    tips: v.array(v.string()),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found.");
    }

    await ctx.db.insert("refinementMessages", {
      sessionId: session._id,
      userId,
      role: "assistant",
      content: args.assistantMessage,
      readyToGenerate: args.readyToGenerate,
      canonicalPrompt: args.canonicalPrompt ?? undefined,
      tips: args.tips,
    });

    await ctx.db.patch(session._id, {
      title: args.title || session.title,
      latestPrompt: args.latestPrompt,
      canonicalPrompt: args.canonicalPrompt ?? undefined,
      status: args.readyToGenerate ? "ready" : "draft",
      lastMessageAt: Date.now(),
    });

    return {
      sessionId: session._id,
    };
  },
});

export const createGenerationJob = mutation({
  args: {
    sessionId: v.id("refinementSessions"),
    prompt: v.string(),
    previewTaskId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found.");
    }

    const jobId = await ctx.db.insert("generationJobs", {
      userId,
      sessionId: session._id,
      prompt: args.prompt,
      previewTaskId: args.previewTaskId,
      status: "preview_pending",
      progress: 0,
    });

    await ctx.db.patch(session._id, {
      status: "generating",
      lastMessageAt: Date.now(),
    });

    return {
      jobId,
    };
  },
});

export const updateGenerationJob = mutation({
  args: {
    jobId: v.id("generationJobs"),
    status: generationStatusValidator,
    progress: v.number(),
    refineTaskId: v.union(v.string(), v.null()),
    errorMessage: v.union(v.string(), v.null()),
    glbUrl: v.union(v.string(), v.null()),
    stlUrl: v.union(v.string(), v.null()),
    thumbnailUrl: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== userId) {
      throw new Error("Generation job not found.");
    }

    await ctx.db.patch(job._id, {
      status: args.status,
      progress: args.progress,
      refineTaskId: args.refineTaskId ?? undefined,
      errorMessage: args.errorMessage ?? undefined,
      glbUrl: args.glbUrl ?? undefined,
      stlUrl: args.stlUrl ?? undefined,
      thumbnailUrl: args.thumbnailUrl ?? undefined,
    });

    if (args.status === "failed") {
      await ctx.db.patch(job.sessionId, {
        status: "ready",
      });
    }
  },
});

export const upsertGeneratedModel = mutation({
  args: {
    jobId: v.id("generationJobs"),
    providerTaskId: v.string(),
    prompt: v.string(),
    glbUrl: v.string(),
    stlUrl: v.union(v.string(), v.null()),
    thumbnailUrl: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== userId) {
      throw new Error("Generation job not found.");
    }

    const existing = await ctx.db
      .query("generatedModels")
      .withIndex("by_generation_job_id", (q) => q.eq("generationJobId", job._id))
      .unique();

    const patch = {
      prompt: args.prompt,
      glbUrl: args.glbUrl,
      stlUrl: args.stlUrl ?? undefined,
      thumbnailUrl: args.thumbnailUrl ?? undefined,
      providerTaskId: args.providerTaskId,
      status: "ready" as const,
    };

    const modelId =
      existing?._id ??
      (await ctx.db.insert("generatedModels", {
        userId,
        sessionId: job.sessionId,
        generationJobId: job._id,
        ...patch,
      }));

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    }

    await ctx.db.patch(job._id, {
      generatedModelId: modelId,
      status: "succeeded",
      progress: 100,
      glbUrl: args.glbUrl,
      stlUrl: args.stlUrl ?? undefined,
      thumbnailUrl: args.thumbnailUrl ?? undefined,
    });

    await ctx.db.patch(job.sessionId, {
      status: "generated",
      canonicalPrompt: job.prompt,
      lastMessageAt: Date.now(),
    });

    return {
      modelId,
    };
  },
});

export const createPrintOrder = mutation({
  args: {
    generatedModelId: v.id("generatedModels"),
    size: sizeValidator,
    targetHeightMm: v.number(),
    contactName: v.string(),
    email: v.string(),
    shippingAddress: v.string(),
    notes: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const model = await ctx.db.get(args.generatedModelId);
    if (!model || model.userId !== userId) {
      throw new Error("Model not found.");
    }

    const orderId = await ctx.db.insert("printOrders", {
      userId,
      sessionId: model.sessionId,
      generatedModelId: model._id,
      size: args.size,
      targetHeightMm: args.targetHeightMm,
      contactName: args.contactName,
      email: args.email,
      shippingAddress: args.shippingAddress,
      notes: args.notes ?? undefined,
      status: "requested",
    });

    await ctx.db.patch(model._id, {
      status: "ordered",
    });

    return {
      orderId,
    };
  },
});

export const updateSessionStatus = mutation({
  args: {
    sessionId: v.id("refinementSessions"),
    status: sessionStatusValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found.");
    }

    await ctx.db.patch(session._id, {
      status: args.status,
      lastMessageAt: Date.now(),
    });
  },
});

const MAX_REFINEMENT_ATTACHMENTS_FOR_MODEL = 5;

export const getSessionMessagesForRefinementLoad = internalQuery({
  args: {
    sessionId: v.id("refinementSessions"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      return null;
    }

    const messages = (
      await ctx.db
        .query("refinementMessages")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .order("desc")
        .take(40)
    ).reverse();

    return messages.map((message) => ({
      _id: message._id,
      role: message.role,
      content: message.content,
      attachmentStorageId: message.attachmentStorageId,
      attachmentContentType: message.attachmentContentType,
    }));
  },
});

export const loadRefinementAttachmentPayloads = action({
  args: {
    sessionId: v.id("refinementSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required.");
    }

    const rows = await ctx.runQuery(internal.app.getSessionMessagesForRefinementLoad, {
      sessionId: args.sessionId,
      userId,
    });

    if (!rows) {
      throw new Error("Session not found.");
    }

    const out: Record<string, { mimeType: string; base64: string }> = {};
    let loaded = 0;

    for (
      let i = rows.length - 1;
      i >= 0 && loaded < MAX_REFINEMENT_ATTACHMENTS_FOR_MODEL;
      i--
    ) {
      const message = rows[i];
      if (message.role !== "user" || !message.attachmentStorageId) {
        continue;
      }

      const blob = await ctx.storage.get(message.attachmentStorageId);
      if (!blob) {
        continue;
      }

      const buf = await blob.arrayBuffer();
      const mimeType =
        message.attachmentContentType?.trim() ||
        (blob.type && blob.type !== "application/octet-stream" ? blob.type : "image/jpeg");

      out[message._id] = {
        mimeType,
        base64: arrayBufferToBase64(buf),
      };
      loaded++;
    }

    return out;
  },
});
