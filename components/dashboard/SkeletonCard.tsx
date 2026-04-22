/**
 * Low-chrome shimmer placeholder card used while list data is loading.
 * Mirrors the footprint of <RequirementCard> so the layout does not reflow
 * when real rows arrive. No JS state — pure CSS via the `animate-pulse`
 * utility.
 */
export function SkeletonCard() {
  return (
    <div className="card pad animate-pulse" aria-hidden>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="h-5 w-16 rounded-full bg-bg-3" />
        <span className="h-5 w-20 rounded-full bg-bg-3" />
        <span className="h-5 w-12 rounded-full bg-bg-3" />
      </div>
      <div className="h-4 w-2/3 rounded bg-bg-3 mb-2" />
      <div className="h-3 w-full rounded bg-bg-3 mb-1.5" />
      <div className="h-3 w-5/6 rounded bg-bg-3 mb-4" />
      <div className="flex items-center gap-2">
        <span className="h-4 w-24 rounded bg-bg-3" />
        <span className="h-4 w-16 rounded bg-bg-3" />
      </div>
    </div>
  );
}

/** Convenience wrapper for rendering N skeletons at once. */
export function SkeletonCardList({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
