using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Moq;
using Texts.Domain;
using Xunit;

namespace Texts.Application.Tests;

public sealed class AnalyzeFileServiceTests
{
    private readonly Mock<ITextService> _textServiceMock;
    private readonly Mock<IShingleService> _shingleServiceMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly AnalyzeFileService _service;

    public AnalyzeFileServiceTests()
    {
        _textServiceMock = new Mock<ITextService>();
        _shingleServiceMock = new Mock<IShingleService>();
        _configurationMock = new Mock<IConfiguration>();

        var allowedExtensions = new[] { ".txt", ".log" };
        var configSectionMock = new Mock<IConfigurationSection>();
        configSectionMock.Setup(s => s.Value).Returns((string)null!); 
        configSectionMock.Setup(s => s.GetChildren()).Returns(new IConfigurationSection[0]); 

        _configurationMock
            .Setup(c => c.GetSection("AllowedFileExtensions"))
            .Returns(configSectionMock.Object);

        
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "AllowedFileExtensions:0", ".txt" },
                { "AllowedFileExtensions:1", ".log" }
            })
            .Build();

        _service = new AnalyzeFileService(_textServiceMock.Object, _shingleServiceMock.Object, configuration);
    }

    [Fact]
    public async Task ReadAndValidateFileContent_UnsupportedExtension_ThrowsArgumentException()
    {
        
        await using var ms = new MemoryStream(Encoding.UTF8.GetBytes("hello"));

        
        var ex = await Assert.ThrowsAsync<ArgumentException>(() => _service.ReadAndValidateFileContentAsync(ms, "data.bin"));
        Assert.Contains("Unsupported file extension '.bin'. Allowed: .txt, .log", ex.Message);
    }

    [Fact]
    public async Task ReadAndValidateFileContent_EmptyFileContent_ThrowsArgumentException()
    {
        
        await using var emptyStream = new MemoryStream();

        
        var ex = await Assert.ThrowsAsync<ArgumentException>(() => _service.ReadAndValidateFileContentAsync(emptyStream, "file.txt"));
        Assert.Equal("File content is empty", ex.Message);
    }

    [Fact]
    public async Task Execute_Success_DelegatesToTextService()
    {
        
        const string content = "a b a";
        var expectedStats = new TextStats { Total = 3 };
        _textServiceMock.Setup(s => s.Analyze(content)).Returns(expectedStats);
        await using var ms = new MemoryStream(Encoding.UTF8.GetBytes(content));

        
        var result = await _service.Execute(ms, "file.log");

        
        Assert.Same(expectedStats, result);
        _textServiceMock.Verify(s => s.Analyze(content), Times.Once);
    }

    [Fact]
    public async Task ExecuteShingleAnalysis_Success_DelegatesToShingleService()
    {
        
        const string content = "a b c a";
        const int k = 2;
        var expectedAnalysis = new ShingleAnalyzer { Total = 3 };
        _shingleServiceMock.Setup(s => s.Extract(content, k)).Returns(expectedAnalysis);
        await using var ms = new MemoryStream(Encoding.UTF8.GetBytes(content));

        
        var result = await _service.ExecuteShingleAnalysis(ms, "file.log", k);

        
        Assert.Same(expectedAnalysis, result);
        _shingleServiceMock.Verify(s => s.Extract(content, k), Times.Once);
    }
}