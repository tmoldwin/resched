import CreateEventForm from "@/components/CreateEventForm";

export default function Home() {
  return (
    <div className="min-h-full bg-gradient-to-b from-emerald-50 via-white to-zinc-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:py-16">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            resched
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Find a time that works for everyone
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-600 sm:text-lg">
            A cleaner when2meet-style scheduler with drag-to-select availability,
            mobile-friendly grids, and instant group heatmaps.
          </p>
        </header>

        <div className="mx-auto w-full">
          <CreateEventForm />
        </div>

        <section className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            {
              title: "No accounts",
              body: "Create an event, share the link, and collect availability in seconds.",
            },
            {
              title: "Drag on mobile",
              body: "Touch-friendly grid with sticky headers so scheduling feels natural on phones.",
            },
            {
              title: "Instant overlap",
              body: "Switch to the group heatmap to see the best times at a glance.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-base font-semibold text-zinc-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{item.body}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
