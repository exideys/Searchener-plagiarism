using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Moq;
using Texts.Domain;
using Texts.Infrastructure;
using Xunit;

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
    public async Task DetectAsync_InvalidShingleSize_ThrowsArgumentException(int shingleSize)
    {
        var ex = await Assert.ThrowsAsync<ArgumentException>(() => _detector.DetectAsync("text", shingleSize, 1));
        Assert.Equal("shingleSize", ex.ParamName);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task DetectAsync_InvalidSampleStep_ThrowsArgumentException(int sampleStep)
    {
        var ex = await Assert.ThrowsAsync<ArgumentException>(() => _detector.DetectAsync("text", 1, sampleStep));
        Assert.Equal("sampleStep", ex.ParamName);
    }

    [Fact]
    public async Task DetectAsync_WithEmptyShingles_ReturnsZeroScore()
    {
        _shingleServiceMock.Setup(s => s.Extract(It.IsAny<string>(), It.IsAny<int>()))
            .Returns(new ShingleAnalyzer()); 
        
        var result = await _detector.DetectAsync("some text", 5, 5);
        
        Assert.Equal(0, result.Score);
        Assert.Empty(result.PotentialSources);
    }

    [Fact]
    public async Task DetectAsync_WhenAllSampledShinglesFound_ReturnsScoreOfOne()
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
    public async Task DetectAsync_WhenHalfOfSampledShinglesFound_ReturnsCorrectScore()
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
    public async Task DetectAsync_GroupsAndCountsSourcesCorrectly()
    {
        var uniqueShingles = new List<string> { "shingle a", "shingle b", "shingle c" };
        var shingleStats = CreateShingleAnalyzerFromList(uniqueShingles);
        _shingleServiceMock.Setup(s => s.Extract(It.IsAny<string>(), It.IsAny<int>())).Returns(shingleStats);
        
        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle a")).ReturnsAsync("http://site-a.com");
        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle b")).ReturnsAsync("http://site-b.com");
        _googleSearchClientMock.Setup(g => g.FindFirstMatchUrlAsync("shingle c")).ReturnsAsync("http://site-a.com"); 
        
        var result = await _detector.DetectAsync("a very long text", 5, 1);
        
        Assert.Equal(2, result.PotentialSources.Count);
        
        var sourceA = result.PotentialSources.FirstOrDefault(s => s.Url == "http://site-a.com");
        Assert.NotNull(sourceA);
        Assert.Equal(2, sourceA.MatchedShingles.Count);
        Assert.Contains("shingle a", sourceA.MatchedShingles);
        Assert.Contains("shingle c", sourceA.MatchedShingles);

        var sourceB = result.PotentialSources.FirstOrDefault(s => s.Url == "http://site-b.com");
        Assert.NotNull(sourceB);
        Assert.Single(sourceB.MatchedShingles);
        Assert.Contains("shingle b", sourceB.MatchedShingles);
    }
    
    [Fact]
    public async Task DetectAsync_SampleStepLargerThanShingleCount_ReturnsZeroScore()
    {
        var uniqueShingles = new List<string> { "shingle a", "shingle b" };
        var shingleStats = CreateShingleAnalyzerFromList(uniqueShingles);
        _shingleServiceMock.Setup(s => s.Extract(It.IsAny<string>(), It.IsAny<int>())).Returns(shingleStats);
        
        var result = await _detector.DetectAsync("short text", 5, 3);
        
        _googleSearchClientMock.Verify(g => g.FindFirstMatchUrlAsync(It.IsAny<string>()), Times.Once);
        _googleSearchClientMock.Verify(g => g.FindFirstMatchUrlAsync("shingle a"), Times.Once);
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
}