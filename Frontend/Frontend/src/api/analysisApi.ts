// src/api/analysisApi.ts

export type AnalyzeResponse = {
  total: number;
  counts: Record<string, number>;
  frequencies: Record<string, number>;
};

export type ShinglesResponse = {
  shingles: string[];
};

export type FileAnalyzeItem = AnalyzeResponse & {
  fileName?: string;
};

export type PlagiarismResponse = {
  score: number;
  potentialSources: Array<{
    matchedShingles: string[];
    url: string;
  }>;
};

export type FilePlagiarismItem = PlagiarismResponse & {
  fileName?: string;
};

function getBaseUrl(): string {
  const raw = import.meta.env?.VITE_API_URL;
  if (!raw || typeof raw !== "string" || raw.trim() === "") {
    throw new Error("VITE_API_URL is not set (.env)");
  }
  // убираем / в конце чтобы не было двойного слэша
  return raw.replace(/\/$/, "");
}

/**
 * POST /text/analyze
 */
export async function analyzeTextRequest(
  text: string,
  signal?: AbortSignal
): Promise<AnalyzeResponse> {
  const res = await fetch(`${getBaseUrl()}/text/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });

  if (!res.ok) {
    // пробуем текстовую ошибку
    throw new Error(await res.text());
  }
  return (await res.json()) as AnalyzeResponse;
}

/**
 * POST /text/shingles
 */
export async function analyzeShinglesRequest(
  text: string,
  k: number,
  step: number,
  signal?: AbortSignal
): Promise<ShinglesResponse> {
  const res = await fetch(`${getBaseUrl()}/text/shingles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, k, step }),
    signal,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  return (await res.json()) as ShinglesResponse;
}

/**
 * POST /file/analyze
 * multipart/form-data
 */
export async function analyzeFilesRequest(
  files: File[],
  signal?: AbortSignal
): Promise<FileAnalyzeItem[]> {
  const form = new FormData();
  for (const f of files) {
    form.append("files", f, f.name);
  }

  const res = await fetch(`${getBaseUrl()}/file/analyze`, {
    method: "POST",
    body: form,
    signal,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  return (await res.json()) as FileAnalyzeItem[];
}

/**
 * POST /plagiarism/detect
 */
export async function detectPlagiarismText(
  text: string,
  signal?: AbortSignal
): Promise<PlagiarismResponse> {
  const res = await fetch(`${getBaseUrl()}/plagiarism/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  return (await res.json()) as PlagiarismResponse;
}

/**
 * POST /plagiarism/detect/file
 * multipart/form-data
 */
export async function detectPlagiarismFiles(
  files: File[],
  signal?: AbortSignal
): Promise<FilePlagiarismItem[]> {
  const form = new FormData();
  for (const f of files) {
    form.append("files", f, f.name);
  }

  const res = await fetch(`${getBaseUrl()}/plagiarism/detect/file`, {
    method: "POST",
    body: form,
    signal,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  return (await res.json()) as FilePlagiarismItem[];
}
