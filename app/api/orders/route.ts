import { fetchMutation } from "convex/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { requireRouteToken, routeErrorResponse } from "@/lib/server/route-utils";

const createOrderSchema = z.object({
  generatedModelId: z.string().min(1),
  size: z.enum(["small", "medium", "large"]),
  targetHeightMm: z.number().int().positive(),
  contactName: z.string().min(1).max(120),
  email: z.email(),
  shippingAddress: z.string().min(10).max(500),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const token = await requireRouteToken();
    const body = createOrderSchema.parse(await request.json());

    const created = await fetchMutation(
      api.app.createPrintOrder,
      {
        generatedModelId: body.generatedModelId as Id<"generatedModels">,
        size: body.size,
        targetHeightMm: body.targetHeightMm,
        contactName: body.contactName.trim(),
        email: body.email.trim(),
        shippingAddress: body.shippingAddress.trim(),
        notes: body.notes?.trim() || null,
      },
      { token },
    );

    return NextResponse.json({
      orderId: created.orderId,
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
