export default function MemoriesLoading() {
  return (
    <div className="space-y-8">
      <div className="h-4 w-64 max-w-full animate-pulse rounded-md bg-black/[0.06] dark:bg-white/[0.06]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]"
          />
        ))}
      </div>
    </div>
  );
}
