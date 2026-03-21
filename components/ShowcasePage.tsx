"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { useEffect, useRef, useState } from "react";

const ModelViewer = dynamic(() => import("@/components/ModelViewer"), { ssr: false });

const SHOWCASE_ITEMS = [
  {
    id: "dragon-planter",
    prompt: "A tiny dragon curled around a succulent planter, with scales that double as drainage holes",
    tag: "From words",
    rotation: "-2.4deg",
    accent: "var(--accent)",
    thumbnail: "/showcase/dragon-planter.jpg",
    note: "Succulent-sized, ready to dress up a desk",
  },
  {
    id: "geometric-lamp",
    prompt: "Geometric lampshade inspired by Voronoi patterns, casts organic shadow patterns on the wall",
    tag: "From words",
    rotation: "1.8deg",
    accent: "var(--sage)",
    thumbnail: "/showcase/geometric-lamp.jpg",
    note: "Light that paints the wall in soft shapes",
  },
  {
    id: "sketch-robot",
    prompt: null,
    sketchLines: true,
    tag: "From a sketch",
    rotation: "-1.2deg",
    accent: "#7c3aed",
    thumbnail: "/showcase/sketch-robot.jpg",
    note: "From a napkin sketch",
    sketchLabel: "\"Make this little guy real\"",
  },
  {
    id: "chess-piece",
    prompt: "A chess knight piece but it's a corgi wearing a tiny helmet, about 6cm tall",
    tag: "From words",
    rotation: "1.4deg",
    accent: "var(--sage)",
    glb: "/showcase/dog_opti.glb",
    note: "Small enough to hold, full of personality",
  },
];

function SketchDoodle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 60 C20 20, 40 10, 60 35 C80 60, 100 15, 110 40"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="4 3"
        opacity="0.5"
      />
      <circle cx="60" cy="35" r="12" stroke="currentColor" strokeWidth="2" strokeDasharray="3 4" opacity="0.3" />
      <path d="M45 55 L75 55" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      <path d="M50 62 L70 62" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
    </svg>
  );
}

function HandArrow({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d="M5 18 C15 8, 30 6, 50 12 C60 15, 68 14, 72 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M66 8 L73 13 L65 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScribbleUnderline({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 12" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <path
        d="M2 8 C30 3, 60 10, 100 6 C140 2, 170 9, 198 5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SketchPlaceholder({ seed, accent }: { seed: string; accent: string }) {
  const shapes = [];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  const abs = Math.abs(hash);

  const cx = 60 + (abs % 30);
  const cy = 50 + ((abs >> 4) % 20);
  const r = 20 + ((abs >> 8) % 15);
  shapes.push(
    <circle key="c1" cx={cx} cy={cy} r={r} stroke={accent} strokeWidth="2" fill="none" strokeDasharray="4 3" opacity="0.4" />
  );
  shapes.push(
    <rect key="r1" x={30 + ((abs >> 3) % 20)} y={25 + ((abs >> 6) % 15)} width={40 + ((abs >> 9) % 20)} height={35 + ((abs >> 12) % 15)}
      rx="4" stroke={accent} strokeWidth="1.5" fill="none" strokeDasharray="6 4" opacity="0.25" />
  );
  shapes.push(
    <path key="p1" d={`M${20 + ((abs >> 2) % 20)} ${70 + ((abs >> 5) % 20)} Q${70 + ((abs >> 7) % 20)} ${20 + ((abs >> 10) % 30)} ${120 + ((abs >> 1) % 20)} ${60 + ((abs >> 4) % 20)}`}
      stroke={accent} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
  );

  return (
    <svg viewBox="0 0 160 120" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="120" rx="8" fill="var(--panel)" opacity="0.5" />
      {shapes}
      <text x="80" y="110" textAnchor="middle" fontSize="7" fill="var(--muted)" opacity="0.5" fontFamily="var(--font-outfit)">preview</text>
    </svg>
  );
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function ShowcaseCard({
  item,
  index,
}: {
  item: (typeof SHOWCASE_ITEMS)[number];
  index: number;
}) {
  const { ref, visible } = useInView(0.1);
  const isSketch = item.sketchLines;
  const imageAlt = item.prompt
    ? `Idea: ${item.prompt}`
    : `Idea: ${item.sketchLabel ?? "sketch"}`;

  return (
    <div
      ref={ref}
      className={`showcase-card group ${visible ? "showcase-card--visible" : ""}`}
      style={{
        "--card-rotation": item.rotation,
        "--card-delay": `${index * 0.09}s`,
        "--card-accent": item.accent,
      } as React.CSSProperties}
    >
      {/* Tape strip */}
      <div className="tape-strip" />

      {/* Tag */}
      <div className="absolute -top-3 right-4 z-10 rounded-full border-2 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{
          borderColor: item.accent,
          color: item.accent,
          background: "var(--paper)",
          transform: `rotate(${parseFloat(item.rotation) > 0 ? "-3" : "2"}deg)`,
        }}
      >
        {item.tag}
      </div>

      {/* Prompt or sketch first (flows into 3D below) */}
      <div className="mb-3 min-h-[60px]">
        {isSketch ? (
          <div className="flex items-start gap-2">
            <SketchDoodle className="mt-1 h-10 w-16 shrink-0" style={{ color: item.accent } as React.CSSProperties} />
            <p className="font-serif text-sm italic leading-relaxed text-[var(--foreground)]">
              {item.sketchLabel}
            </p>
          </div>
        ) : (
          <p className="font-serif text-sm leading-relaxed text-[var(--foreground)]">
            &ldquo;{item.prompt}&rdquo;
          </p>
        )}
      </div>

      {/* Arrow: prompt/sketch → 3D (points down) */}
      <div className="my-1 flex items-center justify-center" style={{ color: item.accent }}>
        <HandArrow className="h-16 w-5 rotate-90 opacity-50" />
      </div>

      {/* Model preview */}
      <div className="relative mt-2 aspect-[4/3] overflow-hidden rounded-xl border-2 border-dashed transition-colors duration-300"
        style={{ borderColor: `color-mix(in srgb, ${item.accent} 30%, transparent)` }}
      >
        {"glb" in item && item.glb ? (
          <div className="absolute inset-0">
            <ModelViewer
              modelUrl={item.glb}
              layout="embed"
              loadingLabel="Loading 3D"
            />
          </div>
        ) : item.thumbnail ? (
          <Image
            src={item.thumbnail}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <SketchPlaceholder seed={item.id} accent={item.accent} />
        )}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="rounded-full bg-white/90 px-4 py-2 text-xs font-bold shadow-lg backdrop-blur-sm"
            style={{ color: item.accent }}
          >
            {"glb" in item && item.glb ? "Drag to rotate" : "Preview ↗"}
          </div>
        </div>
      </div>

      {/* Note at bottom */}
      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">
        {item.note}
      </p>
    </div>
  );
}

export default function ShowcasePage() {
  const createHref = "/create";
  const { ref: heroRef, visible: heroVisible } = useInView(0.05);
  const { ref: ctaRef, visible: ctaVisible } = useInView(0.1);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      {/* Hero — the workbench */}
      <section
        ref={heroRef}
        className="relative overflow-hidden border-b-2 border-dashed border-[var(--line-strong)] px-4 pb-16 pt-12 sm:px-6 lg:px-8"
      >
        {/* Background decorations */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-12 top-16 h-64 w-64 rounded-full bg-[rgba(194,65,12,0.04)] blur-3xl" />
          <div className="absolute -left-8 bottom-0 h-48 w-48 rounded-full bg-[rgba(22,101,52,0.04)] blur-3xl" />
          {/* Grid dots */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-dots" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="var(--foreground)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-dots)" />
          </svg>
        </div>

        <div className={`relative z-10 mx-auto max-w-5xl text-center ${heroVisible ? "animate-fade-up" : "opacity-0"}`}>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--muted)]">
            what people are making
          </p>

          <h1 className="mt-6 font-serif text-5xl font-semibold leading-[1.1] text-[var(--foreground)] sm:text-6xl lg:text-7xl">
            From{" "}
            <span className="relative inline-block">
              <span className="relative z-10 italic" style={{ color: "var(--accent)" }}>
                rough ideas
              </span>
              <ScribbleUnderline className="absolute -bottom-2 left-0 right-0 z-0 h-3 w-full text-[var(--accent)] opacity-40" />
            </span>
            <br />
            to real objects.
          </h1>

          <p className="mx-auto mt-6 max-w-lg font-serif text-lg leading-relaxed text-[var(--muted)]">
            A quick sketch on a napkin. A half-baked idea at 2am.
            Here&rsquo;s what happens when you let it run.
          </p>
        </div>
      </section>

      {/* Showcase grid */}
      <section className="grain relative px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2">
          {SHOWCASE_ITEMS.map((item, i) => (
            <ShowcaseCard key={item.id} item={item} index={i} />
          ))}
        </div>

        {/* Scattered annotations */}
        <div className="pointer-events-none absolute left-[6%] top-[32%] z-20 hidden max-w-[11rem] rotate-[-8deg] rounded-md border border-[var(--line)] bg-[var(--paper)]/95 px-3 py-2 font-mono text-[11px] font-semibold uppercase leading-snug tracking-[0.12em] text-[var(--accent)] shadow-[var(--shadow-sm)] backdrop-blur-sm lg:block">
          feels instant when you&rsquo;re in the flow →
        </div>
        <div className="pointer-events-none absolute bottom-[18%] right-[4%] z-20 hidden max-w-[11rem] rotate-[5deg] rounded-md border border-[var(--line)] bg-[var(--paper)]/95 px-3 py-2 font-mono text-[11px] font-semibold uppercase leading-snug tracking-[0.12em] text-[var(--sage)] shadow-[var(--shadow-sm)] backdrop-blur-sm lg:block">
          ← napkin sketch energy
        </div>
      </section>

      {/* Process strip */}
      <section className="border-y-2 border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--muted)]">
            How it works (seriously, that&rsquo;s it)
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row sm:justify-center sm:gap-0">
            {[
              { step: "01", label: "Describe it", sub: "or upload a sketch" },
              { step: "02", label: "AI refines it", sub: "back-and-forth chat" },
              { step: "03", label: "Preview your piece", sub: "look from every angle" },
              { step: "04", label: "Order a print", sub: "real thing, shipped" },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-0">
                <div className="text-center sm:px-3">
                  <span className="font-mono text-2xl font-bold" style={{ color: i % 2 === 0 ? "var(--accent)" : "var(--sage)" }}>
                    {s.step}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{s.label}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">{s.sub}</p>
                </div>
                {i < 3 && (
                  <div className="hidden text-[var(--line-strong)] sm:block">
                    <HandArrow className="h-4 w-12" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        ref={ctaRef}
        className="relative px-4 py-24 sm:px-6 lg:px-8"
      >
        <div className={`mx-auto max-w-2xl text-center ${ctaVisible ? "animate-fade-up" : "opacity-0"}`}>
          <h2 className="font-serif text-4xl font-semibold text-[var(--foreground)] sm:text-5xl">
            Your turn.
          </h2>
          <p className="mx-auto mt-4 max-w-md font-serif text-lg text-[var(--muted)]">
            Got something rattling around in your head? Throw it at us.
            Worst case you get something you can hold up and show people.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href={createHref}
              className="btn-copper rounded-full px-8 py-4 text-sm"
            >
              Start creating
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl justify-center">
          <p className="text-center text-sm font-medium tracking-wide text-[var(--muted)]">
            Made with ❤️ during the Cursor Hackathon Heilbronn 🚀
          </p>
        </div>
      </footer>
    </main>
  );
}
