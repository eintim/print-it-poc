"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatUsd,
  getModelSizeOption,
  type ModelSizeId,
} from "@/lib/app-config";

/** Matches `app/api/orders/route.ts` — validated on trimmed value before submit. */
const SHIPPING_ADDRESS_MIN_LEN = 10;
const SHIPPING_ADDRESS_MAX_LEN = 500;

type SubmitPayload = {
  size: ModelSizeId;
  targetHeightMm: number;
  contactName: string;
  email: string;
  shippingAddress: string;
  notes: string;
};

export default function PrintOrderForm({
  disabled,
  defaultEmail,
  size,
  estimatedPriceUsd,
  onSubmit,
  embedded = false,
  mockPayment = false,
  submitLabel,
}: {
  disabled: boolean;
  defaultEmail: string;
  size: ModelSizeId;
  estimatedPriceUsd: number;
  /** When true, no outer card — parent provides the white shell (workspace order step). */
  embedded?: boolean;
  /** Opens a demo checkout dialog before calling `onSubmit`. */
  mockPayment?: boolean;
  submitLabel?: string;
  onSubmit: (payload: SubmitPayload) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const shippingRef = useRef<HTMLTextAreaElement>(null);
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<SubmitPayload | null>(null);

  const selectedSize = getModelSizeOption(size);
  const resolvedSubmitLabel = submitLabel ?? "Request print quote";

  const formClassName = embedded
    ? "flex h-full min-h-0 flex-col gap-4"
    : "space-y-5 rounded-2xl bg-white p-6 shadow-[var(--shadow)]";

  const runSubmit = (payload: SubmitPayload) => {
    setSubmitting(true);
    setError(null);
    void onSubmit(payload)
      .catch((submitError) => {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Could not submit the quote request.",
        );
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const onDialogClose = () => {
      setPendingPayload(null);
      setPaySubmitting(false);
      setDialogError(null);
    };
    dialog.addEventListener("close", onDialogClose);
    return () => dialog.removeEventListener("close", onDialogClose);
  }, []);

  const handleConfirmMockPayment = () => {
    if (!pendingPayload) {
      return;
    }
    setPaySubmitting(true);
    setDialogError(null);
    void onSubmit(pendingPayload)
      .then(() => {
        dialogRef.current?.close();
        setPendingPayload(null);
      })
      .catch((submitError) => {
        setDialogError(
          submitError instanceof Error
            ? submitError.message
            : "Could not submit the quote request.",
        );
      })
      .finally(() => {
        setPaySubmitting(false);
      });
  };

  return (
    <>
      <form
        ref={formRef}
        className={formClassName}
        onSubmit={(event) => {
          event.preventDefault();
          const form = formRef.current;
          const shippingEl = shippingRef.current;
          if (!form) {
            return;
          }

          const trimmedShipping = shippingAddress.trim();
          if (trimmedShipping.length < SHIPPING_ADDRESS_MIN_LEN) {
            shippingEl?.setCustomValidity(
              `Enter a complete mailing address (at least ${SHIPPING_ADDRESS_MIN_LEN} characters, not counting leading or trailing spaces).`,
            );
            shippingEl?.reportValidity();
            return;
          }
          if (trimmedShipping.length > SHIPPING_ADDRESS_MAX_LEN) {
            shippingEl?.setCustomValidity(`Address must be at most ${SHIPPING_ADDRESS_MAX_LEN} characters.`);
            shippingEl?.reportValidity();
            return;
          }
          shippingEl?.setCustomValidity("");

          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const payload: SubmitPayload = {
            size,
            targetHeightMm: selectedSize.targetHeightMm,
            contactName,
            email: email || defaultEmail,
            shippingAddress: trimmedShipping,
            notes,
          };

          if (mockPayment) {
            setDialogError(null);
            setPendingPayload(payload);
            dialogRef.current?.showModal();
            return;
          }

          runSubmit(payload);
        }}
      >
        {!embedded ? (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              Final order
            </p>
            <h3 className="font-serif text-3xl font-semibold text-[var(--foreground)]">
              Share your delivery details
            </h3>
          </div>
        ) : null}

        <div className="grid shrink-0 gap-4 rounded-xl border border-[rgba(28,24,21,0.06)] bg-[var(--panel)]/80 p-4 md:grid-cols-2">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              Selected size
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
              {selectedSize.label} · {selectedSize.targetHeightMm} mm tall
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              Estimated price
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--accent)]">
              {formatUsd(estimatedPriceUsd)}
            </p>
          </div>
        </div>

        <input
          className="studio-input shrink-0 rounded-xl"
          placeholder="Contact name"
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          required
          disabled={disabled || submitting || paySubmitting}
        />
        <input
          className="studio-input shrink-0 rounded-xl"
          placeholder="Email"
          type="email"
          value={email || defaultEmail}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={disabled || submitting || paySubmitting}
        />
        <div className="shrink-0 space-y-1.5">
          <textarea
            ref={shippingRef}
            className={
              embedded
                ? "studio-input max-h-[100px] min-h-[76px] w-full resize-y rounded-xl sm:max-h-[120px] sm:min-h-[80px]"
                : "studio-input min-h-28 w-full rounded-xl"
            }
            name="shippingAddress"
            placeholder="Street, city, postal code, country"
            value={shippingAddress}
            onChange={(event) => {
              event.target.setCustomValidity("");
              setShippingAddress(event.target.value);
            }}
            required
            maxLength={SHIPPING_ADDRESS_MAX_LEN}
            disabled={disabled || submitting || paySubmitting}
            aria-describedby="shipping-address-hint"
          />
          <p id="shipping-address-hint" className="text-xs leading-relaxed text-[var(--muted)]">
            Full mailing address — at least {SHIPPING_ADDRESS_MIN_LEN} characters after trimming spaces (max{" "}
            {SHIPPING_ADDRESS_MAX_LEN}).
          </p>
        </div>
        <textarea
          className={
            embedded
              ? "studio-input min-h-20 shrink-0 resize-none rounded-xl"
              : "studio-input min-h-24 rounded-xl"
          }
          placeholder="Optional notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={disabled || submitting || paySubmitting}
        />
        <button
          type="submit"
          disabled={disabled || submitting || paySubmitting}
          className="group relative w-full shrink-0 overflow-hidden rounded-2xl py-4 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_12px_32px_rgba(194,65,12,0.28)] transition duration-300 hover:shadow-[0_16px_40px_rgba(194,65,12,0.34)] disabled:pointer-events-none disabled:opacity-45"
          style={{
            background: `linear-gradient(135deg, #9a3412 0%, var(--accent) 45%, #ea580c 100%)`,
          }}
        >
          <span
            className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
            style={{
              background: `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)`,
            }}
          />
          <span className="relative flex items-center justify-center gap-2">
            {submitting && !mockPayment ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Submitting…
              </>
            ) : (
              resolvedSubmitLabel
            )}
          </span>
        </button>
        {error ? (
          <p className="shrink-0 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {mockPayment ? (
      <dialog
        ref={dialogRef}
        className="print-order-mock-dialog fixed left-1/2 top-1/2 z-[200] m-0 max-h-[min(100dvh-2rem,36rem)] w-[min(100%,26rem)] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-[rgba(28,24,21,0.1)] bg-[var(--paper)] p-0 text-[var(--foreground)] shadow-[var(--shadow-lg)] backdrop:bg-[rgba(28,24,21,0.35)]"
      >
        <div
          className="relative overflow-hidden px-6 pb-6 pt-7"
          style={{
            backgroundImage: `
              linear-gradient(125deg, rgba(22,101,52,0.09) 0%, transparent 45%),
              linear-gradient(200deg, rgba(194,65,12,0.07) 0%, transparent 50%)
            `,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
            aria-hidden
          />
          <button
            type="button"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white/90 text-lg leading-none text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
          >
            ×
          </button>
          <p className="relative font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--sage)]">
            Demo checkout
          </p>
          <h4 className="relative mt-2 font-serif text-2xl font-semibold tracking-tight">
            Mock payment
          </h4>
          <p className="relative mt-2 text-sm leading-relaxed text-[var(--muted)]">
            This is a stand-in for Stripe or similar. No card is charged and no data leaves your session beyond the
            quote request.
          </p>

          <div className="relative mt-5 rounded-xl border border-[rgba(28,24,21,0.08)] bg-gradient-to-br from-[#1c1815] to-[#2d2620] p-4 text-white shadow-inner">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/55">Print It</p>
                <p className="mt-3 font-mono text-sm tracking-widest text-white/90">•••• •••• •••• 4242</p>
              </div>
              <span className="rounded-md bg-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/70">
                Demo
              </span>
            </div>
            <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-3">
              <span className="text-xs text-white/55">Due today</span>
              <span className="font-serif text-2xl font-semibold tabular-nums text-[#fdba74]">
                {formatUsd(estimatedPriceUsd)}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={paySubmitting || !pendingPayload}
            onClick={handleConfirmMockPayment}
            className="relative mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(22,101,52,0.35)] bg-[var(--sage)] py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_24px_rgba(22,101,52,0.25)] transition hover:brightness-110 disabled:opacity-45"
          >
            {paySubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Processing…
              </>
            ) : (
              <>Pay {formatUsd(estimatedPriceUsd)} — demo</>
            )}
          </button>
          <p className="relative mt-3 text-center text-xs text-[var(--muted)]">
            Confirms your quote request after the simulated payment.
          </p>
          {dialogError ? (
            <p className="relative mt-3 text-center text-sm text-red-600" role="alert">
              {dialogError}
            </p>
          ) : null}
        </div>
      </dialog>
      ) : null}
    </>
  );
}
