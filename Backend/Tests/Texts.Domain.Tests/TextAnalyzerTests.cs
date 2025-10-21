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

    [Fact]
    public void CaseInsensitive_CountsTogether()
    {
        var s = TextAnalyzer.Analyze("Hello hELLo HELLO world WORLD");
        Assert.Equal(5, s.Total);
        Assert.Equal(3, s.Counts["hello"]);
        Assert.Equal(2, s.Counts["world"]);
    }
    
    [Fact]
    public void Punctuation_IsRemoved_AndDoesNotGlueWords()
    {
        var s = TextAnalyzer.Analyze("hello,world! foo...bar");
        Assert.Equal(4, s.Total);
        Assert.Equal(1, s.Counts["hello"]);
        Assert.Equal(1, s.Counts["world"]);
        Assert.Equal(1, s.Counts["foo"]);
        Assert.Equal(1, s.Counts["bar"]);
    }

    [Fact]
    public void Symbols_ArePreserved_InsideWords()
    {
        var s = TextAnalyzer.Analyze("c# c++ usd$ price#tag");
        Assert.Equal(4, s.Total);
        Assert.Equal(1, s.Counts["c#"]);
        Assert.Equal(1, s.Counts["c++"]);
        Assert.Equal(1, s.Counts["usd$"]);
        Assert.Equal(1, s.Counts["price#tag"]);
    }

    [Theory]
    [InlineData("hello—world", "hello", "world")]
    [InlineData("cat,dog", "cat", "dog")]
    [InlineData("foo—bar", "foo", "bar")]
    public void UnicodePunctuation_SplitsEnglishWords(string text, string w1, string w2)
    {
        var s = TextAnalyzer.Analyze(text);
        Assert.Equal(2, s.Total);
        Assert.Equal(1, s.Counts[w1]);
        Assert.Equal(1, s.Counts[w2]);
    }

    [Fact]
    public void MixedWhitespace_TabsAndNewlines_SplitCorrectly()
    {
        var s = TextAnalyzer.Analyze("a\t\tb \n c\r\nd");
        Assert.Equal(4, s.Total);
        Assert.Equal(1, s.Counts["a"]);
        Assert.Equal(1, s.Counts["b"]);
        Assert.Equal(1, s.Counts["c"]);
        Assert.Equal(1, s.Counts["d"]);
    }

    [Fact]
    public void Punctuation_MultipleMarks_TreatedAsSingleSeparator()
    {
        var s = TextAnalyzer.Analyze("one---two!!!three??");
        Assert.Equal(3, s.Total);
        Assert.Equal(1, s.Counts["one"]);
        Assert.Equal(1, s.Counts["two"]);
        Assert.Equal(1, s.Counts["three"]);
    }

}