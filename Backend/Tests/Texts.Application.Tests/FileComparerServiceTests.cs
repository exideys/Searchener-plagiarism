using Moq;
using Xunit;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using Texts.Domain;

namespace Texts.Application.Tests;

public class FileComparerServiceTests
{
    private readonly Mock<IShingleService> _shingleServiceMock;
    private readonly FileComparerService _fileComparerService;

    public FileComparerServiceTests()
    {
        _shingleServiceMock = new Mock<IShingleService>();
        _fileComparerService = new FileComparerService(_shingleServiceMock.Object);
    }

    private ShingleAnalyzer CreateShingleAnalyzer(string text, int shingleSize, Dictionary<string, int> counts)
    {
        return new ShingleAnalyzer
        {
            Total = counts.Values.Sum(),
            Counts = counts,
            Frequencies = counts.ToDictionary(kv => kv.Key, kv => (double)kv.Value / counts.Values.Sum())
        };
    }

    [Fact]
    public async Task CompareAsync_WithTwoSimilarTexts_ReturnsCorrectComparisonResult()
    {
        var text1 = "the quick brown fox";
        var text2 = "the quick black fox";
        var shingleSize = 2;

        var shingleCounts1 = new Dictionary<string, int>
        {
            { "the quick", 1 },
            { "quick brown", 1 },
            { "brown fox", 1 }
        };
        var shingleAnalysis1 = CreateShingleAnalyzer(text1, shingleSize, shingleCounts1);

        var shingleCounts2 = new Dictionary<string, int>
        {
            { "the quick", 1 },
            { "quick black", 1 },
            { "black fox", 1 }
        };
        var shingleAnalysis2 = CreateShingleAnalyzer(text2, shingleSize, shingleCounts2);

        _shingleServiceMock.Setup(s => s.Extract(text1, shingleSize)).Returns(shingleAnalysis1);
        _shingleServiceMock.Setup(s => s.Extract(text2, shingleSize)).Returns(shingleAnalysis2);

        var result = await _fileComparerService.CompareAsync(text1, text2, shingleSize);

        Assert.NotNull(result);
        Assert.Equal(0.2, result.SimilarityPercentage);
        Assert.Equal(1, result.TotalCommonShingles);
        Assert.Equal(3, result.TotalFirstTextShingles);
        Assert.Equal(3, result.TotalSecondTextShingles);
        Assert.Single(result.CommonShingles);
        Assert.Equal("the quick", result.CommonShingles.First().MatchedShingle);
        Assert.Equal(1, result.CommonShingles.First().MatchedFirstFileCount);
        Assert.Equal(1, result.CommonShingles.First().MatchedSecondFileCount);
    }

    [Fact]
    public async Task CompareAsync_WithTwoIdenticalTexts_ReturnsOneHundredPercentSimilarity()
    {
        var text = "this is a test text";
        var shingleSize = 3;

        var shingleCounts = new Dictionary<string, int>
        {
            { "this is a", 1 },
            { "is a test", 1 },
            { "a test text", 1 }
        };
        var shingleAnalysis = CreateShingleAnalyzer(text, shingleSize, shingleCounts);

        _shingleServiceMock.Setup(s => s.Extract(text, shingleSize)).Returns(shingleAnalysis);

        var result = await _fileComparerService.CompareAsync(text, text, shingleSize);

        Assert.NotNull(result);
        Assert.Equal(1.0, result.SimilarityPercentage);
        Assert.Equal(3, result.TotalCommonShingles);
        Assert.Equal(3, result.TotalFirstTextShingles);
        Assert.Equal(3, result.TotalSecondTextShingles);
        Assert.Equal(3, result.CommonShingles.Count);
    }

    [Fact]
    public async Task CompareAsync_WithTwoCompletelyDifferentTexts_ReturnsZeroSimilarity()
    {
        var text1 = "apple banana orange";
        var text2 = "cat dog mouse";
        var shingleSize = 2;

        var shingleCounts1 = new Dictionary<string, int>
        {
            { "apple banana", 1 },
            { "banana orange", 1 }
        };
        var shingleAnalysis1 = CreateShingleAnalyzer(text1, shingleSize, shingleCounts1);

        var shingleCounts2 = new Dictionary<string, int>
        {
            { "cat dog", 1 },
            { "dog mouse", 1 }
        };
        var shingleAnalysis2 = CreateShingleAnalyzer(text2, shingleSize, shingleCounts2);

        _shingleServiceMock.Setup(s => s.Extract(text1, shingleSize)).Returns(shingleAnalysis1);
        _shingleServiceMock.Setup(s => s.Extract(text2, shingleSize)).Returns(shingleAnalysis2);

        var result = await _fileComparerService.CompareAsync(text1, text2, shingleSize);

        Assert.NotNull(result);
        Assert.Equal(0.0, result.SimilarityPercentage);
        Assert.Equal(0, result.TotalCommonShingles);
        Assert.Equal(2, result.TotalFirstTextShingles);
        Assert.Equal(2, result.TotalSecondTextShingles);
        Assert.Empty(result.CommonShingles);
    }

    [Fact]
    public async Task CompareAsync_WithEmptyTexts_ReturnsZeroSimilarityAndEmptyShingles()
    {
        var text1 = "";
        var text2 = "";
        var shingleSize = 2;

        var shingleAnalysis = CreateShingleAnalyzer("", shingleSize, new Dictionary<string, int>());

        _shingleServiceMock.Setup(s => s.Extract(text1, shingleSize)).Returns(shingleAnalysis);
        _shingleServiceMock.Setup(s => s.Extract(text2, shingleSize)).Returns(shingleAnalysis);

        var result = await _fileComparerService.CompareAsync(text1, text2, shingleSize);

        Assert.NotNull(result);
        Assert.Equal(0.0, result.SimilarityPercentage);
        Assert.Equal(0, result.TotalCommonShingles);
        Assert.Equal(0, result.TotalFirstTextShingles);
        Assert.Equal(0, result.TotalSecondTextShingles);
        Assert.Empty(result.CommonShingles);
    }
}