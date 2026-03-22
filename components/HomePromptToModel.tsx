"use client";

import Image from "next/image";
import HomeHeroThreePreview from "@/components/HomeHeroThreePreview";

/** Stable SVG gradient ids — useId() can mismatch SSR vs client under Next/Turbopack. */
const HOME_PROMPT_BRIDGE_GRAD_V = "home-prompt-bridge-grad-v";
const HOME_PROMPT_BRIDGE_GRAD_H = "home-prompt-bridge-grad-h";

type HomePromptToModelProps = {
  className?: string;
  /** Tighter layout and smaller 3D preview for above-the-fold heroes */
  compact?: boolean;
};

/** Motion path shared by ribbon + sparks (horizontal, sketch → model). */
const PATH_H = "M 18 46 C 48 12, 104 12, 134 40";
/** Vertical variant for narrow viewports */
const PATH_V = "M 24 10 C 44 36, 44 52, 24 66";

function SketchToModelArrow({
  variant,
  gradId,
  compact,
}: {
  variant: "horizontal" | "vertical";
  gradId: string;
  compact?: boolean;
}) {
  const isH = variant === "horizontal";
  const path = isH ? PATH_H : PATH_V;

  if (isH) {
    return (
      <svg
        className={`hidden shrink-0 lg:block lg:self-center ${compact ? "h-14 w-21 xl:w-24" : "h-20 w-30 sm:w-36 md:w-40 xl:w-44"}`}
        viewBox="0 0 152 80"
        fill="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="55%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
        </defs>

        {/* Shift art down so the curve reads centered vs tall sketch / 3D panels */}
        <g transform="translate(0 10)">
          {/* Drop-shadow ribbon */}
          <path
            d={path}
            stroke="#2a2421"
            strokeWidth="11"
            strokeLinecap="round"
            opacity="0.2"
            transform="translate(2.5 2)"
          />
          {/* Animated spark trail under the ribbon */}
          <path
            d={path}
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeOpacity="0.45"
            strokeDasharray="8 16"
          >
            <animate
              attributeName="stroke-dashoffset"
              dur="1.6s"
              from="0"
              to="-96"
              repeatCount="indefinite"
            />
          </path>
          {/* Solid gradient ribbon */}
          <path
            d={path}
            stroke={`url(#${gradId})`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Comic ink outline */}
          <path
            d={path}
            stroke="#2a2421"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Arrow head */}
          <path
            d="M 126 34 L 140 40 L 126 46 Z"
            fill="#9a3412"
            stroke="#2a2421"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Pencil / sketch nib */}
          <g transform="translate(2 30)">
            <rect
              x="0"
              y="6"
              width="20"
              height="10"
              rx="2"
              fill="#fef3c7"
              stroke="#2a2421"
              strokeWidth="2"
            />
            <path d="M 20 11 L 30 11 L 24 5 Z" fill="#2a2421" />
            <line
              x1="4"
              y1="9"
              x2="14"
              y2="9"
              stroke="#2a2421"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.35"
            />
          </g>

          {/* Sparks riding the curve */}
          {[
            { fill: "#fef9c3", r: 3.2, begin: "0s" },
            { fill: "#fdba74", r: 2.6, begin: "0.45s" },
            { fill: "#fed7aa", r: 2.8, begin: "0.9s" },
          ].map((s, i) => (
            <circle
              key={i}
              r={s.r}
              fill={s.fill}
              stroke="#2a2421"
              strokeWidth="1.2"
            >
              <animateMotion
                dur="2.6s"
                begin={s.begin}
                repeatCount="indefinite"
                path={path}
                rotate="0"
              />
            </circle>
          ))}
        </g>
      </svg>
    );
  }

  return (
    <svg
      className={`mx-auto lg:hidden ${compact ? "h-14 w-11" : "h-24 w-18"}`}
      viewBox="0 0 48 80"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
      </defs>
      <path
        d="M 22 4 V 76"
        stroke="#2a2421"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="5 7"
        opacity="0.25"
      />
      <path
        d={path}
        stroke={`url(#${gradId})`}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="10 16"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="1.9s"
          from="0"
          to="-104"
          repeatCount="indefinite"
        />
      </path>
      <path
        d={path}
        stroke="#2a2421"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M 18 58 L 24 70 L 30 58 Z"
        fill="#9a3412"
        stroke="#2a2421"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle r="2.8" cx="24" cy="8" fill="#fef3c7" stroke="#2a2421" strokeWidth="1.2" />
    </svg>
  );
}

function SketchDoodleDecoration({ compact }: { compact?: boolean }) {
  return (
    <svg
      className={`pointer-events-none absolute -right-1 text-[#2a2421] opacity-[0.14] ${compact ? "bottom-2 h-10 w-10" : "bottom-3 h-14 w-14"}`}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 44c12-18 28-22 40-8s8 20-4 24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="14"
        y="12"
        width="36"
        height="26"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 4"
        transform="rotate(-8 32 25)"
      />
    </svg>
  );
}

/**
 * Hero diagram: Sketch → (creative arrow) → real WebGL 3D preview.
 */
export default function HomePromptToModel({
  className = "",
  compact = false,
}: HomePromptToModelProps) {
  const bridgeGradV = HOME_PROMPT_BRIDGE_GRAD_V;
  const bridgeGradH = HOME_PROMPT_BRIDGE_GRAD_H;

  return (
    <div
      className={`w-full max-w-none ${compact ? "flex min-h-0 max-h-full flex-col" : ""} ${className}`}
      role="img"
      aria-label="Diagram: your sketch becomes a 3D model you can orbit"
    >
      <div
        className={`home-prompt-stage relative border-[#2a2421] bg-[var(--paper)] shadow-[10px_10px_0_rgba(42,36,33,0.14)] sm:shadow-[14px_14px_0_rgba(42,36,33,0.12)] ${
          compact
            ? "max-h-full min-h-0 overflow-hidden rounded-xl border-2 shadow-[6px_6px_0_rgba(42,36,33,0.12)] sm:rounded-[1.25rem] sm:border-[2.5px]"
            : "overflow-visible rounded-[1.75rem] border-[3px] sm:rounded-[2rem] sm:border-4"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.11]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #2a2421 1px, transparent 0)`,
            backgroundSize: "10px 10px",
          }}
        />
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[rgba(194,65,12,0.12)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[rgba(93,64,43,0.07)] blur-3xl" />

        <div
          className={`relative z-10 flex flex-col lg:flex-row lg:items-center ${
            compact
              ? "min-h-0 gap-2 overflow-hidden p-2.5 sm:gap-2.5 sm:p-3 lg:gap-2.5 lg:p-3 lg:items-stretch xl:gap-3 xl:p-3.5"
              : "gap-4 p-5 sm:p-6 md:p-7 lg:gap-5 xl:gap-8 lg:p-8 xl:p-10"
          }`}
        >
          {/* Sketch */}
          <div
            className={`home-prompt-note relative w-full shrink-0 ${
              compact
                ? "min-h-0 min-w-0 max-w-full lg:max-w-[260px] xl:max-w-[280px]"
                : "max-w-[420px] lg:max-w-[min(100%,380px)] xl:max-w-[400px]"
            }`}
          >
            <div
              className="absolute -left-1 top-3 h-8 w-3 rotate-[-8deg] rounded-sm bg-[rgba(194,65,12,0.35)]"
              aria-hidden
            />
            <div
              className="absolute -right-0.5 top-8 h-7 w-3 rotate-[6deg] rounded-sm bg-[rgba(22,101,52,0.28)]"
              aria-hidden
            />

            <div
              className={`relative overflow-hidden rounded-lg border-[#2a2421] border-dashed bg-[#fffdf5] shadow-[5px_5px_0_#2a2421] ${
                compact
                  ? "border-2 p-2.5 sm:p-3"
                  : "rounded-xl border-[2.5px] p-4 sm:p-5"
              }`}
            >
              <SketchDoodleDecoration compact={compact} />
              <div className="relative flex items-start justify-between gap-3">
                <span className="inline-flex items-center rounded-md border-[2.5px] border-[#2a2421] bg-[#fff7ed] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#2a2421]">
                  Sketch
                </span>
                <span
                  className="select-none font-mono text-[10px] font-bold leading-none text-[var(--muted)]"
                  aria-hidden
                >
                  robot-sketch.png
                </span>
              </div>
              <div
                className={`relative mt-3 w-full overflow-hidden rounded-md border-2 border-dashed border-[#2a2421]/20 bg-white/60 ${
                  compact
                    ? "h-[5.25rem] sm:h-[5.75rem]"
                    : "h-[10rem] sm:h-[11.5rem]"
                }`}
              >
                <Image
                  src="/showcase/sketch-robot.png"
                  alt="Hand-drawn robot sketch"
                  fill
                  className="object-contain object-center p-1.5 sm:p-2"
                  sizes={
                    compact
                      ? "(max-width: 1024px) 85vw, 280px"
                      : "(max-width: 768px) 90vw, 400px"
                  }
                  priority
                />
              </div>
              <p
                className={`relative font-mono leading-snug text-[#2a2421] ${
                  compact
                    ? "mt-2 text-[0.78rem] sm:text-[0.82rem]"
                    : "mt-3.5 text-[0.9rem] leading-relaxed sm:text-[0.95rem]"
                }`}
              >
                {compact
                  ? "Chunky robot, antenna, big feet — rough lines OK…"
                  : "Chunky robot · antenna · big feet — rough lines are fine…"}
                <span className="home-prompt-caret" aria-hidden />
              </p>
              {!compact && (
                <p className="relative mt-2 text-[11px] font-semibold leading-snug text-[var(--muted)]">
                  Messy is OK — we help turn this into a clean prompt.
                </p>
              )}
              {!compact && (
                <div
                  className="relative mt-4 flex items-center gap-2 border-t-2 border-dotted border-[#2a2421]/25 pt-3"
                  aria-hidden
                >
                  <span className="h-1.5 flex-1 rounded-full bg-[var(--accent)]/25" />
                  <span className="h-1.5 w-8 rounded-full bg-[var(--sage)]/30" />
                  <span className="h-1.5 w-4 rounded-full bg-[#2a2421]/15" />
                </div>
              )}
            </div>
          </div>

          <SketchToModelArrow variant="vertical" gradId={bridgeGradV} compact={compact} />
          <SketchToModelArrow variant="horizontal" gradId={bridgeGradH} compact={compact} />

          {/* WebGL hero: same chrome as ModelViewer embed (cream panel + dashed accent) */}
          <div
            className={`home-prompt-vault relative shrink-0 overflow-hidden border-2 border-dashed bg-gradient-to-b from-[var(--cream)] to-[var(--panel)] transition-colors duration-300 ${
              compact
                ? "mx-auto aspect-square rounded-lg h-[min(9rem,min(calc(100svh-18rem),calc(100dvh-18rem)))] w-[min(9rem,min(calc(100svh-18rem),calc(100dvh-18rem)))] sm:h-[min(10rem,min(calc(100svh-16.5rem),calc(100dvh-16.5rem)))] sm:w-[min(10rem,min(calc(100svh-16.5rem),calc(100dvh-16.5rem)))] sm:rounded-xl lg:mx-0 lg:ml-auto lg:h-[min(12.5rem,min(calc(100svh-11.5rem),calc(100dvh-11.5rem)))] lg:w-[min(12.5rem,min(calc(100svh-11.5rem),calc(100dvh-11.5rem)))] xl:h-[min(13.5rem,min(calc(100svh-10.5rem),calc(100dvh-10.5rem)))] xl:w-[min(13.5rem,min(calc(100svh-10.5rem),calc(100dvh-10.5rem)))]"
                : "aspect-square w-full max-w-[min(100%,520px)] min-w-0 rounded-xl sm:max-w-[560px] lg:mx-0 lg:ml-auto lg:max-w-[min(100%,min(640px,52vw))] xl:max-w-[min(100%,min(720px,48vw))]"
            }`}
            style={{
              borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
            }}
          >
            <HomeHeroThreePreview className="absolute inset-0 h-full w-full" />
          </div>
        </div>
      </div>

      {!compact && (
        <p className="mt-4 text-center text-sm font-bold text-[#2a2421]">
          <span className="rounded-full bg-[var(--cream)] px-3 py-1 ring-2 ring-[#2a2421]/10">
            Sketch
          </span>{" "}
          <span className="text-[var(--accent)]">→</span>{" "}
          <span className="rounded-full bg-[rgba(22,101,52,0.12)] px-3 py-1 text-[var(--sage)] ring-2 ring-[var(--sage)]/15">
            3D Model
          </span>
        </p>
      )}
    </div>
  );
}
