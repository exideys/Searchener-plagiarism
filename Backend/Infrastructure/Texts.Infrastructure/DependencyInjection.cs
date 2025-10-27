using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Texts.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpClient<IGoogleSearchClient, GoogleSearchClient>(client =>
        {
            client.BaseAddress = new Uri("https://www.googleapis.com/customsearch/v1");
        });

        return services;
    }
}