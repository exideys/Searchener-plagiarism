// App.tsx — Text + Files upload; backend calculates everything
import React, { useMemo, useState } from "react";

/** Backend contract:
 * Text:
 *   POST {VITE_API_URL}/text/analyze
 *   Body: { text: string }
 *   Resp: { total: number; counts: Record<string, number>; frequencies: Record<string, number> }
 *
 * Files:
 *   POST {VITE_API_URL}/text/file/analyze
 *   Body: multipart/form-data (field name: files) — one or many
 *   Resp variants supported by this UI:
 *     A) { items: Array<{ fileName?: string } & AnalyzeResponse> }
 *     B) Array<{ fileName?: string } & AnalyzeResponse>
 *     C) Single AnalyzeResponse (for one file) — fileName omitted
 */

type AnalyzeResponse = {
  total: number;
  counts: Record<string, number>;
  frequencies: Record<string, number>;
};

type FileAnalyzeItem = AnalyzeResponse & { fileName?: string };
type FilesResponseVariant = { items: FileAnalyzeItem[] } | FileAnalyzeItem[] | AnalyzeResponse;

type Row = { word: string; count: number; freq: number };

const API_URL = (import.meta as any).env?.VITE_API_URL as string | undefined;

// endpoints (adjust if you use different routes)
const TEXT_ENDPOINT = "/text/analyze";
const FILE_ENDPOINT = "/file/analyze";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/* ======================== API calls ======================== */
async function analyzeText(text: string, signal?: AbortSignal): Promise<AnalyzeResponse> {
  if (!API_URL) throw new Error("VITE_API_URL is not set (.env).");
  const res = await fetch(`${API_URL.replace(/\/$/, "")}${TEXT_ENDPOINT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  return (await res.json()) as AnalyzeResponse;
}

async function analyzeFiles(files: File[], signal?: AbortSignal): Promise<FileAnalyzeItem[]> {
  if (!API_URL) throw new Error("VITE_API_URL is not set (.env).");
  const fd = new FormData();
  for (const f of files) fd.append("file", f, f.name);

  const res = await fetch(`${API_URL.replace(/\/$/, "")}${FILE_ENDPOINT}`, {
    method: "POST",
    body: fd,
    signal,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text().catch(() => res.statusText)}`);

  const data = (await res.json()) as FilesResponseVariant;

  if (Array.isArray(data)) return data.map((x) => ({ ...x }));
  if ("items" in (data as any)) return (data as any).items;
  return [{ ...(data as AnalyzeResponse) }];
}

/* ======================== UI bits ======================== */
function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1 rounded-2xl bg-gray-100 border text-gray-800 text-xs font-medium">
      <span className="opacity-70 mr-1">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Loader({ label = "Analyzing…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-6 text-sm opacity-80">
      <span className="animate-spin inline-block w-5 h-5 rounded-full border-[3px] border-gray-300 border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

function ResultsTable({
  data,
  title,
}: {
  data: AnalyzeResponse;
  title?: string;
}) {
  const [sortKey, setSortKey] = useState<"word" | "count" | "freq">("count");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const rows: Row[] = useMemo(() => {
    const r: Row[] = Object.keys(data.counts).map((w) => ({
      word: w,
      count: data.counts[w],
      freq: data.frequencies[w] ?? 0,
    }));
    const keyFn =
      sortKey === "word"
        ? (x: Row) => x.word.toLowerCase()
        : sortKey === "count"
        ? (x: Row) => x.count
        : (x: Row) => x.freq;
    return [...r].sort((a, b) => {
      const va = keyFn(a) as any;
      const vb = keyFn(b) as any;
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, dir]);

  const HeaderBtn = ({ label, k }: { label: string; k: typeof sortKey }) => (
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
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <h3 className="text-base font-semibold">{title ?? "Results"}</h3>
        <StatBadge label="Total words" value={String(data.total)} />
        <StatBadge label="Unique" value={String(Object.keys(data.counts).length)} />
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

function FileDrop({
  onFilesSelected,
  disabled,
}: {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}) {
  const [over, setOver] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) onFilesSelected(files);
    e.currentTarget.value = ""; // allow re-selecting same file
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) onFilesSelected(files);
  };

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl px-4 py-10 text-center cursor-pointer transition ${
        over ? "border-indigo-500 bg-indigo-50/40" : "border-gray-300 bg-white"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <input
        type="file"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={onChange}
        accept=".txt,text/plain" /* расширь при необходимости */
      />
      <div className="text-sm font-medium">Drop files here or click to choose</div>
      <div className="text-xs text-gray-500">TXT recommended. Multiple files supported.</div>
    </label>
  );
}

/* ======================== App ======================== */
export default function App() {
  const [text, setText] = useState("");

  const [textResult, setTextResult] = useState<AnalyzeResponse | null>(null);
  const [fileResults, setFileResults] = useState<FileAnalyzeItem[] | null>(null);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [activeFileTab, setActiveFileTab] = useState(0);

  const [loading, setLoading] = useState<"text" | "files" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const runTextAnalyze = async () => {
    const value = text.trim();
    if (!value) return;
    setErr(null);
    setLoading("text");
    setFileResults(null);
    try {
      const ctrl = new AbortController();
      const resp = await analyzeText(value, ctrl.signal);
      setTextResult(resp);
    } catch (e: any) {
      setErr(e?.message || "API error");
      setTextResult(null);
    } finally {
      setLoading(null);
    }
  };

  const runFilesAnalyze = async () => {
    if (!pendingFiles.length) return;
    setErr(null);
    setLoading("files");
    setTextResult(null);
    try {
      const ctrl = new AbortController();
      const items = await analyzeFiles(pendingFiles, ctrl.signal);

      // если бэкенд не вернул имя, подставим локальное
      const itemsWithNames = items.map((it, i) => ({
        fileName: it.fileName || pendingFiles[i]?.name || `File ${i + 1}`,
        total: it.total,
        counts: it.counts,
        frequencies: it.frequencies,
      }));
      setFileResults(itemsWithNames);
      setActiveFileTab(0);
    } catch (e: any) {
      setErr(e?.message || "API error");
      setFileResults(null);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600" />
            <h1 className="text-lg font-bold">Text Analysis: Unique Words</h1>
          </div>
          <div className="text-xs text-gray-500">API: {API_URL || "not set"}</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 grid gap-6">
        {/* TEXT CARD */}
        <div className="bg-white border rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-semibold mb-2">Paste text to analyze</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste text here…"
            className="w-full min-h-[160px] max-h-[420px] resize-y rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">Characters: {text.length}</div>
            <button
              onClick={runTextAnalyze}
              disabled={loading !== null || text.trim().length < 1}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition"
            >
              Analyze text
            </button>
          </div>
        </div>

        {/* FILES CARD */}
        <div className="bg-white border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Analyze files</div>
            <div className="text-xs text-gray-500">
              Selected: {pendingFiles.length || 0}
            </div>
          </div>

          <FileDrop
            disabled={loading !== null}
            onFilesSelected={(files) => setPendingFiles((prev) => [...prev, ...files])}
          />

          {!!pendingFiles.length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {pendingFiles.map((f, i) => (
                <div
                  key={i}
                  className="text-xs px-2 py-1 rounded-lg border bg-gray-50 flex items-center gap-2"
                  title={`${f.name} (${f.type || "unknown"}, ${f.size} bytes)`}
                >
                  <span className="truncate max-w-[220px]">{f.name}</span>
                  <button
                    className="px-1 rounded hover:bg-gray-200"
                    onClick={() =>
                      setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="ml-auto inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white disabled:opacity-50 hover:bg-indigo-500 transition"
                onClick={runFilesAnalyze}
                disabled={!pendingFiles.length || loading !== null}
              >
                Analyze file{pendingFiles.length > 1 ? "s" : ""}
              </button>
            </div>
          )}
        </div>

        {/* LOADING / ERROR */}
        {loading === "text" && <Loader label="Analyzing text…" />}
        {loading === "files" && <Loader label="Analyzing files…" />}

        {err && (
          <div className="p-4 rounded-xl border bg-red-50 text-red-700 text-sm">API: {err}</div>
        )}

        {/* RESULTS */}
        {!loading && textResult && <ResultsTable data={textResult} />}

        {!loading && fileResults && !!fileResults.length && (
          <div className="grid gap-3">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
              {fileResults.map((it, i) => (
                <button
                  key={i}
                  onClick={() => setActiveFileTab(i)}
                  className={`px-3 py-1.5 rounded-xl border text-sm ${
                    activeFileTab === i
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  {it.fileName || `File ${i + 1}`}
                </button>
              ))}
            </div>

            {/* Active file result */}
            <ResultsTable
              data={fileResults[activeFileTab]}
              title={`Results — ${fileResults[activeFileTab].fileName || `File ${activeFileTab + 1}`}`}
            />
          </div>
        )}
      </main>
    </div>
  );
}
