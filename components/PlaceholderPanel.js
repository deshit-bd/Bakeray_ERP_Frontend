export default function PlaceholderPanel({ title }) {
  return (
    <section className="flex-1 bg-[#f4f7fc] p-4 md:p-6 xl:p-8">
      <div className="rounded-[28px] border border-[#e5eaf3] bg-white p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <h1 className="text-[22px] font-semibold text-[#0f172a]">{title}</h1>
        <p className="mt-2 text-[15px] text-[#64748b]">
          This section is ready. Click Dashboard to see the finished design.
        </p>
      </div>
    </section>
  );
}
