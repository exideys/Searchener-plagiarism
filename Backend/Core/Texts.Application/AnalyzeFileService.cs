using System.Text;
using Texts.Domain;
using Microsoft.Extensions.Configuration;

namespace Texts.Application;

public sealed class AnalyzeFileService : IAnalyzeFileService
{
    private readonly ITextService _textService;
    private readonly IShingleService _shingleService;
    private readonly IFileComparerService _fileComparerService;
    
    private readonly string[] _allowedExtensions;

    public AnalyzeFileService(ITextService textService, IShingleService shingleService, IConfiguration configuration, IFileComparerService fileComparerService)
    {
        _textService = textService;
        _shingleService = shingleService;
        _fileComparerService = fileComparerService;
        _allowedExtensions = configuration.GetSection("AllowedFileExtensions").Get<string[]>() ?? new[] { ".txt", ".log" };
    }

    public async Task<TextStats> Execute(Stream fileStream, string fileName, int q)
    {
        var content = await ReadAndValidateFileContentAsync(fileStream, fileName);
        return _textService.Analyze(content, q);
    }

    public async Task<ShingleAnalyzer> ExecuteShingleAnalysis(Stream fileStream, string fileName, int k, int q)
    {
        var content = await ReadAndValidateFileContentAsync(fileStream, fileName);
        return _shingleService.Extract(content, k, q);
    }
    
    public async Task<string> ReadAndValidateFileContentAsync(Stream fileStream, string fileName)
    {
        ValidateFile(fileStream, fileName);
        using var reader = new StreamReader(fileStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        var content = await reader.ReadToEndAsync();
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("File content is empty");
        return content;
    }


    private void ValidateFile(Stream fileStream, string fileName)
    {
        if (fileStream is null)
            throw new ArgumentNullException(nameof(fileStream), "File stream is required");

        if (string.IsNullOrWhiteSpace(fileName))
            throw new ArgumentException("File name is required", nameof(fileName));

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (!_allowedExtensions.Contains(ext))
            throw new ArgumentException($"Unsupported file extension '{ext}'. Allowed: {string.Join(", ", _allowedExtensions)}");
    }

    public async Task<FileComparisonResult> CompareTwoFilesAsync(Stream fileStream1, string fileName1, Stream fileStream2, string fileName2, int shingleSize, int q)
    {
        var content1 = await ReadAndValidateFileContentAsync(fileStream1, fileName1);
        var content2 = await ReadAndValidateFileContentAsync(fileStream2, fileName2);

        return await _fileComparerService.CompareAsync(content1, content2, shingleSize, q);
    }
}