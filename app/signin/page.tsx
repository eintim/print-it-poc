"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const redirectTo = nextPath?.startsWith("/") ? nextPath : "/";

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="grid gap-6 rounded-[2.5rem] bg-white p-6 shadow-[var(--shadow)] lg:grid-cols-[minmax(0,1.05fr)_460px] lg:p-10">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--accent)]">
                Account
              </p>
              <h1
                className="mt-4 max-w-3xl text-5xl font-semibold leading-tight text-[var(--foreground)] sm:text-6xl"
                style={{ fontFamily: "var(--font-newsreader), serif" }}
              >
                {flow === "signIn"
                  ? "Sign in to keep building from where you left off."
                  : "Create an account to save every idea you refine."}
              </h1>
              <p
                className="mt-6 max-w-2xl text-xl leading-8 text-[var(--muted)]"
                style={{ fontFamily: "var(--font-newsreader), serif" }}
              >
                Save refinement sessions, generated models, and print quote
                requests in one workspace. Public pages stay open, and protected
                pages will bring you here when you need an account.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.75rem] bg-[var(--panel)] p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[var(--accent)]">
                  Refine
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  Shape a rough thought into a clearer, more printable concept.
                </p>
              </div>
              <div className="rounded-[1.75rem] bg-[var(--panel)] p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[var(--accent)]">
                  Generate
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  Preview the 3D model before moving on to production.
                </p>
              </div>
              <div className="rounded-[1.75rem] bg-[var(--panel)] p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[var(--accent)]">
                  Order
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  Keep quote requests and saved ideas connected to your account.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/"
                className="rounded-full border border-[rgba(186,176,164,0.42)] bg-[var(--paper)] px-5 py-3 font-bold text-[var(--foreground)] transition hover:bg-[var(--cream)]"
              >
                Back to home
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-[rgba(186,176,164,0.42)] bg-[var(--paper)] px-5 py-3 font-bold text-[var(--foreground)] transition hover:bg-[var(--cream)]"
              >
                About Print It 2
              </Link>
            </div>
          </div>

          <form
            className="paper-texture flex flex-col gap-4 rounded-[2.25rem] bg-[var(--panel)] p-6 lg:p-8"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError(null);
              const formData = new FormData(e.target as HTMLFormElement);
              formData.set("flow", flow);
              try {
                await signIn("password", formData);
                router.push(redirectTo);
              } catch (error) {
                setError(error instanceof Error ? error.message : "Sign in failed.");
                setLoading(false);
              }
            }}
          >
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[var(--accent)]">
                {flow === "signIn" ? "Welcome back" : "New workspace"}
              </p>
              <h2
                className="mt-2 text-4xl font-semibold text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-newsreader), serif" }}
              >
                {flow === "signIn" ? "Sign in" : "Create account"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                {redirectTo === "/"
                  ? "Use your account to pick up saved work and manage your quote requests."
                  : `Sign in to continue to ${redirectTo}.`}
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
              Email
              <input
                className="rounded-[1.5rem] border border-[rgba(186,176,164,0.36)] bg-white px-4 py-3 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)]/70 focus:border-[rgba(165,60,44,0.35)]"
                type="email"
                name="email"
                placeholder="you@example.com"
                required
              />
            </label>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Password
              </label>
              <input
                className="rounded-[1.5rem] border border-[rgba(186,176,164,0.36)] bg-white px-4 py-3 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)]/70 focus:border-[rgba(165,60,44,0.35)]"
                type="password"
                name="password"
                placeholder="Enter your password"
                minLength={8}
                required
              />
              {flow === "signUp" ? (
                <p className="px-1 text-xs text-[var(--muted)]">
                  Password must be at least 8 characters.
                </p>
              ) : null}
            </div>

            <button
              className="rounded-full px-5 py-3 text-sm font-extrabold uppercase tracking-[0.16em] text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--accent-soft), var(--accent))" }}
              type="submit"
              disabled={loading}
            >
              {loading
                ? flow === "signIn"
                  ? "Signing in..."
                  : "Creating account..."
                : flow === "signIn"
                  ? "Sign in"
                  : "Create account"}
            </button>

            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <span className="text-[var(--muted)]">
                {flow === "signIn"
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </span>
              <button
                type="button"
                className="font-medium text-[var(--accent)] underline decoration-2 underline-offset-2 hover:no-underline"
                onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
              >
                {flow === "signIn" ? "Sign up" : "Sign in"}
              </button>
            </div>

            {error ? (
              <div className="rounded-[1.75rem] border border-[#e2b0a8] bg-[#fff2ef] p-4">
                <p className="break-words text-sm font-medium text-[#b54b4b]">
                  Error: {error}
                </p>
              </div>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  );
}
