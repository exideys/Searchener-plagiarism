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
    public void Counts_IgnoresSpaces()
    {
        var s = TextAnalyzer.Analyze("ab a"); 
        Assert.Equal(3, s.Total);
        Assert.Equal(2, s.Counts['a']);
        Assert.Equal(1, s.Counts['b']);
        var sum = s.Frequencies.Values.Sum();
        Assert.InRange(sum, 0.999, 1.001);
    }

    [Theory]
    [InlineData("аа bb", 'а', 2, 4)] 
    [InlineData("éé e", 'é', 2, 3)]  
    public void Unicode_Works(string text, char key, int expected, int total)
    {
        var s = TextAnalyzer.Analyze(text);
        Assert.Equal(total, s.Total);
        Assert.Equal(expected, s.Counts[key]);
    }
}