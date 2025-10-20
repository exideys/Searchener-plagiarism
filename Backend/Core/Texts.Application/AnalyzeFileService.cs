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

        using var reader = new StreamReader(fileStream, System.Text.Encoding.UTF8);
        var content = await reader.ReadToEndAsync();
        
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("File content is empty");
        
        return textService.Analyze(content);
    }

    private static void ValidateFile(Stream fileStream, string fileName)
    {
        
        if (fileStream == null || fileStream.Length == 0)
            throw new ArgumentException("File stream is empty");
        var allowedExtensions = new[] { ".txt", ".text", ".log" };
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
            throw new ArgumentException($"File type not supported. Allowed: {string.Join(", ", allowedExtensions)}");
        const long maxFileSize = 10 * 1024 * 1024;
        if (fileStream.Length > maxFileSize)
            throw new ArgumentException($"File size exceeds maximum allowed size of {maxFileSize / 1024 / 1024} MB");
        if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
            throw new ArgumentException($"File type not supported. Allowed: {string.Join(", ", allowedExtensions)}");
    }
}