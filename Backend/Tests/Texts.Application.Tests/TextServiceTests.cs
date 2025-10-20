using System.Linq;
using Texts.Application;
using Xunit;

namespace Texts.Application.Tests;

public class TextServiceTests
{
    [Fact]
    public void Analyze_ForwardsToDomain_WordCounting()
    {
        var svc = new TextService();

        var s = svc.Analyze("aa bb aa");

        Assert.Equal(3, s.Total);
        Assert.Equal(2, s.Counts["aa"]);
        Assert.Equal(1, s.Counts["bb"]);

        var sum = s.Frequencies.Values.Sum();
        Assert.InRange(sum, 0.999, 1.001);
    }

    [Fact]
    public void Analyze_IgnoresExtraSpaces()
    {
        var svc = new TextService();

        var s = svc.Analyze("  foo   bar   foo  ");

        Assert.Equal(3, s.Total);
        Assert.Equal(2, s.Counts["foo"]);
        Assert.Equal(1, s.Counts["bar"]);
    }

    [Fact]
    public void Analyze_Null_IsSafe()
    {
        var svc = new TextService();
        var s = svc.Analyze(null);

        Assert.Equal(0, s.Total);
        Assert.Empty(s.Counts);
        Assert.Empty(s.Frequencies);
    }
}