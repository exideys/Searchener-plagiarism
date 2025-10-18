namespace Texts.Contracts;

public sealed record AnalyzeTextRequest(string Text);
public sealed record AnalyzeTextResponse(
    int Total,
    IDictionary<string,int> Counts,
    IDictionary<string,double> Frequencies
);