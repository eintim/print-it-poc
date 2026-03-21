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
          <div className="absolute left-[calc(50%+30px)] right-0 top-6 hidden h-px bg-[rgba(130,121,110,0.28)] md:block" />
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
            className={`flex h-12 w-12 items-center justify-center rounded-full border text-sm font-extrabold transition ${
              isActive
                ? "border-[var(--accent)] text-white shadow-[0_10px_30px_rgba(165,60,44,0.18)]"
                : "border-[rgba(186,176,164,0.4)] bg-white text-[var(--muted)]"
            }`}
            style={
              isActive
                ? { background: "linear-gradient(135deg, var(--accent-soft), var(--accent))" }
                : undefined
            }
          >
            {icon}
          </div>
          <span
            className={`text-[11px] font-extrabold uppercase tracking-[0.22em] ${
              isActive ? "text-[var(--accent)]" : "text-[var(--muted)]"
            }`}
          >
            {label}
          </span>
        </button>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-transparent text-[var(--foreground)]">
      <SiteHeader />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="paper-texture relative overflow-hidden rounded-[2.25rem] bg-[var(--panel)] px-6 py-7 lg:px-8">
          <div className="absolute inset-y-0 right-0 hidden w-80 rounded-l-[4rem] bg-[rgba(255,255,255,0.36)] lg:block" />
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--accent)]">
                Create
              </p>
              <h1
                className="mt-3 text-4xl font-semibold text-[var(--foreground)] sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "var(--font-newsreader), serif" }}
              >
                Build your next printable keepsake.
              </h1>
              <p
                className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]"
                style={{ fontFamily: "var(--font-newsreader), serif" }}
              >
                Refine the idea, preview the model, and package the final order details
                without leaving the workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onStartOver}
                className="rounded-full border border-[rgba(186,176,164,0.45)] bg-white px-5 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--cream)]"
              >
                Start over
              </button>
              <div className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[var(--muted)] shadow-[0_12px_30px_rgba(93,64,43,0.05)]">
                {isWorkspaceLoading ? "Loading workspace..." : (workspace.viewer ?? "Signed in")}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] bg-[rgba(246,236,225,0.74)] px-4 py-5 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-start justify-between gap-4">
            <StepButton id="chat" icon="01" label="Create" />
            <StepButton id="model" icon="02" label="Customize" disabled={!activeSession} />
            <StepButton id="order" icon="03" label="Order" disabled={!activeModel} />
          </div>
        </section>

        {isWorkspaceLoading ? (
          <section className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
            <aside className="rounded-[2rem] bg-[var(--panel)] p-5">
              <div className="h-full rounded-[1.75rem] bg-white/70 p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--accent)]">
                  Suggested refinements
                </p>
                <h2
                  className="mt-3 text-3xl font-semibold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  Preparing your studio
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  Loading your workspace and recent context...
                </p>
              </div>
            </aside>

            <section className="overflow-hidden rounded-[2.25rem] bg-white shadow-[var(--shadow)]">
              <div className="border-b border-[rgba(186,176,164,0.28)] px-6 py-6">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--sage)]">
                  Dream it into shape
                </p>
                <h2
                  className="mt-3 text-4xl font-semibold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  Prompt refinement studio
                </h2>
              </div>

              <div className="flex min-h-[520px] flex-col items-center justify-center bg-[linear-gradient(180deg,#fffdfb_0%,#fcf5ef_100%)] px-6 py-6 text-center">
                <div className="rounded-[2rem] bg-white px-8 py-6 text-[var(--muted)] shadow-[0_12px_28px_rgba(93,64,43,0.05)]">
                  Loading workspace...
                </div>
              </div>
            </section>

            <aside className="space-y-4 rounded-[2rem] bg-[var(--panel)] p-5">
              <div className="rounded-[1.75rem] bg-white p-5 shadow-[0_12px_28px_rgba(93,64,43,0.05)]">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--accent)]">
                  Final prompt
                </p>
                <h2
                  className="mt-3 text-3xl font-semibold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  Ready to generate
                </h2>
                <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
                  Your latest prompt and next steps will appear here once the workspace is ready.
                </p>
              </div>
            </aside>
          </section>
        ) : activeScreen === "chat" ? (
          <section className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
            <aside className="rounded-[2rem] bg-[var(--panel)] p-5">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--accent)]">
                  Suggested refinements
                </p>
                <h2
                  className="mt-3 text-3xl font-semibold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  Add more soul
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  Tap a prompt idea to layer more detail into the conversation.
                </p>
              </div>
              <div className="mt-6 space-y-3">
                {promptSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full rounded-[1.5rem] bg-white px-4 py-4 text-left text-sm leading-6 text-[var(--foreground)] shadow-[0_12px_28px_rgba(93,64,43,0.04)] transition hover:bg-[var(--cream)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </aside>

            <section className="overflow-hidden rounded-[2.25rem] bg-white shadow-[var(--shadow)]">
              <div className="border-b border-[rgba(186,176,164,0.28)] px-6 py-6">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--sage)]">
                  Dream it into shape
                </p>
                <h2
                  className="mt-3 text-4xl font-semibold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  Prompt refinement studio
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                  Describe the object, mood, materials, and details you want. The
                  assistant will keep turning it into a cleaner, more printable idea.
                </p>
              </div>

              <div
                ref={chatScrollRef}
                className="custom-scrollbar flex min-h-[520px] flex-col gap-4 overflow-y-auto bg-[linear-gradient(180deg,#fffdfb_0%,#fcf5ef_100%)] px-6 py-6"
              >
                {chatMessages.length === 0 && !streamingResponse && !pendingUserMessage ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
                    <div className="relative flex h-28 w-28 items-center justify-center">
                      <div className="absolute inset-0 animate-[spin_18s_linear_infinite] rounded-full border border-[rgba(165,60,44,0.16)]" />
                      <div className="absolute inset-3 rounded-full border border-[rgba(71,102,82,0.16)]" />
                      <div className="h-10 w-10 rounded-full bg-[rgba(253,125,104,0.16)]" />
                    </div>
                    <h3
                      className="mt-8 text-5xl font-medium text-[var(--foreground)]"
                      style={{ fontFamily: "var(--font-newsreader), serif" }}
                    >
                      What shall we craft today?
                    </h3>
                    <p
                      className="mt-4 max-w-xl text-xl leading-8 text-[var(--muted)]"
                      style={{ fontFamily: "var(--font-newsreader), serif" }}
                    >
                      Start with a rough concept. Every detail helps shape a model that is
                      beautiful and printable.
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
                      className={`max-w-[85%] rounded-[1.75rem] px-5 py-4 ${
                        message.role === "user"
                          ? "bg-[rgba(253,125,104,0.16)] text-[var(--foreground)]"
                          : "bg-white text-[var(--foreground)] shadow-[0_10px_24px_rgba(93,64,43,0.04)]"
                      }`}
                    >
                      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--muted)]">
                        {message.role === "user" ? "You" : "Assistant"}
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-7">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}

                {pendingUserMessage ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-[1.75rem] bg-[rgba(253,125,104,0.16)] px-5 py-4 text-[var(--foreground)]">
                      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--muted)]">
                        You
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-7">
                        {pendingUserMessage}
                      </p>
                    </div>
                  </div>
                ) : null}

                {streamingResponse ? (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-[1.75rem] bg-white px-5 py-4 text-[var(--foreground)] shadow-[0_10px_24px_rgba(93,64,43,0.04)]">
                      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--muted)]">
                        Assistant
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-7">
                        {streamingResponse}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-[rgba(186,176,164,0.28)] bg-white px-6 py-6">
                <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)]">
                  <div>
                    <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--sage)]">
                      Reference image
                    </p>
                    <div className="flex h-28 items-center justify-center rounded-[1.5rem] border-2 border-dashed border-[rgba(186,176,164,0.65)] bg-[var(--cream)] text-center text-xs font-semibold text-[var(--muted)]">
                      Image support
                      <br />
                      coming soon
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--sage)]">
                      Describe your dream idea
                    </p>
                    <textarea
                      className="min-h-28 w-full rounded-[1.5rem] border border-[rgba(186,176,164,0.3)] bg-[var(--cream)] px-5 py-4 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)]/70 focus:border-[rgba(165,60,44,0.35)]"
                      placeholder="A delicate keepsake box with carved cherry blossoms and a hidden drawer..."
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex-1 text-sm text-[var(--muted)]">
                    {requestError ? (
                      <span className="rounded-full bg-[#fff2ef] px-4 py-2 text-[#b54b4b]">
                        {requestError}
                      </span>
                    ) : pollError ? (
                      <span className="rounded-full bg-[#fff2ef] px-4 py-2 text-[#b54b4b]">
                        {pollError}
                      </span>
                    ) : (
                      <span>Keep refining until the final prompt feels ready.</span>
                    )}
                  </div>
                  <button
                    className="rounded-full px-7 py-4 text-sm font-extrabold uppercase tracking-[0.16em] text-white shadow-[0_18px_40px_rgba(165,60,44,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-soft))" }}
                    onClick={() => {
                      void handleRefine();
                    }}
                    disabled={isRefining}
                  >
                    {isRefining ? "Refining..." : "Craft my idea"}
                  </button>
                </div>
              </div>
            </section>

            <aside className="space-y-4 rounded-[2rem] bg-[var(--panel)] p-5">
              <div className="rounded-[1.75rem] bg-white p-5 shadow-[0_12px_28px_rgba(93,64,43,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--accent)]">
                      Final prompt
                    </p>
                    <h2
                      className="mt-3 text-3xl font-semibold text-[var(--foreground)]"
                      style={{ fontFamily: "var(--font-newsreader), serif" }}
                    >
                      Ready to generate
                    </h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${
                      canGenerate
                        ? "bg-[rgba(71,102,82,0.12)] text-[var(--sage)]"
                        : "bg-[rgba(130,121,110,0.12)] text-[var(--muted)]"
                    }`}
                  >
                    {canGenerate ? "ready" : "draft"}
                  </span>
                </div>
                <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
                  {currentPrompt || "The assistant's clearest prompt will appear here once you start refining."}
                </p>
              </div>

              <div className="rounded-[1.75rem] bg-[rgba(71,102,82,0.12)] p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--sage)]">
                  Studio note
                </p>
                <p
                  className="mt-3 text-2xl font-semibold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  Refine until the object, mood, and printability all feel specific.
                </p>
              </div>

              <button
                className="w-full rounded-[1.75rem] px-5 py-5 text-base font-extrabold text-white shadow-[0_18px_40px_rgba(165,60,44,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, var(--accent-soft), var(--accent))" }}
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
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-[2.25rem] bg-white p-5 shadow-[var(--shadow)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--accent)]">
                    Customize
                  </p>
                  <h2
                    className="mt-3 text-4xl font-semibold text-[var(--foreground)]"
                    style={{ fontFamily: "var(--font-newsreader), serif" }}
                  >
                    Preview your model
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    Inspect the geometry, size it for print, and move it toward the final order.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {jobProgress ? (
                    <span className="rounded-full bg-[var(--panel)] px-3 py-1 font-semibold text-[var(--accent)]">
                      {jobLabel(jobProgress.status)} · {jobProgress.progress}%
                    </span>
                  ) : null}
                  {previewDownloadUrl ? (
                    <a
                      href={previewDownloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[rgba(186,176,164,0.42)] bg-white px-3 py-1 font-semibold text-[var(--foreground)] transition hover:bg-[var(--cream)]"
                    >
                      Download STL
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="relative mt-5">
                <ModelViewer
                  modelUrl={previewModelUrl}
                  onBoundsChange={setViewerBounds}
                  isGenerating={isGeneratingPreview}
                  loadingLabel={previewLoadingLabel}
                  progress={jobProgress?.progress ?? null}
                />

                <div className="pointer-events-none absolute right-4 top-4 max-w-[220px] rounded-[1.5rem] border border-[rgba(186,176,164,0.2)] bg-white/88 p-4 shadow-[0_20px_45px_rgba(93,64,43,0.08)] backdrop-blur">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--sage)]">
                    Maker&apos;s assistant
                  </p>
                  <p
                    className="mt-2 text-base leading-6 text-[var(--foreground)]"
                    style={{ fontFamily: "var(--font-newsreader), serif" }}
                  >
                    {isGeneratingPreview
                      ? "This idea is taking shape now. The preview should be ready shortly."
                      : "Rotate and inspect the model to make sure the silhouette feels right."}
                  </p>
                </div>
              </div>
            </div>

            <aside className="space-y-4 rounded-[2rem] bg-[var(--panel)] p-5">
              <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_12px_28px_rgba(93,64,43,0.05)]">
                <h3
                  className="text-2xl font-semibold text-[var(--sage)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  Printability check
                </h3>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-[1.25rem] bg-[var(--cream)] p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Sturdiness
                    </p>
                    <p className="mt-2 text-sm font-bold text-[var(--foreground)]">
                      {viewerBounds ? "Ready to inspect" : "Waiting on preview"}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--cream)] p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Time to craft
                    </p>
                    <p className="mt-2 text-sm font-bold text-[var(--foreground)]">
                      {viewerBounds ? "~14 hours" : "Calculating"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_12px_28px_rgba(93,64,43,0.05)]">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--accent)]">
                  Size and price
                </p>
                <div className="mt-4 grid gap-3">
                  {MODEL_SIZE_OPTIONS.map((option) => {
                    const optionDimensions = getScaledModelDimensions(
                      viewerBounds,
                      option.targetHeightMm,
                    );
                    const optionPrice = estimatePrintPriceUsd(option.id, viewerBounds);
                    return (
                      <label
                        key={option.id}
                        className={`cursor-pointer rounded-[1.5rem] border p-4 transition ${
                          selectedSize === option.id
                            ? "border-[rgba(165,60,44,0.35)] bg-[rgba(253,125,104,0.08)]"
                            : "border-[rgba(186,176,164,0.28)] bg-[var(--cream)]"
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
                            <p className="font-bold text-[var(--foreground)]">{option.label}</p>
                            <p className="mt-1 text-sm text-[var(--muted)]">
                              {option.description}
                            </p>
                          </div>
                          <p className="text-sm font-extrabold text-[var(--accent)]">
                            {formatUsd(optionPrice)}
                          </p>
                        </div>
                        <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--muted)]">
                          {optionDimensions
                            ? `${optionDimensions.widthMm} x ${optionDimensions.heightMm} x ${optionDimensions.depthMm} mm`
                            : `${option.targetHeightMm} mm target height`}
                        </p>
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_12px_28px_rgba(93,64,43,0.05)]">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Estimated total
                </p>
                <p
                  className="mt-2 text-4xl font-semibold text-[var(--accent)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  {formatUsd(estimatedPriceUsd)}
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  {scaledDimensions
                    ? `Approx. ${scaledDimensions.widthMm} x ${scaledDimensions.heightMm} x ${scaledDimensions.depthMm} mm once printed.`
                    : "Sizing and price will sharpen once the preview finishes loading."}
                </p>
              </section>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveScreen("chat")}
                  className="rounded-full border border-[rgba(186,176,164,0.42)] bg-white px-5 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--cream)]"
                >
                  Back to create
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScreen("order")}
                  disabled={!activeModel}
                  className="flex-1 rounded-[1.5rem] px-5 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_18px_40px_rgba(165,60,44,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--accent-soft), var(--accent))" }}
                >
                  Send to order
                </button>
              </div>
            </aside>
          </section>
        ) : null}

        {activeScreen === "order" ? (
          <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-4 rounded-[2rem] bg-[var(--panel)] p-5">
              <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_12px_28px_rgba(93,64,43,0.05)]">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--accent)]">
                  Final review
                </p>
                <h2
                  className="mt-3 text-3xl font-semibold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  Your custom idea
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  Finalize the print details and share where it should be delivered.
                </p>
              </section>

              <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_12px_28px_rgba(93,64,43,0.05)]">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Selected size
                </p>
                <p className="mt-2 text-lg font-bold text-[var(--foreground)]">
                  {selectedSizeOption.label} · {selectedSizeOption.targetHeightMm} mm
                </p>
                <p
                  className="mt-4 text-4xl font-semibold text-[var(--accent)]"
                  style={{ fontFamily: "var(--font-newsreader), serif" }}
                >
                  {formatUsd(estimatedPriceUsd)}
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  {scaledDimensions
                    ? `Estimated footprint: ${scaledDimensions.widthMm} x ${scaledDimensions.heightMm} x ${scaledDimensions.depthMm} mm.`
                    : "The viewer will provide exact scale once the model finishes loading."}
                </p>
              </section>

              <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_12px_28px_rgba(93,64,43,0.05)]">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Final prompt
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
                  {currentPrompt || "No prompt available yet."}
                </p>
              </section>

              {orderMessage ? (
                <div className="rounded-[1.75rem] border border-[#b5d5b7] bg-[#edf8ef] px-4 py-4 text-sm text-[#2f6c39]">
                  {orderMessage}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setActiveScreen("model")}
                className="rounded-full border border-[rgba(186,176,164,0.42)] bg-white px-5 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--cream)]"
              >
                Back to customize
              </button>
            </aside>

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
                <div className="rounded-[2rem] border border-[rgba(186,176,164,0.32)] bg-white p-8 text-sm leading-7 text-[var(--muted)] shadow-[var(--shadow)]">
                  Generate a model first, then come back here to submit the final order details.
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
