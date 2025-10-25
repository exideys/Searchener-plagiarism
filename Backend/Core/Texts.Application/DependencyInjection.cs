using Microsoft.Extensions.DependencyInjection;

namespace Texts.Application;


public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<ITextService, TextService>();
        services.AddScoped<IAnalyzeFileService, AnalyzeFileService>();
        services.AddScoped<IShingleService, ShingleService>();

        return services;
    }
}