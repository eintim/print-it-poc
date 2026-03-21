"use client";

import { api } from "@/convex/_generated/api";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SiteHeader from "@/components/SiteHeader";

function formatIdeaStatus(status: string) {
  switch (status) {
    case "draft":
      return "Draft";
    case "ready":
      return "Ready to generate";
    case "generating":
      return "Generating";
    case "generated":
      return "Generated";
    default:
      return status;
  }
}

function formatIdeaDate(timestamp: number) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function IdeasList() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.app.listIdeas,
    {},
    { initialNumItems: 12 },
  );

  if (results.length === 0 && status === "LoadingFirstPage") {
    return (
      <div className="rounded-[1.75rem] bg-white p-8 text-sm text-[var(--muted)] shadow-[0_24px_70px_rgba(93,64,43,0.08)]">
        Loading your ideas...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-[2rem] bg-white p-8 shadow-[0_24px_70px_rgba(93,64,43,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
          No saved ideas yet
        </p>
        <h2
          className="mt-3 text-3xl font-semibold text-[var(--foreground)]"
          style={{ fontFamily: "var(--font-newsreader), serif" }}
        >
          Start your first concept
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Once you begin refining prompts, each idea will appear here so you can
          reopen it and keep iterating.
        </p>
        <Link
          href="/create"
          className="mt-6 inline-flex rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-soft))] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105"
        >
          Create an idea
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {results.map((idea) => (
          <article
            key={idea._id}
            className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_70px_rgba(93,64,43,0.08)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                  {formatIdeaStatus(idea.status)}
                </p>
                <h2
                  className="mt-2 text-3xl font-semibold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  {idea.title}
                </h2>
              </div>
              <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                {formatIdeaDate(idea.lastMessageAt)}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-[1.5rem] bg-[var(--panel)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Original idea
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">
                  {idea.originalPrompt}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Latest refined prompt
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">
                  {(idea.canonicalPrompt ?? idea.latestPrompt) ||
                    "Still being refined."}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/create?sessionId=${idea._id}`}
                className="rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-soft))] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Open idea
              </Link>
              <Link
                href="/create"
                className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white"
              >
                Start another
              </Link>
            </div>
          </article>
        ))}
      </div>

      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => loadMore(12)}
            disabled={status === "LoadingMore"}
            className="rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "LoadingMore" ? "Loading more..." : "Load more ideas"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function MyIdeasPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/signin?next=/ideas");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="rounded-[2rem] bg-[var(--panel)] p-6 lg:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
            My ideas
          </p>
          <h1
            className="mt-4 text-5xl font-semibold text-[var(--foreground)] sm:text-6xl"
            style={{ fontFamily: "var(--font-newsreader), serif" }}
          >
            Revisit everything you have created.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--muted)]">
            This page is only available to logged-in users. Open an existing idea
            to continue refining it, generate a model, or place an order.
          </p>
        </section>

        {isLoading ? (
          <div className="rounded-[1.75rem] bg-white p-8 text-sm text-[var(--muted)] shadow-[0_24px_70px_rgba(93,64,43,0.08)]">
            Checking your account...
          </div>
        ) : isAuthenticated ? (
          <IdeasList />
        ) : (
          <div className="rounded-[1.75rem] bg-white p-8 text-sm text-[var(--muted)] shadow-[0_24px_70px_rgba(93,64,43,0.08)]">
            Redirecting to sign in...
          </div>
        )}
      </div>
    </main>
  );
}
