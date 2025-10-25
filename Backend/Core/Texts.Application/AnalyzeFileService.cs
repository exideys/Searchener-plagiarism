using System.Text;
using Texts.Domain;

namespace Texts.Application;

public sealed class AnalyzeFileService : IAnalyzeFileService
{
    private readonly ITextService textService;

    // допустимые расширения файла (низкий риск менять часто, можно держать здесь)
    private static readonly string[] AllowedExtensions = [".txt", ".log"];

    public AnalyzeFileService(ITextService textService)
    {
        this.textService = textService;
    }

    public async Task<TextStats> Execute(Stream fileStream, string fileName)
    {
        ValidateFile(fileStream, fileName);

        // читаем весь текст файла
        using var reader = new StreamReader(fileStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);

        var content = await reader.ReadToEndAsync();

        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("File content is empty");

        return textService.Analyze(content);
    }

    private static void ValidateFile(Stream fileStream, string fileName)
    {
        if (fileStream is null)
            throw new ArgumentNullException(nameof(fileStream), "File stream is required");

        if (string.IsNullOrWhiteSpace(fileName))
            throw new ArgumentException("File name is required", nameof(fileName));

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            throw new ArgumentException($"Unsupported file extension '{ext}'. Allowed: {string.Join(", ", AllowedExtensions)}");
    }
}