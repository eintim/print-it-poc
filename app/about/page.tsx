import SiteHeader from "@/components/SiteHeader";

const VALUES = [
  {
    title: "We shape vague ideas into something buildable",
    copy:
      "Our team is focused on helping people go from a rough prompt to a concrete object they can actually hold.",
  },
  {
    title: "We care about speed without losing clarity",
    copy:
      "Every step is designed to keep momentum high while making the final prompt, model, and order details easier to trust.",
  },
  {
    title: "We treat creation as a collaborative process",
    copy:
      "The product is meant to feel like a conversation between human intent, AI refinement, and print-ready production.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="grid gap-6 rounded-[2.5rem] bg-white p-6 shadow-[var(--shadow)] lg:grid-cols-[minmax(0,1.1fr)_320px] lg:p-10">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--accent)]">
              About
            </p>
            <h1
              className="mt-4 text-5xl font-semibold leading-tight text-[var(--foreground)] sm:text-6xl"
              style={{ fontFamily: "var(--font-newsreader), serif" }}
            >
              We are building a better path from imagination to object.
            </h1>
            <p
              className="mt-6 max-w-2xl text-xl leading-8 text-[var(--muted)]"
              style={{ fontFamily: "var(--font-newsreader), serif" }}
            >
              Print It 2 is a small team effort centered on one goal: make it
              easier for people to describe an idea, refine it with confidence,
              and move toward a real printed result.
            </p>
          </div>

          <div className="paper-texture rounded-[1.75rem] bg-[var(--panel)] p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[var(--accent)]">
              Our approach
            </p>
            <p
              className="mt-4 text-base leading-8 text-[var(--muted)]"
              style={{ fontFamily: "var(--font-newsreader), serif" }}
            >
              We combine thoughtful prompt refinement, clear model previews, and
              a simple ordering flow so the experience stays understandable from
              start to finish.
            </p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {VALUES.map((value) => (
            <article key={value.title} className="soft-card rounded-[2rem] p-6">
              <h2
                className="text-3xl font-semibold text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-newsreader), serif" }}
              >
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
