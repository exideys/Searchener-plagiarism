namespace Texts.Domain;

public sealed class TextStats
{
    public int Total { get; init; }
    public IReadOnlyDictionary<string,int> Counts { get; init; } = new Dictionary<string,int>();
    public IReadOnlyDictionary<string,double> Frequencies { get; init; } = new Dictionary<string,double>();
}

public static class TextAnalyzer
{
    public static TextStats Analyze(string? text)
    {
        var words = text?.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries) ?? [];
        var dict = new Dictionary<string,int>();
        if (!string.IsNullOrEmpty(text))
            foreach (var ch in words)
                dict[ch] = dict.TryGetValue(ch, out var n) ? n + 1 : 1;

        var total = dict.Values.Sum();
        var freq = dict.ToDictionary(kv => kv.Key, kv => (double)kv.Value / (total == 0 ? 1 : total));
        return new TextStats { Total = total, Counts = dict, Frequencies = freq };
    }
}