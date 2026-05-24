export function SearchSkeleton() {
  return (
    <div className="container max-w-7xl pb-32 pt-6 md:pb-20">
      <div className="h-9 w-24 animate-pulse rounded-lg bg-ink-100 dark:bg-ink-800" />
      <div className="mt-4 flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-ink-100 dark:bg-ink-800" />
        <div className="w-full max-w-md space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
          <div className="h-6 w-3/4 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
        </div>
      </div>
      <div className="mt-6 h-32 animate-pulse rounded-3xl bg-ink-100 dark:bg-ink-800" />
      <div className="mt-9 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-80 animate-pulse rounded-3xl bg-ink-100 dark:bg-ink-800" />
        ))}
      </div>
      <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
        ))}
      </div>
    </div>
  );
}
