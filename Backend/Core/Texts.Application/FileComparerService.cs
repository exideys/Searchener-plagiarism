using Texts.Domain;

namespace Texts.Application;

public class FileComparerService : IFileComparerService
{
    private readonly IShingleService _shingleService;

    public FileComparerService(IShingleService shingleService)
    {
        _shingleService = shingleService;
    }


public async Task<FileComparisonResult> CompareAsync(string text1, string text2, int shingleSize, int q)
{
    var shingleAnalysis1 = _shingleService.Extract(text1, shingleSize, q);
    var shingleAnalysis2 = _shingleService.Extract(text2, shingleSize, q);

    var shingles1 = shingleAnalysis1.Counts.Keys;
    var shingles2 = shingleAnalysis2.Counts.Keys;

    var commonShingles = shingles1.Intersect(shingles2).ToList();

    var unionShingles = shingles1.Count() + shingles2.Count() - commonShingles.Count;
    var similarity = unionShingles > 0 ? (double)commonShingles.Count / unionShingles : 0;

    return await Task.FromResult(new FileComparisonResult
    {
        SimilarityPercentage = similarity,
        CommonShingles = commonShingles.Select(shingle => new MatchedShingles
        {
            MatchedShingle = shingle,
            MatchedFirstFileCount = shingleAnalysis1.Counts.GetValueOrDefault(shingle, 0),
            MatchedSecondFileCount = shingleAnalysis2.Counts.GetValueOrDefault(shingle, 0)
        }).ToList(),
        TotalFirstTextShingles = shingles1.Count(),
        TotalSecondTextShingles = shingles2.Count(),
        TotalCommonShingles = commonShingles.Count
    });
}

}
