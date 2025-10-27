import React, { useMemo, useState } from "react";

type AnalyzeResponse = {
  total: number;
  counts: Record<string, number>;
  frequencies: Record<string, number>;
};

type FileAnalyzeItem = AnalyzeResponse & { fileName?: string };

type Row = { word: string; count: number; freq: number };

type SourceMatchDto = {
  matchedShingles: string[];
  url: string;
};

type PlagiarismResponse = {
  score: number;
  potentialSources: SourceMatchDto[];
};

type FilePlagiarismItem = PlagiarismResponse & {
  fileName?: string;
};

const API_URL = import.meta.env?.VITE_API_URL as string | undefined;

const TEXT_ENDPOINT_WORDS = "/text/analyze";
const TEXT_ENDPOINT_SHINGLES = "/text/shingles";
const FILE_ENDPOINT_WORDS = "/file/analyze";
const FILE_ENDPOINT_SHINGLES = "/file/shingles";
const PLAINTEXT_PLAGIARISM_ENDPOINT = "/plagiarism/detect";
const FILE_PLAGIARISM_ENDPOINT = "/plagiarism/detect/file";

const DEFAULT_SHINGLE_SIZE = 5;
const DEFAULT_SAMPLE_STEP = 2;

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function isAnalyzeResponse(x: unknown): x is AnalyzeResponse {
  if (typeof x !== "object" || x === null) return false;
  const r = x as {
    total?: unknown;
    counts?: unknown;
    frequencies?: unknown;
  };
  const totalOk = typeof r.total === "number";
  const countsOk = typeof r.counts === "object" && r.counts !== null;
  const freqsOk = typeof r.frequencies === "object" && r.frequencies !== null;
  return totalOk && countsOk && freqsOk;
}

function isPlagiarismResponse(x: unknown): x is PlagiarismResponse {
  if (typeof x !== "object" || x === null) return false;
  const r = x as { score?: unknown; potentialSources?: unknown };
  const scoreOk = typeof r.score === "number";
  const arrOk =
    Array.isArray(r.potentialSources) &&
    r.potentialSources.every((s: any) => {
      if (typeof s !== "object" || s === null) return false;
      return (
        Array.isArray(s.matchedShingles) &&
        s.matchedShingles.every((m: any) => typeof m === "string") &&
        typeof s.url === "string"
      );
    });
  return scoreOk && arrOk;
}

async function analyzeText(
  text: string,
  mode: "words" | "shingles",
  k: number,
  signal?: AbortSignal
): Promise<AnalyzeResponse> {
  if (!API_URL) throw new Error("VITE_API_URL is not set (.env).");
  const endpoint = mode === "shingles" ? TEXT_ENDPOINT_SHINGLES : TEXT_ENDPOINT_WORDS;
  const body = mode === "shingles" ? { text, k } : { text };
  const res = await fetch(`${API_URL.replace(/\/$/, "")}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }
  const data: unknown = await res.json();
  if (!isAnalyzeResponse(data)) {
    throw new Error("Unexpected API response shape");
  }
  return data;
}

async function analyzeSingleFileWords(
  file: File,
  signal?: AbortSignal
): Promise<AnalyzeResponse> {
  if (!API_URL) throw new Error("VITE_API_URL is not set (.env).");
  const fd = new FormData();
  fd.append("file", file, file.name);
  const res = await fetch(`${API_URL.replace(/\/$/, "")}${FILE_ENDPOINT_WORDS}`, {
    method: "POST",
    body: fd,
    signal,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${msg}`);
  }
  const data: unknown = await res.json();
  if (!isAnalyzeResponse(data)) {
    throw new Error("Unexpected API response shape");
  }
  return data;
}

async function analyzeSingleFileShingles(
  file: File,
  k: number,
  signal?: AbortSignal
): Promise<AnalyzeResponse> {
  if (!API_URL) throw new Error("VITE_API_URL is not set (.env).");
  const fd = new FormData();
  fd.append("file", file, file.name);
  fd.append("k", String(k));
  const res = await fetch(`${API_URL.replace(/\/$/, "")}${FILE_ENDPOINT_SHINGLES}`, {
    method: "POST",
    body: fd,
    signal,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${msg}`);
  }
  const data: unknown = await res.json();
  if (!isAnalyzeResponse(data)) {
    throw new Error("Unexpected API response shape");
  }
  return data;
}

async function analyzeFiles(
  files: File[],
  mode: "words" | "shingles",
  k: number,
  signal?: AbortSignal
): Promise<FileAnalyzeItem[]> {
  const results: FileAnalyzeItem[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const r =
      mode === "shingles"
        ? await analyzeSingleFileShingles(f, k, signal)
        : await analyzeSingleFileWords(f, signal);
    results.push({
      fileName: f.name || `File ${i + 1}`,
      total: r.total,
      counts: r.counts,
      frequencies: r.frequencies,
    });
  }
  return results;
}

async function detectPlagiarismText(
  text: string,
  signal?: AbortSignal
): Promise<PlagiarismResponse> {
  if (!API_URL) throw new Error("VITE_API_URL is not set (.env).");
  const res = await fetch(
    `${API_URL.replace(/\/$/, "")}${PLAINTEXT_PLAGIARISM_ENDPOINT}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        shingleSize: DEFAULT_SHINGLE_SIZE,
        sampleStep: DEFAULT_SAMPLE_STEP,
      }),
      signal,
    }
  );
  if (!res.ok) {
    throw new Error(
      `Plagiarism API ${res.status}: ${await res.text().catch(() => res.statusText)}`
    );
  }
  const data: unknown = await res.json();
  if (isPlagiarismResponse(data)) return data;
  return { score: 0, potentialSources: [] };
}

async function detectPlagiarismFiles(
  files: File[],
  signal?: AbortSignal
): Promise<FilePlagiarismItem[]> {
  if (!API_URL) throw new Error("VITE_API_URL is not set (.env).");
  const results: FilePlagiarismItem[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const fd = new FormData();
    fd.append("file", f, f.name);
    fd.append("shingleSize", String(DEFAULT_SHINGLE_SIZE));
    fd.append("sampleStep", String(DEFAULT_SAMPLE_STEP));

    const res = await fetch(
      `${API_URL.replace(/\/$/, "")}${FILE_PLAGIARISM_ENDPOINT}`,
      {
        method: "POST",
        body: fd,
        signal,
      }
    );

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`Plagiarism API ${res.status}: ${msg}`);
    }

    const data: unknown = await res.json();
    if (isPlagiarismResponse(data)) {
      results.push({
        fileName: f.name || `File ${i + 1}`,
        score: data.score,
        potentialSources: data.potentialSources,
      });
    } else {
      results.push({
        fileName: f.name || `File ${i + 1}`,
        score: 0,
        potentialSources: [],
      });
    }
  }
  return results;
}

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

function PlagiarismTable({
  data,
  title,
}: {
  data: PlagiarismResponse;
  title?: string;
}) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2 flex-wrap">
        <h3 className="text-base font-semibold">
          {title ?? "Plagiarism check"}
        </h3>
        <StatBadge
          label="Sources"
          value={String(data.potentialSources.length)}
        />
        <StatBadge label="Score" value={pct(data.score)} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-y">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-[60px]">
                #
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-[200px]">
                Source URL
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Matched shingles
              </th>
            </tr>
          </thead>
          <tbody>
            {data.potentialSources.length ? (
              data.potentialSources.map((src, i) => (
                <tr key={i} className="border-b last:border-0 align-top">
                  <td className="px-4 py-3 text-gray-500 tabular-nums">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 break-words text-[13px] text-indigo-700">
                    {src.url}
                  </td>
                  <td className="px-4 py-3 text-[13px] whitespace-pre-wrap break-words">
                    {src.matchedShingles && src.matchedShingles.length
                      ? src.matchedShingles.join("\n")
                      : "(no exact shingles provided)"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-gray-500 text-sm" colSpan={3}>
                  No plagiarism detected
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilePlagiarismBlock({ results }: { results: FilePlagiarismItem[] }) {
  const [tab, setTab] = useState(0);

  if (!results.length) return null;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {results.map((it, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`px-3 py-1.5 rounded-xl border text-sm ${
              tab === i
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            {it.fileName || `File ${i + 1}`}
          </button>
        ))}
      </div>

      <PlagiarismTable
        data={{
          score: results[tab].score,
          potentialSources: results[tab].potentialSources,
        }}
        title={`Plagiarism — ${results[tab].fileName || `File ${tab + 1}`}`}
      />
    </div>
  );
}

function FileResultsBlock({ results }: { results: FileAnalyzeItem[] }) {
  const [tab, setTab] = useState(0);

  if (!results.length) return null;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {results.map((it, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`px-3 py-1.5 rounded-xl border text-sm ${
              tab === i
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            {it.fileName || `File ${i + 1}`}
          </button>
        ))}
      </div>

      <ResultsTable
        data={results[tab]}
        title={`Results — ${results[tab].fileName || `File ${tab + 1}`}`}
      />
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
    e.currentTarget.value = "";
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
        accept=".txt,text/plain"
      />
      <div className="text-sm font-medium">
        Drop files here or click to choose
      </div>
      <div className="text-xs text-gray-500">
        TXT recommended. Multiple files supported.
      </div>
    </label>
  );
}

export default function App() {
  const [text, setText] = useState("");

  const [textResult, setTextResult] = useState<AnalyzeResponse | null>(null);
  const [textPlagiarism, setTextPlagiarism] = useState<PlagiarismResponse | null>(null);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const [fileResults, setFileResults] = useState<FileAnalyzeItem[] | null>(null);
  const [filePlagiarism, setFilePlagiarism] = useState<FilePlagiarismItem[] | null>(null);

  const [loading, setLoading] = useState<"text" | "files" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [textMode, setTextMode] = useState<"words" | "shingles">("words");
  const [fileMode, setFileMode] = useState<"words" | "shingles">("words");

  const [k, setK] = useState<number>(3);

  const runTextAnalyze = async () => {
    const value = text.trim();
    if (!value) return;

    setErr(null);
    setLoading("text");

    setTextResult(null);
    setTextPlagiarism(null);

    setFileResults(null);
    setFilePlagiarism(null);

    try {
      const ctrl = new AbortController();

      const stats = await analyzeText(value, textMode, k, ctrl.signal);
      setTextResult(stats);

      const plag = await detectPlagiarismText(value, ctrl.signal);
      setTextPlagiarism(plag);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg || "API error");
    } finally {
      setLoading(null);
    }
  };

  const runFilesAnalyze = async () => {
    if (!pendingFiles.length) return;

    setErr(null);
    setLoading("files");

    setTextResult(null);
    setTextPlagiarism(null);

    setFileResults(null);
    setFilePlagiarism(null);

    try {
      const ctrl = new AbortController();

      const analyzeds = await analyzeFiles(pendingFiles, fileMode, k, ctrl.signal);
      setFileResults(analyzeds);

      const plagItems = await detectPlagiarismFiles(pendingFiles, ctrl.signal);
      setFilePlagiarism(plagItems);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg || "API error");
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
            <h1 className="text-lg font-bold">Text Analysis</h1>
          </div>
          <div className="text-xs text-gray-500">API: {API_URL || "not set"}</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 grid gap-6">
        <div className="bg-white border rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-semibold mb-2">
            Paste text to analyze
          </label>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste text here…"
            className="w-full min-h-[160px] max-h-[420px] resize-y rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-xs text-gray-700 flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
              <div className="text-gray-500">Characters: {text.length}</div>

              <label className="flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-wide font-semibold opacity-70">
                  Mode
                </span>
                <select
                  className="border rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={textMode}
                  onChange={(e) =>
                    setTextMode(
                      e.target.value === "shingles" ? "shingles" : "words"
                    )
                  }
                >
                  <option value="words">Words</option>
                  <option value="shingles">Shingles</option>
                </select>
              </label>

              {textMode === "shingles" && (
                <label className="flex items-center gap-1">
                  <span className="text-[11px] uppercase tracking-wide font-semibold opacity-70">
                    Step k
                  </span>
                  <input
                    type="number"
                    min={1}
                    className="w-16 border rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={k}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setK(!Number.isNaN(v) && v > 0 ? v : 1);
                    }}
                  />
                </label>
              )}
            </div>

            <button
              onClick={runTextAnalyze}
              disabled={
                (loading !== "text" && loading !== null) ||
                text.trim().length < 1
              }
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition"
            >
              Analyze text
            </button>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between flex-col sm:flex-row sm:items-center">
              <div className="text-sm font-semibold">
                Analyze files ({fileMode})
              </div>
              <div className="text-xs text-gray-500">
                Selected: {pendingFiles.length || 0}
              </div>
            </div>

            <div className="text-xs text-gray-700 flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
              <label className="flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-wide font-semibold opacity-70">
                  Mode
                </span>
                <select
                  className="border rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={fileMode}
                  onChange={(e) =>
                    setFileMode(
                      e.target.value === "shingles" ? "shingles" : "words"
                    )
                  }
                  disabled={loading !== null}
                >
                  <option value="words">Words</option>
                  <option value="shingles">Shingles</option>
                </select>
              </label>

              {fileMode === "shingles" && (
                <label className="flex items-center gap-1">
                  <span className="text-[11px] uppercase tracking-wide font-semibold opacity-70">
                    Step k
                  </span>
                  <input
                    type="number"
                    min={1}
                    className="w-16 border rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={k}
                    disabled={loading !== null}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setK(!Number.isNaN(v) && v > 0 ? v : 1);
                    }}
                  />
                </label>
              )}
            </div>

            <FileDrop
              disabled={loading !== null}
              onFilesSelected={(files) =>
                setPendingFiles((prev) => [...prev, ...files])
              }
            />

            {!!pendingFiles.length && (
              <div className="flex flex-wrap gap-2">
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
                        setPendingFiles((prev) =>
                          prev.filter((_, idx) => idx !== i)
                        )
                      }
                      disabled={loading !== null}
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
                  Analyze file
                  {pendingFiles.length > 1 ? "s" : ""}
                </button>
              </div>
            )}
          </div>
        </div>

        {loading === "text" && (
          <Loader label="Analyzing text & plagiarism…" />
        )}
        {loading === "files" && (
          <Loader label="Analyzing files & plagiarism…" />
        )}

        {err && (
          <div className="p-4 rounded-xl border bg-red-50 text-red-700 text-sm">
            API: {err}
          </div>
        )}

        {!loading && textResult && (
          <ResultsTable data={textResult} />
        )}

        {!loading && textPlagiarism && (
          <PlagiarismTable
            data={textPlagiarism}
            title="Plagiarism — text"
          />
        )}

        {!loading && fileResults && !!fileResults.length && (
          <FileResultsBlock results={fileResults} />
        )}

        {!loading && filePlagiarism && !!filePlagiarism.length && (
          <FilePlagiarismBlock results={filePlagiarism} />
        )}
      </main>
    </div>
  );
}
