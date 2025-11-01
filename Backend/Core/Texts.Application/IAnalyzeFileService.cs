using Texts.Domain;

namespace Texts.Application;

public interface IAnalyzeFileService
{
    Task<TextStats> Execute(Stream fileStream, string fileName);
    Task<ShingleAnalyzer> ExecuteShingleAnalysis(Stream fileStream, string fileName, int k);
    Task<string> ReadAndValidateFileContentAsync(Stream fileStream, string fileName);
    Task<FileComparisonResult> CompareTwoFilesAsync(Stream fileStream1, string fileName1, Stream fileStream2, string fileName2, int shingleSize);

}