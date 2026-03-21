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
        <section className="grain grid gap-6 overflow-hidden rounded-3xl bg-[var(--paper)] p-6 shadow-[var(--shadow)] lg:grid-cols-[minmax(0,1fr)_420px] lg:p-10">
          <div className="flex flex-col justify-between gap-8">
            <div className="animate-fade-up">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                Account
              </p>
              <h1 className="mt-4 max-w-3xl font-serif text-5xl font-semibold leading-[1.1] text-[var(--foreground)] sm:text-6xl">
                {flow === "signIn"
                  ? "Sign in to keep building from where you left off."
                  : "Create an account to save every idea you refine."}
              </h1>
              <p className="mt-6 max-w-2xl font-serif text-xl leading-8 text-[var(--muted)]">
                Save refinement sessions, generated models, and print quote
                requests in one workspace.
              </p>
            </div>

            <div className="animate-fade-up delay-2 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Refine", desc: "Shape a rough thought into a clearer, more printable concept." },
                { label: "Generate", desc: "Preview the 3D model before moving on to production." },
                { label: "Order", desc: "Keep quote requests and saved ideas connected to your account." },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-[var(--panel)] p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/" className="btn-outline rounded-full px-5 py-2.5">
                Back to home
              </Link>
              <Link href="/about" className="btn-outline rounded-full px-5 py-2.5">
                About Print It
              </Link>
            </div>
          </div>

          <form
            className="animate-slide-right delay-1 flex flex-col gap-4 rounded-2xl bg-[var(--panel)] p-6 paper-texture lg:p-8"
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
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
                {flow === "signIn" ? "Welcome back" : "New workspace"}
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-[var(--foreground)]">
                {flow === "signIn" ? "Sign in" : "Create account"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {redirectTo === "/"
                  ? "Use your account to pick up saved work and manage your quote requests."
                  : `Sign in to continue to ${redirectTo}.`}
              </p>
            </div>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--foreground)]">
              Email
              <input
                className="studio-input rounded-xl"
                type="email"
                name="email"
                placeholder="you@example.com"
                required
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Password
              </label>
              <input
                className="studio-input rounded-xl"
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
              className="btn-copper rounded-full py-3 text-sm"
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
                className="font-semibold text-[var(--accent)] underline decoration-[var(--accent)]/30 decoration-2 underline-offset-2 transition hover:decoration-[var(--accent)]"
                onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
              >
                {flow === "signIn" ? "Sign up" : "Sign in"}
              </button>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  );
}
