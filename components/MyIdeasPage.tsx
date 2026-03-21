"use client";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SiteHeader from "@/components/SiteHeader";

type Idea = Doc<"refinementSessions">;

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
    return {
      label: "Ready prompt",
      text: canonicalPrompt,
    };
  }

  if (latestPrompt) {
    return {
      label: "Latest draft",
      text: latestPrompt,
    };
  }

  return {
    label: "Original idea",
    text: idea.originalPrompt,
  };
}

function getIdeaStatusClasses(status: Idea["status"]) {
  switch (status) {
    case "ready":
      return "bg-[rgba(71,102,82,0.12)] text-[var(--sage)]";
    case "generated":
      return "bg-[rgba(165,60,44,0.12)] text-[var(--accent)]";
    case "generating":
      return "bg-[rgba(253,125,104,0.15)] text-[var(--accent)]";
    case "draft":
    default:
      return "bg-[var(--paper)] text-[var(--muted)]";
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
      <div className="soft-card rounded-[1.75rem] p-6 text-sm text-[var(--muted)] sm:p-8">
        Loading your ideas...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="soft-card rounded-[1.75rem] p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--accent)]">
          No saved ideas yet
        </p>
        <h2
          className="mt-3 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl"
          style={{ fontFamily: "var(--font-newsreader), serif" }}
        >
          Start your first concept
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Once you begin refining prompts, each idea will appear here so you can
          reopen it and keep iterating.
        </p>
        <Link
          href="/create"
          className="mt-6 inline-flex rounded-full px-6 py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition hover:brightness-105"
          style={{ background: "linear-gradient(135deg, var(--accent-soft), var(--accent))" }}
        >
          Create an idea
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-[var(--paper)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-[0_10px_24px_rgba(93,64,43,0.05)]">
          {results.length} total
        </span>
        <span className="rounded-full bg-[rgba(71,102,82,0.12)] px-4 py-2 text-sm font-semibold text-[var(--sage)]">
          {readyCount} ready
        </span>
        <span className="rounded-full bg-[rgba(186,176,164,0.18)] px-4 py-2 text-sm font-semibold text-[var(--muted)]">
          {draftCount} drafts
        </span>
      </div>

      <div className="space-y-4">
        {results.map((idea) => (
          <article key={idea._id} className="soft-card rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${getIdeaStatusClasses(idea.status)}`}
                  >
                    {formatIdeaStatus(idea.status)}
                  </span>
                  <span className="text-xs font-medium text-[var(--muted)]">
                    Updated {formatIdeaDate(idea.lastMessageAt)}
                  </span>
                </div>
                <h2
                  className="mt-3 text-2xl font-semibold leading-tight text-[var(--foreground)] sm:text-3xl"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  {idea.title}
                </h2>

                <div className="mt-4 rounded-[1.35rem] bg-[var(--panel)] p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--muted)]">
                    {getIdeaPreview(idea).label}
                  </p>
                  <p
                    className="mt-2 text-sm leading-7 text-[var(--foreground)] sm:text-[15px]"
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

              <div className="flex flex-wrap gap-3 lg:w-[190px] lg:flex-col lg:items-stretch">
                <Link
                  href={`/create?sessionId=${idea._id}`}
                  className="rounded-full px-5 py-3 text-center text-sm font-extrabold uppercase tracking-[0.14em] text-white transition hover:brightness-105"
                  style={{ background: "linear-gradient(135deg, var(--accent-soft), var(--accent))" }}
                >
                  Continue
                </Link>
                <Link
                  href="/create"
                  className="rounded-full border border-[rgba(186,176,164,0.42)] bg-[var(--paper)] px-5 py-3 text-center text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--cream)]"
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
            className="rounded-full border border-[rgba(186,176,164,0.42)] bg-white px-5 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--cream)] disabled:cursor-not-allowed disabled:opacity-60"
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
        <section className="paper-texture rounded-[2rem] border border-[rgba(216,203,184,0.7)] bg-[rgba(246,236,225,0.82)] px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--accent)]">
                My ideas
              </p>
              <h1
                className="mt-3 text-4xl font-semibold leading-tight text-[var(--foreground)] sm:text-5xl"
                style={{ fontFamily: "var(--font-newsreader), serif" }}
              >
                Pick up where you left off.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                Open any saved idea to keep refining it, generate when it is ready,
                or start something new without wading through a crowded layout.
              </p>
            </div>

            <Link
              href="/create"
              className="inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition hover:brightness-105 sm:w-auto"
              style={{ background: "linear-gradient(135deg, var(--accent-soft), var(--accent))" }}
            >
              Start a new idea
            </Link>
          </div>
        </section>

        {isLoading ? (
          <div className="soft-card rounded-[1.75rem] p-6 text-sm text-[var(--muted)] sm:p-8">
            Checking your account...
          </div>
        ) : isAuthenticated ? (
          <IdeasList />
        ) : (
          <div className="soft-card rounded-[1.75rem] p-6 text-sm text-[var(--muted)] sm:p-8">
            Redirecting to sign in...
          </div>
        )}
      </div>
    </main>
  );
}
