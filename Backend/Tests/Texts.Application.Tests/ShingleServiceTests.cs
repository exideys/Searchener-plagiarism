using System;
using Texts.Application;
using Xunit;

namespace Texts.Application.Tests;

public class ShingleServiceTests
{
    private readonly IShingleService _shingleService = new ShingleService();

    [Fact]
    public void Extract_ValidTextAndK_ReturnsCorrectAnalysis()
    {
        var text = "one two three four";
        var k = 2;

        var result = _shingleService.Extract(text, k);

        Assert.NotNull(result);
        Assert.Equal(3, result.Total);
        Assert.True(result.Counts.ContainsKey("one two"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Extract_NullOrWhitespaceText_ThrowsArgumentException(string? text)
    {
        var ex = Assert.Throws<ArgumentException>(() => _shingleService.Extract(text!, 2));
        Assert.Contains("Text is required", ex.Message);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Extract_KIsZeroOrNegative_ThrowsArgumentException(int k)
    {
        var ex = Assert.Throws<ArgumentException>(() => _shingleService.Extract("some text", k));
        Assert.Contains("K must be > 0", ex.Message);
    }

    [Fact]
    public void Extract_TextLengthLessThanK_ReturnsEmptyResult()
    {
        var text = "one two";
        var k = 3;

        var result = _shingleService.Extract(text, k);

        Assert.NotNull(result);
        Assert.Equal(0, result.Total);
        Assert.Empty(result.Counts);
    }

    [Fact]
    public void Extract_TextTooLarge_ThrowsArgumentException()
    {
        var longText = new string('a', 1_000_001);
        var ex = Assert.Throws<ArgumentException>(() => _shingleService.Extract(longText, 2));
        Assert.Contains("Text is too large", ex.Message);
    }
}