export function Loader({ label = "Analyzing…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-6 text-sm opacity-80">
      <span className="animate-spin inline-block w-5 h-5 rounded-full border-[3px] border-gray-300 border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}
