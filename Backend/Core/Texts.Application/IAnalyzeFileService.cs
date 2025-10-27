using Texts.Domain;

namespace Texts.Application;

public interface IAnalyzeFileService
{
    Task<TextStats> Execute(Stream fileStream, string fileName);
    Task<ShingleAnalyzer> ExecuteShingleAnalysis(Stream fileStream, string fileName, int k);
    Task<string> ReadAndValidateFileContentAsync(Stream fileStream, string fileName);

}