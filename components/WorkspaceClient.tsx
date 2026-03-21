"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import ModelViewer from "@/components/ModelViewer";
import PrintOrderForm from "@/components/PrintOrderForm";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type ViewerBounds = {
  width: number;
  height: number;
  depth: number;
} | null;

function jobLabel(status: string) {
  switch (status) {
    case "preview_pending":
      return "Building preview mesh";
    case "refine_pending":
      return "Texturing final model";
    case "succeeded":
      return "Model ready";
    case "failed":
      return "Generation failed";
    default:
      return status;
  }
}

async function readNdjsonStream(
  response: Response,
  onEvent: (event: StreamEvent) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming is not available in this browser.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    let newlineIndex = buffer.indexOf("\n");

    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      newlineIndex = buffer.indexOf("\n");

      if (!line) {
        continue;
      }

      onEvent(JSON.parse(line) as StreamEvent);
    }
  }
}

export default function WorkspaceClient() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [selectedSessionId, setSelectedSessionId] =
    useState<Id<"refinementSessions"> | null>(null);
  const [creatingNewSession, setCreatingNewSession] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [pollJobId, setPollJobId] = useState<Id<"generationJobs"> | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<{
    status: string;
    progress: number;
  } | null>(null);
  const [viewerBounds, setViewerBounds] = useState<ViewerBounds>(null);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);

  const resetTransientState = useCallback(() => {
    setChatInput("");
    setPendingUserMessage(null);
    setStreamingResponse("");
    setRequestError(null);
    setPollJobId(null);
    setPollError(null);
    setJobProgress(null);
    setViewerBounds(null);
    setOrderMessage(null);
  }, []);

  const rawWorkspace = useQuery(api.app.getWorkspace, {
    sessionId: selectedSessionId,
  });
  const [cachedWorkspace, setCachedWorkspace] = useState<typeof rawWorkspace>(undefined);

  useEffect(() => {
    if (rawWorkspace !== undefined) {
      setCachedWorkspace(rawWorkspace);
    }
  }, [rawWorkspace]);

  const workspace = rawWorkspace ?? cachedWorkspace;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/signin");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!creatingNewSession && !selectedSessionId && workspace?.selectedSession?._id) {
      setSelectedSessionId(workspace.selectedSession._id);
    }
  }, [creatingNewSession, selectedSessionId, workspace?.selectedSession?._id]);

  useEffect(() => {
    if (
      creatingNewSession &&
      selectedSessionId &&
      rawWorkspace?.selectedSession?._id === selectedSessionId
    ) {
      setCreatingNewSession(false);
    }
  }, [creatingNewSession, rawWorkspace?.selectedSession?._id, selectedSessionId]);

  useEffect(() => {
    const currentJob = workspace?.currentJob;
    if (!currentJob) {
      setPollJobId(null);
      setJobProgress(null);
      return;
    }
    if (
      currentJob.status === "preview_pending" ||
      currentJob.status === "refine_pending"
    ) {
      setPollJobId(currentJob._id);
      setJobProgress({
        status: currentJob.status,
        progress: currentJob.progress,
      });
    }
  }, [workspace?.currentJob]);

  useEffect(() => {
    if (!pollJobId) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/api/models/${pollJobId}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Could not refresh the Meshy job.");
        }

        if (cancelled) {
          return;
        }

        setPollError(null);
        setJobProgress({
          status: data.job.status,
          progress: data.job.progress,
        });

        if (data.job.status === "succeeded" || data.job.status === "failed") {
          setPollJobId(null);
        }
      } catch (error) {
        if (!cancelled) {
          setPollError(error instanceof Error ? error.message : "Polling failed.");
        }
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pollJobId]);

  const activeSession = creatingNewSession ? null : workspace?.selectedSession ?? null;
  const activeModel = creatingNewSession ? null : workspace?.currentModel ?? null;
  const currentJob = creatingNewSession ? null : workspace?.currentJob ?? null;
  const chatMessages = useMemo(
    () => (creatingNewSession ? [] : workspace?.selectedMessages ?? []),
    [creatingNewSession, workspace?.selectedMessages],
  );
  const canGenerate =
    activeSession !== null &&
    (activeSession.status === "ready" || activeSession.status === "generated") &&
    !!(activeSession.canonicalPrompt ?? activeSession.latestPrompt);
  const currentPrompt = activeSession?.canonicalPrompt ?? activeSession?.latestPrompt ?? "";
  const isGeneratingPreview =
    jobProgress?.status === "preview_pending" || jobProgress?.status === "refine_pending";
  const previewJobId = activeModel?.generationJobId ?? currentJob?._id ?? null;
  const previewModelUrl =
    previewJobId && (activeModel?.glbUrl ?? currentJob?.glbUrl)
      ? `/api/models/${previewJobId}/asset/glb`
      : null;
  const previewDownloadUrl =
    previewJobId && (activeModel?.stlUrl ?? currentJob?.stlUrl)
      ? `/api/models/${previewJobId}/asset/stl`
      : null;
  const previewLoadingLabel = isGeneratingPreview
    ? jobLabel(jobProgress.status)
    : "Loading 3D preview";
  const tips = useMemo(() => {
    if (creatingNewSession) {
      return [];
    }
    const assistantMessages = [...(workspace?.selectedMessages ?? [])]
      .reverse()
      .find((message) => message.role === "assistant");
    return assistantMessages?.tips ?? [];
  }, [creatingNewSession, workspace?.selectedMessages]);

  useEffect(() => {
    const chatContainer = chatScrollRef.current;
    if (!chatContainer) {
      return;
    }

    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: "smooth",
    });
  }, [chatMessages, streamingResponse]);

  useEffect(() => {
    if (!pendingUserMessage || chatMessages.length === 0) {
      return;
    }

    const lastUserMessage = [...chatMessages]
      .reverse()
      .find((message) => message.role === "user");

    if (lastUserMessage?.content === pendingUserMessage) {
      setPendingUserMessage(null);
    }
  }, [chatMessages, pendingUserMessage]);

  const handleRefine = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) {
      setRequestError("Add a message before continuing refinement.");
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
        headers: {
          "Content-Type": "application/json",
        },
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
          setSelectedSessionId(event.sessionId as Id<"refinementSessions">);
          return;
        }

        if (event.type === "token") {
          setStreamingResponse((current) => current + event.value);
          return;
        }

        if (event.type === "error") {
          setRequestError(event.error);
          return;
        }

        if (event.type === "final") {
          setPendingUserMessage(null);
          setStreamingResponse("");
        }
      });
    } catch (error) {
      setChatInput(trimmed);
      setPendingUserMessage(null);
      setRequestError(error instanceof Error ? error.message : "Refinement failed.");
    } finally {
      setIsRefining(false);
    }
  }, [activeSession?._id, chatInput]);

  const handleGenerate = useCallback(async () => {
    if (!activeSession?._id) {
      return;
    }

    setPollError(null);
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: activeSession._id,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setPollError(data.error || "Generation failed.");
      return;
    }

    setPollJobId(data.jobId as Id<"generationJobs">);
    setJobProgress({
      status: "preview_pending",
      progress: 0,
    });
  }, [activeSession?._id]);

  const handleOrderSubmit = useCallback(
    async (payload: {
      size: "small" | "medium" | "large";
      targetHeightMm: number;
      contactName: string;
      email: string;
      shippingAddress: string;
      notes: string;
    }) => {
      if (!activeModel?._id) {
        throw new Error("Generate a model before ordering.");
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generatedModelId: activeModel._id,
          ...payload,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not create the quote request.");
      }

      setOrderMessage(`Quote request ${data.orderId} created.`);
    },
    [activeModel?._id],
  );

  if (isLoading || !workspace) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        Loading workspace...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#15203d,#020617_55%)] text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
                Prompt to 3D print
              </p>
              <h1 className="mt-2 text-4xl font-semibold text-white">Print It 2</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">
                Refine a model prompt, generate it with Meshy, preview it in
                Three.js, and request a print quote.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                {workspace.viewer ?? "Signed in"}
              </div>
              <button
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"
                onClick={() => {
                  void signOut().then(() => router.push("/signin"));
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_380px]">
          <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Sessions</h2>
              <button
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300"
                onClick={() => {
                  resetTransientState();
                  setCreatingNewSession(true);
                  setSelectedSessionId(null);
                }}
              >
                New
              </button>
            </div>
            <div className="space-y-3">
              {workspace.sessions.map((session) => (
                <button
                  key={session._id}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    activeSession?._id === session._id
                      ? "border-cyan-400 bg-cyan-400/10"
                      : "border-white/10 bg-slate-950/40 hover:bg-white/5"
                  }`}
                  onClick={() => {
                    resetTransientState();
                    setCreatingNewSession(false);
                    setSelectedSessionId(session._id);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{session.title}</p>
                    <span className="text-xs uppercase tracking-wide text-cyan-200">
                      {session.status}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                    {session.latestPrompt || session.originalPrompt}
                  </p>
                </button>
              ))}
              {workspace.sessions.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                  Start with a rough idea. The refinement agent will guide the
                  rest.
                </p>
              ) : null}
            </div>
          </aside>

          <section className="space-y-6">
            <div className="flex min-h-[720px] flex-col rounded-3xl border border-white/10 bg-white/5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-5">
                <div>
                  <h2 className="text-xl font-semibold text-white">Refinement chat</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Describe the object you want to print and refine it like a
                    conversation until the prompt is ready.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-slate-300">
                    Status: {activeSession?.status ?? "draft"}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-slate-300">
                    Ready: {canGenerate ? "yes" : "not yet"}
                  </span>
                  {jobProgress ? (
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-100">
                      {jobLabel(jobProgress.status)} · {jobProgress.progress}%
                    </span>
                  ) : null}
                </div>
              </div>

              <div
                ref={chatScrollRef}
                className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
              >
                {chatMessages.length === 0 && !streamingResponse ? (
                  <div className="flex h-full min-h-64 items-center justify-center">
                    <p className="max-w-md rounded-3xl border border-dashed border-white/10 px-5 py-4 text-center text-sm leading-6 text-slate-400">
                      Start with a rough idea. The refinement agent will ask
                      follow-up questions and shape it into a printable prompt.
                    </p>
                  </div>
                ) : null}

                {chatMessages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-[28px] border px-4 py-3 ${
                        message.role === "user"
                          ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-50"
                          : "border-white/10 bg-slate-950/60 text-slate-100"
                      }`}
                    >
                      <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                        {message.role}
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}

                {pendingUserMessage ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-[28px] border border-cyan-400/30 bg-cyan-400/15 px-4 py-3 text-cyan-50">
                      <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                        user
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {pendingUserMessage}
                      </p>
                    </div>
                  </div>
                ) : null}

                {streamingResponse ? (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-[28px] border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100">
                      <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                        assistant
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {streamingResponse}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {tips.length > 0 ? (
                <div className="border-t border-white/10 px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {tips.map((tip) => (
                      <span
                        key={tip}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                      >
                        {tip}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="border-t border-white/10 px-5 py-5">
                <textarea
                  className="min-h-32 w-full rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-4 text-white outline-none placeholder:text-slate-500"
                  placeholder="Tell the agent more about what you want to print..."
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-400">
                    Chat with the agent and it will keep updating the refined idea.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="rounded-2xl border border-cyan-400/40 px-4 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-500"
                      onClick={() => {
                        void handleGenerate();
                      }}
                      disabled={!canGenerate || isRefining}
                    >
                      Generate model
                    </button>
                    <button
                      className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                      onClick={() => {
                        void handleRefine();
                      }}
                      disabled={isRefining}
                    >
                      {isRefining ? "Refining..." : "Send message"}
                    </button>
                  </div>
                </div>
                {requestError ? (
                  <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                    {requestError}
                  </p>
                ) : null}
                {pollError ? (
                  <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                    {pollError}
                  </p>
                ) : null}
              </div>
            </div>

          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-white">Current idea</h2>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-cyan-200">
                  {canGenerate ? "ready" : "in progress"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                This shows the latest refined prompt returned by the agent and
                used for generation.
              </p>
              <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">
                  {currentPrompt || "The agent's latest refined idea will appear here."}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">3D preview</h2>
                {previewDownloadUrl ? (
                  <a
                    href={previewDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-cyan-200 underline underline-offset-4"
                  >
                    Download STL
                  </a>
                ) : null}
              </div>
              <ModelViewer
                modelUrl={previewModelUrl}
                onBoundsChange={setViewerBounds}
                isGenerating={isGeneratingPreview}
                loadingLabel={previewLoadingLabel}
                progress={jobProgress?.progress ?? null}
              />
            </div>

            {activeModel ? (
              <PrintOrderForm
                disabled={false}
                defaultEmail={workspace.viewer ?? ""}
                modelBounds={viewerBounds}
                onSubmit={handleOrderSubmit}
              />
            ) : null}
            {orderMessage ? (
              <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                {orderMessage}
              </p>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
