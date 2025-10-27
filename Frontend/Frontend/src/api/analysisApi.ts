import {
  AnalyzeResponse,
  FileAnalyzeItem,
  PlagiarismResponse,
  FilePlagiarismItem,
} from "../types/analysis";

const API_URL = import.meta.env?.VITE_API_URL as string | undefined;

const TEXT_ENDPOINT_WORDS = "/text/analyze";
const TEXT_ENDPOINT_SHINGLES = "/text/shingles";
const FILE_ENDPOINT_WORDS = "/file/analyze";
const FILE_ENDPOINT_SHINGLES = "/file/shingles";
const PLAINTEXT_PLAGIARISM_ENDPOINT = "/plagiarism/detect";
const FILE_PLAGIARISM_ENDPOINT = "/plagiarism/detect/file";

const DEFAULT_SHINGLE_SIZE = 5;
const DEFAULT_SAMPLE_STEP = 2;

const assertApiUrl = () => {
  if (!API_URL) throw new Error("VITE_API_URL is not set (.env).");
  return API_URL.replace(/\/$/, "");
};

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

export async function analyzeText(
  text: string,
  mode: "words" | "shingles",
  k: number,
  signal?: AbortSignal
): Promise<AnalyzeResponse> {
  const base = assertApiUrl();
  const endpoint = mode === "shingles" ? TEXT_ENDPOINT_SHINGLES : TEXT_ENDPOINT_WORDS;
  const body = mode === "shingles" ? { text, k } : { text };

  const res = await fetch(`${base}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }

  const data: unknown = await res.json();
  if (!isAnalyzeResponse(data)) throw new Error("Unexpected API response shape");
  return data;
}

async function analyzeSingleFileWords(
  file: File,
  signal?: AbortSignal
): Promise<AnalyzeResponse> {
  const base = assertApiUrl();
  const fd = new FormData();
  fd.append("file", file, file.name);

  const res = await fetch(`${base}${FILE_ENDPOINT_WORDS}`, {
    method: "POST",
    body: fd,
    signal,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${msg}`);
  }

  const data: unknown = await res.json();
  if (!isAnalyzeResponse(data)) throw new Error("Unexpected API response shape");
  return data;
}

async function analyzeSingleFileShingles(
  file: File,
  k: number,
  signal?: AbortSignal
): Promise<AnalyzeResponse> {
  const base = assertApiUrl();
  const fd = new FormData();
  fd.append("file", file, file.name);
  fd.append("k", String(k));

  const res = await fetch(`${base}${FILE_ENDPOINT_SHINGLES}`, {
    method: "POST",
    body: fd,
    signal,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${msg}`);
  }

  const data: unknown = await res.json();
  if (!isAnalyzeResponse(data)) throw new Error("Unexpected API response shape");
  return data;
}

export async function analyzeFiles(
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

export async function detectPlagiarismText(
  text: string,
  signal?: AbortSignal
): Promise<PlagiarismResponse> {
  const base = assertApiUrl();

  const res = await fetch(`${base}${PLAINTEXT_PLAGIARISM_ENDPOINT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      shingleSize: DEFAULT_SHINGLE_SIZE,
      sampleStep: DEFAULT_SAMPLE_STEP,
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(
      `Plagiarism API ${res.status}: ${await res
        .text()
        .catch(() => res.statusText)}`
    );
  }

  const data: unknown = await res.json();
  if (isPlagiarismResponse(data)) return data;
  return { score: 0, potentialSources: [] };
}

export async function detectPlagiarismFiles(
  files: File[],
  signal?: AbortSignal
): Promise<FilePlagiarismItem[]> {
  const base = assertApiUrl();
  const results: FilePlagiarismItem[] = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const fd = new FormData();
    fd.append("file", f, f.name);
    fd.append("shingleSize", String(DEFAULT_SHINGLE_SIZE));
    fd.append("sampleStep", String(DEFAULT_SAMPLE_STEP));

    const res = await fetch(`${base}${FILE_PLAGIARISM_ENDPOINT}`, {
      method: "POST",
      body: fd,
      signal,
    });

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

export const API_BASE_URL = API_URL || "not set";
