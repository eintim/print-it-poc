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

  const subtitle =
    redirectTo === "/"
      ? "Access saved work and orders."
      : `Continue to ${redirectTo}`;

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16">
        <section className="grain overflow-hidden rounded-3xl bg-[var(--paper)] p-6 shadow-[var(--shadow)] sm:p-8">
          <form
            className="flex flex-col gap-5 paper-texture"
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
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
                {flow === "signIn" ? "Sign in" : "Create account"}
              </h1>
              <p className="mt-1.5 text-sm text-[var(--muted)]">{subtitle}</p>
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
              <label className="text-sm font-medium text-[var(--foreground)]">Password</label>
              <input
                className="studio-input rounded-xl"
                type="password"
                name="password"
                placeholder="••••••••"
                minLength={8}
                required
              />
              {flow === "signUp" ? (
                <p className="px-1 text-xs text-[var(--muted)]">At least 8 characters.</p>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            ) : null}

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

            <div className="flex flex-wrap items-center justify-center gap-1.5 text-sm">
              <span className="text-[var(--muted)]">
                {flow === "signIn" ? "No account?" : "Have an account?"}
              </span>
              <button
                type="button"
                className="font-semibold text-[var(--accent)] underline decoration-[var(--accent)]/30 decoration-2 underline-offset-2 transition hover:decoration-[var(--accent)]"
                onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
              >
                {flow === "signIn" ? "Sign up" : "Sign in"}
              </button>
            </div>
          </form>
        </section>

        <p className="text-center text-sm text-[var(--muted)]">
          <Link href="/" className="text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-4 hover:decoration-[var(--accent)]">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
