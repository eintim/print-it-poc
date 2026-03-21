"use client";

import { useConvexAuth } from "convex/react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

const FEATURE_CARDS = [
  {
    eyebrow: "Refine",
    title: "Start with a rough thought",
    copy:
      "Describe what you want to print and let the app shape it into a clearer, more printable idea.",
  },
  {
    eyebrow: "Generate",
    title: "Preview the 3D model",
    copy:
      "Once the prompt is ready, generate a model preview, review the geometry, and size it for printing.",
  },
  {
    eyebrow: "Order",
    title: "Request the finished print",
    copy:
      "Move from idea to quote request in one flow, with your refinement history saved to your workspace.",
  },
];

export default function HomePage() {
  const { isAuthenticated } = useConvexAuth();
  const createHref = isAuthenticated ? "/create" : "/signin?next=/create";
  const ideasHref = isAuthenticated ? "/ideas" : "/signin?next=/ideas";

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="grid gap-6 rounded-[2.25rem] bg-white p-6 shadow-[0_24px_70px_rgba(93,64,43,0.08)] lg:grid-cols-[minmax(0,1.2fr)_360px] lg:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
              Home page
            </p>
            <h1
              className="mt-4 max-w-3xl text-5xl font-semibold leading-tight text-[var(--foreground)] sm:text-6xl"
              style={{ fontFamily: "var(--font-newsreader), serif" }}
            >
              Turn an idea into a printable 3D model.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Print It 2 helps your team move from a first concept to a refined
              prompt, a generated model, and a print-ready order request.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={createHref}
                className="rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-soft))] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Create a new idea
              </Link>
              <Link
                href={ideasHref}
                className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white"
              >
                View my ideas
              </Link>
            </div>
          </div>

          <div className="space-y-4 rounded-[1.75rem] bg-[var(--panel)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Why it helps
            </p>
            <div className="rounded-[1.5rem] bg-white p-5">
              <p
                className="text-2xl font-semibold text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-newsreader), serif" }}
              >
                A clearer path from prompt to print
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                The home page is now focused on a single action: start creating.
                Logged-in users can jump back into saved ideas from the new
                dashboard at any time.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] px-5 py-4 text-sm leading-7 text-[var(--muted)]">
              {isAuthenticated
                ? "You are signed in, so your next idea will be saved to your workspace."
                : "Sign in to keep a history of your ideas and come back to them later."}
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {FEATURE_CARDS.map((card) => (
            <article key={card.title} className="rounded-[1.75rem] bg-[var(--panel)] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                {card.eyebrow}
              </p>
              <h2
                className="mt-3 text-3xl font-semibold text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-newsreader), serif" }}
              >
                {card.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                {card.copy}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
