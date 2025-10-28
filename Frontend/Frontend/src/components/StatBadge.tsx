export function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1 rounded-2xl bg-gray-100 border text-gray-800 text-xs font-medium">
      <span className="opacity-70 mr-1">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
