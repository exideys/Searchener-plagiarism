using Moq;
using Xunit;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using Texts.Domain;
using Texts.Infrastructure;

namespace Texts.Application.Tests;

public class PlagiarismDetectorServiceTests
{
    private readonly Mock<IShingleService> _shingleServiceMock;
    private readonly Mock<IGoogleSearchClient> _googleSearchClientMock;
    private readonly PlagiarismDetectorService _detector;

    public PlagiarismDetectorServiceTests()
    {
        _shingleServiceMock = new Mock<IShingleService>();
        _googleSearchClientMock = new Mock<IGoogleSearchClient>();
        _detector = new PlagiarismDetectorService(_shingleServiceMock.Object, _googleSearchClientMock.Object);
    }
    
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task DetectAsync_WithInvalidShingleSize_ShouldThrowArgumentException(int shingleSize)
    {
        var ex = await Assert.ThrowsAsync<ArgumentException>(() => _detector.DetectAsync("text", shingleSize, 1));
        Assert.Equal("shingleSize", ex.ParamName);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task DetectAsync_WithInvalidSampleStep_ShouldThrowArgumentException(int sampleStep)
    {
        var ex = await Assert.ThrowsAsync<ArgumentException>(() => _detector.DetectAsync("text", 1, sampleStep));
        Assert.Equal("sampleStep", ex.ParamName);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task DetectAsync_WithNullOrEmptyText_ShouldThrowArgumentException(string text)
    {
        var ex = await Assert.ThrowsAsync<ArgumentException>(() => _detector.DetectAsync(text, 5, 1));
        Assert.Equal("text", ex.ParamName);
    }

    [Fact]
    public async Task DetectAsync_WhenNoShinglesAreExtracted_ShouldReturnZeroScore()
    {
        _shingleServiceMock.Setup(s => s.Extract(It.IsAny<string>(), It.IsAny<int>()))
            .Returns(new ShingleAnalyzer()); 
        
        var result = await _detector.DetectAsync("some text", 5, 5);
        
        Assert.Equal(0, result.Score);
        Assert.Empty(result.PotentialSources);
    }

    [Fact]
    public async Task DetectAsync_WhenTextIsTooShortForShingleCreation_ShouldReturnZeroScore()
    {
        var shortText = "short";
        var shingleSize = 10;
        _shingleServiceMock.Setup(s => s.Extract(shortText, shingleSize))
            .Returns(new ShingleAnalyzer());

        var result = await _detector.DetectAsync(shortText, shingleSize, 1);

        Assert.Equal(0, result.Score);
        Assert.Empty(result.PotentialSources);
        _shingleServiceMock.Verify(s => s.Extract(shortText, shingleSize), Times.Once);
    }

    [Fact]
    public async Task DetectAsync_WhenAllSampledShinglesAreFound_ShouldReturnScoreOfOne()
    {
        var uniqueShingles = new List<string> { "shingle a", "shingle b", "shingle c", "shingle d" };
        var shingleStats = CreateShingleAnalyzerFromList(uniqueShingles);
        _shingleServiceMock.Setup(s => s.Extract(It.IsAny<string>(), It.IsAny<int>())).Returns(shingleStats);
        
        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle a")).ReturnsAsync("http://example.com/a");
        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle c")).ReturnsAsync("http://example.com/c");
        
        var result = await _detector.DetectAsync("a long text", 5, 2);
        
        Assert.Equal(1.0, result.Score);
    }

    [Fact]
    public async Task DetectAsync_WhenHalfOfSampledShinglesAreFound_ShouldReturnCorrectScore()
    {
        var uniqueShingles = new List<string> { "shingle a", "shingle b", "shingle c", "shingle d" }; 
        var shingleStats = CreateShingleAnalyzerFromList(uniqueShingles);
        _shingleServiceMock.Setup(s => s.Extract(It.IsAny<string>(), It.IsAny<int>())).Returns(shingleStats);

        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle a")).ReturnsAsync("http://found.com");
        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle c")).ReturnsAsync((string?)null);
        
        var result = await _detector.DetectAsync("a long text", 5, 2);
        
        Assert.Equal(0.5, result.Score);
    }

    [Fact]
    public async Task DetectAsync_WithMultipleMatchesFromSameSource_ShouldGroupSourcesCorrectly()
    {
        var uniqueShingles = new List<string> { "shingle a", "shingle b", "shingle c" };
        var shingleStats = CreateShingleAnalyzerFromList(uniqueShingles);
        _shingleServiceMock.Setup(s => s.Extract(It.IsAny<string>(), It.IsAny<int>())).Returns(shingleStats);
        
        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle a")).ReturnsAsync("http://site-a.com");
        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle b")).ReturnsAsync("http://site-b.com");
        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle c")).ReturnsAsync("http://site-a.com"); 
        
        var result = await _detector.DetectAsync("a very long text", 5, 1);
        
        Assert.Equal(2, result.PotentialSources.Count);
        
        var sourceA = result.PotentialSources.First(s => s.Url == "http://site-a.com");
        Assert.Equal(2, sourceA.MatchedShingles.Count);
        Assert.Contains("shingle a", sourceA.MatchedShingles);
        Assert.Contains("shingle c", sourceA.MatchedShingles);

        var sourceB = result.PotentialSources.First(s => s.Url == "http://site-b.com");
        Assert.Single(sourceB.MatchedShingles);
        Assert.Contains("shingle b", sourceB.MatchedShingles);
    }
    
    [Fact]
    public async Task DetectAsync_WhenNoShinglesAreSampled_ShouldReturnZeroScore()
    {
        var uniqueShingles = new List<string> { "shingle a", "shingle b", "shingle c", "shingle d" };
        var shingleStats = CreateShingleAnalyzerFromList(uniqueShingles);
        _shingleServiceMock.Setup(s => s.Extract(It.IsAny<string>(), It.IsAny<int>())).Returns(shingleStats);
        
        var result = await _detector.DetectAsync("a short text", 5, 10);
        
        Assert.Equal(0, result.Score);
        Assert.Empty(result.PotentialSources);
    }

    [Fact]
    public async Task DetectAsync_WhenShinglesToSearchIsEmptyDueToLargeSampleStep_ShouldReturnZeroScore()
    {
        var uniqueShingles = new List<string> { "shingle a", "shingle b", "shingle c" };
        var shingleStats = CreateShingleAnalyzerFromList(uniqueShingles);
        _shingleServiceMock.Setup(s => s.Extract(It.IsAny<string>(), It.IsAny<int>())).Returns(shingleStats);

        var result = await _detector.DetectAsync("some text", 1, 10); 

        Assert.Equal(0, result.Score);
        Assert.Empty(result.PotentialSources);
    }


    private static ShingleAnalyzer CreateShingleAnalyzerFromList(List<string> shingles)
    {
        return new ShingleAnalyzer
        {
            Total = shingles.Count,
            Counts = shingles.ToDictionary(s => s, s => 1),
            Frequencies = shingles.ToDictionary(s => s, s => 1.0 / shingles.Count)
        };
    }
    
    [Fact]
    public async Task DetectAsync_WhenGoogleSearchClientThrowsException_ShouldHandleGracefully()
    {
        var uniqueShingles = new List<string> { "shingle a", "shingle b" };
        var shingleStats = CreateShingleAnalyzerFromList(uniqueShingles);
        _shingleServiceMock.Setup(s => s.Extract(It.IsAny<string>(), It.IsAny<int>())).Returns(shingleStats);

        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle a")).ReturnsAsync("http://found.com");
        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle b")).ThrowsAsync(new Exception("Google search failed"));

        var result = await _detector.DetectAsync("some text", 1, 1);

        Assert.Equal(0.5, result.Score);
        Assert.Single(result.PotentialSources);
        Assert.Equal("http://found.com", result.PotentialSources.First().Url);
        Assert.Single(result.PotentialSources.First().MatchedShingles);
        Assert.Contains("shingle a", result.PotentialSources.First().MatchedShingles);
    }

    [Fact]
    public async Task DetectAsync_WhenShinglesAreSampledButNoMatchesFound_ShouldReturnZeroScore()
    {
        var uniqueShingles = new List<string> { "shingle a", "shingle b", "shingle c" };
        var shingleStats = CreateShingleAnalyzerFromList(uniqueShingles);
        _shingleServiceMock.Setup(s => s.Extract(It.IsAny<string>(), It.IsAny<int>())).Returns(shingleStats);

        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync(It.IsAny<string>())).ReturnsAsync((string?)null);

        var result = await _detector.DetectAsync("some text", 1, 1);

        Assert.Equal(0, result.Score);
        Assert.Empty(result.PotentialSources);
    }

    [Fact]
    public async Task DetectAsync_WhenFewShinglesToSearch_ShouldProcessCorrectly()
    {
        var uniqueShingles = new List<string> { "shingle a", "shingle b" };
        var shingleStats = CreateShingleAnalyzerFromList(uniqueShingles);
        _shingleServiceMock.Setup(s => s.Extract(It.IsAny<string>(), It.IsAny<int>())).Returns(shingleStats);

        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle a")).ReturnsAsync("http://found.com/a");
        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle b")).ReturnsAsync((string?)null);

        var result = await _detector.DetectAsync("some text with few shingles", 1, 1);

        Assert.Equal(0.5, result.Score);
        Assert.Single(result.PotentialSources);
        Assert.Equal("http://found.com/a", result.PotentialSources.First().Url);
        Assert.Single(result.PotentialSources.First().MatchedShingles);
        Assert.Contains("shingle a", result.PotentialSources.First().MatchedShingles);
    }

    [Fact]
    public async Task DetectAsync_WithLessShinglesThanMax_ShouldProcessCorrectly()
    {
        var uniqueShingles = new List<string> { "shingle a", "shingle b" };
        var shingleStats = CreateShingleAnalyzerFromList(uniqueShingles);
        _shingleServiceMock.Setup(s => s.Extract(It.IsAny<string>(), It.IsAny<int>())).Returns(shingleStats);

        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle a")).ReturnsAsync("http://found.com/a");
        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle b")).ReturnsAsync((string?)null);

        var result = await _detector.DetectAsync("some text with few shingles", 1, 1);

        Assert.Equal(0.5, result.Score);
        Assert.Single(result.PotentialSources);
        Assert.Equal("http://found.com/a", result.PotentialSources.First().Url);
        Assert.Single(result.PotentialSources.First().MatchedShingles);
        Assert.Contains("shingle a", result.PotentialSources.First().MatchedShingles);
    }

    [Fact]
    public async Task DetectAsync_WithSmallNumberOfUniqueShingles_ShouldProcessCorrectly()
    {
        var uniqueShingles = new List<string> { "short text one", "short text two" };
        var shingleStats = CreateShingleAnalyzerFromList(uniqueShingles);
        _shingleServiceMock.Setup(s => s.Extract(It.IsAny<string>(), It.IsAny<int>())).Returns(shingleStats);

        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("short text one")).ReturnsAsync("http://found.com/one");
        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("short text two")).ReturnsAsync((string?)null);

        var result = await _detector.DetectAsync("a very short text", 1, 1);

        Assert.Equal(0.5, result.Score);
        Assert.Single(result.PotentialSources);
        Assert.Equal("http://found.com/one", result.PotentialSources.First().Url);
        Assert.Single(result.PotentialSources.First().MatchedShingles);
        Assert.Contains("short text one", result.PotentialSources.First().MatchedShingles);
    }
}