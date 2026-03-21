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

function statusDotColor(status: Idea["status"]) {
  switch (status) {
    case "generated":
      return "bg-[var(--accent)]";
    case "ready":
      return "bg-[var(--sage)]";
    case "generating":
      return "bg-amber-500 animate-pulse";
    case "draft":
    default:
      return "bg-[var(--muted)]";
  }
}

function statusLabel(status: Idea["status"]) {
  switch (status) {
    case "draft":
      return "Draft";
    case "ready":
      return "Ready";
    case "generating":
      return "Generating";
    case "generated":
      return "Generated";
    default:
      return status;
  }
}

function timeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    timestamp,
  );
}

function getPreviewText(idea: Idea) {
  const canonical = idea.canonicalPrompt?.trim();
  if (canonical) return canonical;
  const latest = idea.latestPrompt.trim();
  if (latest) return latest;
  return idea.originalPrompt;
}

function IdeaCard({ idea }: { idea: Idea }) {
  return (
    <Link
      href={`/create?sessionId=${idea._id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)] transition-all duration-200 hover:border-[var(--line-strong)] hover:shadow-[var(--shadow)]"
    >
      {idea.thumbnailUrl ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--panel)]">
          <Image
            src={idea.thumbnailUrl}
            alt={idea.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-[var(--panel)]">
          <span className="text-3xl text-[var(--muted)] opacity-30">
            &#9651;
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-xl font-semibold leading-snug text-[var(--foreground)] sm:text-[1.35rem]">
          {idea.title}
        </h3>

        <p
          className="mt-2 text-sm leading-relaxed text-[var(--muted)]"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
          }}
        >
          {getPreviewText(idea)}
        </p>

        <div className="mt-auto flex items-center gap-2 pt-4">
          <span
            className={`inline-block h-2 w-2 rounded-full ${statusDotColor(idea.status)}`}
          />
          <span className="text-xs font-medium text-[var(--muted)]">
            {statusLabel(idea.status)}
          </span>
          <span className="text-xs text-[var(--muted)] opacity-50">&middot;</span>
          <span className="text-xs text-[var(--muted)] opacity-70">
            {timeAgo(idea.lastMessageAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function IdeasList() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.app.listIdeas,
    {},
    { initialNumItems: 12 },
  );

  if (results.length === 0 && status === "LoadingFirstPage") {
    return (
      <p className="py-12 text-center text-sm text-[var(--muted)]">
        Loading your ideas...
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-6 py-12 text-center sm:px-8">
        <h2 className="font-serif text-3xl font-semibold text-[var(--foreground)]">
          No ideas yet
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[var(--muted)]">
          Once you begin refining prompts, each idea will appear here so you can
          reopen it and keep iterating.
        </p>
        <Link
          href="/create"
          className="btn-copper mt-6 inline-flex rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest"
        >
          Create your first idea
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((idea) => (
          <IdeaCard key={idea._id} idea={idea} />
        ))}
      </div>

      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => loadMore(12)}
            disabled={status === "LoadingMore"}
            className="btn-outline rounded-full px-6 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "LoadingMore" ? "Loading..." : "Load more"}
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

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-4xl font-semibold text-[var(--foreground)] sm:text-5xl">
              My ideas
            </h1>
            <p className="mt-2 text-base text-[var(--muted)] sm:text-lg">
              Pick up where you left off, or start something new.
            </p>
          </div>
          <Link
            href="/create"
            className="btn-copper inline-flex w-full rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest sm:w-auto"
          >
            New idea
          </Link>
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            Checking your account...
          </p>
        ) : isAuthenticated ? (
          <IdeasList />
        ) : (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            Redirecting to sign in...
          </p>
        )}
      </div>
    </main>
  );
}
