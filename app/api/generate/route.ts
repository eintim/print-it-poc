import { fetchAction, fetchMutation, fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  createMeshyImageTo3dTask,
  createMeshyPreviewTask,
} from "@/lib/server/meshy";
import { requireRouteToken, routeErrorResponse } from "@/lib/server/route-utils";

const generateRequestSchema = z
  .object({
    sessionId: z.string().min(1).optional().nullable(),
    attachmentStorageId: z.string().min(1).optional(),
    attachmentContentType: z.string().max(120).optional().nullable(),
    caption: z.string().max(2000).optional().nullable(),
  })
  .refine(
    (data) =>
      Boolean(data.attachmentStorageId?.trim()) || Boolean(data.sessionId?.trim()),
    { message: "Provide sessionId or attachmentStorageId." },
  );

export async function POST(request: Request) {
  try {
    const token = await requireRouteToken();
    const body = generateRequestSchema.parse(await request.json());

    if (body.attachmentStorageId?.trim()) {
      const storageId = body.attachmentStorageId.trim() as Id<"_storage">;
      const { sessionId } = await fetchMutation(
        api.app.prepareImageToModelSession,
        {
          sessionId: body.sessionId?.trim()
            ? (body.sessionId.trim() as Id<"refinementSessions">)
            : null,
          caption: body.caption?.trim() || undefined,
        },
        { token },
      );

      const { dataUri } = await fetchAction(
        api.app.getStorageFileDataUri,
        { storageId },
        { token },
      );

      const previewTaskId = await createMeshyImageTo3dTask(dataUri);
      const prompt =
        body.caption?.trim() && body.caption.trim().length > 0
          ? body.caption.trim()
          : "Image to 3D";

      const created = await fetchMutation(
        api.app.createGenerationJob,
        {
          sessionId,
          prompt,
          previewTaskId,
          meshyTaskKind: "image",
        },
        { token },
      );

      return NextResponse.json({
        jobId: created.jobId,
        sessionId,
      });
    }

    const sessionId = body.sessionId!.trim() as Id<"refinementSessions">;

    const session = await fetchQuery(
      api.app.getSessionForGeneration,
      { sessionId },
      { token },
    );

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
        meshyTaskKind: "text",
      },
      { token },
    );

    return NextResponse.json({
      jobId: created.jobId,
      sessionId,
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
