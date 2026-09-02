import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Everything a signed-out visitor may see: the marketing page, the two auth
 * screens, and the PWA manifest and icons the browser fetches before anyone has
 * signed in.
 *
 * The list is of *public* routes rather than protected ones deliberately — a new
 * caregiver screen is then private by default, and forgetting to list it fails
 * closed. Every dashboard route is caregiver-facing patient data (AGENTS.md
 * §2.5), so an unauthenticated one is never the intended outcome.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/manifest.json",
  "/icons/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Everything except Next's build output and static assets, unless the
    // request carries search params — those are pages, not files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API and tRPC routes.
    "/(api|trpc)(.*)",
  ],
};
