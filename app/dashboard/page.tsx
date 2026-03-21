/* eslint-disable @next/next/no-img-element */
"use client";

import TopNavBar from "@/components/ui/TopNavBar";
import BottomNavBar from "@/components/ui/BottomNavBar";

const SPECS = ["Warm Onyx", "20% Gyroid", "0.12mm", "Sanded"];

const STATS = [
  {
    label: "Total Prints",
    value: "1,284",
    className: "bg-surface-container-low",
    valueClassName: "text-primary",
  },
  {
    label: "Revenue",
    value: "$4.2k",
    className: "bg-surface-container-low",
    valueClassName: "text-primary",
  },
  {
    label: "Rating",
    value: "4.9 ★",
    className: "bg-secondary-container",
    valueClassName: "",
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-surface">
      <TopNavBar />

      <main className="max-w-7xl mx-auto px-6 py-12 mb-24 md:mb-12">
        {/* Header + stats */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-jakarta text-4xl font-extrabold text-on-surface tracking-tight mb-2">
              Maker Dashboard
            </h1>
            <p className="font-body text-xl text-on-surface-variant">
              Warm welcome back, Artisan. You have 4 active projects.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {STATS.map((stat) => (
              <div key={stat.label} className={`${stat.className} p-4 rounded-[1rem]`}>
                <span className="block text-xs uppercase font-bold text-on-surface-variant">
                  {stat.label}
                </span>
                <span className={`text-2xl font-bold ${stat.valueClassName}`}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Orders section */}
          <section className="lg:col-span-8 space-y-8">
            <article className="relative bg-white rounded-xl p-6 shadow-sm border border-outline-variant/10 overflow-hidden paper-texture">
              <div className="relative z-10 flex flex-col md:flex-row gap-8">
                <div className="w-40 h-40 rounded-[1rem] bg-surface-container overflow-hidden">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCH1_9mVuQyI-pzuorarUvWs8FQ9qw8_WefHSZcB9cXwhoJJljYl1YI5T-UyMxXO-NlIorH0tbqDFXYzXEEcoq7MSpdOA3LAIWlb6yrZ_bpKDs6nZ7gH69k-tYtc8aDkaYkUTDEDfnlhdvwademTicrqr3i0NgoJv61jX46l-PNDIlrGpbT6WquET8QQZRwiKsgIVye0MEsbE3sRX0pEv4fcAE9zdm2vCPGgQKYkIPDsX7FuP7N3mQp1e8Ui3200-l8ceFcXWgSRas"
                    className="w-full h-full object-cover"
                    alt="Order item"
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-primary uppercase tracking-widest">
                        Order #PI-8821
                      </span>
                      <h3 className="text-2xl font-jakarta font-bold">
                        Articulated Mountain Dragon
                      </h3>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">
                      Printing
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {SPECS.map((spec) => (
                      <div
                        key={spec}
                        className="bg-surface-container-low p-2 rounded-[1rem] text-xs font-semibold"
                      >
                        {spec}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4">
                    <button className="px-5 py-3 bg-surface-container-highest text-sm font-bold rounded-xl">
                      Download STL
                    </button>
                    <button className="px-5 py-3 bg-primary text-white text-sm font-bold rounded-xl">
                      Update Status
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </section>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="bg-surface-container p-8 rounded-xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  local_shipping
                </span>{" "}
                Pending Shipment
              </h3>
              <div className="bg-white p-5 rounded-[1rem] border border-outline-variant/10">
                <h4 className="font-jakarta font-bold text-lg">
                  Custom Dice Vault
                </h4>
                <p className="text-sm opacity-70 mb-6">
                  1242 Whispering Pines Way
                  <br />
                  Portland, OR 97201
                </p>
                <button className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-md">
                  Mark as Shipped
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
