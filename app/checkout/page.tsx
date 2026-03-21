/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import TopNavBar from "@/components/ui/TopNavBar";
import BottomNavBar from "@/components/ui/BottomNavBar";

export default function CheckoutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNavBar />

      <main className="pt-12 pb-24 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left column */}
        <div className="lg:col-span-7 space-y-10">
          <section>
            <h1 className="font-jakarta text-5xl font-extrabold tracking-tight text-on-background mb-3">
              Your Custom Idea
            </h1>
            <p className="font-serif italic text-xl text-secondary opacity-80">
              Finalize the details of your handcrafted keepsake
            </p>
          </section>

          {/* Workshop card */}
          <div className="bg-surface-container p-8 rounded-xl border border-outline-warm space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-3xl">
                  home_pin
                </span>
              </div>
              <div>
                <p className="font-jakarta font-bold text-xl">
                  Maker&apos;s Studio Seattle
                </p>
                <p className="opacity-70">
                  Crafted locally for a smaller footprint
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between p-5 bg-white/60 rounded-[1rem] border border-secondary-container">
              <div className="flex items-center gap-4">
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  favorite
                </span>
                <p className="text-sm font-bold uppercase text-secondary">
                  Earth-Friendly Promise
                </p>
              </div>
              <div className="text-3xl font-serif italic font-bold text-secondary">
                A+
              </div>
            </div>
          </div>

          {/* Extras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-xl bg-white border border-outline-warm">
              <p className="font-jakarta font-bold text-lg">
                Signature Packaging
              </p>
              <p className="text-sm opacity-60">
                Recycled paper with velvet ribbon
              </p>
            </div>
            <div className="p-6 rounded-xl bg-white border border-outline-warm">
              <p className="font-jakarta font-bold text-lg">Handwritten Note</p>
              <textarea
                className="mt-2 w-full bg-warm-bg/50 border-outline-warm rounded-[1rem] text-sm p-3"
                placeholder="Type message..."
              />
            </div>
          </div>
        </div>

        {/* Right column – sticky summary */}
        <div className="lg:col-span-5">
          <div className="sticky top-28 space-y-6">
            <div className="bg-white rounded-2xl border border-outline-warm overflow-hidden shadow-xl">
              <img
                className="w-full aspect-square object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAoU3XL4gLpZcJeXDZQCZ22r5BsyCMxnR0J23N7Erh4eqgxTZMtSOh2lgo08dHV0mnX_DpFWyawl5TVflQ2j9EGPydVD4_UcyTrUeHosA1Gi-tCdh-GXSn5ESqBI_JisSwUnHOsYHh5Kqt9F7aTM73JKTIi6uBqtPsncev7CASXLv6pbQCHRi95FG_DLQY1DORZ6EyI3U-Z3EIuZMa5pdaZti0deyHAXD7QGlITtk0gItj-3DuEA6zjkwvg-XOxw2bH3TeZtudQPs"
                alt="Order preview"
              />
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-end pt-6 border-t">
                  <div>
                    <p className="text-[10px] font-bold text-primary uppercase">
                      Total Amount
                    </p>
                    <p className="text-4xl font-jakarta font-extrabold text-on-background">
                      $31.50
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-60">Estimated Delivery</p>
                    <p className="text-sm font-bold text-secondary">
                      October 24
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className="block w-full text-center py-5 rounded-xl bg-primary text-white font-jakarta font-extrabold text-xl shadow-lg"
                >
                  Complete My Idea
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
