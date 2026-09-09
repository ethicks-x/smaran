export default function RemindersLoading() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]"
        />
      ))}
    </div>
  );
}
