import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/signin"]);
/** Logged-out users may only browse /, /showcase, /create, and /signin. */
const isProtectedRoute = createRouteMatcher([
  "/ideas",
  "/orders",
  "/server",
  "/admin",
]);

// Next.js 16+: use this file only — do not add `middleware.ts` (conflicts + wrong export shape).
export const proxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isSignInPage(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/");
  }
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return nextjsMiddlewareRedirect(
      request,
      `/signin?next=${encodeURIComponent(next)}`,
    );
  }
});

export default proxy;

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
