export default function OverviewLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {["sessions", "accuracy", "memories"].map((key) => (
          <div
            key={key}
            className="h-24 animate-pulse rounded-xl bg-black/[0.04] dark:bg-white/[0.04]"
          />
        ))}
      </div>
      <div className="h-24 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
    </div>
  );
}
