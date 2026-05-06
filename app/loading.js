export default function Loading() {
  return (
    <section className="min-h-screen w-full bg-[var(--background)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-200" />
        </div>
        <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    </section>
  );
}
