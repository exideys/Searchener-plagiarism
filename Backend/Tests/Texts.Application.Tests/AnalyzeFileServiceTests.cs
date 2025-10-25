using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
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

    private static AnalyzeFileService CreateService(FakeTextService fake) => new(fake);

    [Fact]
    public async Task Execute_UnsupportedExtension_ThrowsArgumentException()
    {
        var fake = new FakeTextService(new TextStats());
        var svc = CreateService(fake);
        await using var ms = new MemoryStream(Encoding.UTF8.GetBytes("hello"));

        var ex = await Assert.ThrowsAsync<ArgumentException>(() => svc.Execute(ms, "data.bin"));
        Assert.Contains("Unsupported file extension '.bin'", ex.Message);
    }

    [Fact]
    public async Task Execute_NullStream_ThrowsArgumentNullException()
    {
        var fake = new FakeTextService(new TextStats());
        var svc = CreateService(fake);

        await Assert.ThrowsAsync<ArgumentNullException>("fileStream", () => svc.Execute(null!, "file.txt"));
    }

    [Fact]
    public async Task Execute_EmptyFileName_ThrowsArgumentException()
    {
        var fake = new FakeTextService(new TextStats());
        var svc = CreateService(fake);
        await using var ms = new MemoryStream(Encoding.UTF8.GetBytes("content"));

        await Assert.ThrowsAsync<ArgumentException>("fileName", () => svc.Execute(ms, " "));
    }
    
    [Fact]
    public async Task Execute_EmptyFileContent_ThrowsArgumentException()
    {
        var fake = new FakeTextService(new TextStats());
        var svc = CreateService(fake);
        await using var emptyStream = new MemoryStream();

        var ex = await Assert.ThrowsAsync<ArgumentException>(() => svc.Execute(emptyStream, "file.txt"));
        Assert.Equal("File content is empty", ex.Message);
    }

    [Fact]
    public async Task Execute_WhitespaceOnlyContent_ThrowsArgumentException()
    {
        var fake = new FakeTextService(new TextStats());
        var svc = CreateService(fake);
        await using var ms = new MemoryStream(Encoding.UTF8.GetBytes("   \n\t  "));

        var ex = await Assert.ThrowsAsync<ArgumentException>(() => svc.Execute(ms, "file.txt"));
        Assert.Equal("File content is empty", ex.Message);
    }

    [Fact]
    public async Task Execute_Success_DelegatesToTextServiceAndReturnsResult()
    {
        var expectedStats = new TextStats { Total = 3 };
        var fake = new FakeTextService(expectedStats);
        var svc = CreateService(fake);
        const string content = "a b a";
        await using var ms = new MemoryStream(Encoding.UTF8.GetBytes(content));

        var result = await svc.Execute(ms, "file.log");

        Assert.Same(expectedStats, result);
        Assert.Equal(content, fake.LastText);
    }
    
    private sealed class NonSeekableStream : MemoryStream
    {
        public NonSeekableStream(byte[] buffer) : base(buffer, writable: false) { }
        public override bool CanSeek => false;
        public override long Position { get => base.Position; set => throw new NotSupportedException(); }
        public override long Length => throw new NotSupportedException();
    }

    [Fact]
    public async Task Execute_NonSeekableStream_WorksCorrectly()
    {
        var fake = new FakeTextService(new TextStats());
        var svc = new AnalyzeFileService(fake);
        var content = "ok";
        await using var ns = new NonSeekableStream(Encoding.UTF8.GetBytes(content));

        var result = await svc.Execute(ns, "file.txt");

        Assert.NotNull(result);
        Assert.Equal(content, fake.LastText);
    }
}