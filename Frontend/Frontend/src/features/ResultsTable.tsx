import { useMemo, useState } from "react";
import { AnalyzeResponse, Row } from "../types/analysis";
import { StatBadge } from "../components/StatBadge";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function ResultsTable({
  data,
  title,
}: {
  data: AnalyzeResponse;
  title?: string;
}) {
  const [sortKey, setSortKey] = useState<"word" | "count" | "freq">("count");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const rows: Row[] = useMemo(() => {
    const base: Row[] = Object.keys(data.counts).map((w) => ({
      word: w,
      count: data.counts[w],
      freq: data.frequencies[w] ?? 0,
    }));

    type Key = string | number;
    const keyFn: (x: Row) => Key =
      sortKey === "word"
        ? (x) => x.word.toLowerCase()
        : sortKey === "count"
        ? (x) => x.count
        : (x) => x.freq;

    const cmp = (x: Key, y: Key) => (x < y ? -1 : x > y ? 1 : 0);

    return [...base].sort((a, b) => {
      const baseOrder = cmp(keyFn(a), keyFn(b));
      return dir === "asc" ? baseOrder : -baseOrder;
    });
  }, [data, sortKey, dir]);

  const HeaderBtn = ({
    label,
    k,
  }: {
    label: string;
    k: typeof sortKey;
  }) => (
    <button
      className={`text-left w-full font-semibold ${
        sortKey === k ? "text-indigo-700" : "text-gray-700"
      }`}
      onClick={() =>
        sortKey === k
          ? setDir((d) => (d === "asc" ? "desc" : "asc"))
          : setSortKey(k)
      }
      title="Sort"
    >
      <span className="align-middle">{label}</span>
      {sortKey === k && (
        <span className="ml-1 align-middle opacity-70">
          {dir === "asc" ? "▲" : "▼"}
        </span>
      )}
    </button>
  );

  return (
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <h3 className="text-base font-semibold">{title ?? "Results"}</h3>
        <StatBadge label="Total tokens" value={String(data.total)} />
        <StatBadge
          label="Unique"
          value={String(Object.keys(data.counts).length)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-y">
            <tr>
              <th className="px-4 py-3 w-[50%]">
                <HeaderBtn label="Token / Shingle" k="word" />
              </th>
              <th className="px-4 py-3 w-[25%]">
                <HeaderBtn label="Count" k="count" />
              </th>
              <th className="px-4 py-3 w-[25%]">
                <HeaderBtn label="Probability" k="freq" />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.word} className="border-b last:border-0">
                <td className="px-4 py-3">{r.word}</td>
                <td className="px-4 py-3">{r.count}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded bg-gray-200 overflow-hidden">
                      <div
                        className="h-1.5 rounded bg-indigo-600"
                        style={{ width: pct(r.freq) }}
                      />
                    </div>
                    <span className="tabular-nums">{pct(r.freq)}</span>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-gray-500 text-sm" colSpan={3}>
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
