/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import TopNavBar from "@/components/ui/TopNavBar";
import BottomNavBar from "@/components/ui/BottomNavBar";

const STATS = ["Sturdiness: Strong", "Details: Fine", "94% Safe", "14 Hours"];

export default function ValidatePage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface overflow-hidden">
      <TopNavBar />

      {/* Stepper bar */}
      <div className="w-full bg-surface-container border-b border-outline/20">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <nav className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-outline/30 -translate-y-1/2 z-0" />

            {/* Step 1 – Create (completed) */}
            <div className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer opacity-50">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-primary/40 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">brush</span>
              </div>
              <span className="text-[10px] font-jakarta font-bold uppercase tracking-widest">
                Create
              </span>
            </div>

            {/* Step 2 – Validate (active) */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full heart-gradient flex items-center justify-center text-white shadow-lg ring-4 ring-white scale-110">
                <span className="material-symbols-outlined text-2xl">
                  fact_check
                </span>
              </div>
              <span className="text-[10px] font-jakarta font-extrabold uppercase tracking-widest text-primary">
                Validate
              </span>
            </div>

            {/* Step 3 – Order (upcoming) */}
            <div className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer opacity-50">
              <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-500">
                <span className="material-symbols-outlined text-xl">
                  shopping_cart
                </span>
              </div>
              <span className="text-[10px] font-jakarta font-bold uppercase tracking-widest">
                Order
              </span>
            </div>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 relative flex overflow-hidden">
        {/* Left – 3D preview */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, #a53c2c 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative w-4/5 h-4/5 flex items-center justify-center">
            <img
              className="max-h-full drop-shadow-2xl rounded-3xl border-4 border-white"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcK3wYt5PLgWAffT33tAayP0k89xYpMEDERDrnSjBJdt2X_ssFTj6SVeF4eNLemdzpTjywEsQAo3q5XG9yP1dsmazko6EsUregIJq6PzA0OqPqfFD2HZe2Nv4Ze39wdiymoiDdLZGVCahhALrZ1I_LZ8hx8WLKnMCgQvmNA1QjU-XukW1Rgcf-dg9Y6kcQhpdVPabsBRoxpk_VhV3gafnknnjUk7w0MiEr959aLOjnnZUn_4YZymX_SBKA8_a409u8BldqUwjuoXo"
              alt="3D Model Preview"
            />

            {/* Floating assistant bubble */}
            <div className="absolute -top-4 -right-4 bg-white p-4 rounded-2xl shadow-xl border border-outline/20 max-w-[200px] flex gap-3 items-start animate-bounce-slow">
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-sm">face</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                  Maker&apos;s Assistant
                </p>
                <p className="text-xs text-on-surface/80 font-serif italic">
                  &ldquo;This idea looks quite sturdy!&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right – Settings panel */}
        <div className="w-[420px] h-full flex flex-col gap-6 p-6 overflow-y-auto custom-scrollbar bg-surface-container border-l border-outline/20">
          {/* Printability check */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-outline/20 space-y-6">
            <h3 className="text-base font-jakarta font-extrabold text-secondary tracking-tight">
              Idea Printability Check
            </h3>
            <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary-container/20 border border-secondary/10">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">
                  visibility
                </span>
                <span className="text-sm font-semibold text-secondary">
                  See Hotspots
                </span>
              </div>
              <div className="w-10 h-5 rounded-full bg-secondary relative">
                <div className="absolute right-1 top-1 w-3 h-3 rounded-full bg-white" />
              </div>
            </button>
            <div className="grid grid-cols-2 gap-3">
              {STATS.map((item) => (
                <div
                  key={item}
                  className="bg-stone-50 p-4 rounded-2xl border border-stone-100 text-xs font-bold"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* Size controls */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-outline/20 space-y-6">
            <h3 className="text-base font-jakarta font-extrabold text-primary">
              Personalize Your Size
            </h3>
            <div className="relative h-2 w-full bg-stone-100 rounded-full">
              <div className="absolute left-0 top-0 h-full w-[62%] bg-primary-container rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input
                defaultValue="142.0"
                className="bg-stone-50 border-0 border-b-2 border-stone-200 text-sm text-center font-bold"
              />
              <input
                defaultValue="98.2"
                className="bg-stone-50 border-0 border-b-2 border-stone-200 text-sm text-center font-bold"
              />
              <input
                defaultValue="210.5"
                className="bg-stone-50 border-0 border-b-2 border-stone-200 text-sm text-center font-bold"
              />
            </div>
          </section>

          {/* CTA */}
          <div className="mt-auto pt-4 space-y-4">
            <Link
              href="/checkout"
              className="w-full h-20 heart-gradient text-white font-extrabold text-lg rounded-3xl shadow-xl flex items-center justify-center gap-3 active:scale-95"
            >
              <span className="material-symbols-outlined text-2xl">
                rocket_launch
              </span>{" "}
              Send to Workshop
            </Link>
          </div>
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
