"use client";

import { api } from "@/convex/_generated/api";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import TopNavBar from "@/components/ui/TopNavBar";
import BottomNavBar from "@/components/ui/BottomNavBar";

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return { label: "Draft", className: "bg-outline/10 text-on-surface-variant" };
    case "ready":
      return { label: "Ready", className: "bg-secondary-container text-on-secondary-container" };
    case "generating":
      return { label: "Generating", className: "bg-primary-container/20 text-primary" };
    case "generated":
      return { label: "Generated", className: "bg-primary/10 text-primary" };
    default:
      return { label: status, className: "bg-outline/10 text-on-surface-variant" };
  }
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function IdeasGrid() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.app.listIdeas,
    {},
    { initialNumItems: 12 },
  );

  if (results.length === 0 && status === "LoadingFirstPage") {
    return (
      <div className="col-span-full flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="material-symbols-outlined text-5xl text-outline">
            hourglass_empty
          </span>
          <p className="font-jakarta text-lg text-on-surface-variant">
            Loading your ideas...
          </p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="col-span-full">
        <div className="bg-surface-container-lowest rounded-xl p-12 text-center border border-outline-variant/15 space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-primary text-4xl">
              lightbulb
            </span>
          </div>
          <div>
            <h3 className="font-jakarta font-bold text-2xl mb-2">
              No ideas yet
            </h3>
            <p className="font-body text-on-surface-variant max-w-md mx-auto">
              Start creating your first printable idea. Each conversation will
              be saved here so you can revisit and refine it.
            </p>
          </div>
          <Link
            href="/create"
            className="inline-flex px-8 py-4 rounded-full bg-gradient-to-br from-primary to-primary-container text-white font-jakarta font-bold text-lg hover:shadow-lg active:scale-95 transition-all"
          >
            Start Creating
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {results.map((idea) => {
        const badge = statusBadge(idea.status);
        const displayPrompt =
          idea.canonicalPrompt ?? idea.latestPrompt ?? idea.originalPrompt;

        return (
          <article
            key={idea._id}
            className="bg-surface-container-lowest rounded-xl p-6 paper-texture group hover:shadow-[0_8px_24px_rgba(56,50,40,0.06)] transition-all flex flex-col h-full border border-outline-variant/15"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-jakarta font-bold text-xl truncate">
                  {idea.title}
                </h3>
                <p className="text-sm text-on-surface-variant mt-1 font-body">
                  {formatDate(idea.lastMessageAt)}
                </p>
              </div>
              <span
                className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-jakarta font-bold uppercase tracking-wider ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>

            {/* Original idea */}
            <div className="bg-surface-container rounded-2xl p-4 mb-3">
              <p className="text-[10px] font-jakarta font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Original Idea
              </p>
              <p className="text-sm font-body text-on-surface leading-relaxed line-clamp-2">
                {idea.originalPrompt}
              </p>
            </div>

            {/* Refined prompt */}
            <div className="rounded-2xl border border-outline-variant/20 p-4 mb-6 flex-1">
              <p className="text-[10px] font-jakarta font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Latest Prompt
              </p>
              <p className="text-sm font-body text-on-surface leading-relaxed line-clamp-3">
                {displayPrompt || "Still being refined."}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href={`/create?sessionId=${idea._id}`}
                className="flex-1 py-3 rounded-xl text-center bg-gradient-to-br from-primary to-primary-container text-white font-jakarta font-bold hover:shadow-lg active:scale-[0.98] transition-all"
              >
                Open Idea
              </Link>
              <Link
                href="/create"
                className="py-3 px-5 rounded-xl text-center border border-outline-variant/30 font-jakarta font-bold text-on-surface hover:bg-surface-container transition-all"
              >
                New
              </Link>
            </div>
          </article>
        );
      })}

      {/* Load more */}
      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className="col-span-full flex justify-center pt-4">
          <button
            type="button"
            onClick={() => loadMore(12)}
            disabled={status === "LoadingMore"}
            className="px-8 py-3 rounded-full border-2 border-primary text-primary font-jakarta font-bold hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "LoadingMore" ? "Loading..." : "Load More Ideas"}
          </button>
        </div>
      ) : null}
    </>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/signin?next=/history");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-surface">
      <TopNavBar />

      <main className="max-w-7xl mx-auto px-6 py-12 mb-24 md:mb-12">
        {/* Header */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold font-jakarta mb-4">
                <span className="material-symbols-outlined text-sm">
                  history
                </span>
                Prompt History
              </div>
              <h1 className="font-jakarta text-5xl font-extrabold text-on-surface tracking-tight mb-3">
                Revisit your{" "}
                <span className="text-primary italic font-serif font-medium">
                  creative journey.
                </span>
              </h1>
              <p className="font-body text-xl text-on-surface-variant leading-relaxed max-w-2xl">
                Every idea you&apos;ve shaped lives here. Open any conversation
                to keep refining, generate a model, or start something new.
              </p>
            </div>

            <Link
              href="/create"
              className="shrink-0 bg-primary hover:bg-primary-container px-8 py-4 rounded-full font-bold text-white shadow-lg hover:shadow-primary/20 transition-all active:scale-95 text-lg font-jakarta"
            >
              New Idea
            </Link>
          </div>
        </section>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="material-symbols-outlined text-5xl text-outline animate-spin">
                progress_activity
              </span>
              <p className="font-jakarta text-lg text-on-surface-variant">
                Checking your account...
              </p>
            </div>
          </div>
        ) : isAuthenticated ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <IdeasGrid />
          </div>
        ) : (
          <div className="flex items-center justify-center py-24">
            <p className="font-jakarta text-lg text-on-surface-variant">
              Redirecting to sign in...
            </p>
          </div>
        )}
      </main>

      <BottomNavBar />
    </div>
  );
}
