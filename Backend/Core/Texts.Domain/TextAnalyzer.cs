namespace Texts.Domain;

public sealed class TextStats
{
    public int Total { get; init; }
    public IReadOnlyDictionary<char,int> Counts { get; init; } = new Dictionary<char,int>();
    public IReadOnlyDictionary<char,double> Frequencies { get; init; } = new Dictionary<char,double>();
}

public static class TextAnalyzer
{
    public static TextStats Analyze(string? text)
    {
        var dict = new Dictionary<char,int>();
        if (!string.IsNullOrEmpty(text))
            foreach (var ch in text.Replace(" ", ""))
                dict[ch] = dict.TryGetValue(ch, out var n) ? n + 1 : 1;

        var total = dict.Values.Sum();
        var freq = dict.ToDictionary(kv => kv.Key, kv => (double)kv.Value / (total == 0 ? 1 : total));
        return new TextStats { Total = total, Counts = dict, Frequencies = freq };
    }
}