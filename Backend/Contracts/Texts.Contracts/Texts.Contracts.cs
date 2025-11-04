namespace Texts.Contracts;

public sealed record AnalyzeTextRequest(string Text, int q);

public sealed record AnalyzeTextResponse(
    int Total,
    Dictionary<string, int> Counts,
    Dictionary<string, double> Frequencies
);

public sealed record ExtractShinglesRequest(string Text, int K,int q);

public sealed record ExtractShinglesResponse(
    int Total,
    Dictionary<string, int> Counts,
    Dictionary<string, double> Frequencies
);

public sealed record DetectPlagiarismRequest(string Text, int ShingleSize, int SampleStep, int q);

public sealed record DetectPlagiarismResponse(double Score, List<SourceMatchDto> PotentialSources);

public sealed record SourceMatchDto(List<string> MatchedShingles, string Url);

public sealed record FileComparisonResult(
    double SimilarityPercentage, 
    List<MatchedShingles> CommonShingles,
    int TotalFirstTextShingles,
    int TotalSecondTextShingles,
    int TotalCommonShingles
    );

public sealed record MatchedShingles(string MatchedShingle, int MatchedFirstFileCount, int MatchedSecondFileCount);

public sealed record FileComparisonRequest(string File1Content, string File2Content);

public sealed record FileComparisonResponse(FileComparisonResult Result);
