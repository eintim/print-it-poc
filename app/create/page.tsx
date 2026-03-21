"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopNavBar from "@/components/ui/TopNavBar";
import BottomNavBar from "@/components/ui/BottomNavBar";

/* ── Stream helpers (shared with WorkspaceClient) ─────────── */

type StreamEvent =
  | { type: "session"; sessionId: string }
  | { type: "token"; value: string }
  | {
      type: "final";
      sessionId: string;
      assistantMessage: string;
      readyToGenerate: boolean;
      latestPrompt: string;
      canonicalPrompt: string | null;
      tips: string[];
      title: string;
    }
  | { type: "error"; error: string };

async function readNdjsonStream(
  response: Response,
  onEvent: (event: StreamEvent) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Streaming is not available in this browser.");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let idx = buffer.indexOf("\n");
    while (idx >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      idx = buffer.indexOf("\n");
      if (line) onEvent(JSON.parse(line) as StreamEvent);
    }
  }
}

/* ── Default suggestions when the AI hasn't provided any yet ─ */

const DEFAULT_SUGGESTIONS = [
  "Make the silhouette cleaner and easier to print.",
  "Add a friendly expression and rounded details.",
  "Specify the pose, material feel, and finishing style.",
  "Keep overhangs gentle so the model prints reliably.",
];

/* ── Page Component ──────────────────────────────────────── */

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSessionId = searchParams.get("sessionId") as Id<"refinementSessions"> | null;

  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

  /* Session & chat state */
  const [selectedSessionId, setSelectedSessionId] =
    useState<Id<"refinementSessions"> | null>(urlSessionId);
  const [chatInput, setChatInput] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  /* Convex workspace query */
  const rawWorkspace = useQuery(api.app.getWorkspace, {
    sessionId: selectedSessionId,
  });
  const [cachedWorkspace, setCachedWorkspace] = useState<typeof rawWorkspace>(undefined);

  useEffect(() => {
    if (rawWorkspace !== undefined) setCachedWorkspace(rawWorkspace);
  }, [rawWorkspace]);

  const workspace = rawWorkspace ?? cachedWorkspace;

  /* Derived state */
  const activeSession = workspace?.selectedSession ?? null;
  const chatMessages = useMemo(
    () => workspace?.selectedMessages ?? [],
    [workspace?.selectedMessages],
  );
  const canGenerate =
    activeSession !== null &&
    (activeSession.status === "ready" || activeSession.status === "generated") &&
    !!(activeSession.canonicalPrompt ?? activeSession.latestPrompt);
  const currentPrompt =
    activeSession?.canonicalPrompt ?? activeSession?.latestPrompt ?? "";

  const tips = useMemo(() => {
    const last = [...(workspace?.selectedMessages ?? [])]
      .reverse()
      .find((m) => m.role === "assistant");
    return last?.tips ?? [];
  }, [workspace?.selectedMessages]);

  const promptSuggestions = tips.length > 0 ? tips : DEFAULT_SUGGESTIONS;

  /* Auth redirect */
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/signin?next=/create");
    }
  }, [authLoading, isAuthenticated, router]);

  /* Sync URL → state when navigating with a sessionId */
  useEffect(() => {
    if (urlSessionId && urlSessionId !== selectedSessionId) {
      setSelectedSessionId(urlSessionId);
      setChatInput("");
      setPendingUserMessage(null);
      setStreamingResponse("");
      setRequestError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSessionId]);

  /* Auto-scroll chat on new content */
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chatMessages, streamingResponse, pendingUserMessage]);

  /* Clear optimistic user message once it appears from Convex */
  useEffect(() => {
    if (!pendingUserMessage || chatMessages.length === 0) return;
    const lastUser = [...chatMessages].reverse().find((m) => m.role === "user");
    if (lastUser?.content === pendingUserMessage) setPendingUserMessage(null);
  }, [chatMessages, pendingUserMessage]);

  /* ── Handlers ──────────────────────────────────────────── */

  const handleRefine = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) {
      setRequestError("Type a message before sending.");
      return;
    }

    setIsRefining(true);
    setChatInput("");
    setPendingUserMessage(trimmed);
    setStreamingResponse("");
    setRequestError(null);

    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession?._id ?? null,
          message: trimmed,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Refinement failed.");
      }

      await readNdjsonStream(response, (event) => {
        if (event.type === "session") {
          const newId = event.sessionId as Id<"refinementSessions">;
          setSelectedSessionId(newId);
          window.history.replaceState(null, "", `/create?sessionId=${newId}`);
        }
        if (event.type === "token") {
          setStreamingResponse((c) => c + event.value);
        }
        if (event.type === "error") {
          setRequestError(event.error);
        }
        if (event.type === "final") {
          setPendingUserMessage(null);
          setStreamingResponse("");
        }
      });
    } catch (error) {
      setChatInput(trimmed);
      setPendingUserMessage(null);
      setRequestError(
        error instanceof Error ? error.message : "Refinement failed.",
      );
    } finally {
      setIsRefining(false);
    }
  }, [activeSession?._id, chatInput]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setChatInput((c) => (c.trim() ? `${c.trim()} ${suggestion}` : suggestion));
  }, []);

  const handleStartOver = useCallback(() => {
    setSelectedSessionId(null);
    setChatInput("");
    setPendingUserMessage(null);
    setStreamingResponse("");
    setRequestError(null);
    window.history.replaceState(null, "", "/create");
  }, []);

  /* ── Loading / auth guard ──────────────────────────────── */

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface">
        <TopNavBar />
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-5xl text-outline animate-spin">
              progress_activity
            </span>
            <p className="font-jakarta text-lg text-on-surface-variant">
              Loading workspace...
            </p>
          </div>
        </div>
        <BottomNavBar />
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-surface">
      <TopNavBar />

      <main className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12">
        {/* ── Main chat column ──────────────────────────── */}
        <section className="flex-1 flex flex-col gap-6">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-jakarta text-4xl font-extrabold tracking-tight text-on-background mb-2">
                Idea Creation Studio
              </h1>
              <p className="font-body text-xl italic text-on-surface-variant">
                Describe your dream object, and let&apos;s bring it to life
                together.
              </p>
            </div>
            {activeSession && (
              <button
                type="button"
                onClick={handleStartOver}
                className="shrink-0 px-5 py-2.5 rounded-full border border-outline-variant/30 font-jakarta font-bold text-sm text-on-surface hover:bg-surface-container transition-all active:scale-95"
              >
                Start Over
              </button>
            )}
          </header>

          {/* Chat panel */}
          <div className="bg-surface-container rounded-xl flex flex-col min-h-[560px] shadow-sm relative overflow-hidden">
            {/* Messages area */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-5"
            >
              {/* Empty state */}
              {chatMessages.length === 0 &&
                !streamingResponse &&
                !pendingUserMessage && (
                  <div className="flex items-center justify-center h-full min-h-[300px]">
                    <div className="text-center max-w-md space-y-4">
                      <div className="w-16 h-16 bg-secondary-container rounded-full flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-on-secondary-container text-3xl">
                          auto_awesome
                        </span>
                      </div>
                      <p className="font-body text-lg text-on-surface-variant italic leading-relaxed">
                        Start with a rough idea — describe what you want to
                        print and the assistant will shape it into a clearer,
                        more printable prompt.
                      </p>
                    </div>
                  </div>
                )}

              {/* Persisted messages */}
              {chatMessages.map((message) =>
                message.role === "system" ? null : (
                  <div
                    key={message._id}
                    className={`flex gap-3 ${
                      message.role === "user"
                        ? "flex-row-reverse max-w-[85%] ml-auto"
                        : "max-w-[85%]"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        message.role === "user"
                          ? "bg-primary-container"
                          : "bg-secondary-container"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-base ${
                          message.role === "user"
                            ? "text-on-primary-container"
                            : "text-on-secondary-container"
                        }`}
                      >
                        {message.role === "user" ? "person" : "auto_awesome"}
                      </span>
                    </div>
                    <div
                      className={`p-5 rounded-xl shadow-sm ${
                        message.role === "user"
                          ? "bg-primary text-white rounded-tr-none"
                          : "bg-surface-container-lowest rounded-tl-none"
                      }`}
                    >
                      <p className="font-body text-[15px] leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ),
              )}

              {/* Optimistic user message */}
              {pendingUserMessage && (
                <div className="flex gap-3 flex-row-reverse max-w-[85%] ml-auto">
                  <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-base text-on-primary-container">
                      person
                    </span>
                  </div>
                  <div className="bg-primary text-white p-5 rounded-xl rounded-tr-none shadow-sm">
                    <p className="font-body text-[15px] leading-relaxed whitespace-pre-wrap">
                      {pendingUserMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Streaming assistant response */}
              {streamingResponse && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-base text-on-secondary-container">
                      auto_awesome
                    </span>
                  </div>
                  <div className="bg-surface-container-lowest p-5 rounded-xl rounded-tl-none shadow-sm">
                    <p className="font-body text-[15px] leading-relaxed whitespace-pre-wrap">
                      {streamingResponse}
                      <span className="inline-block w-2 h-4 ml-1 bg-primary/60 rounded-sm animate-pulse" />
                    </p>
                  </div>
                </div>
              )}

              {/* Typing indicator (refining but no tokens yet) */}
              {isRefining && !streamingResponse && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-base text-on-secondary-container">
                      auto_awesome
                    </span>
                  </div>
                  <div className="bg-surface-container-lowest px-5 py-4 rounded-xl rounded-tl-none shadow-sm">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error banner */}
            {requestError && (
              <div className="mx-6 mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">
                  error
                </span>
                {requestError}
              </div>
            )}

            {/* Input area */}
            <div className="p-4 border-t border-outline-variant/15">
              <div className="relative">
                <textarea
                  className="w-full bg-surface-container-low border-none rounded-xl py-4 pl-5 pr-14 font-body text-base focus:ring-2 focus:ring-primary-container resize-none"
                  placeholder="Describe your idea or refine your design..."
                  rows={2}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleRefine();
                    }
                  }}
                  disabled={isRefining}
                />
                <button
                  type="button"
                  onClick={() => void handleRefine()}
                  disabled={isRefining || !chatInput.trim()}
                  className="absolute right-3 bottom-3 w-10 h-10 bg-primary text-white rounded-[0.75rem] flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-xl">
                    send
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Right sidebar ─────────────────────────────── */}
        <aside className="w-full md:w-80 flex flex-col gap-8">
          {/* Prompt suggestions */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                tips_and_updates
              </span>
              <h3 className="font-jakarta font-bold text-lg">
                Prompt Suggestions
              </h3>
            </div>
            <div className="space-y-2.5">
              {promptSuggestions.map((txt) => (
                <button
                  key={txt}
                  type="button"
                  onClick={() => handleSuggestionClick(txt)}
                  className="w-full text-left bg-surface-container-lowest p-4 rounded-[1rem] border border-outline-variant/15 hover:bg-white hover:shadow-md transition-all text-sm font-body leading-relaxed"
                >
                  {txt}
                </button>
              ))}
            </div>
          </div>

          {/* Current prompt status */}
          <div className="bg-surface-container rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-jakarta font-bold uppercase tracking-widest text-on-surface-variant">
                Refined Prompt
              </p>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-jakarta font-bold uppercase tracking-wider ${
                  canGenerate
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-outline/10 text-on-surface-variant"
                }`}
              >
                {canGenerate ? "Ready" : "Draft"}
              </span>
            </div>
            <p className="text-sm font-body text-on-surface leading-relaxed">
              {currentPrompt ||
                "The assistant\u2019s refined prompt will appear here as you chat."}
            </p>
          </div>

          {/* CTA button */}
          <div className="mt-auto">
            {canGenerate ? (
              <Link
                href={`/old/create?sessionId=${selectedSessionId}`}
                className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-white font-jakarta font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Generate 3D Model
                <span className="material-symbols-outlined">
                  chevron_right
                </span>
              </Link>
            ) : (
              <div className="w-full h-14 bg-surface-container-high text-on-surface-variant font-jakarta font-bold text-base rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                <span className="material-symbols-outlined text-lg">chat</span>
                Keep chatting to finalize
              </div>
            )}
          </div>
        </aside>
      </main>

      <BottomNavBar />
    </div>
  );
}
