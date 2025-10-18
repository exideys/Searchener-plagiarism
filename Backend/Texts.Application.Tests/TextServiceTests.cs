using Texts.Application;
using Xunit;

namespace Texts.Application.Tests;

public class TextServiceTests
{
    [Fact]
    public void Analyze_ForwardsToDomain()
    {
        var svc = new TextService();
        var s = svc.Analyze("aa bb");
        Assert.Equal(4, s.Total);
        Assert.Equal(2, s.Counts['a']);
        Assert.Equal(2, s.Counts['b']);
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