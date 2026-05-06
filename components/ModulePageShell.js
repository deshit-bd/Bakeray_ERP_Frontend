export default function ModulePageShell({ children }) {
  return (
    <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px] space-y-6">
        {children}
      </div>
    </section>
  );
}
