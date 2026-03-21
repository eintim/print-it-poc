import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

export class UnauthorizedRouteError extends Error {}

export async function requireRouteToken() {
  const token = await convexAuthNextjsToken();
  if (!token) {
    throw new UnauthorizedRouteError("Authentication required.");
  }
  return token;
}

export function routeErrorResponse(error: unknown) {
  if (error instanceof UnauthorizedRouteError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const message =
    error instanceof Error ? error.message : "Unexpected server error.";
  return NextResponse.json({ error: message }, { status: 500 });
}
