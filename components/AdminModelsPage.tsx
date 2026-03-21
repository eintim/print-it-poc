"use client";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useConvexAuth, usePaginatedQuery, useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SiteHeader from "@/components/SiteHeader";

type ModelRow = Doc<"generatedModels"> & {
  ownerEmail: string;
  sessionTitle: string;
};

function modelStatusLabel(status: ModelRow["status"]) {
  switch (status) {
    case "ready":
      return "Ready";
    case "ordered":
      return "Ordered";
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

function ModelCard({ model }: { model: ModelRow }) {
  const promptPreview =
    model.prompt.trim().slice(0, 160) +
    (model.prompt.length > 160 ? "…" : "");

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)] sm:flex-row">
      {model.thumbnailUrl ? (
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[var(--panel)] sm:aspect-auto sm:h-auto sm:w-44 md:w-52">
          <Image
            src={model.thumbnailUrl}
            alt={model.sessionTitle}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, 200px"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full shrink-0 items-center justify-center bg-[var(--panel)] sm:aspect-auto sm:h-auto sm:w-44 md:w-52">
          <span className="text-3xl text-[var(--muted)] opacity-30">&#9651;</span>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
        <div>
          <h2 className="font-serif text-xl font-semibold leading-snug text-[var(--foreground)]">
            {model.sessionTitle}
          </h2>
          {promptPreview ? (
            <p
              className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 3,
                overflow: "hidden",
              }}
            >
              {promptPreview}
            </p>
          ) : null}
        </div>

        <dl className="grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              Owner
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--foreground)]">
              {model.ownerEmail}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              Status
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--foreground)]">
              {modelStatusLabel(model.status)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              Created
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--foreground)]">
              {timeAgo(model._creationTime)}
            </dd>
          </div>
          <div className="sm:col-span-2 font-mono text-xs text-[var(--muted)]">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              IDs
            </span>
            <div className="mt-1 break-all opacity-90">
              model {model._id} · job {model.generationJobId}
            </div>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(186,176,164,0.18)] pt-3">
          <span className="text-xs text-[var(--muted)] opacity-80">
            Provider task {model.providerTaskId.slice(0, 12)}…
          </span>
          <Link
            href={`/create?sessionId=${model.sessionId}`}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Open session
          </Link>
        </div>
      </div>
    </article>
  );
}

function ModelsList({ canLoad }: { canLoad: boolean }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.listAllGeneratedModels,
    canLoad ? {} : "skip",
    { initialNumItems: 16 },
  );

  if (!canLoad) {
    return null;
  }

  if (results.length === 0 && status === "LoadingFirstPage") {
    return (
      <p className="py-12 text-center text-sm text-[var(--muted)]">
        Loading models...
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-6 py-12 text-center sm:px-8">
        <h2 className="font-serif text-3xl font-semibold text-[var(--foreground)]">
          No generated models yet
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[var(--muted)]">
          When users complete generations, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {results.map((model) => (
          <ModelCard key={model._id} model={model as ModelRow} />
        ))}
      </div>

      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => loadMore(16)}
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

export default function AdminModelsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const adminStatus = useQuery(api.admin.adminStatus);

  const isAdmin = adminStatus?.isAdmin === true;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/signin?next=/admin");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-4xl font-semibold text-[var(--foreground)] sm:text-5xl">
              All models
            </h1>
            <p className="mt-2 text-base text-[var(--muted)] sm:text-lg">
              Every generated model across accounts (admin only).
            </p>
          </div>
          <Link
            href="/"
            className="btn-outline inline-flex w-full rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest sm:w-auto"
          >
            Back home
          </Link>
        </div>

        {isLoading || adminStatus === undefined ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            Checking access...
          </p>
        ) : !isAuthenticated ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            Redirecting to sign in...
          </p>
        ) : !isAdmin ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-6 py-12 text-center sm:px-8">
            <h2 className="font-serif text-2xl font-semibold text-[var(--foreground)]">
              Access denied
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[var(--muted)]">
              Your account is not listed in{" "}
              <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 font-mono text-sm">
                ADMIN_EMAILS
              </code>{" "}
              for this deployment.
            </p>
          </div>
        ) : (
          <ModelsList canLoad />
        )}
      </div>
    </main>
  );
}
