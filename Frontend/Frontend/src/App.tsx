import React, { useMemo, useState } from "react";
import {
  analyzeTextRequest,
  analyzeShinglesRequest,
  analyzeFilesRequest,
  detectPlagiarismText,
  detectPlagiarismFiles,
  type AnalyzeResponse,
  type ShinglesResponse,
  type FileAnalyzeItem,
  type PlagiarismResponse,
  type FilePlagiarismItem,
} from "./api/analysisApi";

type Mode = "WORDS" | "SHINGLES";

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

export default function App() {
  // ===== text analysis state =====
  const [textInput, setTextInput] = useState("");
  const [mode, setMode] = useState<Mode>("WORDS");
  const [shingleSize, setShingleSize] = useState<number>(5);
  const [sampleStep, setSampleStep] = useState<number>(2);

  const [textResultWords, setTextResultWords] = useState<AnalyzeResponse | null>(null);
  const [textResultShingles, setTextResultShingles] = useState<ShinglesResponse | null>(null);

  const [textError, setTextError] = useState<string | null>(null);

  // ===== file analysis state =====
  const [fileResults, setFileResults] = useState<FileAnalyzeItem[]>([]);
  const [activeFileTab, setActiveFileTab] = useState<number>(0);
  const [fileError, setFileError] = useState<string | null>(null);

  // ===== plagiarism text =====
  const [plagiarismTextInput, setPlagiarismTextInput] = useState("");
  const [plagiarismTextResult, setPlagiarismTextResult] = useState<PlagiarismResponse | null>(null);
  const [plagiarismTextError, setPlagiarismTextError] = useState<string | null>(null);

  // ===== plagiarism files =====
  const [plagiarismFilesResult, setPlagiarismFilesResult] = useState<FilePlagiarismItem[]>([]);
  const [plagiarismFilesError, setPlagiarismFilesError] = useState<string | null>(null);

  // ===== derived =====
  const activeFileStats = useMemo(() => {
    if (
      activeFileTab >= 0 &&
      activeFileTab < fileResults.length
    ) {
      return fileResults[activeFileTab];
    }
    return null;
  }, [fileResults, activeFileTab]);

  // ===== handlers =====

  async function handleAnalyzeText() {
    setTextError(null);
    setTextResultWords(null);
    setTextResultShingles(null);

    try {
      if (mode === "WORDS") {
        const data = await analyzeTextRequest(textInput);
        setTextResultWords(data);
      } else {
        const data = await analyzeShinglesRequest(
          textInput,
          shingleSize,
          sampleStep
        );
        setTextResultShingles(data);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Request failed";
      setTextError(message);
    }
  }

  async function handleUploadAnalyzeFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setFileError(null);

    try {
      const arr = Array.from(files);
      const data = await analyzeFilesRequest(arr);
      setFileResults(data);
      setActiveFileTab(0);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Request failed";
      setFileError(message);
    }
  }

  async function handleCheckPlagiarismText() {
    setPlagiarismTextError(null);
    setPlagiarismTextResult(null);

    try {
      const data = await detectPlagiarismText(plagiarismTextInput);
      setPlagiarismTextResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Request failed";
      setPlagiarismTextError(message);
    }
  }

  async function handleCheckPlagiarismFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPlagiarismFilesError(null);
    setPlagiarismFilesResult([]);

    try {
      const arr = Array.from(files);
      const data = await detectPlagiarismFiles(arr);
      setPlagiarismFilesResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Request failed";
      setPlagiarismFilesError(message);
    }
  }

  // ===== render helpers =====

  function renderWordsTable(r: AnalyzeResponse) {
    const rows = Object.keys(r.counts).map((word) => {
      const count = r.counts[word];
      const freq = r.frequencies[word] ?? 0;
      return { word, count, freq };
    });

    return (
      <div>
        <div className="font-medium text-sm mb-2">
          Total tokens:{" "}
          <span className="font-bold">{r.total}</span>
        </div>

        <table className="text-sm w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left pr-4 py-1">Word</th>
              <th className="text-left pr-4 py-1">Count</th>
              <th className="text-left pr-4 py-1">Freq</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b" key={row.word}>
                <td className="pr-4 py-1">{row.word}</td>
                <td className="pr-4 py-1">{row.count}</td>
                <td className="pr-4 py-1">{pct(row.freq)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderShinglesTable(r: ShinglesResponse) {
    return (
      <div>
        <div className="font-medium text-sm mb-2">
          Generated shingles:
        </div>
        <table className="text-sm w-full border-collapse">
          <tbody>
            {r.shingles.map((s, idx) => (
              <tr className="border-b" key={idx}>
                <td className="py-1">{s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderFileTabs() {
    if (!fileResults.length) return null;

    return (
      <div className="mt-4">
        <div className="flex gap-2 mb-2 flex-wrap">
          {fileResults.map((f, idx) => (
            <button
              key={idx}
              role="tab"
              onClick={() => setActiveFileTab(idx)}
              className={
                "px-3 py-1 rounded-2xl border text-xs font-medium " +
                (idx === activeFileTab
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 text-gray-800 border-gray-300")
              }
            >
              {f.fileName ?? `File ${idx + 1}`}
            </button>
          ))}
        </div>

        {activeFileStats && (
          <div className="text-sm">
            <div className="font-medium text-sm mb-2">
              Total tokens:{" "}
              <span className="font-bold">
                {activeFileStats.total}
              </span>
            </div>

            <table className="text-sm w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left pr-4 py-1">Word</th>
                  <th className="text-left pr-4 py-1">Count</th>
                  <th className="text-left pr-4 py-1">Freq</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(activeFileStats.counts).map((w) => (
                  <tr className="border-b" key={w}>
                    <td className="pr-4 py-1">{w}</td>
                    <td className="pr-4 py-1">
                      {activeFileStats.counts[w]}
                    </td>
                    <td className="pr-4 py-1">
                      {pct(activeFileStats.frequencies[w] ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderPlagiarismTextResult() {
    if (!plagiarismTextResult) return null;
    return (
      <div className="mt-4 text-sm">
        <div className="mb-2 font-medium">
          Plagiarism score:{" "}
          <span className="font-bold">
            {pct(plagiarismTextResult.score)}
          </span>
        </div>

        <div className="space-y-2">
          {plagiarismTextResult.potentialSources.map(
            (src, i) => (
              <div
                key={i}
                className="rounded-lg border p-2 text-xs"
              >
                <div className="break-all underline">
                  {src.url}
                </div>
                <div className="mt-1">
                  {src.matchedShingles.join(" / ")}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  function renderPlagiarismFilesResult() {
    if (!plagiarismFilesResult.length) return null;
    return (
      <div className="mt-4 space-y-4 text-sm">
        {plagiarismFilesResult.map((res, idx) => (
          <div
            key={idx}
            className="rounded-lg border p-3 bg-white shadow"
          >
            <div className="font-medium text-sm mb-1">
              {res.fileName ?? `File ${idx + 1}`}
            </div>
            <div className="text-sm mb-2">
              Plagiarism score:{" "}
              <span className="font-bold">
                {pct(res.score)}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              {res.potentialSources.map((src, i) => (
                <div
                  key={i}
                  className="rounded border p-2"
                >
                  <div className="break-all underline">
                    {src.url}
                  </div>
                  <div className="mt-1">
                    {src.matchedShingles.join(" / ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ===== main render =====

  return (
    <div className="p-4 flex flex-col gap-8 max-w-5xl mx-auto text-gray-900">
      {/* TEXT ANALYSIS */}
      <section className="bg-white rounded-xl shadow p-4 border">
        <h2 className="text-lg font-bold mb-2">
          Text Analysis: Unique Words
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Paste text to analyze
        </p>

        <textarea
          className="w-full border rounded-lg p-2 text-sm mb-4"
          rows={4}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Paste text to analyze"
        />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="WORDS"
                checked={mode === "WORDS"}
                onChange={() => setMode("WORDS")}
              />
              <span>Words mode</span>
            </label>

            <label className="text-sm font-medium flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="SHINGLES"
                checked={mode === "SHINGLES"}
                onChange={() => setMode("SHINGLES")}
              />
              <span>Shingles mode</span>
            </label>

            <label className="text-xs text-gray-600 flex flex-col">
              <span>Shingle size</span>
              <input
                aria-label="Shingle size"
                className="border rounded px-2 py-1 text-sm w-24"
                type="number"
                value={shingleSize}
                onChange={(e) =>
                  setShingleSize(Number(e.target.value) || 0)
                }
              />
            </label>

            <label className="text-xs text-gray-600 flex flex-col">
              <span>Sample step</span>
              <input
                aria-label="Sample step"
                className="border rounded px-2 py-1 text-sm w-24"
                type="number"
                value={sampleStep}
                onChange={(e) =>
                  setSampleStep(Number(e.target.value) || 0)
                }
              />
            </label>
          </div>

          <div className="flex items-start">
            <button
              className="px-3 py-1 rounded-2xl bg-blue-600 text-white text-xs font-semibold shadow"
              onClick={handleAnalyzeText}
            >
              Analyze text
            </button>
          </div>
        </div>

        {textError && (
          <div className="text-red-600 text-sm mt-4">
            {textError}
          </div>
        )}

        {!textError && textResultWords && (
          <div className="mt-4">{renderWordsTable(textResultWords)}</div>
        )}

        {!textError && textResultShingles && (
          <div className="mt-4">
            {renderShinglesTable(textResultShingles)}
          </div>
        )}
      </section>

      {/* FILE ANALYSIS */}
      <section className="bg-white rounded-xl shadow p-4 border">
        <h2 className="text-lg font-bold mb-2">
          Analyze files
        </h2>

        <label className="block text-sm text-gray-700 mb-2 font-medium">
          Upload files
        </label>
        <input
          aria-label="Upload files"
          className="text-sm"
          type="file"
          multiple
          onChange={(e) =>
            handleUploadAnalyzeFiles(e.target.files)
          }
        />

        {fileError && (
          <div className="text-red-600 text-sm mt-4">
            {fileError}
          </div>
        )}

        {!fileError && renderFileTabs()}
      </section>

      {/* PLAGIARISM CHECK */}
      <section className="bg-white rounded-xl shadow p-4 border">
        <h2 className="text-lg font-bold mb-2">
          Plagiarism Check
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* plagiarism TEXT */}
          <div>
            <p className="text-sm text-gray-600 mb-2 font-medium">
              Check plagiarism for text
            </p>

            <textarea
              className="w-full border rounded-lg p-2 text-sm mb-2"
              rows={4}
              placeholder="Paste text to check plagiarism"
              value={plagiarismTextInput}
              onChange={(e) =>
                setPlagiarismTextInput(e.target.value)
              }
            />

            <button
              className="px-3 py-1 rounded-2xl bg-purple-600 text-white text-xs font-semibold shadow"
              onClick={handleCheckPlagiarismText}
            >
              Check text plagiarism
            </button>

            {plagiarismTextError && (
              <div className="text-red-600 text-sm mt-2">
                {plagiarismTextError}
              </div>
            )}

            {!plagiarismTextError &&
              renderPlagiarismTextResult()}
          </div>

          {/* plagiarism FILE */}
          <div>
            <p className="text-sm text-gray-600 mb-2 font-medium">
              Check plagiarism for file
            </p>

            <input
              aria-label="Upload file to check plagiarism"
              className="text-sm mb-2"
              type="file"
              onChange={(e) =>
                handleCheckPlagiarismFiles(e.target.files)
              }
            />

            {plagiarismFilesError && (
              <div className="text-red-600 text-sm">
                {plagiarismFilesError}
              </div>
            )}

            {!plagiarismFilesError &&
              renderPlagiarismFilesResult()}
          </div>
        </div>
      </section>
    </div>
  );
}
