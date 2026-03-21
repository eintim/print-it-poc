import { fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { requireRouteToken, routeErrorResponse } from "@/lib/server/route-utils";

function defaultContentType(asset: string) {
  switch (asset) {
    case "glb":
      return "model/gltf-binary";
    case "stl":
      return "model/stl";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string; asset: string }> },
) {
  try {
    const token = await requireRouteToken();
    const { jobId, asset } = await context.params;
    const typedJobId = jobId as Id<"generationJobs">;

    if (asset !== "glb" && asset !== "stl") {
      return NextResponse.json({ error: "Unknown asset requested." }, { status: 404 });
    }

    const current = await fetchQuery(
      api.app.getGenerationJob,
      { jobId: typedJobId },
      { token },
    );

    const sourceUrl =
      asset === "glb"
        ? current.model?.glbUrl ?? current.job.glbUrl ?? null
        : current.model?.stlUrl ?? current.job.stlUrl ?? null;

    if (!sourceUrl) {
      return NextResponse.json({ error: "Asset is not available yet." }, { status: 404 });
    }

    const upstream = await fetch(sourceUrl);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Could not fetch upstream asset (${upstream.status}).` },
        { status: 502 },
      );
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("Content-Type") ?? defaultContentType(asset),
    );
    headers.set(
      "Cache-Control",
      upstream.headers.get("Cache-Control") ?? "private, max-age=300",
    );

    const contentLength = upstream.headers.get("Content-Length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    if (asset === "stl") {
      headers.set("Content-Disposition", `attachment; filename="${jobId}.stl"`);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
