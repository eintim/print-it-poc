import { fetchMutation, fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { createMeshyPreviewTask } from "@/lib/server/meshy";
import { requireRouteToken, routeErrorResponse } from "@/lib/server/route-utils";

const generateRequestSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const token = await requireRouteToken();
    const body = generateRequestSchema.parse(await request.json());
    const sessionId = body.sessionId as Id<"refinementSessions">;

    const session = await fetchQuery(
      api.app.getSessionForGeneration,
      { sessionId },
      { token },
    );

    if (session.status === "draft") {
      return NextResponse.json(
        { error: "Refine the prompt until it is ready before generating." },
        { status: 400 },
      );
    }

    const prompt = session.canonicalPrompt ?? session.latestPrompt;
    if (!prompt.trim()) {
      return NextResponse.json(
        { error: "The prompt is not ready for generation yet." },
        { status: 400 },
      );
    }

    const previewTaskId = await createMeshyPreviewTask(prompt);
    const created = await fetchMutation(
      api.app.createGenerationJob,
      {
        sessionId,
        prompt,
        previewTaskId,
      },
      { token },
    );

    return NextResponse.json({
      jobId: created.jobId,
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
