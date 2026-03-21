"use client";

import { useConvexAuth } from "convex/react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export default function HomePage() {
  const { isAuthenticated } = useConvexAuth();
  const createHref = isAuthenticated ? "/create" : "/signin?next=/create";
  const ideasHref = isAuthenticated ? "/ideas" : "/signin?next=/ideas";

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2.5rem] px-6 py-8 sm:px-8 lg:min-h-[720px] lg:px-12 lg:py-14">
          <div className="paper-texture absolute inset-0 rounded-[2.5rem] bg-[var(--background)]" />
          <div className="absolute inset-y-0 right-0 hidden w-[46%] rounded-l-[5rem] bg-[rgba(246,236,225,0.8)] lg:block" />
          <div className="absolute -left-16 top-0 h-72 w-72 rounded-full bg-[rgba(200,235,209,0.4)] blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-60 w-60 rounded-full bg-[rgba(253,125,104,0.12)] blur-3xl" />

          <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(71,102,82,0.1)] px-4 py-2 text-sm font-semibold text-[var(--sage)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--sage)]" />
                Gift-worthy ideas
              </div>
              <h1
                className="mt-8 text-5xl font-semibold leading-[1.02] text-[var(--foreground)] sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "var(--font-newsreader), serif" }}
              >
                Your personal{" "}
                <span className="text-[var(--accent)] italic">print studio.</span>
              </h1>
              <p
                className="mt-6 max-w-2xl text-xl leading-8 text-[var(--muted)]"
                style={{ fontFamily: "var(--font-newsreader), serif" }}
              >
                Turn a rough thought into something printable.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href={createHref}
                  className="rounded-full px-7 py-4 text-base font-bold text-white shadow-[0_18px_40px_rgba(165,60,44,0.22)] transition hover:brightness-105"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-soft))" }}
                >
                  Start creating
                </Link>
                <Link
                  href={ideasHref}
                  className="rounded-full border border-[rgba(130,121,110,0.36)] bg-white px-7 py-4 text-base font-bold text-[var(--foreground)] transition hover:bg-[var(--cream)]"
                >
                  Browse my ideas
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none">
              <div className="rotate-[3deg] rounded-[2rem] bg-white p-4 shadow-[0_28px_70px_rgba(93,64,43,0.12)] transition duration-500 hover:rotate-0">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-[linear-gradient(180deg,#f8eadf_0%,#e8d8c9_100%)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(253,125,104,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(71,102,82,0.18),transparent_28%)]" />
                  <div className="absolute inset-x-8 top-10 rounded-[1.5rem] border border-white/70 bg-white/72 p-5 shadow-[0_20px_40px_rgba(93,64,43,0.08)] backdrop-blur">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--sage)]">
                      Current idea
                    </p>
                    <p
                      className="mt-3 text-3xl leading-tight text-[var(--foreground)]"
                      style={{ fontFamily: "var(--font-newsreader), serif" }}
                    >
                      Cherry blossom keepsake box.
                    </p>
                  </div>
                  <div className="absolute inset-x-8 bottom-8 rounded-[1.5rem] border border-[rgba(165,60,44,0.1)] bg-white/90 p-5 shadow-[0_20px_40px_rgba(93,64,43,0.08)] backdrop-blur">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--accent)]">
                        Crafting your preview...
                      </span>
                      <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--sage)]">
                        75%
                      </span>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-[rgba(71,102,82,0.14)]">
                      <div className="h-full w-3/4 rounded-full bg-[var(--sage)]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-3 -top-4 rounded-[1.5rem] border border-[rgba(130,121,110,0.2)] bg-white px-5 py-4 shadow-[0_20px_45px_rgba(93,64,43,0.08)]">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--sage)]">
                  Saved
                </p>
                <p
                  className="mt-2 text-xl font-semibold text-[var(--accent)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  {isAuthenticated ? "Ready to revisit" : "Sign in to keep them"}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-[rgba(186,176,164,0.25)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <p
            className="text-3xl font-black italic text-[var(--accent)]"
            style={{ fontFamily: "var(--font-newsreader), serif" }}
          >
            Print It
          </p>
          <div className="flex flex-wrap gap-5 text-sm font-semibold text-[var(--muted)]">
            <Link href="/about" className="transition hover:text-[var(--accent)]">
              Our story
            </Link>
            <Link href={ideasHref} className="transition hover:text-[var(--accent)]">
              Saved ideas
            </Link>
            <Link href={createHref} className="transition hover:text-[var(--accent)]">
              Start creating
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
