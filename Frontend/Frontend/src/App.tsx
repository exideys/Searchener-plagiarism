import { useState } from "react";

import {
  analyzeText,
  analyzeFiles,
  detectPlagiarismText,
  detectPlagiarismFiles,
  API_BASE_URL,
} from "./api/analysisApi";

import {
  AnalyzeResponse,
  PlagiarismResponse,
  FileAnalyzeItem,
  FilePlagiarismItem,
} from "./types/analysis";

import { Loader } from "./components/Loader";
import { FileDrop } from "./components/FileDrop";
import { ResultsTable } from "./features/ResultsTable";
import { PlagiarismTable } from "./features/PlagiarismTable";
import { FileResultsBlock } from "./features/FileResultsBlock";
import { FilePlagiarismBlock } from "./features/FilePlagiarismBlock";

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
            <h1 className="text-lg font-bold">Searchener-plagiarism</h1>
          </div>
          <div className="text-xs text-gray-500">API: {API_BASE_URL}</div>
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

        {!loading && textResult && <ResultsTable data={textResult} />}

        {!loading && textPlagiarism && (
          <PlagiarismTable data={textPlagiarism} title="Plagiarism — text" />
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
