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

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="grain relative overflow-hidden rounded-3xl bg-[var(--paper)] p-6 shadow-[var(--shadow)] sm:p-8 lg:min-h-[680px] lg:p-12">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[rgba(22,101,52,0.06)] blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-[rgba(194,65,12,0.05)] blur-3xl" />
          <div className="absolute inset-y-0 right-0 hidden w-[42%] rounded-l-[4rem] bg-[var(--panel)] lg:block" />

          <div className="relative z-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
            <div className="max-w-3xl">
              <div className="animate-fade-up inline-flex items-center gap-2.5 rounded-full border border-[rgba(22,101,52,0.15)] bg-[rgba(22,101,52,0.06)] px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--sage)]">
                <span className="h-2 w-2 rounded-full bg-[var(--sage)]" />
                Prompt to print
              </div>

              <h1 className="animate-fade-up delay-1 mt-8 font-serif text-5xl font-semibold leading-[1.05] text-[var(--foreground)] sm:text-6xl lg:text-7xl">
                Your personal{" "}
                <span className="italic text-[var(--accent)]">print studio.</span>
              </h1>

              <p className="animate-fade-up delay-2 mt-6 max-w-xl font-serif text-xl leading-relaxed text-[var(--muted)]">
                Describe something you want to hold. We&rsquo;ll refine it,
                model it in 3D, and get you a quote to make it real.
              </p>

              <div className="animate-fade-up delay-3 mt-10 flex flex-wrap gap-3">
                <Link
                  href={createHref}
                  className="btn-copper rounded-full px-7 py-3.5 text-sm"
                >
                  Start creating
                </Link>
                <Link
                  href={ideasHref}
                  className="btn-outline rounded-full px-7 py-3.5 text-sm"
                >
                  Browse my ideas
                </Link>
              </div>
            </div>

            {/* Hero illustration */}
            <div className="animate-slide-right delay-2 relative mx-auto w-full max-w-[400px] lg:max-w-none">
              <div className="rotate-[2deg] rounded-2xl bg-white p-3.5 shadow-[var(--shadow-lg)] transition-transform duration-700 hover:rotate-0">
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gradient-to-b from-[var(--panel)] to-[var(--panel-strong)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(194,65,12,0.08),transparent_50%)]" />

                  <div className="absolute inset-x-6 top-8 rounded-xl border border-white/60 bg-white/80 p-4 shadow-[var(--shadow-sm)] backdrop-blur-sm">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--sage)]">
                      Current idea
                    </p>
                    <p className="mt-2.5 font-serif text-2xl leading-tight text-[var(--foreground)]">
                      Cherry blossom keepsake box.
                    </p>
                  </div>

                  <div className="absolute inset-x-6 bottom-6 rounded-xl border border-[var(--accent-glow)] bg-white/90 p-4 shadow-[var(--shadow-sm)] backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--accent)]">
                        Crafting your preview...
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sage)]">
                        75%
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-[rgba(22,101,52,0.1)]">
                      <div className="h-full w-3/4 rounded-full bg-[var(--sage)] transition-all duration-1000" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="animate-float absolute -right-2 -top-3 rounded-xl border border-[var(--line)] bg-white px-4 py-3 shadow-[var(--shadow)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--sage)]">
                  Saved
                </p>
                <p className="mt-1.5 font-serif text-lg font-semibold text-[var(--accent)]">
                  {isAuthenticated ? "Ready to revisit" : "Sign in to save"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature highlights */}
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Refine", desc: "Chat with AI to shape your rough idea into a precise, print-ready prompt." },
            { label: "Generate", desc: "Turn the refined prompt into a 3D model you can spin, inspect, and download." },
            { label: "Order", desc: "Choose a size, get an instant estimate, and request a real print quote." },
          ].map((feature, i) => (
            <div
              key={feature.label}
              className={`animate-fade-up craft-card p-5 ${i === 0 ? "delay-1" : i === 1 ? "delay-2" : "delay-3"}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
                {feature.label}
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">
                {feature.desc}
              </p>
            </div>
          ))}
        </section>
      </div>

      {/* Footer */}
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
