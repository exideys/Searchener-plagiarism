using Texts.Domain;

namespace Texts.Application;

public sealed class TextService : ITextService
{
    public TextStats Analyze(string? text)
        => TextAnalyzer.Analyze(text);
}