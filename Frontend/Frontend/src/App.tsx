// App.tsx — frontend sends text to backend and renders an English table
import React, { useMemo, useState } from "react";

/** Backend contract (your API)
POST  {VITE_API_URL}/text/analyze
Body: { text: string }
Resp: {
  total: number;
  counts: Record<string, number>;
  frequencies: Record<string, number>;
}
*/

type AnalyzeResponse = {
  total: number;
  counts: Record<string, number>;
  frequencies: Record<string, number>;
};

type Row = { word: string; count: number; freq: number };

const API_URL = (import.meta as any).env?.VITE_API_URL as string | undefined;

const toPercent = (x: number) => `${(x * 100).toFixed(1)}%`;

async function analyzeText(text: string, signal?: AbortSignal): Promise<AnalyzeResponse> {
  if (!API_URL) {
    throw new Error(
      "VITE_API_URL is not set. Create .env with VITE_API_URL=http://localhost:8081 (or your URL) and restart dev server."
    );
  }

  const res = await fetch(`${API_URL.replace(/\/$/, "")}/text/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${msg || res.statusText}`);
  }
  return (await res.json()) as AnalyzeResponse;
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1 rounded-2xl bg-gray-100 border text-gray-800 text-xs font-medium">
      <span className="opacity-70 mr-1">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex items-center gap-3 py-6 text-sm opacity-80">
      <span className="animate-spin inline-block w-5 h-5 rounded-full border-[3px] border-gray-300 border-t-transparent" />
      <span>Analyzing…</span>
    </div>
  );
}

export default function App() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"word" | "count" | "freq">("count");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    if (!rows) return [];
    const keyFn =
      sortKey === "word"
        ? (r: Row) => r.word.toLowerCase()
        : sortKey === "count"
        ? (r: Row) => r.count
        : (r: Row) => r.freq;
    return [...rows].sort((a, b) => {
      const va = keyFn(a) as any;
      const vb = keyFn(b) as any;
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, dir]);

  const onAnalyze = async () => {
    const value = text.trim();
    if (!value) return;
    setErr(null);
    setLoading(true);
    setRows(null);
    try {
      const ctrl = new AbortController();
      const resp = await analyzeText(value, ctrl.signal);

      const r: Row[] = Object.keys(resp.counts).map((w) => ({
        word: w,
        count: resp.counts[w],
        freq: resp.frequencies[w] ?? 0,
      }));
      setRows(r);
      setTotal(resp.total);
    } catch (e: any) {
      setErr(e?.message || "API error");
    } finally {
      setLoading(false);
    }
  };

  const HeaderBtn = ({ label, k }: { label: string; k: "word" | "count" | "freq" }) => (
    <button
      className={`text-left w-full font-semibold ${
        sortKey === k ? "text-indigo-700" : "text-gray-700"
      }`}
      onClick={() => (sortKey === k ? setDir((d) => (d === "asc" ? "desc" : "asc")) : setSortKey(k))}
      title="Sort"
    >
      <span className="align-middle">{label}</span>
      {sortKey === k && (
        <span className="ml-1 align-middle opacity-70">{dir === "asc" ? "▲" : "▼"}</span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600" />
            <h1 className="text-lg font-bold">Searchener-plagiarism</h1>
          </div>
          <div className="text-xs text-gray-500">API: {API_URL || "not set"}</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 grid gap-6">
        <div className="bg-white border rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-semibold mb-2">Paste text to analyze</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder ="Enter your text here"
            className="w-full min-h-[160px] max-h-[420px] resize-y rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">Characters: {text.length}</div>
            <button
              onClick={onAnalyze}
              disabled={loading || text.trim().length < 1}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition"
            >
              Analyze
            </button>
          </div>
        </div>

        {loading && <Loader />}

        {err && (
          <div className="p-4 rounded-xl border bg-red-50 text-red-700 text-sm">API: {err}</div>
        )}

        {!loading && rows && (
          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <h3 className="text-base font-semibold">Results</h3>
              <StatBadge label="Total words" value={String(total)} />
              <StatBadge label="Unique" value={String(rows.length)} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y">
                  <tr>
                    <th className="px-4 py-3 w-[50%]">
                      <HeaderBtn label="Word" k="word" />
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
                  {sorted.map((r) => (
                    <tr key={r.word} className="border-b last:border-0">
                      <td className="px-4 py-3">{r.word}</td>
                      <td className="px-4 py-3">{r.count}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 rounded bg-gray-200 overflow-hidden">
                            <div
                              className="h-1.5 rounded bg-indigo-600"
                              style={{ width: toPercent(r.freq) }}
                            />
                          </div>
                          <span className="tabular-nums">{toPercent(r.freq)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
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
        )}
      </main>
    </div>
  );
}
