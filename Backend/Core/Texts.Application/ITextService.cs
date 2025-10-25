using Texts.Domain;

namespace Texts.Application;

public interface ITextService
{
    TextStats Analyze(string? text);
}