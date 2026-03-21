"use client";

import { useState } from "react";
import {
  formatUsd,
  getModelSizeOption,
  type ModelSizeId,
} from "@/lib/app-config";

export default function PrintOrderForm({
  disabled,
  defaultEmail,
  size,
  estimatedPriceUsd,
  onSubmit,
}: {
  disabled: boolean;
  defaultEmail: string;
  size: ModelSizeId;
  estimatedPriceUsd: number;
  onSubmit: (payload: {
    size: ModelSizeId;
    targetHeightMm: number;
    contactName: string;
    email: string;
    shippingAddress: string;
    notes: string;
  }) => Promise<void>;
}) {
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSize = getModelSizeOption(size);

  return (
    <form
      className="space-y-5 rounded-[2rem] bg-white p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        void onSubmit({
          size,
          targetHeightMm: selectedSize.targetHeightMm,
          contactName,
          email: email || defaultEmail,
          shippingAddress,
          notes,
        })
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
      }}
    >
      <div className="space-y-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--accent)]">
          Final order
        </p>
        <h3
          className="text-4xl font-semibold text-[var(--foreground)]"
          style={{ fontFamily: "var(--font-newsreader), serif" }}
        >
          Share your delivery details
        </h3>
      </div>

      <div className="grid gap-4 rounded-[1.75rem] bg-[var(--panel)] p-5 md:grid-cols-2">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--muted)]">
            Selected size
          </p>
          <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
            {selectedSize.label} · {selectedSize.targetHeightMm} mm tall
          </p>
        </div>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--muted)]">
            Estimated price
          </p>
          <p className="mt-2 text-lg font-semibold text-[var(--accent)]">
            {formatUsd(estimatedPriceUsd)}
          </p>
        </div>
      </div>

      <input
        className="w-full rounded-[1.5rem] border border-[rgba(186,176,164,0.32)] bg-[var(--cream)] px-4 py-3 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)]/70 focus:border-[rgba(165,60,44,0.35)]"
        placeholder="Contact name"
        value={contactName}
        onChange={(event) => setContactName(event.target.value)}
        required
        disabled={disabled || submitting}
      />
      <input
        className="w-full rounded-[1.5rem] border border-[rgba(186,176,164,0.32)] bg-[var(--cream)] px-4 py-3 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)]/70 focus:border-[rgba(165,60,44,0.35)]"
        placeholder="Email"
        type="email"
        value={email || defaultEmail}
        onChange={(event) => setEmail(event.target.value)}
        required
        disabled={disabled || submitting}
      />
      <textarea
        className="min-h-28 w-full rounded-[1.5rem] border border-[rgba(186,176,164,0.32)] bg-[var(--cream)] px-4 py-3 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)]/70 focus:border-[rgba(165,60,44,0.35)]"
        placeholder="Shipping address"
        value={shippingAddress}
        onChange={(event) => setShippingAddress(event.target.value)}
        required
        disabled={disabled || submitting}
      />
      <textarea
        className="min-h-24 w-full rounded-[1.5rem] border border-[rgba(186,176,164,0.32)] bg-[var(--cream)] px-4 py-3 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)]/70 focus:border-[rgba(165,60,44,0.35)]"
        placeholder="Optional notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        disabled={disabled || submitting}
      />
      <button
        type="submit"
        disabled={disabled || submitting}
        className="w-full rounded-[1.75rem] px-4 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, var(--accent-soft), var(--accent))" }}
      >
        {submitting ? "Submitting..." : "Request print quote"}
      </button>
      {error ? <p className="text-sm text-[#b54b4b]">{error}</p> : null}
    </form>
  );
}
