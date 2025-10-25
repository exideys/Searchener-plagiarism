using Texts.Application;
using Xunit;

namespace Texts.Application.Tests;

public class TextServiceTests
{
    [Fact]
    public void Analyze_DelegatesToTextAnalyzer()
    {
        var svc = new TextService();
        var text = "word1 word2 word1";

        var stats = svc.Analyze(text);

        Assert.NotNull(stats);
        Assert.Equal(3, stats.Total);
        Assert.Equal(2, stats.Counts["word1"]);
    }

    [Fact]
    public void Analyze_NullInput_ReturnsEmptyStats()
    {
        var svc = new TextService();
        
        var stats = svc.Analyze(null);

        Assert.NotNull(stats);
        Assert.Equal(0, stats.Total);
        Assert.Empty(stats.Counts);
        Assert.Empty(stats.Frequencies);
    }
}