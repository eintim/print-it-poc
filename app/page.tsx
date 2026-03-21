/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import TopNavBar from "@/components/ui/TopNavBar";
import BottomNavBar from "@/components/ui/BottomNavBar";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNavBar />

      <main className="flex-1">
        <section className="relative min-h-[800px] flex items-center justify-center overflow-hidden px-6 lg:px-24">
          {/* Background decorations */}
          <div className="absolute inset-0 z-0 bg-surface">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-surface-container rounded-l-[5rem] opacity-50" />
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-secondary-container/30 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left column – copy */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold font-jakarta">
                <span className="material-symbols-outlined text-sm">
                  favorite
                </span>
                Gift from the Heart
              </div>

              <h1 className="text-6xl md:text-7xl font-bold font-jakarta tracking-tight leading-[1.1] text-on-background">
                Your Personal <br />
                <span className="text-primary italic font-serif">
                  Gift Studio.
                </span>
              </h1>

              <p className="text-xl text-on-surface opacity-90 max-w-xl font-body leading-relaxed italic">
                Create one-of-a-kind keepsakes that celebrate life&apos;s most
                beautiful moments. From imagination to a tangible token of love.
              </p>

              <div className="flex flex-wrap gap-5 pt-4">
                <Link
                  href="/create"
                  className="bg-primary hover:bg-primary-container px-10 py-5 rounded-full font-bold text-white shadow-lg hover:shadow-primary/20 transition-all active:scale-95 text-lg font-jakarta"
                >
                  Start Creating
                </Link>
                <Link
                  href="/gallery"
                  className="bg-white px-10 py-5 rounded-full font-bold border border-outline hover:bg-surface transition-all active:scale-95 text-lg font-jakarta text-on-surface"
                >
                  Browse Gallery
                </Link>
              </div>
            </div>

            {/* Right column – hero image card */}
            <div className="relative hidden lg:block">
              <div className="bg-white p-4 rounded-3xl shadow-2xl rotate-3 transform hover:rotate-0 transition-transform duration-500">
                <div className="relative rounded-2xl overflow-hidden aspect-[4/5]">
                  <img
                    alt="Personalized Gift Creation"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAr-p6SQfpbVQJ_sWk694zzRNH93IxBBRFWLYV7FQGhkcxlba7tBv2T-cKC_GtPL7S3lG51GuwIfP2jT5mwZLck0gjCE5TuEweP3xCaOZt2ECuUx8GB69ehauDTRkOAkidlAiHFqunTWeZ_AnGHPmnx4TOrJvEOsknl_9y1DvIFCNmy9xcAOYI7hOmeAv2fK1Qiwp9XxGK2Vlg2vsvkFtgPPxsRPg3-iiYvGjQTwotpCnEYmobZ6lra68n_aCer3LWFzWqn82kgB6E"
                  />
                  <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-sm p-5 rounded-2xl shadow-lg border border-primary/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold font-jakarta text-primary">
                        Crafting Your Keepsake...
                      </span>
                      <span className="text-xs font-bold font-jakarta text-secondary">
                        75%
                      </span>
                    </div>
                    <div className="w-full bg-secondary-container/30 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-secondary w-[75%] rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -top-8 -right-8 bg-white p-5 rounded-2xl shadow-xl border border-outline -rotate-6">
                <div className="text-[10px] font-bold font-jakarta text-secondary uppercase tracking-widest mb-1">
                  HAND-FINISHED
                </div>
                <div className="text-xl font-bold font-jakarta text-primary">
                  With Love
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BottomNavBar />
    </div>
  );
}
