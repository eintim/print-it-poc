"use client";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SiteHeader from "@/components/SiteHeader";

type OrderRow = Doc<"printOrders"> & {
  sessionTitle: string;
  modelPrompt: string;
  thumbnailUrl: string | null;
};

function orderStatusLabel(status: OrderRow["status"]) {
  switch (status) {
    case "requested":
      return "Quote requested";
    default:
      return status;
  }
}

function sizeLabel(size: OrderRow["size"]) {
  switch (size) {
    case "small":
      return "Small";
    case "medium":
      return "Medium";
    case "large":
      return "Large";
    default:
      return size;
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

function OrderCard({ order }: { order: OrderRow }) {
  const promptPreview =
    order.modelPrompt.trim().slice(0, 140) +
    (order.modelPrompt.length > 140 ? "…" : "");

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)] sm:flex-row">
      {order.thumbnailUrl ? (
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[var(--panel)] sm:aspect-auto sm:h-auto sm:w-44 md:w-52">
          <Image
            src={order.thumbnailUrl}
            alt={order.sessionTitle}
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
            {order.sessionTitle}
          </h2>
          {promptPreview ? (
            <p
              className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
              }}
            >
              {promptPreview}
            </p>
          ) : null}
        </div>

        <dl className="grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              Size &amp; height
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--foreground)]">
              {sizeLabel(order.size)} · {order.targetHeightMm} mm
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              Status
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--foreground)]">
              {orderStatusLabel(order.status)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              Ship to
            </dt>
            <dd className="mt-0.5 line-clamp-2 font-medium text-[var(--foreground)]">
              {order.contactName} · {order.email}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(186,176,164,0.18)] pt-3">
          <span className="text-xs text-[var(--muted)] opacity-80">
            Requested {timeAgo(order._creationTime)}
          </span>
          <Link
            href={`/create?sessionId=${order.sessionId}`}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Open in workspace
          </Link>
        </div>
      </div>
    </article>
  );
}

function OrdersList() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.app.listMyPrintOrders,
    {},
    { initialNumItems: 12 },
  );

  if (results.length === 0 && status === "LoadingFirstPage") {
    return (
      <p className="py-12 text-center text-sm text-[var(--muted)]">
        Loading your orders...
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-6 py-12 text-center sm:px-8">
        <h2 className="font-serif text-3xl font-semibold text-[var(--foreground)]">
          No print orders yet
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[var(--muted)]">
          When you request a quote from the workspace, it will show up here with
          size, shipping details, and a link back to the idea.
        </p>
        <Link
          href="/create"
          className="btn-copper mt-6 inline-flex rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest"
        >
          Go to create
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {results.map((order) => (
          <OrderCard key={order._id} order={order} />
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

export default function MyOrdersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/signin?next=/orders");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-4xl font-semibold text-[var(--foreground)] sm:text-5xl">
              My Orders
            </h1>
            <p className="mt-2 text-base text-[var(--muted)] sm:text-lg">
              Print quote requests tied to your account.
            </p>
          </div>
          <Link
            href="/create"
            className="btn-copper inline-flex w-full rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest sm:w-auto"
          >
            New quote
          </Link>
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            Checking your account...
          </p>
        ) : isAuthenticated ? (
          <OrdersList />
        ) : (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            Redirecting to sign in...
          </p>
        )}
      </div>
    </main>
  );
}
