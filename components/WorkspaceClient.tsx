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
  "Make the silhouette cleaner and easier to print.",
  "Add a friendly expression and rounded details.",
  "Specify the pose, material feel, and finishing style.",
  "Keep overhangs gentle so the model prints reliably.",
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

  if (isLoading || !workspace) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        Loading workspace...
      </main>
    );
  }

  const StepButton = ({
    id,
    label,
    icon,
    disabled = false,
  }: {
    id: WorkspaceScreen;
    label: string;
    icon: string;
    disabled?: boolean;
  }) => {
    const isActive = activeScreen === id;
    return (
      <div className="relative flex flex-1 items-center justify-center">
        {id !== "order" ? (
          <div className="absolute left-[calc(50%+28px)] right-0 top-5 hidden h-px bg-[var(--line)] md:block" />
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setActiveScreen(id)}
          className={`relative z-10 flex flex-col items-center gap-2 text-center transition ${
            disabled ? "cursor-not-allowed opacity-45" : ""
          }`}
        >
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition ${
              isActive
                ? "border-[var(--accent)] bg-[linear-gradient(135deg,var(--accent),var(--accent-soft))] text-white shadow-[0_10px_30px_rgba(165,60,44,0.18)]"
                : "border-[var(--line)] bg-white text-[var(--muted)]"
            }`}
          >
            {icon}
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            {label}
          </span>
        </button>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-transparent text-[var(--foreground)]">
      <SiteHeader />

      <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <section className="flex flex-col gap-4 rounded-[1.75rem] bg-[var(--panel)] p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
              Create
            </p>
            <h1
              className="mt-2 text-4xl font-semibold text-[var(--foreground)] sm:text-5xl"
              style={{ fontFamily: "var(--font-newsreader), serif" }}
            >
              Build your next printable idea
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Refine the prompt, generate the model, and prepare the final print
              request from one workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onStartOver}
              className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--paper)]"
            >
              Start over
            </button>
            <div className="rounded-full bg-white px-4 py-2 text-sm text-[var(--muted)]">
              {workspace.viewer ?? "Signed in"}
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-3xl items-start justify-between gap-4">
          <StepButton id="chat" icon="01" label="Create" />
          <StepButton id="model" icon="02" label="Customize" disabled={!activeSession} />
          <StepButton id="order" icon="03" label="Order" disabled={!activeModel} />
        </section>

        {activeScreen === "chat" ? (
          <section className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
            <aside className="space-y-3 rounded-[1.75rem] bg-[var(--panel)] p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                  Prompt suggestions
                </p>
                <h2
                  className="mt-2 text-2xl font-semibold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  Refine
                </h2>
              </div>
              <div className="space-y-3">
                {promptSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full rounded-[1.25rem] bg-white px-4 py-3 text-left text-sm leading-6 text-[var(--foreground)] transition hover:bg-[var(--paper)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </aside>

            <section className="flex min-h-[720px] flex-col rounded-[2rem] bg-white">
              <div className="border-b border-[var(--line)] px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                    Chat screen
                  </p>
                  <h2
                    className="mt-2 text-4xl font-semibold text-[var(--foreground)]"
                    style={{ fontFamily: "var(--font-newsreader), serif" }}
                  >
                    Prompt refinement chat
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Describe your idea and refine it until it is ready.
                  </p>
                </div>
              </div>

              <div
                ref={chatScrollRef}
                className="flex-1 space-y-4 overflow-y-auto px-6 py-6"
              >
                {chatMessages.length === 0 && !streamingResponse ? (
                  <div className="flex h-full min-h-64 items-center justify-center">
                    <p className="max-w-md text-center text-sm leading-7 text-[var(--muted)]">
                      Start with a rough idea. The assistant will shape it into a
                      printable prompt.
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
                      className={`max-w-[80%] rounded-[1.5rem] px-4 py-4 ${
                        message.role === "user"
                          ? "bg-[rgba(253,125,104,0.14)] text-[var(--foreground)]"
                          : "bg-[var(--panel)] text-[var(--foreground)]"
                      }`}
                    >
                      <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                        {message.role === "user" ? "You" : "Assistant"}
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}

                {pendingUserMessage ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-[1.5rem] bg-[rgba(253,125,104,0.14)] px-4 py-4 text-[var(--foreground)]">
                      <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                        You
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {pendingUserMessage}
                      </p>
                    </div>
                  </div>
                ) : null}

                {streamingResponse ? (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-[1.5rem] bg-[var(--panel)] px-4 py-4 text-[var(--foreground)]">
                      <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                        Assistant
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {streamingResponse}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-[var(--line)] px-6 py-5">
                <textarea
                  className="min-h-28 w-full rounded-[1.5rem] bg-[var(--panel)] px-4 py-4 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)]/70"
                  placeholder="Tell the assistant more about what you want to print..."
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                />
                <div className="mt-4 flex items-center justify-end">
                  <button
                    className="rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-soft))] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => {
                      void handleRefine();
                    }}
                    disabled={isRefining}
                  >
                    {isRefining ? "Refining..." : "Send message"}
                  </button>
                </div>
                {requestError ? (
                  <p className="mt-4 rounded-[1.25rem] border border-[#e2b0a8] bg-[#fff2ef] px-4 py-3 text-sm text-[#b54b4b]">
                    {requestError}
                  </p>
                ) : null}
                {pollError ? (
                  <p className="mt-4 rounded-[1.25rem] border border-[#e2b0a8] bg-[#fff2ef] px-4 py-3 text-sm text-[#b54b4b]">
                    {pollError}
                  </p>
                ) : null}
              </div>
            </section>

            <aside className="space-y-4 rounded-[1.75rem] bg-[var(--panel)] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                    Final prompt
                  </p>
                  <h2
                    className="mt-2 text-2xl font-semibold text-[var(--foreground)]"
                    style={{ fontFamily: "var(--font-newsreader), serif" }}
                  >
                    Ready to generate
                  </h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs uppercase tracking-wide text-[var(--accent)]">
                  {canGenerate ? "ready" : "draft"}
                </span>
              </div>
              <div className="rounded-[1.5rem] bg-white p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
                  {currentPrompt || "The assistant's latest refined idea will appear here."}
                </p>
              </div>
              <button
                className="w-full rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-soft))] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  void handleGenerate();
                }}
                disabled={!canGenerate || isRefining}
              >
                Generate model
              </button>
            </aside>
          </section>
        ) : null}

        {activeScreen === "model" ? (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5 rounded-[2rem] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                    Model screen
                  </p>
                  <h2
                    className="mt-2 text-4xl font-semibold text-[var(--foreground)]"
                    style={{ fontFamily: "var(--font-newsreader), serif" }}
                  >
                    Preview your model
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {jobProgress ? (
                    <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-[var(--accent)]">
                      {jobLabel(jobProgress.status)} · {jobProgress.progress}%
                    </span>
                  ) : null}
                  {previewDownloadUrl ? (
                    <a
                      href={previewDownloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-[var(--panel)] px-3 py-1 text-[var(--foreground)] underline underline-offset-4"
                    >
                      Download STL
                    </a>
                  ) : null}
                </div>
              </div>

              <ModelViewer
                modelUrl={previewModelUrl}
                onBoundsChange={setViewerBounds}
                isGenerating={isGeneratingPreview}
                loadingLabel={previewLoadingLabel}
                progress={jobProgress?.progress ?? null}
              />
            </div>

            <aside className="space-y-4 rounded-[1.75rem] bg-[var(--panel)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                  Customization
                </p>
                <h3
                  className="mt-2 text-2xl font-semibold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  Size and price
                </h3>
              </div>

              <div className="grid gap-3">
                {MODEL_SIZE_OPTIONS.map((option) => {
                  const optionDimensions = getScaledModelDimensions(
                    viewerBounds,
                    option.targetHeightMm,
                  );
                  const optionPrice = estimatePrintPriceUsd(option.id, viewerBounds);
                  return (
                    <label
                      key={option.id}
                      className={`cursor-pointer rounded-[1.25rem] p-4 transition ${
                        selectedSize === option.id
                          ? "bg-white ring-1 ring-[var(--accent)]"
                          : "bg-white/80"
                      }`}
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        name="size"
                        checked={selectedSize === option.id}
                        onChange={() => setSelectedSize(option.id)}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">
                            {option.label}
                          </p>
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {option.description}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-[var(--accent)]">
                          {formatUsd(optionPrice)}
                        </p>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        {optionDimensions
                          ? `${optionDimensions.widthMm} x ${optionDimensions.heightMm} x ${optionDimensions.depthMm} mm`
                          : `${option.targetHeightMm} mm target height`}
                      </p>
                    </label>
                  );
                })}
              </div>

              <div className="rounded-[1.5rem] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Price
                </p>
                <p className="mt-2 text-4xl font-semibold text-[var(--accent)]">
                  {formatUsd(estimatedPriceUsd)}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {scaledDimensions
                    ? `Approx. ${scaledDimensions.widthMm} x ${scaledDimensions.heightMm} x ${scaledDimensions.depthMm} mm once printed.`
                    : "Sizing and price will refine once the model preview finishes loading."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveScreen("chat")}
                  className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--paper)]"
                >
                  Back to chat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScreen("order")}
                  disabled={!activeModel}
                  className="flex-1 rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-soft))] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </aside>
          </section>
        ) : null}

        {activeScreen === "order" ? (
          <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="space-y-4 rounded-[1.75rem] bg-[var(--panel)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                  Final order screen
                </p>
                <h2
                  className="mt-2 text-2xl font-semibold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  Final review
                </h2>
              </div>

              <div className="rounded-[1.5rem] bg-white p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {selectedSizeOption.label} · {selectedSizeOption.targetHeightMm} mm
                </p>
                <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">
                  {formatUsd(estimatedPriceUsd)}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {scaledDimensions
                    ? `Estimated footprint: ${scaledDimensions.widthMm} x ${scaledDimensions.heightMm} x ${scaledDimensions.depthMm} mm.`
                    : "The viewer will provide exact scale once the model finishes loading."}
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Final prompt
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
                  {currentPrompt || "No prompt available yet."}
                </p>
              </div>

              {orderMessage ? (
                <div className="rounded-[1.5rem] border border-[#b5d5b7] bg-[#edf8ef] px-4 py-3 text-sm text-[#2f6c39]">
                  {orderMessage}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setActiveScreen("model")}
                className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--paper)]"
              >
                Back to model screen
              </button>
            </aside>

            <div>
              {activeModel ? (
                <PrintOrderForm
                  disabled={false}
                  defaultEmail={workspace.viewer ?? ""}
                  size={selectedSize}
                  estimatedPriceUsd={estimatedPriceUsd}
                  onSubmit={handleOrderSubmit}
                />
              ) : (
                <div className="rounded-[2rem] border border-[var(--line)] bg-[rgba(255,253,249,0.88)] p-8 text-sm leading-6 text-[var(--muted)] shadow-[0_24px_70px_rgba(93,64,43,0.08)]">
                  Generate a model first, then come back here to submit the final
                  order details.
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
