import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

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

    const selectedSessionId = args.sessionId ?? sessions[0]?._id ?? null;
    const selectedSession =
      selectedSessionId === null
        ? null
        : await ctx.db.get(selectedSessionId);

    if (selectedSession && selectedSession.userId !== userId) {
      throw new Error("Session not found.");
    }

    const selectedMessages =
      selectedSessionId === null
        ? []
        : (
            await ctx.db
              .query("refinementMessages")
              .withIndex("by_session", (q) => q.eq("sessionId", selectedSessionId))
              .order("desc")
              .take(40)
          ).reverse();

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

export const beginRefinementTurn = mutation({
  args: {
    sessionId: v.union(v.id("refinementSessions"), v.null()),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const now = Date.now();

    let sessionId = args.sessionId;
    let session = sessionId ? await ctx.db.get(sessionId) : null;
    if (session && session.userId !== userId) {
      throw new Error("Session not found.");
    }

    if (!session) {
      sessionId = await ctx.db.insert("refinementSessions", {
        userId,
        title: buildSessionTitle(args.prompt),
        originalPrompt: args.prompt,
        latestPrompt: args.prompt,
        status: "draft",
        lastMessageAt: now,
      });
      session = await ctx.db.get(sessionId);
    } else {
      await ctx.db.patch(session._id, {
        latestPrompt: args.prompt,
        lastMessageAt: now,
      });
    }

    await ctx.db.insert("refinementMessages", {
      sessionId: sessionId!,
      userId,
      role: "user",
      content: args.prompt,
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
