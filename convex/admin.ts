import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const set = new Set<string>();
  for (const part of raw.split(",")) {
    const e = part.trim().toLowerCase();
    if (e.length > 0) set.add(e);
  }
  return set;
}

function emailIsAdmin(email: string | undefined) {
  if (!email) return false;
  return parseAdminEmails().has(email.trim().toLowerCase());
}

export const adminStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { isAdmin: false };
    }
    const user = await ctx.db.get(userId);
    return { isAdmin: emailIsAdmin(user?.email) };
  },
});

export const listAllGeneratedModels = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required.");
    }
    const user = await ctx.db.get(userId);
    if (!emailIsAdmin(user?.email)) {
      throw new Error("Forbidden.");
    }

    const paginated = await ctx.db
      .query("generatedModels")
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      paginated.page.map(async (model) => {
        const owner = await ctx.db.get(model.userId);
        const session = await ctx.db.get(model.sessionId);
        return {
          ...model,
          ownerEmail: owner?.email ?? "(unknown)",
          sessionTitle: session?.title ?? "Untitled",
        };
      }),
    );

    return {
      ...paginated,
      page,
    };
  },
});
