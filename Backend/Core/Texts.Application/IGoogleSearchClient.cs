namespace Texts.Infrastructure;

public interface IGoogleSearchClient
{
    Task<string?> FindFirstMatchUrlAsync(string exactPhrase);
}