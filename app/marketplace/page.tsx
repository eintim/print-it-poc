/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import TopNavBar from "@/components/ui/TopNavBar";
import BottomNavBar from "@/components/ui/BottomNavBar";

const SHOPS = [
  {
    name: "Seaside Prints",
    loc: "Brighton, UK",
    price: "12",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAaQrn5x3gUD9EEyl2c-kzsoT0zx-mRG1Ah7gVWUTKTIh3wpNcl9zKBWmjIW9tWD3y07kbj37w47FhXj6b909oBnRPJqIgwWl5qnuOMVaQ3LWDN6hPYA1Mr7HO5jF9s1lMriUMWzkdOaowyfUGYc0_jpgkS19XwQGTaDrWoiywEjdnDMa1P78jFd2SNf5y9SSytOyvVs0nwEJ130zyvnLZQFkCAdItekxn2I2YJOWdeBHVOo3TKvzI6U5Y6n3zewRg2aMIWfJ7IrO0",
    rating: "4.9",
    tags: ["FDM", "Bio"],
  },
  {
    name: "The Resin Room",
    loc: "Portland, US",
    price: "25",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDqkVLbtXxFaSmU1Z6_653IkYXe2jJQCQUs00nRUcFl_XdfJAN4bUiJJWvZjUE2DMktAL_MkS1RWVZrYpME0cQWJXHSxod1qnqdJqnLA3mZ0UAzCC47xSTUzBpzeiQfz4XPpMcZU39XEko_pSGJJAZ48Kdk6QbBCfQaZS_WAEsNntBfEd5fU0ZYSbXBXRy7w3tvhFSa9c9l4SQMWOihSTrCZSjPbR2FpX25MRYIFKezUpQPTh6tfmucky31M01mAewhm47EKuwRHrg",
    rating: "5.0",
    tags: ["Resin", "SLS"],
  },
  {
    name: "Mountain Forge",
    loc: "Munich, DE",
    price: "18",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAosz0moyvrRX8QZUGYXTbseE5KSKlXlCgRoPAKakC5yI0BzKUto8qWAOZD6n6OPea8bcX8_OAXu7euNjwDeFDYlOaGWSsf_zFfNZIrKJmjT5iLCKnH-kkEH0GB9MEhrCBJmGwEHMQRViKfW7cHv2QKrpVuKxilfvu1IkL6awzcaphh2bDzQtSpi_W7fUfmOBvcZgRBWaHmyPm-z1MzHZQOrzccrdXhAcIQPzfwzCc33nGTin3ANsV-c-uQvwGKWQab7yEDanK8tl4",
    rating: "4.7",
    tags: ["FDM", "Ind"],
  },
];

const TECHNIQUES = ["FDM (Filament)", "Resin (SLA/DLP)", "SLS (Powder)", "Bio-Materials"];

export default function MarketplacePage() {
  return (
    <div className="min-h-screen">
      <TopNavBar />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <section className="mb-16 max-w-2xl">
          <h1 className="font-jakarta text-5xl font-extrabold text-on-surface tracking-tight mb-4">
            Find your perfect{" "}
            <span className="text-primary italic font-serif font-medium">
              printing partner.
            </span>
          </h1>
          <p className="font-body text-xl text-on-surface-variant leading-relaxed">
            Connect with artisanal 3D workshops to bring your digital keepsakes
            to life.
          </p>
        </section>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar filters */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-10">
            <div>
              <h3 className="font-jakarta font-bold text-lg mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  tune
                </span>{" "}
                Filters
              </h3>

              <div className="space-y-8">
                <div>
                  <span className="font-jakarta text-xs uppercase tracking-widest font-bold text-on-surface-variant block mb-4">
                    Printing Techniques
                  </span>
                  <div className="space-y-3">
                    {TECHNIQUES.map((tech) => (
                      <label
                        key={tech}
                        className="flex items-center gap-3 group cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="rounded-md border-outline-variant text-primary focus:ring-primary h-5 w-5 bg-surface-container-low"
                        />
                        <span className="font-jakarta font-medium group-hover:text-primary transition-colors">
                          {tech}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-jakarta text-xs uppercase tracking-widest font-bold text-on-surface-variant block mb-4">
                    Price Range
                  </span>
                  <input
                    className="w-full h-2 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary"
                    type="range"
                  />
                  <div className="flex justify-between mt-2 font-jakarta text-sm font-semibold text-on-surface-variant">
                    <span>$</span>
                    <span>$$$</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-secondary-container p-6 rounded-[1rem] paper-texture relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-jakarta font-bold text-on-secondary-container text-lg leading-snug mb-2">
                  Have a unique idea?
                </h4>
                <p className="font-body text-on-secondary-container opacity-90 text-sm mb-4">
                  Our top partners offer custom consultation for complex designs.
                </p>
                <button className="bg-on-secondary-container text-surface-container-lowest font-jakarta font-bold text-sm px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
                  Learn More
                </button>
              </div>
              <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-on-secondary-container opacity-10 text-8xl">
                lightbulb
              </span>
            </div>
          </aside>

          {/* Shop grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {SHOPS.map((shop, i) => (
                <div
                  key={i}
                  className="bg-surface-container-lowest rounded-xl p-6 paper-texture group hover:shadow-[0_8px_24px_rgba(56,50,40,0.06)] transition-all flex flex-col h-full border border-outline-variant/15"
                >
                  <div className="aspect-video rounded-[1rem] overflow-hidden mb-6 relative">
                    <img
                      alt={shop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={shop.img}
                    />
                    <div className="absolute top-4 right-4 bg-surface-container-lowest/80 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1">
                      <span
                        className="material-symbols-outlined text-amber-500 text-sm"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                      <span className="font-jakarta text-xs font-bold">
                        {shop.rating}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-jakarta font-bold text-2xl">
                        {shop.name}
                      </h3>
                      <div className="text-right">
                        <span className="block font-jakarta text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                          Starts at
                        </span>
                        <span className="font-jakarta font-extrabold text-primary text-xl">
                          ${shop.price}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant text-sm mb-4">
                      <span className="material-symbols-outlined text-base">
                        location_on
                      </span>
                      <span className="font-body">{shop.loc}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {shop.tags.map((t) => (
                        <span
                          key={t}
                          className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-jakarta font-bold"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link
                    href="/checkout"
                    className="w-full py-4 rounded-xl text-center bg-gradient-to-br from-primary to-primary-container text-white font-jakarta font-bold text-lg hover:shadow-lg active:scale-[0.98] transition-all block"
                  >
                    Select Partner
                  </Link>
                </div>
              ))}

              {/* Match card */}
              <div className="bg-surface-container rounded-xl p-8 flex flex-col justify-center items-center text-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-4xl">
                    auto_awesome
                  </span>
                </div>
                <div>
                  <h3 className="font-jakarta font-bold text-2xl mb-2">
                    Not sure who to pick?
                  </h3>
                  <p className="font-body text-on-surface-variant">
                    Tell us about your project and we&apos;ll match you with the
                    3 best workshops.
                  </p>
                </div>
                <button className="px-8 py-3 rounded-full border-2 border-primary text-primary font-jakarta font-bold hover:bg-primary hover:text-white transition-all">
                  Start Matching Tool
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
