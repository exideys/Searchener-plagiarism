using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Texts.Infrastructure;

public class GoogleSearchClient : IGoogleSearchClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GoogleSearchClient> _logger;
    private readonly string _apiKey;
    private readonly string _searchEngineId;

    public GoogleSearchClient(HttpClient httpClient, IConfiguration configuration, ILogger<GoogleSearchClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["GoogleSearch:ApiKey"]!;
        _searchEngineId = configuration["GoogleSearch:SearchEngineId"]!;
    }

    public async Task<string?> FindFirstMatchUrlAsync(string exactPhrase)
    {
        var query = $"\"{exactPhrase}\""; 
        var requestUri = $"?key={_apiKey}&cx={_searchEngineId}&q={Uri.EscapeDataString(query)}";

        try
        {
            var response = await _httpClient.GetAsync(requestUri);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Google Search API returned a non-success status code {StatusCode} for phrase: {Phrase}", 
                    response.StatusCode, exactPhrase);
                return null;
            }

            var result = await response.Content.ReadFromJsonAsync<GoogleSearchResult>();
            return result?.Items?.FirstOrDefault()?.Link;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while calling Google Search API for phrase: {Phrase}", exactPhrase);
            return null;
        }
    }
}


public record GoogleSearchResult(List<GoogleSearchItem>? Items);
public record GoogleSearchItem(string Link);