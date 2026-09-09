export default function ProgressLoading() {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 h-4 w-40 animate-pulse rounded-md bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="h-64 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
      </div>
      <div>
        <div className="mb-4 h-4 w-48 animate-pulse rounded-md bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="h-40 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
      </div>
      <div>
        <div className="mb-3 h-4 w-24 animate-pulse rounded-md bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-black/[0.04] dark:bg-white/[0.04]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
