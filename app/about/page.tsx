import SiteHeader from "@/components/SiteHeader";

const VALUES = [
  {
    title: "We shape vague ideas into something buildable",
    copy: "Our team is focused on helping people go from a rough prompt to a concrete object they can actually hold.",
  },
  {
    title: "We care about speed without losing clarity",
    copy: "Every step is designed to keep momentum high while making the final prompt, model, and order details easier to trust.",
  },
  {
    title: "We treat creation as a collaborative process",
    copy: "The product is meant to feel like a conversation between human intent, AI refinement, and print-ready production.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="grain grid gap-6 overflow-hidden rounded-3xl bg-[var(--paper)] p-6 shadow-[var(--shadow)] lg:grid-cols-[minmax(0,1.1fr)_300px] lg:p-10">
          <div className="animate-fade-up">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              About
            </p>
            <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.1] text-[var(--foreground)] sm:text-6xl">
              We are building a better path from imagination to object.
            </h1>
            <p className="mt-6 max-w-2xl font-serif text-xl leading-8 text-[var(--muted)]">
              Print It is a small team effort centered on one goal: make it
              easier for people to describe an idea, refine it with confidence,
              and move toward a real printed result.
            </p>
          </div>

          <div className="animate-fade-up delay-2 paper-texture rounded-2xl bg-[var(--panel)] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              Our approach
            </p>
            <p className="mt-4 font-serif text-base leading-8 text-[var(--muted)]">
              We combine thoughtful prompt refinement, clear model previews, and
              a simple ordering flow so the experience stays understandable from
              start to finish.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {VALUES.map((value, i) => (
            <article
              key={value.title}
              className={`animate-fade-up craft-card p-6 ${i === 0 ? "delay-1" : i === 1 ? "delay-2" : "delay-3"}`}
            >
              <h2 className="font-serif text-2xl font-semibold leading-tight text-[var(--foreground)]">
                {value.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                {value.copy}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
