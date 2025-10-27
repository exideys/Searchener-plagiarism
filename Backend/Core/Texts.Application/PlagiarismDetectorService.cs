using Texts.Domain;
using Texts.Infrastructure; 

namespace Texts.Application;

public class PlagiarismDetectorService : IPlagiarismDetectorService
{
    
    private readonly IShingleService _shingleService;
    private readonly IGoogleSearchClient _googleSearchClient;

    public PlagiarismDetectorService(IShingleService shingleService, IGoogleSearchClient googleSearchClient)
    {
        _shingleService = shingleService;
        _googleSearchClient = googleSearchClient;
    }

    public async Task<PlagiarismResult> DetectAsync(string text, int shingleSize, int sampleStep)
    {
        if (shingleSize <= 0)
            throw new ArgumentException("Shingle size must be greater than 0.", nameof(shingleSize));
        if (sampleStep <= 0)
            throw new ArgumentException("Sample step must be greater than 0.", nameof(sampleStep));
        var shingleAnalysis = _shingleService.Extract(text, shingleSize);
        var uniqueShingles = shingleAnalysis.Counts.Keys.ToArray();

        if (uniqueShingles.Length == 0)
            return new PlagiarismResult { Score = 0 };

        
        var shinglesToSearch = uniqueShingles
            .Where((shingle, index) => index % sampleStep == 0)
            .ToList();

        if (shinglesToSearch.Count == 0)
            return new PlagiarismResult { Score = 0 };
            
        
        var searchTasks = shinglesToSearch
            .Select(shingle => _googleSearchClient.FindFirstMatchUrlAsync(shingle))
            .ToList();

        var foundUrls = await Task.WhenAll(searchTasks);
        
        
        var shingleAndUrlPairs = new List<(string Shingle, string? Url)>();
        for (int i = 0; i < shinglesToSearch.Count; i++)
        {
            shingleAndUrlPairs.Add((shinglesToSearch[i], foundUrls[i]));
        }
        
        var matches = shingleAndUrlPairs.Where(pair => !string.IsNullOrEmpty(pair.Url)).ToList();
        
        var sources = matches
            .GroupBy(match => match.Url)
            .Select(group => new SourceMatch
            {
                Url = group.Key!,
                MatchedShingles = group.Select(g => g.Shingle).ToList()
            })
            .ToList();

        return new PlagiarismResult
        {
            Score = shinglesToSearch.Count > 0 ? (double)matches.Count / shinglesToSearch.Count : 0,
            PotentialSources = sources
        };
    }
}
