namespace Texts.Contracts;

public sealed record AnalyzeTextRequest(string Text);

public sealed record AnalyzeTextResponse(
    int Total,
    Dictionary<string, int> Counts,
    Dictionary<string, double> Frequencies
);

public sealed record ExtractShinglesRequest(string Text, int K);

public sealed record ExtractShinglesResponse(
    int Total,
    Dictionary<string, int> Counts,
    Dictionary<string, double> Frequencies
);

public sealed record DetectPlagiarismRequest(string Text, int ShingleSize, int SampleStep);

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
