"use client";

import { useAuthActions } from "@convex-dev/auth/react";
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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#15203d,_#020617_55%)] px-4">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_480px]">
        <div className="hidden rounded-[2rem] border border-white/10 bg-white/5 p-10 lg:block">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Print It 2
          </p>
          <h1 className="mt-4 text-5xl font-semibold text-white">
            Turn a prompt into a printable 3D model.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Refine the idea with a backend agent, generate the model through
            Meshy, preview it in 3D, and submit a print quote request.
          </p>
          <div className="mt-10 space-y-4 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              Prompt coaching stays streamable in Next route handlers.
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              Convex handles auth, session history, generated models, and orders.
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              Meshy powers the prompt-to-3D generation pipeline.
            </div>
          </div>
        </div>
      <form
        className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-2xl"
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
        <div className="mb-2">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Account
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            {flow === "signIn" ? "Welcome back" : "Create your workspace"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to save refinement sessions, generated models, and print
            quote requests.
          </p>
        </div>
        <input
          className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-white outline-none transition-all placeholder:text-slate-500"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <div className="flex flex-col gap-1">
          <input
            className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-white outline-none transition-all placeholder:text-slate-500"
            type="password"
            name="password"
            placeholder="Password"
            minLength={8}
            required
          />
          {flow === "signUp" && (
            <p className="px-1 text-xs text-slate-500">
              Password must be at least 8 characters
            </p>
          )}
        </div>
        <button
          className="cursor-pointer rounded-2xl bg-cyan-400 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          type="submit"
          disabled={loading}
        >
          {loading ? "Loading..." : flow === "signIn" ? "Sign in" : "Sign up"}
        </button>
        <div className="flex flex-row justify-center gap-2 text-sm">
          <span className="text-slate-400">
            {flow === "signIn"
              ? "Don't have an account?"
              : "Already have an account?"}
          </span>
          <span
            className="cursor-pointer font-medium text-cyan-200 underline decoration-2 underline-offset-2 hover:no-underline"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up" : "Sign in"}
          </span>
        </div>
        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
            <p className="break-words text-sm font-medium text-rose-300">
              Error: {error}
            </p>
          </div>
        )}
      </form>
      </div>
    </div>
  );
}
