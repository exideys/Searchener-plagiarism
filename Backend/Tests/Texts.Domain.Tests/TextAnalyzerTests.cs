using Xunit;
using System.Linq;
using Texts.Domain;

namespace Texts.Domain.Tests;

public class TextAnalyzerTests
{
    [Fact]
    public void Analyze_WithEmptyString_ShouldReturnEmptyStats()
    {
        var stats = TextAnalyzer.Analyze("");
        Assert.Equal(0, stats.Total);
        Assert.Empty(stats.Counts);
        Assert.Empty(stats.Frequencies);
    }

    [Fact]
    public void Analyze_WithNullString_ShouldReturnEmptyStats()
    {
        var stats = TextAnalyzer.Analyze(null);
        Assert.Equal(0, stats.Total);
        Assert.Empty(stats.Counts);
        Assert.Empty(stats.Frequencies);
    }

    [Fact]
    public void Analyze_WithExtraSpaces_ShouldBeIgnored()
    {
        var stats = TextAnalyzer.Analyze("ab   a   a");
        Assert.Equal(3, stats.Total);
        Assert.Equal(2, stats.Counts["a"]);
        Assert.Equal(1, stats.Counts["ab"]);
    }
    
    [Fact]
    public void Analyze_WithMixedCaseText_ShouldBeCaseInsensitive()
    {
        var stats = TextAnalyzer.Analyze("Hello hELLo HELLO world WORLD");
        Assert.Equal(5, stats.Total);
        Assert.Equal(3, stats.Counts["hello"]);
        Assert.Equal(2, stats.Counts["world"]);
    }

    [Fact]
    public void Analyze_WithPunctuation_ShouldBeRemovedAndSplitWords()
    {
        var stats = TextAnalyzer.Analyze("hello,world! foo...bar");
        Assert.Equal(4, stats.Total);
        Assert.True(stats.Counts.ContainsKey("hello"));
        Assert.True(stats.Counts.ContainsKey("world"));
        Assert.True(stats.Counts.ContainsKey("foo"));
        Assert.True(stats.Counts.ContainsKey("bar"));
    }

    [Fact]
    public void ExtractShingles_WithValidInput_ShouldProduceCorrectCountsAndFrequencies()
    {
        var result = TextAnalyzer.ExtractShingles("one two three one two", 2);

        Assert.NotNull(result);
        Assert.Equal(4, result.Total);
        Assert.Equal(2, result.Counts["one two"]);
        Assert.Equal(1, result.Counts["two three"]);
        Assert.Equal(1, result.Counts["three one"]);
        Assert.Equal(0.5, result.Frequencies["one two"]);
    }

    [Fact]
    public void ExtractShingles_WhenKIsGreaterThanWordCount_ShouldReturnEmptyResult()
    {
        var result = TextAnalyzer.ExtractShingles("one two", 3);
        Assert.Equal(0, result.Total);
        Assert.Empty(result.Counts);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ExtractShingles_WithNullOrEmptyText_ShouldReturnEmptyResult(string text)
    {
        var result = TextAnalyzer.ExtractShingles(text, 2);
        Assert.NotNull(result);
        Assert.Equal(0, result.Total);
        Assert.Empty(result.Counts);
        Assert.Empty(result.Frequencies);
    }


}