using Texts.Domain;

namespace Texts.Application;

public sealed class ShingleService : IShingleService
{
    private const int MaxChars = 1_000_000; 

    public ShingleAnalyzer Extract(string text, int k)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("Text is required");

        if (k <= 0)
            throw new ArgumentException("K must be > 0");

        if (text.Length > MaxChars)
            throw new ArgumentException($"Text is too large (>{MaxChars} chars)");
        
        
        return TextAnalyzer.ExtractShingles(text, k);
    }
}