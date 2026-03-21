"use client";

import { useMemo, useState } from "react";
import { MODEL_SIZE_OPTIONS, type ModelSizeId } from "@/lib/app-config";

type DimensionPreview = {
  width: number;
  height: number;
  depth: number;
} | null;

export default function PrintOrderForm({
  disabled,
  defaultEmail,
  modelBounds,
  onSubmit,
}: {
  disabled: boolean;
  defaultEmail: string;
  modelBounds: DimensionPreview;
  onSubmit: (payload: {
    size: ModelSizeId;
    targetHeightMm: number;
    contactName: string;
    email: string;
    shippingAddress: string;
    notes: string;
  }) => Promise<void>;
}) {
  const [size, setSize] = useState<ModelSizeId>("medium");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSize = useMemo(
    () => MODEL_SIZE_OPTIONS.find((option) => option.id === size)!,
    [size],
  );
  const dimensionPreview = useMemo(() => {
    if (!modelBounds || modelBounds.height <= 0) {
      return null;
    }

    const scale = selectedSize.targetHeightMm / modelBounds.height;
    return {
      widthMm: Math.round(modelBounds.width * scale),
      heightMm: Math.round(modelBounds.height * scale),
      depthMm: Math.round(modelBounds.depth * scale),
    };
  }, [modelBounds, selectedSize.targetHeightMm]);

  return (
    <form
      className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5"
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
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-white">Request a print quote</h3>
        <p className="text-sm text-slate-400">
          Choose a print size and leave your shipping details.
        </p>
      </div>

      <div className="grid gap-3">
        {MODEL_SIZE_OPTIONS.map((option) => (
          <label
            key={option.id}
            className={`rounded-2xl border p-3 transition ${
              size === option.id
                ? "border-cyan-400 bg-cyan-400/10"
                : "border-white/10 bg-slate-950/40"
            }`}
          >
            <input
              className="sr-only"
              type="radio"
              name="size"
              checked={size === option.id}
              onChange={() => setSize(option.id)}
              disabled={disabled || submitting}
            />
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">{option.label}</span>
              <span className="text-sm text-cyan-200">{option.targetHeightMm} mm</span>
            </div>
            <p className="mt-1 text-sm text-slate-400">{option.description}</p>
          </label>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
        {dimensionPreview ? (
          <p>
            Estimated footprint: {dimensionPreview.widthMm} x {dimensionPreview.heightMm} x{" "}
            {dimensionPreview.depthMm} mm
          </p>
        ) : (
          <p>The live size estimate will appear once the model preview loads.</p>
        )}
      </div>

      <input
        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
        placeholder="Contact name"
        value={contactName}
        onChange={(event) => setContactName(event.target.value)}
        required
        disabled={disabled || submitting}
      />
      <input
        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
        placeholder="Email"
        type="email"
        value={email || defaultEmail}
        onChange={(event) => setEmail(event.target.value)}
        required
        disabled={disabled || submitting}
      />
      <textarea
        className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
        placeholder="Shipping address"
        value={shippingAddress}
        onChange={(event) => setShippingAddress(event.target.value)}
        required
        disabled={disabled || submitting}
      />
      <textarea
        className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
        placeholder="Optional notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        disabled={disabled || submitting}
      />
      <button
        type="submit"
        disabled={disabled || submitting}
        className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
      >
        {submitting ? "Submitting..." : "Request print quote"}
      </button>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </form>
  );
}
