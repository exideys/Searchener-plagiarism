using System.Text;

namespace Texts.Domain;

public static class TextAnalyzer
{
    public static string[] Tokenize(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return [];
        
        var cleaned = new string(
            text
                .Normalize(NormalizationForm.FormC)
                .Select(c =>
                    char.IsPunctuation(c) && c != '#' && c != '@'
                        ? ' '
                        : char.ToLowerInvariant(c))
                .ToArray()
        );

        return cleaned
            .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
    }
    
    public static TextStats Analyze(string? text)
    {
        var words = Tokenize(text);

        var total = words.Length;
        var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var w in words)
        {
            if (!counts.TryGetValue(w, out var n))
                counts[w] = 1;
            else
                counts[w] = n + 1;
        }

        var freqs = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        if (total > 0)
        {
            foreach (var (word, cnt) in counts)
            {
                freqs[word] = (double)cnt / total;
            }
        }

        return new TextStats
        {
            Total = total,
            Counts = counts,
            Frequencies = freqs
        };
    }
    
    public static ShingleAnalyzer ExtractShingles(string text, int k)
    {
        var words = Tokenize(text);

        if (k <= 0 || words.Length < k)
            return new ShingleAnalyzer(); 
        var allShingles = new List<string>();
        for (int i = 0; i <= words.Length - k; i++)
        {
            allShingles.Add(string.Join(" ", words.Skip(i).Take(k)));
        }

        var total = allShingles.Count;
        var counts = new Dictionary<string, int>();
        
        foreach (var shingle in allShingles)
        {
            counts.TryGetValue(shingle, out var currentCount);
            counts[shingle] = currentCount + 1;
        }

        var freqs = new Dictionary<string, double>();
        if (total > 0)
        {
            foreach (var (shingle, count) in counts)
            {
                freqs[shingle] = (double)count / total;
            }
        }
        
        return new ShingleAnalyzer
        {
            Total = total,
            Counts = counts,
            Frequencies = freqs
        };
    }
}
