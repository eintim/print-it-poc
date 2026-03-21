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
  type ModelPrintMetrics,
  type ModelSizeId,
} from "@/lib/app-config";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
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

type WorkspaceScreen = "chat" | "model" | "order";

const DEFAULT_PROMPT_SUGGESTIONS = [
  "Cleaner silhouette for printing",
  "Add friendly expression & rounded details",
  "Specify pose, material & finish",
  "Keep overhangs gentle for reliability",
];

/** Shown in the chat canvas when the composer is open but there are no messages yet. */
const COMPOSER_EMPTY_TEXT_IDEAS: { short: string; full: string }[] = [
  {
    short: "Bookends",
    full: "Tiny brutalist bookend pair, concrete texture, flat base for stability",
  },
  {
    short: "Cloud planter",
    full: "Whimsical cloud-shaped planter with a drainage hole and soft edges",
  },
  {
    short: "Lamp base",
    full: "Art deco desk lamp base—geometric fluting, solid and printable",
  },
];

const COMPOSER_EMPTY_IMAGE_HINTS: { short: string; full: string }[] = [
  {
    short: "Simplify",
    full: "Keep the silhouette; simplify small details for reliable printing",
  },
  {
    short: "Flat base",
    full: "Add a flat base so it stands; gentle overhangs only",
  },
  {
    short: "~120mm desk",
    full: "Scale for desk display (~120mm tall), mention wall thickness",
  },
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

function CustomizePriceSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-md bg-[var(--panel)] animate-pulse ${className ?? ""}`}
      aria-hidden
    />
  );
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
  const [viewerPrintMetrics, setViewerPrintMetrics] =
    useState<ModelPrintMetrics>(null);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [textStartActive, setTextStartActive] = useState(false);

  const generateAttachmentUploadUrl = useMutation(api.app.generateRefinementAttachmentUploadUrl);

  const clearAttachment = useCallback(() => {
    setAttachmentFile(null);
    setAttachmentPreviewUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return null;
    });
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  }, []);

  const resetTransientState = useCallback(() => {
    setChatInput("");
    setPendingUserMessage(null);
    setStreamingResponse("");
    setRequestError(null);
    setPollJobId(null);
    setPollError(null);
    setJobProgress(null);
    setViewerPrintMetrics(null);
    setOrderMessage(null);
    setTextStartActive(false);
    clearAttachment();
  }, [clearAttachment]);

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
    () =>
      getScaledModelDimensions(
        viewerPrintMetrics,
        selectedSizeOption.targetHeightMm,
      ),
    [selectedSizeOption.targetHeightMm, viewerPrintMetrics],
  );
  const estimatedPriceUsd = useMemo(
    () => estimatePrintPriceUsd(selectedSize, viewerPrintMetrics),
    [selectedSize, viewerPrintMetrics],
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

  const handleImageToModel = useCallback(async () => {
    if (!attachmentFile) {
      return;
    }

    setIsRefining(true);
    setRequestError(null);
    setPollError(null);
    const trimmed = chatInput.trim();
    const fileSnapshot = attachmentFile;

    try {
      const { uploadUrl } = await generateAttachmentUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": fileSnapshot.type || "application/octet-stream",
        },
        body: fileSnapshot,
      });

      if (!uploadResponse.ok) {
        throw new Error("Could not upload the image.");
      }

      const uploadJson = (await uploadResponse.json()) as { storageId: string };

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: activeSession?._id ?? null,
          attachmentStorageId: uploadJson.storageId,
          attachmentContentType: fileSnapshot.type || "image/jpeg",
          caption: trimmed.length > 0 ? trimmed : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Generation failed.");
      }

      setSelectedSessionId(data.sessionId as Id<"refinementSessions">);
      setActiveScreen("model");
      setChatInput("");
      clearAttachment();
      setPollJobId(data.jobId as Id<"generationJobs">);
      setJobProgress({
        status: "preview_pending",
        progress: 0,
      });
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Generation failed.",
      );
    } finally {
      setIsRefining(false);
    }
  }, [
    activeSession?._id,
    attachmentFile,
    chatInput,
    clearAttachment,
    generateAttachmentUploadUrl,
  ]);

  const handleRefine = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) {
      setRequestError("Describe your idea to refine it.");
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
          attachmentStorageId: null,
          attachmentContentType: null,
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

  const handleCreateSubmit = useCallback(() => {
    if (attachmentFile) {
      void handleImageToModel();
    } else {
      void handleRefine();
    }
  }, [attachmentFile, handleImageToModel, handleRefine]);

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
  const hasAttachment = Boolean(attachmentFile);
  const showStarterCards = !hasMessages && !hasAttachment && !textStartActive;
  const showChatComposer = hasMessages || textStartActive || hasAttachment;
  const showComposerEmptyCanvas =
    showChatComposer && !hasMessages && !showStarterCards;

  useEffect(() => {
    if (!textStartActive || !showChatComposer || hasMessages) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const node = chatTextareaRef.current;
      if (!node) {
        return;
      }
      node.focus({ preventScroll: false });
      node.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [textStartActive, showChatComposer, hasMessages]);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-transparent text-[var(--foreground)]">
      <SiteHeader />

      <div className="mx-auto flex min-h-0 w-full max-w-[1320px] flex-1 flex-col gap-4 overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
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
          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-4 overflow-y-auto xl:overflow-hidden xl:grid-cols-[minmax(0,1fr)_280px]">
            {/* Main chat panel */}
            <section className="flex min-h-[320px] flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow)] xl:min-h-0">
              <input
                ref={attachmentInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  setAttachmentPreviewUrl((previous) => {
                    if (previous) {
                      URL.revokeObjectURL(previous);
                    }
                    return URL.createObjectURL(file);
                  });
                  setAttachmentFile(file);
                }}
              />
              {/* Messages */}
              <div
                ref={chatScrollRef}
                className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-5"
              >
                {showStarterCards ? (
                  <div className="grain relative flex min-h-[min(420px,55vh)] flex-1 flex-col justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#fffdf9] via-[var(--cream)] to-[rgba(22,101,52,0.06)] px-4 py-10 sm:px-8">
                    <div
                      className="pointer-events-none absolute -right-16 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-[rgba(194,65,12,0.07)] blur-3xl"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-[rgba(22,101,52,0.08)] blur-3xl"
                      aria-hidden
                    />
                    <div className="relative z-[2] mx-auto w-full max-w-2xl">
                      <p className="animate-fade-up text-center text-[10px] font-bold uppercase tracking-[0.35em] text-[var(--muted)]">
                        New idea
                      </p>
                      <h3 className="animate-fade-up delay-1 mt-3 text-center font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-[var(--foreground)] sm:text-4xl">
                        How do you want to begin?
                      </h3>
                      <p className="animate-fade-up delay-2 mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-[var(--muted)]">
                        Image path: pick a file, add an optional note, then generate — you go straight to
                        Customize. Text path: describe your idea here and refine with the assistant first.
                      </p>

                      <div className="animate-fade-up delay-3 mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5">
                        <button
                          type="button"
                          disabled={isRefining}
                          onClick={() => attachmentInputRef.current?.click()}
                          className="group relative flex w-full flex-col items-start gap-4 overflow-hidden rounded-2xl border border-[rgba(22,101,52,0.22)] bg-gradient-to-br from-white/90 to-[rgba(220,252,231,0.35)] p-6 text-left shadow-[0_12px_40px_rgba(22,101,52,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(22,101,52,0.35)] hover:shadow-[0_18px_48px_rgba(22,101,52,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sage)] disabled:pointer-events-none disabled:opacity-45"
                        >
                          <span
                            className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--sage-soft)]/50 transition-transform duration-500 group-hover:scale-110"
                            aria-hidden
                          />
                          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(22,101,52,0.2)] bg-white/80 text-[var(--sage)] shadow-sm">
                            <svg
                              width="26"
                              height="26"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              aria-hidden
                            >
                              <path
                                d="M4 16l4.5-5.5a1.5 1.5 0 012.4.15L15 18l3-3 3 3v3H4v-5z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <circle
                                cx="8.5"
                                cy="8.5"
                                r="2"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              />
                            </svg>
                          </span>
                          <span className="relative space-y-1.5">
                            <span className="block font-serif text-lg font-semibold text-[var(--foreground)]">
                              Sketch or image
                            </span>
                            <span className="block text-sm leading-snug text-[var(--muted)]">
                              After you choose a file, add an optional note and press Generate — Meshy builds
                              the model from your image.
                            </span>
                          </span>
                          <span className="relative mt-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--sage)]">
                            Choose file
                            <span
                              className="inline-block transition-transform duration-300 group-hover:translate-x-0.5"
                              aria-hidden
                            >
                              →
                            </span>
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTextStartActive(true)}
                          className="group relative flex w-full flex-col items-start gap-4 overflow-hidden rounded-2xl border border-[rgba(194,65,12,0.22)] bg-gradient-to-br from-white/95 to-[rgba(253,125,104,0.08)] p-6 text-left shadow-[0_12px_40px_rgba(194,65,12,0.07)] transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(194,65,12,0.38)] hover:shadow-[0_18px_48px_rgba(194,65,12,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                        >
                          <span
                            className="absolute -right-8 -top-10 h-28 w-28 rotate-12 rounded-3xl bg-[rgba(253,125,104,0.15)] transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105"
                            aria-hidden
                          />
                          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(194,65,12,0.2)] bg-white/85 text-[var(--accent)] shadow-sm">
                            <svg
                              width="26"
                              height="26"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              aria-hidden
                            >
                              <path
                                d="M6 8h12M6 12h9M6 16h6"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                          <span className="relative space-y-1.5">
                            <span className="block font-serif text-lg font-semibold text-[var(--foreground)]">
                              Start from text
                            </span>
                            <span className="block text-sm leading-snug text-[var(--muted)]">
                              Opens the composer and hides this screen so you can focus on your
                              prompt. Add a reference image anytime with the image button.
                            </span>
                          </span>
                          <span className="relative mt-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                            Continue
                            <span
                              className="inline-block transition-transform duration-300 group-hover:translate-x-0.5"
                              aria-hidden
                            >
                              →
                            </span>
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {showComposerEmptyCanvas ? (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <div className="shrink-0 border-b border-[rgba(186,176,164,0.12)] pb-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {hasAttachment ? (
                          <p className="text-[11px] leading-snug text-[var(--muted)]">
                            Optional note — saved as the session label. The 3D mesh comes from your image
                            (Meshy image-to-3D).
                          </p>
                        ) : null}
                        {textStartActive && !hasAttachment ? (
                          <button
                            type="button"
                            onClick={() => setTextStartActive(false)}
                            className="text-[11px] font-medium text-[var(--muted)] underline decoration-[rgba(120,113,108,0.3)] underline-offset-2 transition hover:text-[var(--accent)] hover:decoration-[rgba(194,65,12,0.4)]"
                          >
                            ← Starting choices
                          </button>
                        ) : null}
                      </div>
                      <div className="custom-scrollbar mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                        <span className="shrink-0 text-[10px] font-medium text-[var(--muted)]">
                          Try
                        </span>
                        {(hasAttachment
                          ? COMPOSER_EMPTY_IMAGE_HINTS
                          : COMPOSER_EMPTY_TEXT_IDEAS
                        ).map((idea) => (
                          <button
                            key={idea.full}
                            type="button"
                            title={idea.full}
                            onClick={() => {
                              setChatInput((current) =>
                                current.trim()
                                  ? `${current.trim()}\n${idea.full}`
                                  : idea.full,
                              );
                              chatTextareaRef.current?.focus({ preventScroll: true });
                            }}
                            className="shrink-0 rounded-full border border-[rgba(186,176,164,0.45)] bg-[var(--cream)]/80 px-2.5 py-0.5 text-[10px] font-medium text-[var(--foreground)] transition hover:border-[rgba(194,65,12,0.45)] hover:bg-white"
                          >
                            {idea.short}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative mt-3 flex min-h-[min(200px,36vh)] flex-1 flex-col items-center justify-center px-2 py-6 sm:px-4">
                      <div
                        className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-[rgba(250,243,235,0.9)] via-white/40 to-[rgba(253,125,104,0.05)]"
                        aria-hidden
                      />
                      <div
                        className="pointer-events-none absolute left-1/2 top-1/3 h-40 w-64 -translate-x-1/2 rounded-full bg-[rgba(194,65,12,0.06)] blur-3xl"
                        aria-hidden
                      />
                      <div
                        className="pointer-events-none absolute bottom-1/4 right-1/4 h-32 w-32 rounded-full bg-[rgba(22,101,52,0.05)] blur-3xl"
                        aria-hidden
                      />

                      <div className="relative z-[1] flex max-w-md flex-col items-center text-center">
                        <div
                          className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(186,176,164,0.28)] bg-white/90 text-[var(--accent)] shadow-sm"
                          aria-hidden
                        >
                          <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z"
                              stroke="currentColor"
                              strokeWidth="1.35"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M12 22V12M3.34 7L12 12l8.66-5M12 12l8.66 5"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity="0.4"
                            />
                          </svg>
                        </div>
                        <h3 className="font-serif text-[1.15rem] font-semibold leading-snug tracking-tight text-[var(--foreground)] sm:text-xl">
                          {hasAttachment
                            ? "Image → 3D preview"
                            : "From idea to a printable prompt"}
                        </h3>
                        <p className="mt-2 max-w-[28ch] text-xs leading-relaxed text-[var(--muted)]">
                          {hasAttachment
                            ? "Submit sends your image to Meshy image-to-3D and opens Customize while the model generates."
                            : "Chat here to shape the brief. When it feels right, the prompt panel unlocks Generate on the right."}
                        </p>

                        <div
                          className="mt-6 flex w-full max-w-sm flex-wrap items-center justify-center gap-x-1 gap-y-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]"
                          aria-label="Workflow"
                        >
                          {hasAttachment ? (
                            <>
                              <span className="rounded-full border border-[rgba(186,176,164,0.4)] bg-white/90 px-2.5 py-1 text-[var(--foreground)] shadow-sm">
                                1 · Image
                              </span>
                              <span className="text-[var(--line-strong)]" aria-hidden>
                                →
                              </span>
                              <span className="rounded-full border border-[rgba(186,176,164,0.4)] bg-white/90 px-2.5 py-1 text-[var(--foreground)] shadow-sm">
                                2 · Generate
                              </span>
                              <span className="text-[var(--line-strong)]" aria-hidden>
                                →
                              </span>
                              <span className="rounded-full border border-[rgba(186,176,164,0.4)] bg-white/90 px-2.5 py-1 text-[var(--foreground)] shadow-sm">
                                3 · Customize
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="rounded-full border border-[rgba(186,176,164,0.4)] bg-white/90 px-2.5 py-1 text-[var(--foreground)] shadow-sm">
                                1 · Describe
                              </span>
                              <span className="text-[var(--line-strong)]" aria-hidden>
                                →
                              </span>
                              <span className="rounded-full border border-[rgba(186,176,164,0.4)] bg-white/90 px-2.5 py-1 text-[var(--foreground)] shadow-sm">
                                2 · Refine
                              </span>
                              <span className="text-[var(--line-strong)]" aria-hidden>
                                →
                              </span>
                              <span className="rounded-full border border-[rgba(186,176,164,0.4)] bg-white/90 px-2.5 py-1 text-[var(--foreground)] shadow-sm">
                                3 · Generate
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
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
                      {"attachmentUrl" in message && message.attachmentUrl ? (
                        <div className="mb-2 overflow-hidden rounded-xl border border-[rgba(186,176,164,0.25)] bg-[var(--cream)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={message.attachmentUrl}
                            alt="Your reference or sketch"
                            className="max-h-48 w-full object-contain"
                          />
                        </div>
                      ) : null}
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
                      {attachmentPreviewUrl ? (
                        <div className="mb-2 overflow-hidden rounded-xl border border-[rgba(186,176,164,0.25)] bg-[var(--cream)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={attachmentPreviewUrl}
                            alt="Uploading reference"
                            className="max-h-48 w-full object-contain"
                          />
                        </div>
                      ) : null}
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

              {/* Suggestion chips (hidden on empty chat so the two start paths stay primary) */}
              {hasMessages ? (
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
              ) : null}

              {/* Composer (hidden until a start path is chosen or the thread has messages) */}
              {showChatComposer ? (
                <div className="animate-fade-in border-t border-[rgba(186,176,164,0.18)] px-5 pt-4 pb-5">
                  {!hasMessages ? (
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
                          {hasAttachment
                            ? "From sketch or image"
                            : "From text"}
                        </p>
                        <p className="mt-1 text-sm text-[var(--foreground)]">
                          {hasAttachment
                            ? "Choose or change your reference, add an optional note, then refine."
                            : "Describe your idea — attach a reference image anytime with the button."}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {attachmentPreviewUrl ? (
                    <div className="relative mb-3 inline-block max-w-full">
                      <div className="overflow-hidden rounded-xl border border-[rgba(186,176,164,0.3)] bg-[var(--cream)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={attachmentPreviewUrl}
                          alt="Attached reference"
                          className="max-h-36 max-w-full object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={clearAttachment}
                        className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] bg-white text-xs font-bold text-[var(--muted)] shadow-sm transition hover:text-[var(--foreground)]"
                        aria-label="Remove attached image"
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-stretch gap-2 sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={isRefining}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[rgba(186,176,164,0.35)] bg-[var(--cream)] px-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)] transition hover:border-[rgba(165,60,44,0.35)] hover:text-[var(--accent)] disabled:opacity-40"
                    >
                      Image
                    </button>
                    <textarea
                      ref={chatTextareaRef}
                      className="min-h-[72px] min-w-0 flex-1 rounded-xl border border-[rgba(186,176,164,0.3)] bg-[var(--cream)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[rgba(165,60,44,0.3)]"
                      placeholder={
                        hasMessages
                          ? "Describe your idea…"
                          : hasAttachment
                            ? "Optional note for your file name or print intent…"
                            : "Describe shape, mood, material, or how it should print…"
                      }
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleCreateSubmit();
                        }
                      }}
                    />
                    <button
                      className="btn-copper shrink-0 rounded-xl px-5 py-3 text-sm"
                      type="button"
                      onClick={handleCreateSubmit}
                      disabled={isRefining || (!attachmentFile && !chatInput.trim())}
                    >
                      {isRefining ? (
                        <span className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          {attachmentFile ? "Generating" : "Refining"}
                        </span>
                      ) : attachmentFile ? (
                        "Generate 3D model"
                      ) : (
                        "Refine"
                      )}
                    </button>
                  </div>
                  {(requestError ?? pollError) ? (
                    <p className="mt-2 text-xs text-[#b54b4b]">{requestError ?? pollError}</p>
                  ) : null}
                </div>
              ) : null}
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
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto xl:flex-row xl:overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow)]">
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

              <div className="min-h-0 flex-1">
                <ModelViewer
                  modelUrl={previewModelUrl}
                  onPrintMetricsChange={setViewerPrintMetrics}
                  isGenerating={isGeneratingPreview}
                  loadingLabel={previewLoadingLabel}
                  progress={jobProgress?.progress ?? null}
                />
              </div>
            </div>

            <aside
              className="flex w-full shrink-0 flex-col gap-3 xl:w-[280px]"
              aria-busy={isGeneratingPreview}
            >
              {/* Size selector */}
              <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(93,64,43,0.06)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  Print size
                </p>
                <div className="mt-3 grid gap-2">
                  {MODEL_SIZE_OPTIONS.map((option) => {
                    const optionDimensions = getScaledModelDimensions(
                      viewerPrintMetrics,
                      option.targetHeightMm,
                    );
                    const optionPrice = estimatePrintPriceUsd(
                      option.id,
                      viewerPrintMetrics,
                    );
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
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--foreground)]">{option.label}</p>
                            <p className="text-[11px] text-[var(--muted)]">
                              {isGeneratingPreview
                                ? `${option.targetHeightMm} mm tall`
                                : optionDimensions
                                  ? `${optionDimensions.widthMm}×${optionDimensions.heightMm}×${optionDimensions.depthMm} mm`
                                  : `${option.targetHeightMm} mm tall`}
                            </p>
                          </div>
                          {isGeneratingPreview ? (
                            <CustomizePriceSkeleton className="h-5 w-[4.25rem] shrink-0" />
                          ) : (
                            <p className="shrink-0 text-sm font-bold text-[var(--accent)]">
                              {formatUsd(optionPrice)}
                            </p>
                          )}
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
                {isGeneratingPreview ? (
                  <>
                    <span className="sr-only">Prices appear when your model is ready.</span>
                    <CustomizePriceSkeleton className="mt-2 h-9 w-32" />
                    <CustomizePriceSkeleton className="mt-3 h-3 w-40" />
                  </>
                ) : (
                  <>
                    <p className="mt-1 font-serif text-3xl font-semibold text-[var(--accent)]">
                      {formatUsd(estimatedPriceUsd)}
                    </p>
                    {scaledDimensions ? (
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {scaledDimensions.widthMm} × {scaledDimensions.heightMm} × {scaledDimensions.depthMm} mm
                      </p>
                    ) : null}
                  </>
                )}
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
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto xl:flex-row xl:overflow-hidden">
            <div className="flex min-h-[320px] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow)] xl:min-h-0">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <h2 className="font-serif text-xl font-semibold text-[var(--foreground)]">
                  Place order
                </h2>
              </div>

              <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
                {activeModel ? (
                  <PrintOrderForm
                    embedded
                    disabled={false}
                    defaultEmail={workspace?.viewer ?? ""}
                    size={selectedSize}
                    estimatedPriceUsd={estimatedPriceUsd}
                    onSubmit={handleOrderSubmit}
                  />
                ) : (
                  <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-[var(--line)]/30 bg-[var(--cream)] px-6 py-10 text-center text-sm text-[var(--muted)]">
                    Generate a model first, then come back here to submit the final order details.
                  </div>
                )}
              </div>
            </div>

            <aside className="flex w-full shrink-0 flex-col gap-3 xl:w-[280px]">
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
