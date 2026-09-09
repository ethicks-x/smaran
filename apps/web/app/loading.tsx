export default function LandingLoading() {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <header className="sticky top-0 z-40 border-b border-black/5 dark:border-white/[0.08] bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-black/[0.06] dark:bg-white/[0.06]" />
            <div className="h-6 w-24 animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.06]" />
          </div>
          <div className="h-9 w-28 animate-pulse rounded-xl bg-black/[0.06] dark:bg-white/[0.06]" />
        </div>
      </header>

      <section className="px-6 pb-24 pt-16 lg:px-8 lg:pb-32 lg:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto h-7 w-80 max-w-full animate-pulse rounded-full bg-black/[0.05] dark:bg-white/[0.05]" />
          <div className="mx-auto mt-6 h-14 w-full max-w-2xl animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/[0.06]" />
          <div className="mx-auto mt-4 h-14 w-4/5 max-w-xl animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/[0.06]" />
          <div className="mx-auto mt-6 h-5 w-full max-w-lg animate-pulse rounded-lg bg-black/[0.04] dark:bg-white/[0.04]" />
          <div className="mx-auto mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <div className="h-12 w-40 animate-pulse rounded-xl bg-black/[0.06] dark:bg-white/[0.06]" />
            <div className="h-12 w-40 animate-pulse rounded-xl bg-black/[0.06] dark:bg-white/[0.06]" />
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
          {["a", "b", "c", "d", "e", "f"].map((key) => (
            <div
              key={key}
              className="h-28 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
