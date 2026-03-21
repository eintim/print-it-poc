"use client";

import ModelViewer from "@/components/ModelViewer";
import PrintOrderForm from "@/components/PrintOrderForm";
import {
  formatUsd,
  getModelSizeOption,
  type ModelPrintMetrics,
  type ModelSizeId,
} from "@/lib/app-config";

type OrderPayload = {
  size: ModelSizeId;
  targetHeightMm: number;
  contactName: string;
  email: string;
  shippingAddress: string;
  notes: string;
};

export default function WorkspaceOrderStep({
  hasModel,
  modelPreviewUrl,
  previewLoadingLabel,
  isGeneratingPreview,
  jobProgressPercent,
  stlDownloadUrl,
  defaultEmail,
  selectedSize,
  estimatedPriceUsd,
  scaledDimensions,
  currentPrompt,
  confirmedOrderId,
  onPrintMetricsChange,
  onSubmit,
  onBack,
  onNewQuote,
}: {
  hasModel: boolean;
  modelPreviewUrl: string | null;
  previewLoadingLabel: string;
  isGeneratingPreview: boolean;
  jobProgressPercent: number | null;
  stlDownloadUrl: string | null;
  defaultEmail: string;
  selectedSize: ModelSizeId;
  estimatedPriceUsd: number;
  scaledDimensions: { widthMm: number; heightMm: number; depthMm: number } | null;
  currentPrompt: string;
  confirmedOrderId: string | null;
  onPrintMetricsChange: (metrics: ModelPrintMetrics) => void;
  onSubmit: (payload: OrderPayload) => Promise<void>;
  onBack: () => void;
  onNewQuote: () => void;
}) {
  const sizeOption = getModelSizeOption(selectedSize);

  if (confirmedOrderId) {
    return (
      <div className="workspace-order-root flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto xl:overflow-hidden">
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6"
          role="status"
          aria-live="polite"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[rgba(28,24,21,0.08)] bg-[var(--paper)] px-6 py-8 text-center shadow-[var(--shadow)] sm:px-10 sm:py-10"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 120% 80% at 50% 0%, rgba(22,101,52,0.08), transparent 55%),
                linear-gradient(180deg, rgba(250,243,235,0.6) 0%, transparent 45%)
              `,
            }}
          >
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(22,101,52,0.2)] bg-[rgba(220,252,231,0.5)] text-[var(--sage)]"
              aria-hidden
            >
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--sage)]">
              Order confirmed
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.75rem]">
              We received your quote request
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              Demo payment completed. We&apos;ll follow up using the email you provided — nothing was charged.
            </p>
            <p className="mt-5 rounded-xl border border-[rgba(28,24,21,0.08)] bg-[var(--cream)] px-4 py-3 font-mono text-xs text-[var(--foreground)]">
              <span className="text-[var(--muted)]">Reference </span>
              <span className="font-semibold">{confirmedOrderId}</span>
            </p>
            <dl className="mt-6 space-y-2 border-t border-[rgba(28,24,21,0.08)] pt-6 text-left text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Print size</dt>
                <dd className="font-medium text-[var(--foreground)]">
                  {sizeOption.label} · {sizeOption.targetHeightMm} mm
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Estimate</dt>
                <dd className="font-serif font-semibold text-[var(--accent)] tabular-nums">
                  {formatUsd(estimatedPriceUsd)}
                </dd>
              </div>
            </dl>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl border border-[var(--line)] px-5 py-3.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--cream)] sm:min-w-[10rem]"
              >
                Back to customize
              </button>
              <button
                type="button"
                onClick={onNewQuote}
                className="rounded-xl bg-[var(--foreground)] px-5 py-3.5 text-sm font-semibold text-[var(--paper)] transition hover:opacity-90 sm:min-w-[10rem]"
              >
                Create more
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-order-root flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto xl:overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden xl:flex-row xl:gap-5">
        {/* Main checkout column */}
        <section
          className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[rgba(28,24,21,0.07)] bg-[var(--paper)] shadow-[var(--shadow)]"
          aria-labelledby="workspace-order-main-title"
        >
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-[var(--accent-glow)] blur-2xl" />
          <h3 id="workspace-order-main-title" className="sr-only">
            Order details and 3D preview
          </h3>

          {hasModel ? (
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              {/* Form — primary column; scrolls independently */}
              <div className="order-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 md:px-6 md:py-5 lg:order-1">
                <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Delivery details
                </p>
                <PrintOrderForm
                  embedded
                  mockPayment
                  submitLabel="Order now"
                  disabled={false}
                  defaultEmail={defaultEmail}
                  size={selectedSize}
                  estimatedPriceUsd={estimatedPriceUsd}
                  onSubmit={onSubmit}
                />
              </div>

              {/* 3D preview — beside the form on large screens */}
              <div className="order-1 flex h-[200px] shrink-0 flex-col border-b border-[rgba(28,24,21,0.06)] bg-gradient-to-b from-[var(--cream)]/50 to-[var(--cream)]/20 sm:h-[220px] lg:order-2 lg:h-auto lg:min-h-0 lg:w-[min(42vw,400px)] lg:border-b-0 lg:border-l xl:w-[min(38vw,440px)]">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-5 lg:py-3">
                  <p className="font-serif text-base font-semibold text-[var(--foreground)] sm:text-lg">Your model</p>
                  {stlDownloadUrl ? (
                    <a
                      href={stlDownloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--paper)]"
                    >
                      Download STL
                    </a>
                  ) : null}
                </div>
                <div className="min-h-0 flex-1 overflow-hidden px-3 pb-3 sm:px-4 lg:px-4 lg:pb-4">
                  <div className="h-full min-h-[140px] overflow-hidden rounded-xl border border-[rgba(28,24,21,0.08)] bg-[var(--cream)] shadow-[inset_0_2px_12px_rgba(28,24,21,0.04)]">
                    <ModelViewer
                      layout="checkout"
                      modelUrl={modelPreviewUrl}
                      onPrintMetricsChange={onPrintMetricsChange}
                      isGenerating={isGeneratingPreview}
                      loadingLabel={previewLoadingLabel}
                      progress={jobProgressPercent}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-4 px-8 py-12 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--cream)] font-serif text-2xl text-[var(--muted)]"
                aria-hidden
              >
                3D
              </div>
              <div>
                <p className="font-serif text-xl font-semibold text-[var(--foreground)]">Nothing to ship yet</p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
                  Generate a model in the previous step, then return here to lock in delivery details.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Summary rail */}
        <aside className="flex w-full shrink-0 flex-col gap-3 xl:max-h-full xl:w-[280px] xl:gap-4 xl:overflow-y-auto xl:overscroll-contain">
          <div
            className="rounded-2xl border border-[rgba(28,24,21,0.07)] bg-[var(--paper)] p-4 shadow-[var(--shadow-sm)] sm:p-5"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(250,243,235,0.5) 0%, transparent 40%)`,
            }}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
              Summary
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-[rgba(28,24,21,0.06)] pb-3">
                <dt className="text-[var(--muted)]">Print size</dt>
                <dd className="text-right font-semibold text-[var(--foreground)]">
                  {sizeOption.label}
                  <span className="block text-xs font-normal text-[var(--muted)]">{sizeOption.targetHeightMm} mm</span>
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-[rgba(28,24,21,0.06)] pb-3">
                <dt className="text-[var(--muted)]">Subtotal (est.)</dt>
                <dd className="font-serif text-lg font-semibold text-[var(--accent)] tabular-nums">
                  {formatUsd(estimatedPriceUsd)}
                </dd>
              </div>
              {scaledDimensions ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Bounding box</dt>
                  <dd className="text-right font-mono text-xs text-[var(--foreground)]">
                    {scaledDimensions.widthMm}×{scaledDimensions.heightMm}×{scaledDimensions.depthMm} mm
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-2xl border border-[rgba(28,24,21,0.07)] bg-[var(--paper)] p-5 shadow-[var(--shadow-sm)]">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
              Brief
            </p>
            <p className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)] sm:max-h-36">
              {currentPrompt || "No prompt yet."}
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-[var(--line)] px-4 py-3.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--cream)]"
          >
            Back to customize
          </button>
        </aside>
      </div>
    </div>
  );
}
