"use client";

import type { Id } from "@/convex/_generated/dataModel";
import WorkspaceClient from "@/components/WorkspaceClient";
import SiteHeader from "@/components/SiteHeader";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const sessionId = searchParams.get("sessionId") as Id<"refinementSessions"> | null;
  const [resetVersion, setResetVersion] = useState(0);
  const [forcedSessionId, setForcedSessionId] = useState<Id<"refinementSessions"> | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (sessionId === null) {
      setForcedSessionId(undefined);
    }
  }, [sessionId]);

  const handleStartOver = useCallback(() => {
    setForcedSessionId(null);
    setResetVersion((current) => current + 1);
    router.replace("/create");
  }, [router]);

  if (isLoading) {
    return (
      <main className="min-h-screen">
        <SiteHeader />
        <p className="py-24 text-center text-sm text-[var(--muted)]">Checking your account…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen">
        <SiteHeader />

        <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16 sm:px-6 sm:py-20">
          <div className="grain rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-8 shadow-[var(--shadow)] sm:p-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              Create
            </p>
            <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Sign in to create something
            </h1>
            <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
              Refining prompts, generating 3D models, and saving your work all need an account. Sign in
              (or create one) to open the studio.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/signin?next=/create"
                className="btn-copper inline-flex justify-center rounded-full px-8 py-3 text-center text-sm font-bold uppercase tracking-widest"
              >
                Sign in
              </Link>
              <Link
                href="/showcase"
                className="btn-outline inline-flex justify-center rounded-full px-8 py-3 text-center text-sm font-semibold"
              >
                View showcase
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <WorkspaceClient
      initialSessionId={forcedSessionId === undefined ? sessionId : forcedSessionId}
      resetVersion={resetVersion}
      onStartOver={handleStartOver}
    />
  );
}
