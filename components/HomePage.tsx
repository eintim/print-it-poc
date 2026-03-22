"use client";

import { useConvexAuth } from "convex/react";
import Link from "next/link";
import HomePromptToModel from "@/components/HomePromptToModel";
import SiteHeader from "@/components/SiteHeader";

const FLOW = [
  {
    step: "01",
    title: "Sketch",
    body: "Start from a rough idea or doodle-level description. We help you refine it into a prompt that’s ready to become geometry.",
    accent: "var(--accent)",
  },
  {
    step: "02",
    title: "3D Model",
    body: "We generate a model you can spin, inspect, and download — your sketch, now occupying real space on screen.",
    accent: "var(--sage)",
  },
  {
    step: "03",
    title: "Real product",
    body: "Pick a size, see an estimate, and request a quote. Bridge from pixels to something you can hold.",
    accent: "var(--accent)",
  },
] as const;

export default function HomePage() {
  const { isAuthenticated } = useConvexAuth();
  const createHref = "/create";
  const secondaryHref = isAuthenticated ? "/ideas" : "/showcase";
  const secondaryLabel = isAuthenticated ? "Browse my ideas" : "Show showcase";

  return (
    <main className="flex min-h-screen min-h-svh flex-col">
      <SiteHeader />

      <div className="mx-auto flex w-full max-w-[min(100%,90rem)] flex-col gap-10 px-4 pb-20 pt-2 sm:px-6 sm:pt-3 lg:gap-14 lg:px-8">
        {/* Hero — entire card stays within first viewport (header + safe area) */}
        <section className="grain relative max-h-[min(calc(100svh-4.25rem),calc(100dvh-4.25rem))] overflow-hidden rounded-2xl bg-[var(--paper)] p-3 shadow-[var(--shadow)] sm:p-4 lg:rounded-[1.75rem] lg:p-5 xl:p-6">
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[rgba(194,65,12,0.07)] blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-20%] right-[-8%] h-96 w-96 rounded-full bg-[rgba(93,64,43,0.055)] blur-3xl" />

          <div className="relative z-10 min-h-0 w-full">
            <div className="grid min-h-0 w-full grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-stretch lg:gap-6 xl:gap-8">
            <div className="flex min-h-0 min-w-0 flex-col justify-center gap-2.5 sm:gap-3 lg:max-w-xl lg:gap-4">
              <div className="animate-fade-up flex flex-wrap items-center gap-1.5">
                <span className="inline-flex rotate-[-2deg] items-center rounded-full border border-dashed border-[var(--line-strong)] bg-[var(--cream)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--foreground)] shadow-[var(--shadow-sm)]">
                  Sketch
                </span>
                <span className="text-sm font-black text-[var(--muted)]">→</span>
                <span className="inline-flex rotate-[1.5deg] items-center rounded-full border border-[rgba(22,101,52,0.2)] bg-[rgba(22,101,52,0.08)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--sage)]">
                  3D
                </span>
                <span className="text-sm font-black text-[var(--muted)]">→</span>
                <span className="inline-flex rotate-[-1deg] items-center rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_4px_14px_rgba(194,65,12,0.22)]">
                  Print
                </span>
              </div>

              <h1 className="animate-fade-up delay-1 font-serif text-2xl font-semibold leading-[1.12] tracking-tight text-[var(--foreground)] sm:text-3xl lg:text-[2.125rem] xl:text-4xl">
                From a rough sketch to a{" "}
                <span className="home-hero-3d-word">3D model</span> you can
                spin.
              </h1>

              <p className="animate-fade-up delay-2 text-sm leading-relaxed text-[var(--muted)] sm:text-[0.95rem]">
                Refine your prompt, preview geometry, then move toward a real
                print — no CAD required.
              </p>

              <div className="animate-fade-up delay-3 flex flex-wrap items-center gap-2.5">
                <Link
                  href={createHref}
                  className="btn-copper rounded-full px-6 py-2.5 text-sm font-bold shadow-[0_6px_18px_rgba(194,65,12,0.26)]"
                >
                  Start creating
                </Link>
                <Link
                  href={secondaryHref}
                  className="btn-outline rounded-full px-5 py-2.5 text-[13px] font-semibold"
                >
                  {secondaryLabel}
                </Link>
              </div>

              <p className="animate-fade-up delay-4 hidden text-xs font-medium leading-snug text-[var(--muted)] sm:block">
                {!isAuthenticated ? (
                  <>
                    <Link
                      href="/signin"
                      className="font-semibold text-[var(--foreground)] underline decoration-[var(--line-strong)] underline-offset-2 hover:text-[var(--accent)]"
                    >
                      Sign in
                    </Link>{" "}
                    to save ideas across sessions.
                  </>
                ) : (
                  "Your ideas sync automatically while you’re signed in."
                )}
              </p>
            </div>

            <div className="relative flex min-h-0 min-w-0 flex-col justify-center">
              <HomePromptToModel compact className="min-h-0 w-full max-w-full" />
            </div>
            </div>
          </div>
        </section>

        {/* Story strip */}
        <section
          className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-gradient-to-br from-[var(--paper)] via-[var(--cream)] to-[var(--panel)] px-5 py-8 sm:px-8 sm:py-10"
          aria-labelledby="home-flow-heading"
        >
          <div className="paper-texture pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative">
            <h2
              id="home-flow-heading"
              className="font-serif text-2xl font-semibold text-[var(--foreground)] sm:text-3xl"
            >
              How the magic is actually just{" "}
              <span className="italic text-[var(--accent)]">good steps</span>
            </h2>

            <ol className="mt-10 grid gap-5 lg:grid-cols-3">
              {FLOW.map((item, i) => (
                <li
                  key={item.step}
                  className={`animate-fade-up relative rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[var(--shadow-sm)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)] ${i === 0 ? "delay-1" : i === 1 ? "delay-2" : "delay-3"}`}
                >
                  <span
                    className="inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 font-mono text-xs font-bold text-white"
                    style={{ background: item.accent }}
                  >
                    {item.step}
                  </span>
                  <p className="mt-4 font-serif text-xl font-semibold text-[var(--foreground)]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    {item.body}
                  </p>
                  {i < FLOW.length - 1 && (
                    <span
                      className="pointer-events-none absolute -right-3 top-1/2 hidden -translate-y-1/2 text-2xl font-black text-[var(--line-strong)] lg:block"
                      aria-hidden
                    >
                      ↝
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      <footer className="border-t border-[var(--line)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl justify-center">
          <p className="text-center text-sm font-medium tracking-wide text-[var(--muted)]">
            Made with ❤️ during the Cursor Hackathon Heilbronn 🚀
          </p>
        </div>
      </footer>
    </main>
  );
}
