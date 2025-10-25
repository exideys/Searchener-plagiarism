using Texts.Domain;

namespace Texts.Application;

public interface IAnalyzeFileService
{
    Task<TextStats> Execute(Stream fileStream, string fileName);
}