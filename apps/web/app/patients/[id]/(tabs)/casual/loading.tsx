export default function CasualPlayLoading() {
  return (
    <div className="space-y-2.5">
      <div className="mb-3 h-4 w-72 max-w-full animate-pulse rounded-md bg-black/[0.06] dark:bg-white/[0.06]" />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl bg-black/[0.04] dark:bg-white/[0.04]"
        />
      ))}
    </div>
  );
}
