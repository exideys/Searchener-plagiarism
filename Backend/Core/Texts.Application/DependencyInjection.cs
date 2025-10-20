using Microsoft.Extensions.DependencyInjection;
using Texts.Domain;

namespace Texts.Application;

public interface ITextService
{
    TextStats Analyze(string? text);
}

public sealed class TextService : ITextService
{
    public TextStats Analyze(string? text) => TextAnalyzer.Analyze(text);
}

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
        => services.AddSingleton<ITextService, TextService>();
}