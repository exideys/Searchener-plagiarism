using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Texts.Application;
using Texts.Domain;
using Xunit;

namespace Texts.Application.Tests;

public sealed class AnalyzeFileServiceTests
{
    private sealed class FakeTextService : ITextService
    {
        public string? LastText { get; private set; }
        private readonly TextStats _result;
        public FakeTextService(TextStats result) => _result = result;
        public TextStats Analyze(string? text)
        {
            LastText = text;
            return _result;
        }
    }

    private static AnalyzeFileService CreateService(FakeTextService fake) => new AnalyzeFileService(fake);

    [Fact]
    public async Task Execute_InvalidExtension_Throws()
    {
        var fake = new FakeTextService(new TextStats());
        var svc = CreateService(fake);
        await using var ms = new MemoryStream(Encoding.UTF8.GetBytes("hello"));
        var ex = await Assert.ThrowsAsync<ArgumentException>(() => svc.Execute(ms, "data.bin"));
        Assert.Contains("File type not supported", ex.Message);
    }

    [Fact]
    public async Task Execute_NullOrEmptyStream_Throws()
    {
        var fake = new FakeTextService(new TextStats());
        var svc = CreateService(fake);
        await Assert.ThrowsAsync<ArgumentException>(() => svc.Execute(null!, "file.txt"));

        await using var empty = new MemoryStream(Array.Empty<byte>());
        var ex = await Assert.ThrowsAsync<ArgumentException>(() => svc.Execute(empty, "file.txt"));
        Assert.Contains("File stream is empty", ex.Message);
    }

    [Fact]
    public async Task Execute_TooLarge_Throws()
    {
        var fake = new FakeTextService(new TextStats());
        var svc = CreateService(fake);
        var size = 10 * 1024 * 1024 + 1;
        await using var big = new MemoryStream(new byte[size]);
        var ex = await Assert.ThrowsAsync<ArgumentException>(() => svc.Execute(big, "file.txt"));
        Assert.Contains("File size exceeds", ex.Message);
    }

    [Fact]
    public async Task Execute_WhitespaceOnlyContent_Throws()
    {
        var fake = new FakeTextService(new TextStats());
        var svc = CreateService(fake);
        await using var ms = new MemoryStream(Encoding.UTF8.GetBytes("   \n\t  "));
        var ex = await Assert.ThrowsAsync<ArgumentException>(() => svc.Execute(ms, "file.text"));
        Assert.Contains("File content is empty", ex.Message);
    }

    [Fact]
    public async Task Execute_Success_DelegatesToTextService()
    {
        var expected = new TextStats
        {
            Total = 3,
            Counts = new System.Collections.Generic.Dictionary<string, int> { { "a", 2 }, { "b", 1 } },
            Frequencies = new System.Collections.Generic.Dictionary<string, double> { { "a", 2.0/3 }, { "b", 1.0/3 } }
        };
        var fake = new FakeTextService(expected);
        var svc = CreateService(fake);
        const string content = "a b a";
        await using var ms = new MemoryStream(Encoding.UTF8.GetBytes(content));

        var result = await svc.Execute(ms, "file.log");

        Assert.Same(expected, result);
        Assert.Equal(content, fake.LastText);
    }
}
