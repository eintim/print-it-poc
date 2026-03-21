import { fetchMutation, fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  getMeshyTask,
  type MeshyTask,
  type MeshyTaskKind,
} from "@/lib/server/meshy";
import { requireRouteToken, routeErrorResponse } from "@/lib/server/route-utils";

function getTaskError(task: MeshyTask) {
  return task.task_error?.message || "Meshy generation failed.";
}

function buildResponse(result: { job: unknown; model: unknown }) {
  return NextResponse.json({
    job: result.job,
    model: result.model,
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const token = await requireRouteToken();
    const { jobId } = await context.params;
    const typedJobId = jobId as Id<"generationJobs">;

    let current = await fetchQuery(
      api.app.getGenerationJob,
      { jobId: typedJobId },
      { token },
    );

    if (current.job.status === "succeeded" || current.job.status === "failed") {
      return buildResponse(current);
    }

    const meshyKind: MeshyTaskKind =
      current.job.meshyTaskKind === "image" ? "image" : "text";
    const previewTask = await getMeshyTask(current.job.previewTaskId, meshyKind);

    if (previewTask.status === "FAILED") {
      await fetchMutation(
        api.app.updateGenerationJob,
        {
          jobId: typedJobId,
          status: "failed",
          progress: previewTask.progress ?? current.job.progress,
          refineTaskId: null,
          errorMessage: getTaskError(previewTask),
          glbUrl: null,
          stlUrl: null,
          thumbnailUrl: previewTask.thumbnail_url ?? null,
        },
        { token },
      );
    } else if (previewTask.status === "SUCCEEDED" && previewTask.model_urls?.glb) {
      await fetchMutation(
        api.app.updateGenerationJob,
        {
          jobId: typedJobId,
          status: "succeeded",
          progress: previewTask.progress ?? 100,
          refineTaskId: null,
          errorMessage: null,
          glbUrl: previewTask.model_urls.glb,
          stlUrl: previewTask.model_urls.stl ?? null,
          thumbnailUrl: previewTask.thumbnail_url ?? null,
        },
        { token },
      );

      await fetchMutation(
        api.app.upsertGeneratedModel,
        {
          jobId: typedJobId,
          providerTaskId: previewTask.id,
          prompt: current.job.prompt,
          glbUrl: previewTask.model_urls.glb,
          stlUrl: previewTask.model_urls.stl ?? null,
          thumbnailUrl: previewTask.thumbnail_url ?? null,
        },
        { token },
      );
    } else {
      await fetchMutation(
        api.app.updateGenerationJob,
        {
          jobId: typedJobId,
          status: "preview_pending",
          progress: previewTask.progress ?? current.job.progress,
          refineTaskId: null,
          errorMessage: null,
          glbUrl: null,
          stlUrl: null,
          thumbnailUrl: previewTask.thumbnail_url ?? null,
        },
        { token },
      );
    }

    current = await fetchQuery(
      api.app.getGenerationJob,
      { jobId: typedJobId },
      { token },
    );

    return buildResponse(current);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
