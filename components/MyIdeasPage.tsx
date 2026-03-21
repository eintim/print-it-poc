"use client";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SiteHeader from "@/components/SiteHeader";

type Idea = Doc<"refinementSessions"> & {
  thumbnailUrl?: string | null;
};

function formatIdeaStatus(status: Idea["status"]) {
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

function getIdeaPreview(idea: Idea) {
  const canonicalPrompt = idea.canonicalPrompt?.trim();
  const latestPrompt = idea.latestPrompt.trim();

  if (canonicalPrompt) {
    return { label: "Ready prompt", text: canonicalPrompt };
  }
  if (latestPrompt) {
    return { label: "Latest draft", text: latestPrompt };
  }
  return { label: "Original idea", text: idea.originalPrompt };
}

function getIdeaStatusClasses(status: Idea["status"]) {
  switch (status) {
    case "ready":
      return "bg-[var(--sage-soft)] text-[var(--sage)]";
    case "generated":
      return "bg-[var(--accent-glow)] text-[var(--accent)]";
    case "generating":
      return "bg-[rgba(234,88,12,0.1)] text-[var(--accent)]";
    case "draft":
    default:
      return "bg-[var(--panel)] text-[var(--muted)]";
  }
}

function IdeasList() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.app.listIdeas,
    {},
    { initialNumItems: 12 },
  );

  const readyCount = results.filter(
    (idea) => idea.status === "ready" || idea.status === "generated",
  ).length;
  const draftCount = results.filter((idea) => idea.status === "draft").length;

  if (results.length === 0 && status === "LoadingFirstPage") {
    return (
      <div className="craft-card p-6 text-sm text-[var(--muted)] sm:p-8">
        Loading your ideas...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="craft-card p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          No saved ideas yet
        </p>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">
          Start your first concept
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Once you begin refining prompts, each idea will appear here so you can
          reopen it and keep iterating.
        </p>
        <Link
          href="/create"
          className="btn-copper mt-6 inline-flex rounded-full px-6 py-3 text-xs uppercase tracking-[0.12em]"
        >
          Create an idea
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-[var(--paper)] px-3.5 py-1.5 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-sm)]">
          {results.length} total
        </span>
        <span className="rounded-full bg-[var(--sage-soft)] px-3.5 py-1.5 text-sm font-semibold text-[var(--sage)]">
          {readyCount} ready
        </span>
        <span className="rounded-full bg-[var(--panel)] px-3.5 py-1.5 text-sm font-semibold text-[var(--muted)]">
          {draftCount} drafts
        </span>
      </div>

      <div className="space-y-3">
        {results.map((idea) => (
          <article key={idea._id} className="craft-card p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              {idea.thumbnailUrl ? (
                <div className="relative h-32 w-full overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] lg:h-36 lg:w-48 lg:flex-none">
                  <Image
                    src={idea.thumbnailUrl}
                    alt={`${idea.title} thumbnail`}
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 192px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getIdeaStatusClasses(idea.status)}`}
                  >
                    {formatIdeaStatus(idea.status)}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    Updated {formatIdeaDate(idea.lastMessageAt)}
                  </span>
                </div>
                <h2 className="mt-3 font-serif text-2xl font-semibold leading-tight text-[var(--foreground)] sm:text-3xl">
                  {idea.title}
                </h2>

                <div className="mt-4 rounded-xl bg-[var(--panel)] p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                    {getIdeaPreview(idea).label}
                  </p>
                  <p
                    className="mt-2 text-sm leading-7 text-[var(--foreground)]"
                    style={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 3,
                      overflow: "hidden",
                    }}
                  >
                    {getIdeaPreview(idea).text || "Still being refined."}
                  </p>
                </div>

                {getIdeaPreview(idea).text !== idea.originalPrompt ? (
                  <p
                    className="mt-3 text-sm leading-6 text-[var(--muted)]"
                    style={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                    }}
                  >
                    Started with: {idea.originalPrompt}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 lg:w-[180px] lg:flex-col lg:items-stretch">
                <Link
                  href={`/create?sessionId=${idea._id}`}
                  className="btn-copper rounded-full px-5 py-2.5 text-center text-xs uppercase tracking-[0.12em]"
                >
                  Continue
                </Link>
                <Link
                  href="/create"
                  className="btn-outline rounded-full px-5 py-2.5 text-center text-sm"
                >
                  New idea
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => loadMore(12)}
            disabled={status === "LoadingMore"}
            className="btn-outline rounded-full px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
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

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="grain paper-texture overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-6 py-6 sm:px-8 sm:py-7">
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl animate-fade-up">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
                My ideas
              </p>
              <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-[var(--foreground)] sm:text-5xl">
                Pick up where you left off.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                Open any saved idea to keep refining it, generate when it is
                ready, or start something new.
              </p>
            </div>

            <Link
              href="/create"
              className="btn-copper inline-flex w-full rounded-full px-6 py-3 text-xs uppercase tracking-[0.12em] sm:w-auto"
            >
              Start a new idea
            </Link>
          </div>
        </section>

        {isLoading ? (
          <div className="craft-card p-6 text-sm text-[var(--muted)] sm:p-8">
            Checking your account...
          </div>
        ) : isAuthenticated ? (
          <IdeasList />
        ) : (
          <div className="craft-card p-6 text-sm text-[var(--muted)] sm:p-8">
            Redirecting to sign in...
          </div>
        )}
      </div>
    </main>
  );
}
