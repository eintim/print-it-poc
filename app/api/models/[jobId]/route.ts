import { fetchMutation, fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  createMeshyRefineTask,
  getMeshyTask,
  type MeshyTask,
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

    if (current.job.refineTaskId) {
      const refineTask = await getMeshyTask(current.job.refineTaskId);

      if (refineTask.status === "FAILED") {
        await fetchMutation(
          api.app.updateGenerationJob,
          {
            jobId: typedJobId,
            status: "failed",
            progress: refineTask.progress ?? current.job.progress,
            refineTaskId: current.job.refineTaskId,
            errorMessage: getTaskError(refineTask),
            glbUrl: null,
            stlUrl: null,
            thumbnailUrl: refineTask.thumbnail_url ?? null,
          },
          { token },
        );
      } else if (refineTask.status === "SUCCEEDED" && refineTask.model_urls?.glb) {
        await fetchMutation(
          api.app.updateGenerationJob,
          {
            jobId: typedJobId,
            status: "succeeded",
            progress: refineTask.progress ?? 100,
            refineTaskId: current.job.refineTaskId,
            errorMessage: null,
            glbUrl: refineTask.model_urls.glb,
            stlUrl: refineTask.model_urls.stl ?? null,
            thumbnailUrl: refineTask.thumbnail_url ?? null,
          },
          { token },
        );

        await fetchMutation(
          api.app.upsertGeneratedModel,
          {
            jobId: typedJobId,
            providerTaskId: refineTask.id,
            prompt: current.job.prompt,
            glbUrl: refineTask.model_urls.glb,
            stlUrl: refineTask.model_urls.stl ?? null,
            thumbnailUrl: refineTask.thumbnail_url ?? null,
          },
          { token },
        );
      } else {
        await fetchMutation(
          api.app.updateGenerationJob,
          {
            jobId: typedJobId,
            status: "refine_pending",
            progress: refineTask.progress ?? current.job.progress,
            refineTaskId: current.job.refineTaskId,
            errorMessage: null,
            glbUrl: current.job.glbUrl ?? null,
            stlUrl: current.job.stlUrl ?? null,
            thumbnailUrl: refineTask.thumbnail_url ?? current.job.thumbnailUrl ?? null,
          },
          { token },
        );
      }
    } else {
      const previewTask = await getMeshyTask(current.job.previewTaskId);

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
      } else if (previewTask.status === "SUCCEEDED") {
        const refineTaskId = await createMeshyRefineTask(current.job.previewTaskId);
        await fetchMutation(
          api.app.updateGenerationJob,
          {
            jobId: typedJobId,
            status: "refine_pending",
            progress: previewTask.progress ?? 100,
            refineTaskId,
            errorMessage: null,
            glbUrl: previewTask.model_urls?.glb ?? null,
            stlUrl: previewTask.model_urls?.stl ?? null,
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
