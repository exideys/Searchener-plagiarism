export type AnalyzeResponse = {
  total: number;
  counts: Record<string, number>;
  frequencies: Record<string, number>;
};

export type FileAnalyzeItem = AnalyzeResponse & { fileName?: string };

export type Row = { word: string; count: number; freq: number };

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
