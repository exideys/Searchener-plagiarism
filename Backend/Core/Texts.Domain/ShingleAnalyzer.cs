namespace Texts.Domain;

public sealed class ShingleAnalyzer
{
    public int Total { get; init; }
    public IReadOnlyDictionary<string, int> Counts { get; init; } = new Dictionary<string, int>();
    public IReadOnlyDictionary<string, double> Frequencies { get; init; } = new Dictionary<string, double>();

}