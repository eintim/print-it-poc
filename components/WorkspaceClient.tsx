"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import ModelViewer from "@/components/ModelViewer";
import PrintOrderForm from "@/components/PrintOrderForm";
import SiteHeader from "@/components/SiteHeader";
import {
  MODEL_SIZE_OPTIONS,
  estimatePrintPriceUsd,
  formatUsd,
  getModelSizeOption,
  getScaledModelDimensions,
  type ModelSizeId,
} from "@/lib/app-config";
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

type WorkspaceScreen = "chat" | "model" | "order";

const DEFAULT_PROMPT_SUGGESTIONS = [
  "Cleaner silhouette for printing",
  "Add friendly expression & rounded details",
  "Specify pose, material & finish",
  "Keep overhangs gentle for reliability",
];

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

const STEP_TABS: { id: WorkspaceScreen; label: string; num: string }[] = [
  { id: "chat", label: "Create", num: "1" },
  { id: "model", label: "Customize", num: "2" },
  { id: "order", label: "Order", num: "3" },
];

export default function WorkspaceClient({
  initialSessionId = null,
  resetVersion = 0,
  onStartOver,
}: {
  initialSessionId?: Id<"refinementSessions"> | null;
  resetVersion?: number;
  onStartOver?: () => void;
}) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [activeScreen, setActiveScreen] = useState<WorkspaceScreen>("chat");
  const [selectedSessionId, setSelectedSessionId] =
    useState<Id<"refinementSessions"> | null>(initialSessionId);
  const [selectedSize, setSelectedSize] = useState<ModelSizeId>("medium");
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
      router.push("/signin?next=/create");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!initialSessionId || selectedSessionId === initialSessionId) {
      return;
    }

    resetTransientState();
    setSelectedSessionId(initialSessionId);
    setActiveScreen("chat");
  }, [initialSessionId, resetTransientState, selectedSessionId]);

  useEffect(() => {
    if (resetVersion === 0) {
      return;
    }

    resetTransientState();
    setSelectedSessionId(initialSessionId);
    setSelectedSize("medium");
    setActiveScreen("chat");
  }, [initialSessionId, resetTransientState, resetVersion]);

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

  const activeSession = workspace?.selectedSession ?? null;
  const activeModel = workspace?.currentModel ?? null;
  const currentJob = workspace?.currentJob ?? null;
  const chatMessages = useMemo(() => workspace?.selectedMessages ?? [], [workspace?.selectedMessages]);
  const canGenerate =
    activeSession !== null &&
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
  const selectedSizeOption = useMemo(
    () => getModelSizeOption(selectedSize),
    [selectedSize],
  );
  const scaledDimensions = useMemo(
    () => getScaledModelDimensions(viewerBounds, selectedSizeOption.targetHeightMm),
    [selectedSizeOption.targetHeightMm, viewerBounds],
  );
  const estimatedPriceUsd = useMemo(
    () => estimatePrintPriceUsd(selectedSize, viewerBounds),
    [selectedSize, viewerBounds],
  );
  const tips = useMemo(() => {
    const assistantMessages = [...(workspace?.selectedMessages ?? [])]
      .reverse()
      .find((message) => message.role === "assistant");
    return assistantMessages?.tips ?? [];
  }, [workspace?.selectedMessages]);
  const promptSuggestions = tips.length > 0 ? tips : DEFAULT_PROMPT_SUGGESTIONS;
  const isWorkspaceLoading = isLoading || !workspace;

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
    setActiveScreen("model");
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
      setActiveScreen("order");
    },
    [activeModel?._id],
  );

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setChatInput((current) =>
      current.trim() ? `${current.trim()}\n${suggestion}` : suggestion,
    );
  }, []);

  const hasMessages = chatMessages.length > 0 || !!streamingResponse || !!pendingUserMessage;

  return (
    <main className="min-h-screen bg-transparent text-[var(--foreground)]">
      <SiteHeader />

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        {/* Compact workspace bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-full bg-[var(--panel)] p-1">
            {STEP_TABS.map((tab) => {
              const isActive = activeScreen === tab.id;
              const isDisabled =
                (tab.id === "model" && !activeSession) ||
                (tab.id === "order" && !activeModel);

              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setActiveScreen(tab.id)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                    isActive
                      ? "bg-white text-[var(--foreground)] shadow-[0_2px_8px_rgba(93,64,43,0.1)]"
                      : isDisabled
                        ? "cursor-not-allowed text-[var(--muted)] opacity-40"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold ${
                      isActive
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--line)] text-white"
                    }`}
                  >
                    {tab.num}
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onStartOver}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
            >
              Start over
            </button>
          </div>
        </div>

        {/* Loading state */}
        {isWorkspaceLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[var(--line)] border-t-[var(--accent)]" />
              <p className="text-sm text-[var(--muted)]">Preparing workspace...</p>
            </div>
          </div>
        ) : null}

        {/* ── Chat screen ── */}
        {!isWorkspaceLoading && activeScreen === "chat" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            {/* Main chat panel */}
            <section className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow)]">
              {/* Messages */}
              <div
                ref={chatScrollRef}
                className="custom-scrollbar flex min-h-[420px] flex-1 flex-col gap-3 overflow-y-auto px-5 py-5"
              >
                {!hasMessages ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
                    <div className="mb-5 h-12 w-12 rounded-full bg-[rgba(253,125,104,0.12)]" />
                    <h3 className="font-serif text-3xl font-medium text-[var(--foreground)] sm:text-4xl">
                      What shall we craft?
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
                      Describe an object, mood, or scene. The assistant will refine it into
                      a printable 3D prompt.
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
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-[rgba(253,125,104,0.12)] text-[var(--foreground)]"
                          : "bg-[var(--panel)] text-[var(--foreground)]"
                      }`}
                    >
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                        {message.role === "user" ? "You" : "Assistant"}
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}

                {pendingUserMessage ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl bg-[rgba(253,125,104,0.12)] px-4 py-3 text-[var(--foreground)]">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                        You
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {pendingUserMessage}
                      </p>
                    </div>
                  </div>
                ) : null}

                {streamingResponse ? (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl bg-[var(--panel)] px-4 py-3 text-[var(--foreground)]">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                        Assistant
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {streamingResponse}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 border-t border-[rgba(186,176,164,0.18)] px-5 pt-4 pb-2">
                {promptSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {/* Input area */}
              <div className="px-5 pt-2 pb-5">
                <div className="flex gap-3">
                  <textarea
                    className="min-h-[72px] flex-1 rounded-xl border border-[rgba(186,176,164,0.3)] bg-[var(--cream)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[rgba(165,60,44,0.3)]"
                    placeholder="Describe your idea..."
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleRefine();
                      }
                    }}
                  />
                  <button
                    className="btn-copper self-end rounded-xl px-5 py-3 text-sm"
                    onClick={() => {
                      void handleRefine();
                    }}
                    disabled={isRefining}
                  >
                    {isRefining ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Refining
                      </span>
                    ) : (
                      "Refine"
                    )}
                  </button>
                </div>
                {(requestError ?? pollError) ? (
                  <p className="mt-2 text-xs text-[#b54b4b]">{requestError ?? pollError}</p>
                ) : null}
              </div>
            </section>

            {/* Right sidebar: prompt + generate */}
            <aside className="flex flex-col gap-3">
              <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(93,64,43,0.06)]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                    Prompt
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      activeSession?.status === "ready" || activeSession?.status === "generated"
                        ? "bg-[var(--sage-soft)] text-[var(--sage)]"
                        : canGenerate
                          ? "bg-[rgba(253,125,104,0.12)] text-[var(--accent)]"
                          : "bg-[var(--panel)] text-[var(--muted)]"
                    }`}
                  >
                    {activeSession?.status === "ready" || activeSession?.status === "generated"
                      ? "ready"
                      : canGenerate
                        ? "good to go"
                        : "draft"}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
                  {currentPrompt || "Your refined prompt will appear here as you chat."}
                </p>
              </div>

              <button
                className="btn-copper w-full rounded-xl px-5 py-4 text-sm"
                onClick={() => {
                  void handleGenerate();
                }}
                disabled={!canGenerate || isRefining}
              >
                Generate 3D model
              </button>
            </aside>
          </div>
        ) : null}

        {/* ── Model / Customize screen ── */}
        {!isWorkspaceLoading && activeScreen === "model" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow)]">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-serif text-xl font-semibold text-[var(--foreground)]">
                    3D Preview
                  </h2>
                  {jobProgress ? (
                    <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                      {jobLabel(jobProgress.status)} · {jobProgress.progress}%
                    </span>
                  ) : null}
                </div>
                {previewDownloadUrl ? (
                  <a
                    href={previewDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--cream)]"
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

            <aside className="flex flex-col gap-3">
              {/* Size selector */}
              <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(93,64,43,0.06)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  Print size
                </p>
                <div className="mt-3 grid gap-2">
                  {MODEL_SIZE_OPTIONS.map((option) => {
                    const optionDimensions = getScaledModelDimensions(
                      viewerBounds,
                      option.targetHeightMm,
                    );
                    const optionPrice = estimatePrintPriceUsd(option.id, viewerBounds);
                    return (
                      <label
                        key={option.id}
                        className={`cursor-pointer rounded-xl border p-3 transition ${
                          selectedSize === option.id
                            ? "border-[var(--accent)]/30 bg-[rgba(253,125,104,0.06)]"
                            : "border-[var(--line)]/40 hover:border-[var(--line)]"
                        }`}
                      >
                        <input
                          className="sr-only"
                          type="radio"
                          name="size"
                          checked={selectedSize === option.id}
                          onChange={() => setSelectedSize(option.id)}
                        />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-[var(--foreground)]">{option.label}</p>
                            <p className="text-[11px] text-[var(--muted)]">
                              {optionDimensions
                                ? `${optionDimensions.widthMm}×${optionDimensions.heightMm}×${optionDimensions.depthMm} mm`
                                : `${option.targetHeightMm} mm tall`}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-[var(--accent)]">
                            {formatUsd(optionPrice)}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Estimated total */}
              <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(93,64,43,0.06)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  Estimated total
                </p>
                <p className="mt-1 font-serif text-3xl font-semibold text-[var(--accent)]">
                  {formatUsd(estimatedPriceUsd)}
                </p>
                {scaledDimensions ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {scaledDimensions.widthMm} × {scaledDimensions.heightMm} × {scaledDimensions.depthMm} mm
                  </p>
                ) : null}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveScreen("chat")}
                  className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--cream)]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScreen("order")}
                  disabled={!activeModel}
                  className="btn-copper flex-1 rounded-xl px-4 py-3 text-sm"
                >
                  Continue to order
                </button>
              </div>
            </aside>
          </div>
        ) : null}

        {/* ── Order screen ── */}
        {!isWorkspaceLoading && activeScreen === "order" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              {activeModel ? (
                <PrintOrderForm
                  disabled={false}
                  defaultEmail={workspace?.viewer ?? ""}
                  size={selectedSize}
                  estimatedPriceUsd={estimatedPriceUsd}
                  onSubmit={handleOrderSubmit}
                />
              ) : (
                <div className="rounded-2xl border border-[var(--line)]/30 bg-white p-6 text-sm text-[var(--muted)] shadow-[var(--shadow)]">
                  Generate a model first, then come back here to submit the final order details.
                </div>
              )}
            </div>

            <aside className="flex flex-col gap-3">
              <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(93,64,43,0.06)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  Order summary
                </p>
                <p className="mt-2 text-sm font-bold text-[var(--foreground)]">
                  {selectedSizeOption.label} · {selectedSizeOption.targetHeightMm} mm
                </p>
                <p className="mt-1 font-serif text-2xl font-semibold text-[var(--accent)]">
                  {formatUsd(estimatedPriceUsd)}
                </p>
                {scaledDimensions ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {scaledDimensions.widthMm} × {scaledDimensions.heightMm} × {scaledDimensions.depthMm} mm
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(93,64,43,0.06)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  Prompt
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
                  {currentPrompt || "No prompt yet."}
                </p>
              </div>

              {orderMessage ? (
                <div className="rounded-xl border border-[#b5d5b7] bg-[#edf8ef] px-4 py-3 text-sm text-[#2f6c39]">
                  {orderMessage}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setActiveScreen("model")}
                className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--cream)]"
              >
                Back to customize
              </button>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}
