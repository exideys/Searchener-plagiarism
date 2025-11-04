using Xunit;
using Texts.Domain;
using System.Collections.Generic;

namespace Texts.Domain.Tests;

public class PlagiarismResultTests
{
    [Fact]
    public void PlagiarismResult_CanBeInstantiatedAndPropertiesSet()
    {
        var result = new PlagiarismResult
        {
            Score = 0.75,
            PotentialSources = new List<SourceMatch>
            {
                new SourceMatch { Url = "http://example.com/source1", MatchedShingles = new List<string> { "shingle1", "shingle2" } },
                new SourceMatch { Url = "http://example.com/source2", MatchedShingles = new List<string> { "shingle3" } }
            },
            ErrorMessage = "No error"
        };

        Assert.Equal(0.75, result.Score);
        Assert.Equal(2, result.PotentialSources.Count);
        Assert.Equal("http://example.com/source1", result.PotentialSources[0].Url);
        Assert.Equal(2, result.PotentialSources[0].MatchedShingles.Count);
        Assert.Equal("No error", result.ErrorMessage);
    }

    [Fact]
    public void SourceMatch_CanBeInstantiatedAndPropertiesSet()
    {
        var sourceMatch = new SourceMatch
        {
            Url = "http://example.com/test",
            MatchedShingles = new List<string> { "test1", "test2", "test3" }
        };

        Assert.Equal("http://example.com/test", sourceMatch.Url);
        Assert.Equal(3, sourceMatch.MatchedShingles.Count);
    }

    [Fact]
    public void PlagiarismResult_DefaultValuesAreCorrect()
    {
        var result = new PlagiarismResult();

        Assert.Equal(0.0, result.Score);
        Assert.NotNull(result.PotentialSources);
        Assert.Empty(result.PotentialSources);
        Assert.Null(result.ErrorMessage);
    }

    [Fact]
    public void SourceMatch_DefaultValuesAreCorrect()
    {
        var sourceMatch = new SourceMatch();

        Assert.Equal(string.Empty, sourceMatch.Url);
        Assert.NotNull(sourceMatch.MatchedShingles);
        Assert.Empty(sourceMatch.MatchedShingles);
    }
}