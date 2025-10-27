using System.Text;
using Texts.Domain;
using Microsoft.Extensions.Configuration;

namespace Texts.Application;

public sealed class AnalyzeFileService : IAnalyzeFileService
{
    private readonly ITextService _textService;
    private readonly IShingleService _shingleService;
    
    private readonly string[] _allowedExtensions;

    public AnalyzeFileService(ITextService textService, IShingleService shingleService, IConfiguration configuration)
    {
        _textService = textService;
        _shingleService = shingleService;
        _allowedExtensions = configuration.GetSection("AllowedFileExtensions").Get<string[]>() ?? [".txt", ".log"];
    }

    public async Task<TextStats> Execute(Stream fileStream, string fileName)
    {
        var content = await ReadAndValidateFileContentAsync(fileStream, fileName);
        return _textService.Analyze(content);
    }

    public async Task<ShingleAnalyzer> ExecuteShingleAnalysis(Stream fileStream, string fileName, int k)
    {
        var content = await ReadAndValidateFileContentAsync(fileStream, fileName);
        return _shingleService.Extract(content, k);
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
}