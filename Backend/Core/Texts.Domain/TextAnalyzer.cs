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
            return new ShingleAnalyzer { Shingles = [] };

        var result = new string[words.Length - k + 1];
        
        for (int i = 0; i <= words.Length - k; i++)
        {
            var sb = new StringBuilder();
            for (int j = 0; j < k; j++)
            {
                if (j > 0) sb.Append(' ');
                sb.Append(words[i + j]);
            }

            result[i] = sb.ToString();
        }

        return new ShingleAnalyzer { Shingles = result };
    }
}
