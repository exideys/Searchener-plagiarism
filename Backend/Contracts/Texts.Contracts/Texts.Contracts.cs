namespace Texts.Contracts;

public sealed record AnalyzeTextRequest(string Text);

public sealed record AnalyzeTextResponse(
    int Total,
    Dictionary<string, int> Counts,
    Dictionary<string, double> Frequencies
);

public sealed record ExtractShinglesRequest(string Text, int K);

public sealed record ExtractShinglesResponse(string[] Shingles);