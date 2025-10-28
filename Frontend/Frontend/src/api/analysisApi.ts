export type AnalyzeResponse = {
  total: number;
  counts: Record<string, number>;
  frequencies: Record<string, number>;
};

export type FileAnalyzeItem = AnalyzeResponse & { fileName?: string };

export type SourceMatchDto = {
  matchedShingles: string[];
  url: string;
};

export type PlagiarismResponse = {
  score: number;
  potentialSources: SourceMatchDto[];
};

export type FilePlagiarismItem = PlagiarismResponse & {
  fileName?: string;
};

export const API_BASE_URL = import.meta.env?.VITE_API_URL as
  | string
  | undefined;

const TEXT_ENDPOINT_WORDS = "/text/analyze";
const TEXT_ENDPOINT_SHINGLES = "/text/shingles";
const FILE_ENDPOINT_WORDS = "/file/analyze";
const FILE_ENDPOINT_SHINGLES = "/file/shingles";
const PLAINTEXT_PLAGIARISM_ENDPOINT = "/plagiarism/detect";
const FILE_PLAGIARISM_ENDPOINT = "/plagiarism/detect/file";

export const DEFAULT_SHINGLE_SIZE = 5;
export const DEFAULT_SAMPLE_STEP = 2;

function isPlainRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAnalyzeResponse(x: unknown): x is AnalyzeResponse {
  if (!isPlainRecord(x)) return false;

  const { total, counts, frequencies } = x;

  const totalOk = typeof total === "number";

  const countsOk =
    isPlainRecord(counts) &&
    Object.values(counts).every(
      (v): v is number => typeof v === "number"
    );

  const freqsOk =
    isPlainRecord(frequencies) &&
    Object.values(frequencies).every(
      (v): v is number => typeof v === "number"
    );

  return totalOk && countsOk && freqsOk;
}

function isSourceMatchDto(x: unknown): x is SourceMatchDto {
  if (!isPlainRecord(x)) return false;

  const { matchedShingles, url } = x;

  const shinglesOk =
    Array.isArray(matchedShingles) &&
    matchedShingles.every(
      (m): m is string => typeof m === "string"
    );

  const urlOk = typeof url === "string";

  return shinglesOk && urlOk;
}

function isPlagiarismResponse(
  x: unknown
): x is PlagiarismResponse {
  if (!isPlainRecord(x)) return false;

  const { score, potentialSources } = x;

  const scoreOk = typeof score === "number";

  const sourcesOk =
    Array.isArray(potentialSources) &&
    potentialSources.every(
      (s): s is SourceMatchDto => isSourceMatchDto(s)
    );

  return scoreOk && sourcesOk;
}

export async function analyzeText(
  text: string,
  mode: "words" | "shingles",
  k: number,
  signal?: AbortSignal
): Promise<AnalyzeResponse> {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_URL is not set (.env).");
  }

  const endpoint =
    mode === "shingles" ? TEXT_ENDPOINT_SHINGLES : TEXT_ENDPOINT_WORDS;

  const body =
    mode === "shingles"
      ? { text, k }
      : { text };

  const res = await fetch(
    `${API_BASE_URL.replace(/\/$/, "")}${endpoint}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    }
  );

  if (!res.ok) {
    throw new Error(
      `API ${res.status}: ${await res
        .text()
        .catch(() => res.statusText)}`
    );
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
  if (!API_BASE_URL) {
    throw new Error("VITE_API_URL is not set (.env).");
  }

  const fd = new FormData();
  fd.append("file", file, file.name);

  const res = await fetch(
    `${API_BASE_URL.replace(/\/$/, "")}${FILE_ENDPOINT_WORDS}`,
    {
      method: "POST",
      body: fd,
      signal,
    }
  );

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
  if (!API_BASE_URL) {
    throw new Error("VITE_API_URL is not set (.env).");
  }

  const fd = new FormData();
  fd.append("file", file, file.name);
  fd.append("k", String(k));

  const res = await fetch(
    `${API_BASE_URL.replace(/\/$/, "")}${FILE_ENDPOINT_SHINGLES}`,
    {
      method: "POST",
      body: fd,
      signal,
    }
  );

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

export async function analyzeFiles(
  files: File[],
  mode: "words" | "shingles",
  k: number,
  signal?: AbortSignal
): Promise<FileAnalyzeItem[]> {
  const results: FileAnalyzeItem[] = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];

    const stats =
      mode === "shingles"
        ? await analyzeSingleFileShingles(f, k, signal)
        : await analyzeSingleFileWords(f, signal);

    results.push({
      fileName: f.name || `File ${i + 1}`,
      total: stats.total,
      counts: stats.counts,
      frequencies: stats.frequencies,
    });
  }

  return results;
}

export async function detectPlagiarismText(
  text: string,
  signal?: AbortSignal
): Promise<PlagiarismResponse> {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_URL is not set (.env).");
  }

  const res = await fetch(
    `${API_BASE_URL.replace(/\/$/, "")}${
      PLAINTEXT_PLAGIARISM_ENDPOINT
    }`,
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
      `Plagiarism API ${res.status}: ${await res
        .text()
        .catch(() => res.statusText)}`
    );
  }

  const data: unknown = await res.json();
  if (isPlagiarismResponse(data)) {
    return data;
  }

  // fallback (если API не вернул нормальную структуру)
  return { score: 0, potentialSources: [] };
}

export async function detectPlagiarismFiles(
  files: File[],
  signal?: AbortSignal
): Promise<FilePlagiarismItem[]> {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_URL is not set (.env).");
  }

  const results: FilePlagiarismItem[] = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];

    const fd = new FormData();
    fd.append("file", f, f.name);
    fd.append("shingleSize", String(DEFAULT_SHINGLE_SIZE));
    fd.append("sampleStep", String(DEFAULT_SAMPLE_STEP));

    const res = await fetch(
      `${API_BASE_URL.replace(/\/$/, "")}${
        FILE_PLAGIARISM_ENDPOINT
      }`,
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
