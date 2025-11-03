using Moq;
using Xunit;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Texts.Domain;

namespace Texts.Application.Tests;

public sealed class AnalyzeFileServiceTests
{
    private readonly Mock<ITextService> _textServiceMock;
    private readonly Mock<IShingleService> _shingleServiceMock;
    private readonly Mock<IFileComparerService> _fileComparerServiceMock;
    private readonly AnalyzeFileService _service;

    public AnalyzeFileServiceTests()
    {
        _textServiceMock = new Mock<ITextService>();
        _shingleServiceMock = new Mock<IShingleService>();
        _fileComparerServiceMock = new Mock<IFileComparerService>();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "AllowedFileExtensions:0", ".txt" },
                { "AllowedFileExtensions:1", ".log" }
            })
            .Build();

        _service = new AnalyzeFileService(
            _textServiceMock.Object, 
            _shingleServiceMock.Object, 
            configuration, 
            _fileComparerServiceMock.Object
        );
    }

    [Fact]
    public async Task ReadAndValidateFileContentAsync_WithNullStream_ShouldThrowArgumentNullException()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(() => 
            _service.ReadAndValidateFileContentAsync(null!, "file.txt"));
    }

    [Fact]
    public async Task ReadAndValidateFileContentAsync_WithUnsupportedExtension_ShouldThrowArgumentException()
    {
        await using var ms = new MemoryStream(Encoding.UTF8.GetBytes("hello"));
        
        var ex = await Assert.ThrowsAsync<ArgumentException>(() => 
            _service.ReadAndValidateFileContentAsync(ms, "data.bin"));
            
        Assert.Contains("Unsupported file extension '.bin'. Allowed: .txt, .log", ex.Message);
    }

    [Fact]
    public async Task ReadAndValidateFileContentAsync_WithEmptyFileContent_ShouldThrowArgumentException()
    {
        await using var emptyStream = new MemoryStream();

        var ex = await Assert.ThrowsAsync<ArgumentException>(() => 
            _service.ReadAndValidateFileContentAsync(emptyStream, "file.txt"));
            
        Assert.Equal("File content is empty", ex.Message);
    }

    [Fact]
    public async Task Execute_WithValidFile_ShouldDelegateToTextService()
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
    public async Task ExecuteShingleAnalysis_WithValidFile_ShouldDelegateToShingleService()
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
    
    [Fact]
    public async Task CompareTwoFilesAsync_WithValidFiles_ShouldDelegateToFileComparerService()
    {
        const string content1 = "this is file one";
        const string content2 = "this is file two";
        const int shingleSize = 2;
        var expectedResult = new FileComparisonResult { SimilarityPercentage = 0.5 };

        _fileComparerServiceMock
            .Setup(s => s.CompareAsync(content1, content2, shingleSize))
            .ReturnsAsync(expectedResult);
            
        await using var stream1 = new MemoryStream(Encoding.UTF8.GetBytes(content1));
        await using var stream2 = new MemoryStream(Encoding.UTF8.GetBytes(content2));

        var result = await _service.CompareTwoFilesAsync(stream1, "file1.txt", stream2, "file2.txt", shingleSize);

        Assert.Same(expectedResult, result);
        _fileComparerServiceMock.Verify(s => s.CompareAsync(content1, content2, shingleSize), Times.Once);
    }
}