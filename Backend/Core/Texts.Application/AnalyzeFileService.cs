using Texts.Domain;

namespace Texts.Application;

public interface IAnalyzeFileService
{
    Task<TextStats> Execute(Stream fileStream, string fileName);
}

public sealed class AnalyzeFileService(ITextService textService) : IAnalyzeFileService
{
    public async Task<TextStats> Execute(Stream fileStream, string fileName)
    {
        ValidateFile(fileStream, fileName);
        
        if (fileStream.CanSeek) fileStream.Position = 0;
        
        using var reader = new StreamReader(
            fileStream,
            System.Text.Encoding.UTF8,
            detectEncodingFromByteOrderMarks: true,
            bufferSize: 4096,
            leaveOpen: true);

        var content = await reader.ReadToEndAsync();
        
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("File content is empty");
        
        return textService.Analyze(content);
    }

    private static void ValidateFile(Stream fileStream, string fileName)
    {
        if (fileStream is null)
            throw new ArgumentException("File stream is null");
        
        if (string.IsNullOrWhiteSpace(fileName))
            throw new ArgumentException("File name is required");
        var allowedExtensions = new[] { ".txt", ".text", ".log" };
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        
        if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
            throw new ArgumentException($"File type not supported. Allowed: {string.Join(", ", allowedExtensions)}");
        
        if (fileStream is { CanSeek: true, Length: 0 })
            throw new ArgumentException("File stream is empty");
    }
}