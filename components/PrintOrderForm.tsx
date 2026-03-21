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
      className="space-y-5 rounded-2xl bg-white p-6 shadow-[var(--shadow)]"
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
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          Final order
        </p>
        <h3 className="font-serif text-3xl font-semibold text-[var(--foreground)]">
          Share your delivery details
        </h3>
      </div>

      <div className="grid gap-4 rounded-xl bg-[var(--panel)] p-4 md:grid-cols-2">
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
        className="studio-input rounded-xl"
        placeholder="Contact name"
        value={contactName}
        onChange={(event) => setContactName(event.target.value)}
        required
        disabled={disabled || submitting}
      />
      <input
        className="studio-input rounded-xl"
        placeholder="Email"
        type="email"
        value={email || defaultEmail}
        onChange={(event) => setEmail(event.target.value)}
        required
        disabled={disabled || submitting}
      />
      <textarea
        className="studio-input min-h-28 rounded-xl"
        placeholder="Shipping address"
        value={shippingAddress}
        onChange={(event) => setShippingAddress(event.target.value)}
        required
        disabled={disabled || submitting}
      />
      <textarea
        className="studio-input min-h-24 rounded-xl"
        placeholder="Optional notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        disabled={disabled || submitting}
      />
      <button
        type="submit"
        disabled={disabled || submitting}
        className="btn-copper w-full rounded-full py-3.5 text-sm uppercase tracking-[0.1em]"
      >
        {submitting ? "Submitting..." : "Request print quote"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
