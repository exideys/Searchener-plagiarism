using System.Linq;
using Texts.Domain;
using Xunit;

namespace Texts.Domain.Tests;

public class TextAnalyzerTests
{
    [Fact]
    public void Empty_ReturnsZero()
    {
        var s = TextAnalyzer.Analyze("");
        Assert.Equal(0, s.Total);
        Assert.Empty(s.Counts);
        Assert.Empty(s.Frequencies);
    }

    [Fact]
    public void Counts_IgnoresExtraSpaces()
    {
        var s = TextAnalyzer.Analyze("ab   a   a");
        Assert.Equal(3, s.Total);
        Assert.Equal(2, s.Counts["a"]);
        Assert.Equal(1, s.Counts["ab"]);

        var sum = s.Frequencies.Values.Sum();
        Assert.InRange(sum, 0.999, 1.001);
    }

    [Theory]
    [InlineData("аа bb аа", "аа", 2, 3)]
    [InlineData("éé e éé",  "éé", 2, 3)]
    public void Unicode_Words_Work(string text, string key, int expected, int total)
    {
        var s = TextAnalyzer.Analyze(text);
        Assert.Equal(total, s.Total);
        Assert.Equal(expected, s.Counts[key]);
    }

    [Fact]
    public void Frequencies_ComputedCorrectly()
    {
        var s = TextAnalyzer.Analyze("x x y");
        Assert.Equal(3, s.Total);
        Assert.True(s.Frequencies.TryGetValue("x", out var fx) && fx > 0.66 && fx < 0.67);
        Assert.True(s.Frequencies.TryGetValue("y", out var fy) && fy > 0.33 && fy < 0.34);
    }
}