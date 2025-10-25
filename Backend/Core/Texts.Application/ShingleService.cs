using Texts.Domain;

namespace Texts.Application;

public sealed class ShingleService : IShingleService
{
    private const int MaxChars = 1_000_000; 

    public string[] Extract(string text, int k)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("Text is required");

        if (k <= 0)
            throw new ArgumentException("K must be > 0");

        if (text.Length > MaxChars)
            throw new ArgumentException($"Text is too large (>{MaxChars} chars)");
        
        var tokens = TextAnalyzer.Tokenize(text);
        if (tokens.Length < k)
            return [];
        
        var sh = TextAnalyzer.ExtractShingles(text, k);
        return sh.Shingles;
    }
}